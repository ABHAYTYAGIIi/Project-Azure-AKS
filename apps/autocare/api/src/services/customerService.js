import { customerRepository } from "../repositories/customerRepository.js";
import { createResourceService } from "./resourceService.js";
import { definedValues, optionalEmail, optionalString, requiredEmail, requiredString } from "./validation.js";

export const customerService = createResourceService({
  repository: customerRepository,
  createValues: (input) => ({
    name: requiredString(input.name, "name"),
    email: requiredEmail(input.email),
    phone: requiredString(input.phone, "phone")
  }),
  updateValues: (input) => definedValues({
    name: optionalString(input.name, "name"),
    email: optionalEmail(input.email),
    phone: optionalString(input.phone, "phone")
  })
});
