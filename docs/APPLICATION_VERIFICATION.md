# AutoCare — Development Application Verification

**Verification date:** 2026-09-15  
**Scope:** local Development baseline only

This document records the application tests and manual verification performed before starting the AKS application deployment work. It does not claim Azure SQL, AKS application workloads, Ingress, Application Gateway, QA, Production, or CI/CD validation.

## 1. Development architecture verified

```text
Browser: http://localhost:5173/autocare/
  -> React / Vite
  -> Express: http://localhost:3000/api
  -> in-memory Development repository
  -> FastAPI: http://localhost:8001
```

The browser Maintenance page displayed the live maintenance result:

```text
Medium
Schedule a routine maintenance check.
```

FastAPI logs confirmed real `POST /maintenance-analysis` requests returned HTTP `200`.

Azure SQL was not exercised because the Development environment had no SQL configuration. The existing default `DATABASE_PROVIDER=memory` repository implementation was used.

## 2. Automated API tests

The API test suite completed:

- **9 passed**
- **0 failed**

The suite includes:

- Persistence/domain smoke coverage.
- CRUD behavior for the application resources.
- Express-to-maintenance-service HTTP integration coverage.

The integration test exercises the real HTTP boundary:

```text
Express route/controller/service
  -> HTTP request
  -> FastAPI-compatible maintenance endpoint
  -> validated response
  -> Express response
```

## 3. Manual live HTTP verification

The following checks were performed against running local services:

| Check | Result |
|---|---|
| FastAPI `GET /health` | PASS |
| FastAPI `POST /maintenance-analysis` | PASS |
| Express `GET /api/health` | PASS |
| Customer create/read/update/delete | PASS |
| Vehicle resource operations | PASS |
| Service-center resource operations | PASS |
| Service-type resource operations | PASS |
| Booking resource operations | PASS |
| Full customer → vehicle → service center → service type → booking flow | PASS |
| Express maintenance-analysis endpoint | PASS |

## 4. Browser verification

- Dashboard loaded successfully at `http://localhost:5173/autocare/`.
- Dashboard retrieved live API data through Express.
- Maintenance page loaded a vehicle and invoked the Express maintenance-analysis endpoint.
- React displayed the FastAPI-driven recommendation successfully.

## 5. Build and repository checks

- Frontend production build: **PASS**.
- `git diff --check`: **PASS**.
- Application source was committed to GitHub under `apps/autocare/`.
- Local dependency directories, Python virtual environments, build output, caches, and local `.env` files were excluded by the application `.gitignore`.

## 6. Local development caveats discovered

### Frontend API base

For direct local Vite development, the working override is:

```text
VITE_API_BASE_URL=http://localhost:3000/api
```

The application public base remains:

```text
/autocare/
```

The `/autocare/api` path is intended for the future path-based Ingress deployment and does not represent the direct local Express origin.

### localhost vs 127.0.0.1

The current Express CORS configuration permits `http://localhost:5173`. Therefore use:

```text
http://localhost:5173/autocare/
```

rather than:

```text
http://127.0.0.1:5173/autocare/
```

for this local baseline.

### npm availability

`npm` was not available on the shell PATH during verification. The existing bundled Node runtime and installed project dependencies were used to run the required tests and build.

## 7. Application changes made during development verification

- Retained the Development-only Vite entry/base-path fix in `frontend/index.html`.
- Updated `api/package.json` so the test script discovers the API test files.
- Added `api/test/maintenance-http.integration.test.js` for the Express-to-maintenance-service HTTP integration boundary.

No Azure infrastructure, AKS resources, Kubernetes manifests, Docker images, CI/CD workflows, QA environment, Production environment, or Azure SQL runtime configuration were changed as part of this verification.

## 8. Not yet verified

- Docker image builds and container runtime behavior.
- ACR image push/pull.
- AutoCare deployment to AKS `dev` namespace.
- Kubernetes Service discovery between application components.
- Azure SQL connectivity from the deployed API.
- Kubernetes Ingress and path-based routing.
- Application Gateway integration.
- HTTPS/SSL.
- QA promotion.
- Production promotion.
- GitHub Actions CI/CD.

## 9. Next verification stage

The next DevOps stage is intentionally narrow:

```text
Existing AKS infrastructure
        ↓
Inspect current Development/cluster state
        ↓
Containerize AutoCare
        ↓
Validate images locally
        ↓
Push images to ACR
        ↓
Deploy to AKS dev
        ↓
Run the same application smoke tests in AKS
```

Only after this Development deployment is stable should the GitHub Actions CI/CD pipeline be implemented.
