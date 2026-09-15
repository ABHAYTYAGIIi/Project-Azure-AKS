import { serviceTypeController } from "../controllers/serviceTypeController.js";
import { createResourceRoutes } from "./resourceRoutes.js";

export const serviceTypeRoutes = createResourceRoutes(serviceTypeController);
