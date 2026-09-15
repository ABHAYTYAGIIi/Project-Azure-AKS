import { serviceCenterController } from "../controllers/serviceCenterController.js";
import { createResourceRoutes } from "./resourceRoutes.js";

export const serviceCenterRoutes = createResourceRoutes(serviceCenterController);
