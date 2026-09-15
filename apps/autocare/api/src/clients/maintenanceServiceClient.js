import { HttpError } from "../services/errors.js";

const riskLevels = ["low", "medium", "high"];

function endpointFor(baseUrl) {
  return new URL("maintenance-analysis", `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}`).toString();
}

export function createMaintenanceServiceClient({ baseUrl, timeoutMs, fetchImplementation = globalThis.fetch }) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("A fetch implementation is required for the maintenance service client.");
  }

  return {
    async analyze(payload) {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMs);

      let response;
      try {
        response = await fetchImplementation(endpointFor(baseUrl), {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(payload),
          signal: abortController.signal
        });
      } catch (error) {
        if (error.name === "AbortError") {
          throw new HttpError(504, "Maintenance analysis service timed out.");
        }
        throw new HttpError(502, "Maintenance analysis service is unavailable.");
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new HttpError(502, "Maintenance analysis service returned an error.");
      }

      let analysis;
      try {
        analysis = await response.json();
      } catch {
        throw new HttpError(502, "Maintenance analysis service returned an invalid response.");
      }

      if (!riskLevels.includes(analysis.riskLevel) || typeof analysis.recommendation !== "string") {
        throw new HttpError(502, "Maintenance analysis service returned an unexpected response.");
      }

      return analysis;
    }
  };
}
