# Phase 1 — Architecture

## Architectural Goal

Build a full-stack application on a single AKS cluster with three isolated Kubernetes namespaces (`dev`, `qa`, `prod`). The application is externally exposed through one Application Gateway and Kubernetes Ingress using path-based routing.

## High-Level Architecture

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

## Application Components

### Frontend

- React
- HTML
- CSS
- Served from a container.
- Environment-specific application code/configuration for `dev`, `qa`, and `prod`.

### Node.js Backend

Primary REST/API and application business layer.

Responsibilities will include:

- API endpoints
- Application/business logic
- Database operations where appropriate
- Communication with the Python service where required

### Python Backend

A separate service with a clearly defined responsibility such as analytics, data processing, or another specialized operation. It should not exist only as a duplicate backend.

### Database

Azure SQL Database (PaaS). SQL is managed by Azure and is not run as a database container in AKS.

## Environment Model

One AKS cluster contains three namespaces:

```text
dev
qa
prod
```

Each environment has its own application code as required by the project specification.

Each namespace should contain only the resources belonging to that environment.

## Service Exposure

Application services should normally use Kubernetes `ClusterIP` Services.

No individual React, Node.js, or Python Service should receive a public IP unless a specific requirement makes it necessary.

External traffic should enter through Application Gateway and then be routed through the Kubernetes Ingress layer.

## Path-Based Routing

The target public structure is:

```text
https://<domain>/dev/*
https://<domain>/qa/*
https://<domain>/prod/*
```

Within each environment:

```text
/<environment>/          -> React frontend
/<environment>/api/      -> Node.js API
/<environment>/python/   -> Python service
```

The exact URL rewrite/strip-prefix behavior will be selected during implementation so that the applications remain environment-agnostic.

## Security Boundaries

- AKS API server should be private.
- Application Gateway is the intended public entry point.
- Backend Kubernetes Services should remain internal.
- Secrets must never be committed to GitHub.
- Non-sensitive configuration belongs in ConfigMaps.
- Sensitive configuration belongs in Secrets and, where appropriate, Azure Key Vault integration.
- Least-privilege Azure and Kubernetes access should be used.

## Resource Strategy

The project is constrained by an Azure for Students subscription. The initial AKS cluster should use the smallest viable node configuration that can run all required workloads.

The three environments should initially use one replica per workload unless testing demonstrates that more capacity is required.

Resource requests and limits will be defined for workloads to avoid uncontrolled resource consumption.

## Phase Separation

Phase 1 is intentionally manual:

```text
Build -> Containerize -> Push to ACR -> Deploy to AKS -> Test
```

Phase 2 introduces GitHub Actions and automated deployment only after the infrastructure and application are proven to work.

## Architectural Decisions to Validate

Before provisioning, confirm:

- [ ] Private AKS is supported in the selected region/subscription.
- [ ] Application Gateway and selected Kubernetes Ingress integration are supported.
- [ ] The required Application Gateway tier is compatible with the project and Student subscription.
- [ ] The selected AKS networking model fits the available IP quota.
- [ ] Azure SQL networking can be implemented within the available subscription constraints.
- [ ] Phase 2 runner connectivity to private AKS can be implemented without violating the Student resource limits.