import { createResourceController } from "./resourceController.js";
import { bookingService } from "../services/bookingService.js";

export const bookingController = createResourceController(bookingService);
