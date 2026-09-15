# Project Azure AKS

Azure + Kubernetes + DevOps application project.

## Project Objective

Build a full-stack application and deploy it to Azure Kubernetes Service (AKS) using best practices while respecting Azure for Students subscription limits.

## Technology Stack

- Frontend: React / Vite
- API: Node.js / Express
- Maintenance service: Python / FastAPI
- Database: Azure SQL Database (PaaS)
- Container platform: Azure Kubernetes Service (AKS)
- Container registry: Azure Container Registry (ACR)
- Routing: Kubernetes Ingress with path-based routing
- External entry point: Azure Application Gateway
- Security: HTTPS / SSL
- Source control: GitHub
- CI/CD: GitHub Actions (Phase 2)

## Environment Strategy

The project will use **one application codebase** and environment-specific configuration rather than maintaining three separate application codebases.

The target AKS model remains a single cluster with three namespaces:

- `dev`
- `qa`
- `prod`

The same versioned application artifacts should be promoted between environments, with environment-specific configuration supplied through Kubernetes ConfigMaps/Secrets and GitHub Actions deployment inputs. QA and Production will not be created as separate source trees merely to represent environments.

## External Routing

One Application Gateway is the target public entry point, with path-based routing:

```text
https://<domain>/dev/*
https://<domain>/qa/*
https://<domain>/prod/*
```

Kubernetes Ingress will route traffic to the appropriate services inside each namespace. Application services should remain internal and should not receive unnecessary public IPs.

## Phase 1 — Infrastructure and Application Validation

Phase 1 focuses on building and validating the infrastructure and application before introducing CI/CD.

Current sequence:

1. Verify Azure for Students quotas and regional availability. **Completed for the current baseline.**
2. Design VNet, subnets, IP allocation, DNS, and private AKS networking.
3. Create/verify the Azure resource group. **Completed.**
4. Create/verify Azure Container Registry.
5. Create/verify the AKS cluster. **Completed.**
6. Validate the application locally in Development mode. **Completed.**
7. Containerize the frontend, Node.js API, and Python maintenance service.
8. Push images to ACR.
9. Deploy the application manually to the AKS Development namespace.
10. Configure ConfigMaps for non-sensitive configuration.
11. Configure Secrets for sensitive configuration.
12. Configure Azure SQL Database connectivity.
13. Configure Kubernetes Ingress with path-based routing.
14. Configure Application Gateway as the public HTTPS entry point.
15. Configure SSL/HTTPS.
16. Perform end-to-end AKS validation.
17. Document decisions, commands, problems, fixes, and validation results.

### Phase 1 Definition of Done

- AKS is healthy.
- Development application workloads are healthy.
- Required deployments and services are healthy.
- ConfigMaps are working.
- Secrets are handled securely and are not committed to Git.
- Application-to-database connectivity works.
- Path-based Ingress routing works.
- Application Gateway exposes the application externally.
- HTTPS/SSL works.
- End-to-end application flow is verified.

QA and Production namespaces are promotion targets, not separate application codebases. They should be introduced only after the Development deployment is stable.

## Phase 2 — GitHub Actions / CI/CD

CI/CD will be introduced after the Development AKS deployment baseline is stable.

Target flow:

```text
GitHub
  ↓
GitHub Actions
  ↓
Build + Test
  ↓
Build container images
  ↓
Push immutable images to ACR
  ↓
Deploy to AKS Development
  ↓
Smoke / health validation
  ↓
Promote same artifacts/configuration model to QA
  ↓
Approval / promotion gate
  ↓
Promote to Production
```

Because the target AKS cluster is private, the CI/CD runner must have network access to the private AKS API. A self-hosted GitHub Actions runner inside the Azure network is the initial architecture under consideration and will be validated against the Student subscription constraints.

## Current Status

**Application baseline complete; DevOps/AKS application deployment is next.**

### Verified locally — 2026-09-15

The AutoCare application has been built and committed to GitHub under `apps/autocare/`.

Verified Development baseline:

- React/Vite frontend loads at `/autocare/`.
- Express API runs at `/api`.
- Node.js API uses the Development in-memory repository by default.
- FastAPI maintenance service runs locally and responds to health/analysis requests.
- Express successfully calls the FastAPI maintenance-analysis endpoint over HTTP.
- API test suite: **9 passed, 0 failed**.
- Customer CRUD was verified.
- Vehicle, service-center, service-type, and booking resource operations were verified.
- Full customer → vehicle → service center → service type → booking flow was verified.
- Maintenance-analysis flow through Express → FastAPI was verified.
- Frontend Dashboard and Maintenance pages were verified against live API data.
- Frontend production build passed.
- `git diff --check` passed.
- Azure SQL was **not** exercised in this local Development baseline.

See `docs/APPLICATION_VERIFICATION.md` for the complete test/verification record and `apps/autocare/README.md` for application-level setup details.

### Verified AKS baseline

- Resource group: `rg-azure-aks`
- AKS cluster: `aks-azure-project`
- Region: `centralindia`
- Kubernetes version: `1.35.7`
- Two AKS nodes are `Ready`.
- System pods, services, and deployments have been inspected and were running/available at verification time.
- No application workloads or Kubernetes Ingress have yet been recorded as deployed.

See `docs/AKS_VERIFIED_STATE.md` for the verified cluster state.

### Next DevOps milestone

**Validate the existing Development AKS environment, then containerize and deploy AutoCare to Development before designing the complete GitHub Actions CI/CD pipeline.**

We will not claim QA, Production, Azure SQL, ACR, Ingress, Application Gateway, HTTPS, or CI/CD completion until each is directly verified.

## Subscription Constraints

Azure for Students limits such as vCPU/core quotas, public IP quotas, networking limits, regional availability, and service availability must be verified before provisioning. Infrastructure decisions will be based on the actual subscription quotas rather than assumed defaults.

Current observations:

- Primary region: **Central India (`centralindia`)**.
- Regional vCPU quota observed: **4 vCPUs**, current usage 0 at the earlier quota check.
- Standard public IPv4 quota observed in Central India: **3**, current usage 0 at the earlier quota check.
- Quota increase controls appear in the portal, but the Azure for Students subscription may restrict quota adjustments; do not assume an increase will be approved.
- AKS portal presets are documented separately in `docs/AKS_CLUSTER_PRESETS.md`.
- The four portal presets should not be deployed blindly because their current default node pools are much larger than our student-subscription quota allows.

## Documentation

Detailed documentation is maintained under `docs/` as the project progresses.

Key documents:

- `docs/PROJECT.md` — requirements, scope, milestones, and decisions
- `docs/ARCHITECTURE.md` — application and Azure architecture
- `docs/NETWORKING.md` — VNet, subnets, IP allocation, DNS, and connectivity
- `docs/AKS_GENERAL_KNOWLEDGE.md` — general AKS/Kubernetes learning and reference material
- `docs/AKS_CLUSTER_PRESETS.md` — AKS portal presets, purposes, costs, and selection guidance
- `docs/AKS_VERIFIED_STATE.md` — verified AKS cluster, nodes, system pods, services, deployments, and Ingress state
- `docs/AKS_NODE_RESOURCE_GROUP.md` — AKS node resource group concepts and project notes
- `docs/AKS_RESOURCE_GROUPS_AND_MONITORING.md` — resource group and monitoring notes
- `docs/INFRASTRUCTURE.md` — Azure resources, current infrastructure state, and configuration
- `docs/INTEGRATIONS.md` — application and Azure integration notes
- `docs/APPLICATION_VERIFICATION.md` — complete local application tests and verification evidence
- `docs/CHANGELOG.md` — chronological project changes
