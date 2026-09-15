# AutoCare application

AutoCare is a small car-service booking application. This folder intentionally contains application code only; Azure, AKS, Docker, Kubernetes, and CI/CD assets remain outside its scope for now.

## Components

- `frontend/` — React dashboard for vehicles, bookings, and maintenance recommendations.
- `api/` — Node.js and Express REST API for customer, vehicle, booking, service-center, and service-type operations.
- `maintenance-service/` — Python and FastAPI service that provides deterministic maintenance recommendations.

## Local configuration

Copy each component's `.env.example` to `.env` and set local values. Environment files are intentionally ignored by Git.

The API uses `DATABASE_*` variables as a database configuration boundary. Set `DATABASE_PROVIDER=memory` for the development-only in-memory implementation, or set `DATABASE_PROVIDER=azure-sql` to use Azure SQL Database or a compatible SQL Server instance. Production refuses to start unless `DATABASE_PROVIDER=azure-sql`; it never falls back to memory.

## Initial local run commands

```text
frontend:            npm install && npm run dev
api:                 npm install && npm run dev
maintenance-service: python -m venv .venv, activate it, pip install -r requirements.txt, then uvicorn app.main:app --reload --port 8001
```

Run the frontend from `frontend/`, the API from `api/`, and the FastAPI service from `maintenance-service/`.

## Development verification baseline

**Verified locally on 2026-09-15.** This section records the Development-only baseline. It does not represent an AKS, container, Azure SQL, QA, or Production verification.

### VERIFIED — local architecture and topology

```text
Browser: http://localhost:5173/autocare/
  -> React/Vite frontend
  -> Express API: http://localhost:3000/api
  -> Development in-memory repository
  -> FastAPI maintenance service: http://localhost:8001
```

- The frontend public application base path remained `/autocare/`.
- Direct local Vite development used `VITE_API_BASE_URL=http://localhost:3000/api`; the browser therefore called Express directly at `/api/*`.
- Express used its default Development `DATABASE_PROVIDER=memory` repository implementation.
- Azure SQL was not exercised because no Azure SQL connection configuration or credentials were supplied for this local verification.

### VERIFIED — service and API checks

- FastAPI `GET /health` returned `ok`.
- Express `GET /api/health` returned `ok`.
- The API test suite completed with **9 passed, 0 failed**.
- CRUD was verified through the API, including customer create/read/update/delete and resource creation/removal for vehicles, service centers, service types, and bookings.
- The full customer -> vehicle -> service center -> service type -> booking flow was verified.
- `POST /api/vehicles/:id/maintenance-analysis` completed through Express to FastAPI. FastAPI received `POST /maintenance-analysis`, returned a valid recommendation, and Express returned the result to the caller.
- The API suite includes an HTTP integration test that exercises Express forwarding a maintenance-analysis request to a FastAPI-compatible HTTP service.

### VERIFIED — frontend checks

- The Dashboard loaded successfully at `http://localhost:5173/autocare/` and retrieved its live data through Express.
- The Maintenance page loaded a vehicle, invoked the Express maintenance endpoint, and displayed the FastAPI result in React:

  ```text
  Medium
  Schedule a routine maintenance check.
  ```

- The frontend production build completed successfully. Generated asset references use the `/autocare/` public base path.
- `git diff --check` completed without whitespace errors.

### Development-only local caveats

- Use `http://localhost:5173/autocare/`, not `http://127.0.0.1:5173/autocare/`, because the current Express CORS configuration permits `http://localhost:5173`.
- For direct local Vite development, use `VITE_API_BASE_URL=http://localhost:3000/api`. The configured `/autocare/api` value remains the intended path-based public API path for future Ingress deployment, not the direct local Express origin.

### NOT YET VERIFIED

- Azure SQL connectivity and the Azure SQL repository implementation.
- Docker or container-image builds and runtime validation.
- AKS application deployment.
- Kubernetes Services, Ingress, or path rewriting.
- QA and Production application environments.

### FUTURE AKS / DEPLOYMENT WORK

- Deploy the three application components to AKS after container validation.
- Configure path-based Ingress for the frontend and `/autocare/api/*` API path.
- Configure Azure SQL credentials and validate the `azure-sql` repository provider.
- Derive and validate QA and Production only after the Development deployment baseline is complete.

## API endpoints

All API responses use `{ "data": ... }`; validation and domain errors use `{ "error": { "code", "message" } }`.

| Resource | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Customers | `GET`, `POST /api/customers`; `GET`, `PUT`, `DELETE /api/customers/:id` |
| Vehicles | `GET`, `POST /api/vehicles`; `GET`, `PUT`, `DELETE /api/vehicles/:id` |
| Vehicle maintenance analysis | `POST /api/vehicles/:id/maintenance-analysis` |
| Service centers | `GET`, `POST /api/service-centers`; `GET`, `PUT`, `DELETE /api/service-centers/:id` |
| Service types | `GET`, `POST /api/service-types`; `GET`, `PUT`, `DELETE /api/service-types/:id` |
| Bookings | `GET`, `POST /api/bookings`; `GET`, `PUT`, `DELETE /api/bookings/:id` |

The current repository implementations are in-memory for local development. They are isolated behind repository contracts and are the only layer intended to change when an Azure SQL adapter is introduced.

`POST /api/vehicles/:id/maintenance-analysis` loads the vehicle and its completed booking history, then calls the FastAPI service at `MAINTENANCE_SERVICE_URL/maintenance-analysis`. Set `MAINTENANCE_SERVICE_TIMEOUT_MS` (default `5000`) to control the upstream request timeout.

## Azure SQL database setup

The Azure SQL-compatible schema and a small idempotent development seed are in [database/schema.sql](C:/Users/abhay/Project-Azure-AKS/apps/autocare/database/schema.sql) and [database/seed.sql](C:/Users/abhay/Project-Azure-AKS/apps/autocare/database/seed.sql). They create customers, vehicles, service centers, service types, and bookings with primary keys, foreign keys, checks, unique constraints, and booking/query indexes.

1. Create an empty Azure SQL Database and allow your development machine's IP in its firewall.
2. Run `schema.sql`, then `seed.sql`, using Azure Data Studio, SSMS, or `sqlcmd`.
3. In `apps/autocare/api`, copy `.env.example` to `.env` and set these placeholders to real local values: `DATABASE_PROVIDER=azure-sql`, `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD`. Keep `DATABASE_ENCRYPT=true` for Azure SQL and `DATABASE_TRUST_SERVER_CERTIFICATE=false`.
4. Install and start the API:

```text
cd apps/autocare/api
npm install
npm start
```

The API connects to Azure SQL during startup and exits with a clear error if the selected SQL configuration is incomplete or unreachable. To run without SQL for local API/domain development, explicitly set `DATABASE_PROVIDER=memory` instead.
