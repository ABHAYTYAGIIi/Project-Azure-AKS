import cors from "cors";
import express from "express";
import { environment } from "./config/environment.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(cors({ origin: environment.frontendOrigin }));
app.use(express.json());
app.use("/api", apiRouter);

app.use((error, _request, response, _next) => {
  const status = error.status || 500;
  response.status(status).json({
    error: {
      code: status === 500 ? "INTERNAL_ERROR" : "VALIDATION_OR_DOMAIN_ERROR",
      message: status === 500 ? "An unexpected error occurred." : error.message,
      ...(error.details ? { details: error.details } : {})
    }
  });
});
