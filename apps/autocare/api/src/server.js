import { app } from "./app.js";
import { environment } from "./config/environment.js";
import { initializeDatabase } from "./db/sqlClient.js";

try {
  await initializeDatabase();
  app.listen(environment.port, () => {
    console.log(`AutoCare API listening on port ${environment.port}`);
  });
} catch (error) {
  console.error(`AutoCare API could not initialize its database: ${error.message}`);
  process.exitCode = 1;
}
