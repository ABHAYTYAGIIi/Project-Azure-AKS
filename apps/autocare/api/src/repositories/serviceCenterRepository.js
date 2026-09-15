import { createRepository } from "./repositoryFactory.js";

export const serviceCenterRepository = createRepository({
  table: "[dbo].[service_centers]",
  columns: [
    { property: "id", column: "id" }, { property: "name", column: "name" },
    { property: "address", column: "address" }, { property: "city", column: "city" },
    { property: "phone", column: "phone" }, { property: "createdAt", column: "created_at" },
    { property: "updatedAt", column: "updated_at" }
  ]
});
