import { environment } from "../config/environment.js";

export function getDatabaseConfiguration() {
  const { password, ...safeConfiguration } = environment.database;
  return safeConfiguration;
}

export function getSqlConnectionConfiguration() {
  const { provider, host, port, name, user, password, encrypt, trustServerCertificate } = environment.database;
  if (provider !== "azure-sql") return null;

  const missing = [
    ["DATABASE_HOST", host],
    ["DATABASE_NAME", name],
    ["DATABASE_USER", user],
    ["DATABASE_PASSWORD", password]
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`DATABASE_PROVIDER=azure-sql requires: ${missing.join(", ")}.`);
  }

  return {
    server: host,
    port,
    database: name,
    user,
    password,
    options: { encrypt, trustServerCertificate }
  };
}
