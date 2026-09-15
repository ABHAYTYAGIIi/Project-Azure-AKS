# Architecture

## Architectural Goal

Build and operate a full-stack AutoCare application on a single AKS cluster with environment isolation through Kubernetes namespaces. The application source remains a **single codebase**; environment differences are supplied through deployment configuration rather than duplicated application trees.

The target external architecture uses one Application Gateway and Kubernetes Ingress with path-based routing.

## Application Architecture

```text
Browser
  |
  v
React / Vite frontend
  |
  | HTTP / REST
  v
Node.js / Express API
  |
  +--------------------> Azure SQL Database (target runtime provider)
  |
  | HTTP
  v
Python / FastAPI maintenance service
```

For the current local Development baseline, the database boundary uses the in-memory repository and the maintenance service runs as a separate local HTTP process. Azure SQL is a planned runtime dependency and has not yet been validated for this application.

## Target AKS Architecture

```text
                         Internet
                            |
                            | HTTPS / SSL
                            v
                 +------------------------+
                 | Application Gateway    |
                 | Public entry point     |
                 +-----------+------------+
                             |
                             v
                    Kubernetes Ingress
                    Path-based routing
                             |
             +---------------+---------------+
             |               |               |
             v               v               v
          /dev/*           /qa/*           /prod/*
             |               |               |
             v               v               v
          dev ns           qa ns           prod ns
             |               |               |
        +----+----+     +----+----+     +----+----+
        |    |    |     |    |    |     |    |    |
      React Node Python React Node Python React Node Python
             |               |               |
             +---------------+---------------+
                             |
                             v
                       Azure SQL PaaS
```

The diagram represents the target deployment architecture. It is not evidence that every target resource has already been deployed.

## Application Components

### Frontend

- React / Vite
- HTML / CSS
- Served from a container in AKS.
- Uses a configurable API base URL.
- Public application base is `/autocare/` in the current application.

### Node.js API

The Express application provides the primary REST API and business layer.

Responsibilities include:

- API endpoints
- Validation and domain logic
- Repository abstraction
- Customer, vehicle, booking, service-center, and service-type operations
- Maintenance-analysis orchestration
- HTTP communication with the Python maintenance service

### Python Maintenance Service

FastAPI provides the specialized maintenance-analysis capability.

The Node.js API calls this service over HTTP. The service returns a deterministic maintenance recommendation for the supplied vehicle/history input.

### Database

Azure SQL Database is the target managed relational database. SQL is not intended to run as a database container in AKS.

The Node.js API contains a repository boundary with an in-memory implementation for Development/local work and an Azure SQL implementation for the SQL-backed runtime.

## Environment Model

One AKS cluster is intended to contain:

```text
namespace: dev
namespace: qa
namespace: prod
```

There is **one source tree** for the application. The same tested container image should be promoted between environments where practical.

Environment-specific values should be supplied through deployment configuration:

- ConfigMaps for non-sensitive values.
- Kubernetes Secrets and/or Azure Key Vault integration for sensitive values.
- GitHub Actions environment variables/inputs for controlled promotion.

Examples of values that may vary by environment include database endpoints, maintenance-service URLs, public base paths, replica counts, resource limits, and feature/configuration flags.

QA and Production are therefore deployment environments, not separate application codebases.

## Service Exposure

Application services should normally use Kubernetes `ClusterIP` Services.

No individual React, Node.js, or Python Service should receive a public IP unless a specific requirement makes it necessary.

External traffic should enter through Application Gateway and then be routed through the Kubernetes Ingress layer.

The Python maintenance service should remain internal to the cluster because it is called by the Node.js API rather than directly by browsers.

## Path-Based Routing

The target public structure is:

```text
https://<domain>/dev/*
https://<domain>/qa/*
https://<domain>/prod/*
```

Within each environment, the intended public application paths are conceptually:

```text
/<environment>/          -> React frontend
/<environment>/api/      -> Node.js API
```

The Python service is an internal service-to-service endpoint and does not need a public route.

Exact URL rewrite/strip-prefix behavior will be selected during implementation so that the application can run from the same image in each namespace.

## Security Boundaries

- AKS API server should be private where supported by the final design.
- Application Gateway is the intended public entry point.
- Backend Kubernetes Services should remain internal.
- Secrets must never be committed to GitHub.
- Non-sensitive configuration belongs in ConfigMaps.
- Sensitive configuration belongs in Secrets and, where appropriate, Azure Key Vault integration.
- Least-privilege Azure and Kubernetes access should be used.

## Resource Strategy

The project is constrained by an Azure for Students subscription. The initial cluster should use the smallest viable node configuration that can run the required workloads.

Start with one replica per application workload unless testing demonstrates that more capacity is required. Define CPU and memory requests/limits for workloads.

## Deployment Strategy

Phase 1 establishes a manual Development deployment first:

```text
Build -> Test -> Containerize -> Push to ACR -> Deploy to AKS dev -> Validate
```

Phase 2 introduces GitHub Actions:

```text
GitHub
  -> CI: install / test / build
  -> build immutable container images
  -> push images to ACR
  -> deploy to dev
  -> smoke test
  -> controlled promotion to qa
  -> controlled promotion to prod
```

The same application artifacts should be promoted rather than rebuilt differently for each environment.

## Current Verified Boundary

As of 2026-09-15:

- The AutoCare source tree is committed under `apps/autocare/`.
- The local Development application flow is verified.
- The API test suite has 9 passing tests.
- The frontend production build has passed.
- AKS infrastructure is provisioned and verified.
- No AutoCare application workload has yet been verified as deployed to AKS.
- No Kubernetes Ingress for AutoCare has yet been verified.
- Azure SQL application connectivity has not yet been verified.
- GitHub Actions CI/CD has not yet been implemented.

## Architectural Decisions to Validate

- [ ] Confirm the final AKS network configuration.
- [ ] Confirm ACR availability and permissions.
- [ ] Containerize and validate all three application components.
- [ ] Deploy the Development namespace and verify service-to-service connectivity.
- [ ] Validate Azure SQL connectivity from the deployed API.
- [ ] Select and validate the Ingress/Application Gateway integration.
- [ ] Validate HTTPS/SSL.
- [ ] Determine the safest GitHub Actions runner/network model for private AKS.
- [ ] Define promotion and approval controls for QA and Production.
