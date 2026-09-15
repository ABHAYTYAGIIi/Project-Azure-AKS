import { createResourceController } from "./resourceController.js";
import { customerService } from "../services/customerService.js";

export const customerController = createResourceController(customerService);
