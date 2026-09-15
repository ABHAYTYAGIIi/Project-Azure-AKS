import { serviceTypeRepository } from "../repositories/serviceTypeRepository.js";
import { createResourceService } from "./resourceService.js";
import { definedValues, optionalNumber, optionalString, requiredNumber, requiredString } from "./validation.js";

export const serviceTypeService = createResourceService({
  repository: serviceTypeRepository,
  createValues: (input) => ({
    name: requiredString(input.name, "name"),
    description: requiredString(input.description, "description"),
    estimatedDurationMinutes: requiredNumber(input.estimatedDurationMinutes, "estimatedDurationMinutes", 1),
    basePrice: requiredNumber(input.basePrice, "basePrice")
  }),
  updateValues: (input) => definedValues({
    name: optionalString(input.name, "name"),
    description: optionalString(input.description, "description"),
    estimatedDurationMinutes: optionalNumber(input.estimatedDurationMinutes, "estimatedDurationMinutes", 1),
    basePrice: optionalNumber(input.basePrice, "basePrice")
  })
});
