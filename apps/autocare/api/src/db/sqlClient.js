import sql from "mssql";
import { getSqlConnectionConfiguration } from "./database.js";

let pool;

export async function getSqlPool() {
  if (!pool) {
    const configuration = getSqlConnectionConfiguration();
    if (!configuration) throw new Error("Azure SQL was requested without a SQL connection configuration.");
    pool = await new sql.ConnectionPool(configuration).connect();
  }
  return pool;
}

export async function initializeDatabase() {
  if (getSqlConnectionConfiguration()) await getSqlPool();
}

export async function closeSqlPool() {
  if (pool) await pool.close();
  pool = undefined;
}
