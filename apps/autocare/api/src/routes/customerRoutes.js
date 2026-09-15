import { customerController } from "../controllers/customerController.js";
import { createResourceRoutes } from "./resourceRoutes.js";

export const customerRoutes = createResourceRoutes(customerController);
