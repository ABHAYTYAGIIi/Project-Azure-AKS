const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const inferredBaseUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;
const apiBaseUrl = (configuredBaseUrl || inferredBaseUrl).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
      ...options
    });
  } catch {
    throw new ApiError("AutoCare could not reach the API. Check that the API is running.");
  }

  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error?.message || "The request could not be completed.", response.status);
  return body.data;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  remove: (path) => request(path, { method: "DELETE" })
};
