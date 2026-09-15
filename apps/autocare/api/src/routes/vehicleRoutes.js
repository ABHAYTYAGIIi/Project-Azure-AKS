import { vehicleController } from "../controllers/vehicleController.js";
import { createResourceRoutes } from "./resourceRoutes.js";

export const vehicleRoutes = createResourceRoutes(vehicleController);
