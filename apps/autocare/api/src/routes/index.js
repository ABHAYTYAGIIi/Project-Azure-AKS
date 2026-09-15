import { Router } from "express";
import { bookingRoutes } from "./bookingRoutes.js";
import { customerRoutes } from "./customerRoutes.js";
import { getHealth } from "../controllers/healthController.js";
import { analyzeVehicleMaintenance } from "../controllers/maintenanceAnalysisController.js";
import { serviceCenterRoutes } from "./serviceCenterRoutes.js";
import { serviceTypeRoutes } from "./serviceTypeRoutes.js";
import { vehicleRoutes } from "./vehicleRoutes.js";

export const apiRouter = Router();

apiRouter.get("/health", getHealth);
apiRouter.post("/vehicles/:id/maintenance-analysis", analyzeVehicleMaintenance);
apiRouter.use("/customers", customerRoutes);
apiRouter.use("/vehicles", vehicleRoutes);
apiRouter.use("/service-centers", serviceCenterRoutes);
apiRouter.use("/service-types", serviceTypeRoutes);
apiRouter.use("/bookings", bookingRoutes);
