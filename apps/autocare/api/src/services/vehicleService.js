import { customerRepository } from "../repositories/customerRepository.js";
import { vehicleRepository } from "../repositories/vehicleRepository.js";
import { HttpError } from "./errors.js";
import { createResourceService } from "./resourceService.js";
import { definedValues, optionalInteger, optionalString, requiredInteger, requiredString } from "./validation.js";

async function ensureCustomer(customerId) {
  if (!(await customerRepository.findById(customerId))) {
    throw new HttpError(400, "customerId must reference an existing customer.");
  }
}

export const vehicleService = createResourceService({
  repository: vehicleRepository,
  createValues: async (input) => {
    const customerId = requiredString(input.customerId, "customerId");
    await ensureCustomer(customerId);
    return {
      customerId,
      make: requiredString(input.make, "make"),
      model: requiredString(input.model, "model"),
      year: requiredInteger(input.year, "year", 1886),
      licensePlate: requiredString(input.licensePlate, "licensePlate"),
      mileage: requiredInteger(input.mileage, "mileage")
    };
  },
  updateValues: async (input) => {
    const customerId = optionalString(input.customerId, "customerId");
    if (customerId) await ensureCustomer(customerId);
    return definedValues({
      customerId,
      make: optionalString(input.make, "make"),
      model: optionalString(input.model, "model"),
      year: optionalInteger(input.year, "year", 1886),
      licensePlate: optionalString(input.licensePlate, "licensePlate"),
      mileage: optionalInteger(input.mileage, "mileage")
    });
  }
});
