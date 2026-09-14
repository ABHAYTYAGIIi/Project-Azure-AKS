# Project Azure AKS

Azure + Kubernetes + DevOps application project.

## Project Objective

Build a full-stack application and deploy it to Azure Kubernetes Service (AKS) using best practices while respecting Azure for Students subscription limits.

## Technology Stack

- Frontend: HTML, CSS, React
- Backend: Node.js
- Backend service: Python
- Database: Azure SQL Database (PaaS)
- Container platform: Azure Kubernetes Service (AKS)
- Container registry: Azure Container Registry (ACR)
- Routing: Kubernetes Ingress with path-based routing
- External entry point: Azure Application Gateway
- Security: HTTPS / SSL
- Source control: GitHub
- CI/CD: GitHub Actions (Phase 2)

## Environments

One AKS cluster will host three Kubernetes namespaces:

- `dev`
- `qa`
- `prod`

The project requirement is to maintain three different application codebases for the three environments. The application architecture and Kubernetes structure will remain consistent while the environment-specific code is maintained separately.

## External Routing

One Application Gateway will expose all three environments using a single public entry point and path-based routing:

```text
https://<domain>/dev/*
https://<domain>/qa/*
https://<domain>/prod/*
```

Kubernetes Ingress will route traffic to the appropriate services inside each namespace. Application services should remain internal and should not receive unnecessary public IPs.

## Phase 1 — Infrastructure and Manual Deployment

The first phase focuses on building and validating the infrastructure and application before introducing CI/CD.

Planned sequence:

1. Verify Azure for Students quotas and regional availability.
2. Design VNet, subnets, IP allocation, DNS, and private AKS networking.
3. Create the Azure resource group.
4. Create Azure Container Registry.
5. Create the private AKS cluster using a quota-conscious configuration.
6. Create `dev`, `qa`, and `prod` namespaces.
7. Build the three application codebases.
8. Containerize the frontend, Node.js, and Python components.
9. Deploy the applications manually to AKS.
10. Configure ConfigMaps for non-sensitive configuration.
11. Configure Secrets for sensitive configuration.
12. Configure Azure SQL Database connectivity.
13. Configure Kubernetes Ingress with path-based routing.
14. Configure Application Gateway as the public HTTPS entry point.
15. Configure SSL/HTTPS.
16. Perform end-to-end testing.
17. Document decisions, commands, problems, fixes, and validation results.

### Phase 1 Definition of Done

- AKS is healthy.
- `dev`, `qa`, and `prod` namespaces are operational.
- Required deployments and services are healthy.
- ConfigMaps are working.
- Secrets are handled securely and are not committed to Git.
- Application-to-database connectivity works.
- Path-based Ingress routing works for all environments.
- Application Gateway exposes the application externally.
- HTTPS/SSL works.
- End-to-end application flow is verified.

## Phase 2 — GitHub Actions / CI/CD

CI/CD will be introduced only after Phase 1 is stable.

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
Push images to ACR
  ↓
Deploy to private AKS
  ↓
Ingress
  ↓
Application Gateway
  ↓
HTTPS
```

Because AKS is planned as a private cluster, the CI/CD runner must have network access to the private AKS API. A self-hosted GitHub Actions runner inside the Azure network is the initial architecture under consideration.

## Best-Practice Principles

- Least-privilege access.
- No credentials or secrets in source code.
- No unnecessary public IPs.
- Backend services remain internal where possible.
- Private AKS API endpoint where supported and compatible with subscription constraints.
- Kubernetes resource requests and limits.
- Readiness and liveness probes.
- Consistent naming and labels.
- Environment isolation through namespaces.
- Infrastructure sized around actual Azure for Students quotas.
- Avoid unnecessary enterprise complexity.
- Phase 1 and Phase 2 remain clearly separated.

## Subscription Constraints

Azure for Students limits such as vCPU/core quotas, public IP quotas, networking limits, regional availability, and service availability must be verified before provisioning. Infrastructure decisions will be based on the actual subscription quotas rather than assumed defaults.

Current observations:

- Primary region under consideration: **Central India (`centralindia`)**.
- Regional vCPU quota observed: **4 vCPUs**, current usage 0.
- Standard public IPv4 quota observed in Central India: **3**, current usage 0.
- Quota increase controls appear in the portal, but the Azure for Students subscription may restrict quota adjustments; do not assume an increase will be approved.
- AKS portal presets are documented separately in `docs/AKS_CLUSTER_PRESETS.md`.
- The four portal presets should not be deployed blindly because their current default node pools are much larger than our student-subscription quota allows.

## Documentation

Detailed documentation will be maintained under `docs/` as the project progresses.

Planned documents:

- `docs/PROJECT.md` — requirements, scope, milestones, and decisions
- `docs/ARCHITECTURE.md` — application and Azure architecture
- `docs/NETWORKING.md` — VNet, subnets, IP allocation, DNS, and connectivity
- `docs/KUBERNETES.md` — AKS, namespaces, deployments, services, ConfigMaps, Secrets, and Ingress
- `docs/AKS_CLUSTER_PRESETS.md` — AKS portal presets, purposes, costs, and selection guidance
- `docs/SECURITY.md` — identity, access, secrets, exposure, and security decisions
- `docs/INFRASTRUCTURE.md` — Azure resources and configuration
- `docs/TROUBLESHOOTING.md` — problems and solutions
- `docs/CHANGELOG.md` — chronological project changes

## Current Status

**Phase 1 — Planning / Infrastructure preparation**

No Azure infrastructure has been provisioned yet.
