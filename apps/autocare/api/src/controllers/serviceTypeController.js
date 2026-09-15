import { createResourceController } from "./resourceController.js";
import { serviceTypeService } from "../services/serviceTypeService.js";

export const serviceTypeController = createResourceController(serviceTypeService);
