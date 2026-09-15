# Project Plan and Current Scope

## Objective

Build, containerize, deploy, and operate the AutoCare full-stack application on Azure Kubernetes Service while respecting Azure for Students resource constraints and applying practical DevOps practices.

## Current application

The application source is under `apps/autocare/` and contains:

- React/Vite frontend
- Node.js/Express API
- Python/FastAPI maintenance service
- Azure SQL-compatible schema and seed scripts
- API tests and an HTTP integration test

The local Development application baseline has been verified and committed to GitHub.

## Environment strategy

The project will use a **single source codebase** with environment-specific deployment configuration.

Target environments:

```text
AKS cluster
├── dev
├── qa
└── prod
```

`qa` and `prod` are deployment/promotion environments, not separate copies of the application source.

The goal is to promote the same tested application artifacts between environments while changing only the configuration and operational controls appropriate to each environment.

## Milestones

### Milestone 1 — Application baseline

Status: **Complete**

- Application implemented.
- Local Development topology verified.
- API tests passed: 9/9.
- Manual HTTP CRUD and integration flows passed.
- Frontend browser flow verified.
- Frontend production build passed.
- Repository committed and pushed to GitHub.

### Milestone 2 — AKS Development deployment

Status: **Next**

- Inspect current AKS cluster and available capacity.
- Confirm namespace/resource state before application deployment.
- Containerize frontend, API, and maintenance service.
- Build and validate images locally.
- Verify ACR availability/permissions.
- Push images to ACR.
- Create the `dev` namespace if it does not already exist.
- Deploy the three application components.
- Validate Kubernetes Service discovery and health probes.
- Validate the application flow in AKS.

### Milestone 3 — Database and external routing

Status: **Not started**

- Provision/verify Azure SQL.
- Validate API-to-Azure-SQL connectivity.
- Configure application Secrets/ConfigMaps.
- Implement and validate Ingress.
- Validate Application Gateway integration.
- Validate HTTPS/SSL.

### Milestone 4 — GitHub Actions CI/CD

Status: **Planned after Development deployment**

Target pipeline:

```text
Pull request / push
        ↓
CI
 ├── install dependencies
 ├── run tests
 ├── frontend build
 └── container build validation
        ↓
Build immutable images
        ↓
Push to ACR
        ↓
Deploy to dev
        ↓
Smoke tests
        ↓
Controlled promotion to qa
        ↓
Approval gate
        ↓
Promotion to prod
```

Because the AKS API is intended to be private, runner connectivity must be designed and validated. A self-hosted GitHub Actions runner inside the Azure network is the initial option under consideration.

## Definition of done

A milestone is complete only when the relevant behavior has been directly tested and documented. Planned architecture, generated manifests, or configuration files are not treated as evidence of deployment.

## Documentation rule

The project documentation distinguishes between:

- **Verified** — directly observed through commands/tests against the relevant environment.
- **Planned** — intended architecture or next work.
- **Not yet verified** — expected capability that has not been tested.

This prevents the project from claiming that QA, Production, Azure SQL, Ingress, Application Gateway, HTTPS, or CI/CD are complete before they actually work.
