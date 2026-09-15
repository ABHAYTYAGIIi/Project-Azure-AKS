import { serviceCenterRepository } from "../repositories/serviceCenterRepository.js";
import { createResourceService } from "./resourceService.js";
import { definedValues, optionalString, requiredString } from "./validation.js";

export const serviceCenterService = createResourceService({
  repository: serviceCenterRepository,
  createValues: (input) => ({
    name: requiredString(input.name, "name"),
    address: requiredString(input.address, "address"),
    city: requiredString(input.city, "city"),
    phone: requiredString(input.phone, "phone")
  }),
  updateValues: (input) => definedValues({
    name: optionalString(input.name, "name"),
    address: optionalString(input.address, "address"),
    city: optionalString(input.city, "city"),
    phone: optionalString(input.phone, "phone")
  })
});
