import { createResourceController } from "./resourceController.js";
import { serviceCenterService } from "../services/serviceCenterService.js";

export const serviceCenterController = createResourceController(serviceCenterService);
