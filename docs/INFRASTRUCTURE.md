# Phase 1 — Azure Infrastructure

## Current State

No Azure infrastructure has been provisioned as part of this project yet.

This document records the intended infrastructure and the checks required before provisioning.

## Planned Azure Resources

| Resource | Purpose | Public exposure |
|---|---|---|
| Resource Group | Logical management boundary | No |
| VNet | Private network boundary | No |
| Application Gateway | External application entry point, HTTPS/SSL, routing integration | Yes |
| Public IP | Application Gateway public endpoint | Yes |
| AKS | Kubernetes compute/control platform | API intended to be private |
| Azure Container Registry | Store application container images | No direct application exposure |
| Azure SQL Database | Managed relational database | Restricted |

Additional resources will only be added when a concrete requirement exists.

## Quota-First Provisioning

Because the subscription is Azure for Students, the following values must be obtained from the actual subscription before provisioning:

- Regional vCPU quota and current usage
- Public IP quota and current usage
- Available VM SKUs
- Regional availability of AKS and required networking features
- Regional availability of Application Gateway and the selected Ingress integration
- Any relevant networking/IP limits
- Available Azure SQL options

No assumed quota value should be recorded as fact until it is verified in the subscription.

## Target Resource Relationship

```text
Resource Group
|
+-- VNet
|   +-- Application Gateway subnet
|   +-- AKS subnet
|   +-- Optional private-endpoint resources if required
|
+-- Application Gateway
|   +-- Public IP
|
+-- AKS
|   +-- dev namespace
|   +-- qa namespace
|   +-- prod namespace
|
+-- Azure Container Registry
|
+-- Azure SQL Database
```

## Cost/Resource Principles

- Prefer the smallest viable compute SKU.
- Start with one AKS node if it can satisfy the workload and assignment requirements.
- Start workloads with one replica per environment/component.
- Define CPU and memory requests/limits.
- Avoid unnecessary public IP addresses.
- Avoid unnecessary always-on Azure resources.
- Stop/delete temporary resources when they are no longer needed.
- Do not provision optional enterprise components merely for architectural appearance.

## Provisioning Order

1. Inspect subscription quotas.
2. Select region based on quotas and required service availability.
3. Finalize VNet/subnet/IP plan.
4. Create Resource Group.
5. Create VNet and required subnets.
6. Create Azure Container Registry.
7. Create private AKS using the finalized networking plan.
8. Validate AKS connectivity and health.
9. Create namespaces.
10. Deploy application workloads.
11. Configure Azure SQL connectivity.
12. Configure Ingress.
13. Configure Application Gateway integration.
14. Configure HTTPS/SSL.
15. Perform end-to-end tests.

## Phase 1 Rule

Do not move to the next infrastructure layer until the previous layer has been validated. This reduces troubleshooting scope and prevents multiple unknown failures from being introduced simultaneously.