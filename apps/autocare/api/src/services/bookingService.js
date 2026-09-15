import { bookingRepository } from "../repositories/bookingRepository.js";
import { customerRepository } from "../repositories/customerRepository.js";
import { serviceCenterRepository } from "../repositories/serviceCenterRepository.js";
import { serviceTypeRepository } from "../repositories/serviceTypeRepository.js";
import { vehicleRepository } from "../repositories/vehicleRepository.js";
import { HttpError } from "./errors.js";
import { createResourceService } from "./resourceService.js";
import { definedValues, optionalEnum, optionalIsoDate, optionalString, requiredIsoDate, requiredString } from "./validation.js";

const statuses = ["scheduled", "confirmed", "completed", "cancelled"];

async function ensureReferences(values) {
  const references = [
    ["customerId", customerRepository],
    ["vehicleId", vehicleRepository],
    ["serviceCenterId", serviceCenterRepository],
    ["serviceTypeId", serviceTypeRepository]
  ];

  for (const [field, repository] of references) {
    if (values[field] && !(await repository.findById(values[field]))) {
      throw new HttpError(400, `${field} must reference an existing resource.`);
    }
  }
}

export const bookingService = createResourceService({
  repository: bookingRepository,
  createValues: async (input) => {
    const values = {
      customerId: requiredString(input.customerId, "customerId"),
      vehicleId: requiredString(input.vehicleId, "vehicleId"),
      serviceCenterId: requiredString(input.serviceCenterId, "serviceCenterId"),
      serviceTypeId: requiredString(input.serviceTypeId, "serviceTypeId"),
      scheduledAt: requiredIsoDate(input.scheduledAt, "scheduledAt"),
      status: optionalEnum(input.status, "status", statuses) ?? "scheduled",
      notes: optionalString(input.notes, "notes") ?? ""
    };
    await ensureReferences(values);
    if ((await vehicleRepository.findById(values.vehicleId)).customerId !== values.customerId) {
      throw new HttpError(400, "vehicleId must belong to customerId.");
    }
    return values;
  },
  updateValues: async (input, current) => {
    const values = definedValues({
      customerId: optionalString(input.customerId, "customerId"),
      vehicleId: optionalString(input.vehicleId, "vehicleId"),
      serviceCenterId: optionalString(input.serviceCenterId, "serviceCenterId"),
      serviceTypeId: optionalString(input.serviceTypeId, "serviceTypeId"),
      scheduledAt: optionalIsoDate(input.scheduledAt, "scheduledAt"),
      status: optionalEnum(input.status, "status", statuses),
      notes: optionalString(input.notes, "notes")
    });
    const merged = { ...current, ...values };
    await ensureReferences(values);
    if ((await vehicleRepository.findById(merged.vehicleId)).customerId !== merged.customerId) {
      throw new HttpError(400, "vehicleId must belong to customerId.");
    }
    return values;
  }
});
