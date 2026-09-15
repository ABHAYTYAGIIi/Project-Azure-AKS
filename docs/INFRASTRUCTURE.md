# Phase 1 — Azure Infrastructure

## Current State

Azure infrastructure has now been provisioned and the AKS cluster has been successfully validated.

### Verified infrastructure state

- Resource group: `rg-azure-aks`
- AKS cluster: `aks-azure-project`
- Region: `centralindia`
- Kubernetes version: `1.35.7`
- Two AKS nodes are present and both are `Ready`.
- `kubectl` access is configured and the active context is `aks-azure-project`.
- AKS system pods, services, and deployments were successfully inspected.
- No Kubernetes Ingress resource is currently deployed.

Detailed verified AKS/Kubernetes state is maintained in `docs/AKS_VERIFIED_STATE.md`.

## Planned / Remaining Azure Resources

| Resource | Purpose | Current project status |
|---|---|---|
| Resource Group | Logical management boundary | Provisioned and verified |
| VNet | Private network boundary | Verify against deployed configuration |
| Application Gateway | External application entry point, HTTPS/SSL, routing integration | Planned / not yet verified |
| Public IP | Application Gateway public endpoint | Planned / not yet verified |
| AKS | Kubernetes compute/control platform | Provisioned and verified |
| Azure Container Registry | Store application container images | Planned / verify when provisioned |
| Azure SQL Database | Managed relational database | Planned / verify when provisioned |

Additional resources will only be added when a concrete requirement exists.

## Quota-First Provisioning

Because the subscription is Azure for Students, infrastructure decisions continue to be based on actual subscription limits rather than assumed defaults.

Before adding additional Azure resources, verify:

- Regional vCPU quota and current usage
- Public IP quota and current usage
- Available VM SKUs
- Regional availability of required networking features
- Regional availability of Application Gateway and the selected Ingress integration
- Relevant networking/IP limits
- Available Azure SQL options

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

The diagram remains the target architecture. It should not be interpreted as proof that every target resource has already been deployed.

## Cost/Resource Principles

- Prefer the smallest viable compute SKU.
- Start workloads with the minimum viable replica count.
- Define CPU and memory requests/limits.
- Avoid unnecessary public IP addresses.
- Avoid unnecessary always-on Azure resources.
- Stop/delete temporary resources when they are no longer needed.
- Do not provision optional enterprise components merely for architectural appearance.

## Provisioning / Validation Order

1. Inspect subscription quotas.
2. Select region based on quotas and required service availability.
3. Finalize VNet/subnet/IP plan.
4. Create Resource Group.
5. Create VNet and required subnets.
6. Create Azure Container Registry if required.
7. Create AKS using the finalized networking plan.
8. Validate AKS connectivity and health. **Completed.**
9. Create namespaces.
10. Deploy application workloads.
11. Configure Azure SQL connectivity.
12. Configure Ingress.
13. Configure Application Gateway integration.
14. Configure HTTPS/SSL.
15. Perform end-to-end tests.

## Phase 1 Rule

Do not move to the next infrastructure layer until the previous layer has been validated. This reduces troubleshooting scope and prevents multiple unknown failures from being introduced simultaneously.
