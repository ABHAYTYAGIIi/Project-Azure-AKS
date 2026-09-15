import { createRepository } from "./repositoryFactory.js";

export const serviceTypeRepository = createRepository({
  table: "[dbo].[service_types]",
  columns: [
    { property: "id", column: "id" }, { property: "name", column: "name" },
    { property: "description", column: "description" },
    { property: "estimatedDurationMinutes", column: "estimated_duration_minutes" },
    { property: "basePrice", column: "base_price" }, { property: "createdAt", column: "created_at" },
    { property: "updatedAt", column: "updated_at" }
  ]
});
