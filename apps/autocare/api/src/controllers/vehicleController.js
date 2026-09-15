import { createResourceController } from "./resourceController.js";
import { vehicleService } from "../services/vehicleService.js";

export const vehicleController = createResourceController(vehicleService);
