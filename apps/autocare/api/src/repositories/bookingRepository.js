import { createRepository } from "./repositoryFactory.js";

export const bookingRepository = createRepository({
  table: "[dbo].[bookings]",
  columns: [
    { property: "id", column: "id" }, { property: "customerId", column: "customer_id" },
    { property: "vehicleId", column: "vehicle_id" }, { property: "serviceCenterId", column: "service_center_id" },
    { property: "serviceTypeId", column: "service_type_id" }, { property: "scheduledAt", column: "scheduled_at" },
    { property: "status", column: "status" }, { property: "notes", column: "notes" },
    { property: "createdAt", column: "created_at" }, { property: "updatedAt", column: "updated_at" }
  ]
});
