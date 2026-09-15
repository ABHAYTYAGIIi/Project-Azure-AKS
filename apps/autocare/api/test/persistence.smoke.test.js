import assert from "node:assert/strict";
import test from "node:test";

// Force a deterministic local repository implementation for these smoke tests.
process.env.NODE_ENV = "test";
process.env.DATABASE_PROVIDER = "memory";

const { customerService } = await import("../src/services/customerService.js");
const { vehicleService } = await import("../src/services/vehicleService.js");
const { serviceCenterService } = await import("../src/services/serviceCenterService.js");
const { serviceTypeService } = await import("../src/services/serviceTypeService.js");
const { bookingService } = await import("../src/services/bookingService.js");
const { createMaintenanceAnalysisService } = await import("../src/services/maintenanceAnalysisService.js");
const { createMaintenanceServiceClient } = await import("../src/clients/maintenanceServiceClient.js");

async function createBookingReferences() {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const customer = await customerService.create({
    name: "Riya Patel", email: `riya.${suffix}@example.test`, phone: "+91-98765-10000"
  });
  const vehicle = await vehicleService.create({
    customerId: customer.id, make: "Tata", model: "Nexon", year: 2023,
    licensePlate: `KA${suffix.slice(-6).toUpperCase()}`, mileage: 12000
  });
  const serviceCenter = await serviceCenterService.create({
    name: `AutoCare Test ${suffix}`, address: "10 Test Road", city: "Bengaluru", phone: "+91-80000-10000"
  });
  const serviceType = await serviceTypeService.create({
    name: `Inspection ${suffix}`, description: "Safety inspection", estimatedDurationMinutes: 45, basePrice: 899
  });
  return { customer, vehicle, serviceCenter, serviceType };
}

test("creates a customer through the selected repository", async () => {
  const { customer } = await createBookingReferences();
  assert.equal(customer.name, "Riya Patel");
  assert.match(customer.id, /^[0-9a-f-]{36}$/i);
});

test("persists the vehicle/customer relationship", async () => {
  const { customer, vehicle } = await createBookingReferences();
  assert.equal(vehicle.customerId, customer.id);
});

test("creates a service type", async () => {
  const { serviceType } = await createBookingReferences();
  assert.equal(serviceType.basePrice, 899);
  assert.equal(serviceType.estimatedDurationMinutes, 45);
});

test("creates a booking with valid references", async () => {
  const { customer, vehicle, serviceCenter, serviceType } = await createBookingReferences();
  const booking = await bookingService.create({
    customerId: customer.id, vehicleId: vehicle.id, serviceCenterId: serviceCenter.id,
    serviceTypeId: serviceType.id, scheduledAt: "2026-11-01T10:00:00Z"
  });
  assert.equal(booking.status, "scheduled");
  assert.equal(booking.vehicleId, vehicle.id);
});

test("rejects a booking with an invalid reference", async () => {
  const { customer, vehicle, serviceCenter, serviceType } = await createBookingReferences();
  await assert.rejects(
    bookingService.create({
      customerId: customer.id, vehicleId: vehicle.id, serviceCenterId: serviceCenter.id,
      serviceTypeId: "00000000-0000-0000-0000-000000000000", scheduledAt: "2026-11-01T10:00:00Z"
    }),
    { status: 400, message: "serviceTypeId must reference an existing resource." }
  );
});

test("builds maintenance inputs from a vehicle and completed service history", async () => {
  const { customer, vehicle, serviceCenter, serviceType } = await createBookingReferences();
  const booking = await bookingService.create({
    customerId: customer.id, vehicleId: vehicle.id, serviceCenterId: serviceCenter.id,
    serviceTypeId: serviceType.id, scheduledAt: "2026-11-01T10:00:00Z"
  });
  await bookingService.update(booking.id, { status: "completed" });

  let receivedPayload;
  const service = createMaintenanceAnalysisService({
    client: { analyze: async (payload) => { receivedPayload = payload; return { riskLevel: "low", recommendation: "Continue regular service." }; } },
    currentYear: () => 2026
  });
  const analysis = await service.analyzeForVehicle(vehicle.id);

  assert.deepEqual(receivedPayload, {
    mileage: 12000, vehicle_age_years: 3, service_history: [serviceType.name]
  });
  assert.equal(analysis.inputs.serviceHistoryCount, 1);
  assert.equal(analysis.riskLevel, "low");
});

test("maintenance client sends a validated request to FastAPI", async () => {
  let request;
  const client = createMaintenanceServiceClient({
    baseUrl: "http://maintenance.local:8001", timeoutMs: 1000,
    fetchImplementation: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ riskLevel: "medium", recommendation: "Schedule service." }) };
    }
  });

  const analysis = await client.analyze({ mileage: 50000, vehicle_age_years: 5, service_history: [] });
  assert.equal(request.url, "http://maintenance.local:8001/maintenance-analysis");
  assert.equal(request.options.method, "POST");
  assert.equal(analysis.riskLevel, "medium");
});

test("maintenance client translates a timeout into a gateway timeout", async () => {
  const client = createMaintenanceServiceClient({
    baseUrl: "http://maintenance.local:8001", timeoutMs: 1000,
    fetchImplementation: async () => {
      const error = new Error("request aborted");
      error.name = "AbortError";
      throw error;
    }
  });

  await assert.rejects(
    client.analyze({ mileage: 12000, vehicle_age_years: 3, service_history: [] }),
    { status: 504, message: "Maintenance analysis service timed out." }
  );
});
