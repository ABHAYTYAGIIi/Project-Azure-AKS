import { maintenanceAnalysisService } from "../services/maintenanceAnalysisService.js";

export async function analyzeVehicleMaintenance(request, response, next) {
  try {
    const analysis = await maintenanceAnalysisService.analyzeForVehicle(request.params.id);
    response.json({ data: analysis });
  } catch (error) {
    next(error);
  }
}
