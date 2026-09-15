import { bookingController } from "../controllers/bookingController.js";
import { createResourceRoutes } from "./resourceRoutes.js";

export const bookingRoutes = createResourceRoutes(bookingController);
