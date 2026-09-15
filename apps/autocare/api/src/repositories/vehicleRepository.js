import { createRepository } from "./repositoryFactory.js";

export const vehicleRepository = createRepository({
  table: "[dbo].[vehicles]",
  columns: [
    { property: "id", column: "id" }, { property: "customerId", column: "customer_id" },
    { property: "make", column: "make" }, { property: "model", column: "model" },
    { property: "year", column: "model_year" }, { property: "licensePlate", column: "license_plate" },
    { property: "mileage", column: "mileage" }, { property: "createdAt", column: "created_at" },
    { property: "updatedAt", column: "updated_at" }
  ]
});
