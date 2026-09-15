# Changelog

## 2026-09-15 — AutoCare application baseline

### Added

- AutoCare application under `apps/autocare/`.
- React/Vite frontend.
- Node.js/Express API with repository abstraction.
- Python/FastAPI maintenance-analysis service.
- Azure SQL-compatible database schema and development seed.
- API persistence/domain smoke tests.
- Express-to-maintenance-service HTTP integration test.
- Application-level README and environment examples.
- Development application verification documentation.
- Project scope and DevOps roadmap documentation.

### Verified

- Local Development application topology.
- FastAPI health and maintenance-analysis requests.
- Express health endpoint.
- Customer CRUD.
- Vehicle, service-center, service-type, and booking operations.
- Full customer → vehicle → service center → service type → booking flow.
- Express → FastAPI maintenance-analysis integration.
- Browser Dashboard and Maintenance flows.
- Frontend production build.
- Git repository hygiene checks.
- AKS infrastructure baseline separately documented in `docs/AKS_VERIFIED_STATE.md`.

### Not yet completed

- Container image build/runtime validation.
- ACR push/pull.
- AKS application deployment.
- Azure SQL runtime validation.
- Ingress/Application Gateway/HTTPS.
- QA and Production deployment.
- GitHub Actions CI/CD.

## Documentation principle

Only directly verified infrastructure/application behavior is recorded as complete. Planned architecture remains explicitly marked as planned until validated.
