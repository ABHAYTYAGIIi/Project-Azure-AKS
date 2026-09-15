import { environment } from "../config/environment.js";
import { bookingRepository } from "../repositories/bookingRepository.js";
import { serviceTypeRepository } from "../repositories/serviceTypeRepository.js";
import { createMaintenanceServiceClient } from "../clients/maintenanceServiceClient.js";
import { vehicleService } from "./vehicleService.js";

function getVehicleAge(vehicleYear, currentYear) {
  return Math.max(0, currentYear - vehicleYear);
}

export function createMaintenanceAnalysisService({
  vehicles = vehicleService,
  bookings = bookingRepository,
  serviceTypes = serviceTypeRepository,
  client = createMaintenanceServiceClient({
    baseUrl: environment.maintenanceServiceUrl,
    timeoutMs: environment.maintenanceServiceTimeoutMs
  }),
  currentYear = () => new Date().getUTCFullYear()
} = {}) {
  return {
    async analyzeForVehicle(vehicleId) {
      const vehicle = await vehicles.get(vehicleId);
      const completedBookings = (await bookings.list()).filter(
        (booking) => booking.vehicleId === vehicle.id && booking.status === "completed"
      );
      const serviceHistory = await Promise.all(completedBookings.map(async (booking) => {
        const serviceType = await serviceTypes.findById(booking.serviceTypeId);
        return serviceType?.name || "Completed service";
      }));
      const vehicleAgeYears = getVehicleAge(vehicle.year, currentYear());

      const analysis = await client.analyze({
        mileage: vehicle.mileage,
        vehicle_age_years: vehicleAgeYears,
        service_history: serviceHistory
      });

      return {
        vehicleId: vehicle.id,
        inputs: {
          mileage: vehicle.mileage,
          vehicleAgeYears,
          serviceHistoryCount: serviceHistory.length
        },
        ...analysis
      };
    }
  };
}

export const maintenanceAnalysisService = createMaintenanceAnalysisService();
