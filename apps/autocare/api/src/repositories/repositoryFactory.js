import { environment } from "../config/environment.js";
import { createInMemoryRepository } from "./inMemoryRepository.js";
import { createSqlRepository } from "./sqlRepository.js";

export function createRepository(sqlDefinition) {
  if (environment.database.provider === "memory") return createInMemoryRepository();
  return createSqlRepository(sqlDefinition);
}
