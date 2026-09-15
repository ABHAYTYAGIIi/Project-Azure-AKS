import { createRepository } from "./repositoryFactory.js";

export const customerRepository = createRepository({
  table: "[dbo].[customers]",
  columns: [
    { property: "id", column: "id" }, { property: "name", column: "name" },
    { property: "email", column: "email" }, { property: "phone", column: "phone" },
    { property: "createdAt", column: "created_at" }, { property: "updatedAt", column: "updated_at" }
  ]
});
