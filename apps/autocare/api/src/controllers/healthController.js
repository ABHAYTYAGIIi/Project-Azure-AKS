import { getDatabaseConfiguration } from "../db/database.js";

export function getHealth(_request, response) {
  response.json({
    service: "autocare-api",
    status: "ok",
    databaseConfigured: Boolean(getDatabaseConfiguration().host)
  });
}
