# Azure AutoCare — Current Architecture

> **Source of truth:** This document describes the current verified/rebuilt architecture. Older design alternatives remain historical and must not override the state below.

## 1. Current Azure Architecture

| Layer | Current state |
|---|---|
| Resource group | rg-azure-aks |
| Region | Central India |
| VNet | vnet-azure-project — 10.20.0.0/16 |
| AKS | aks-azure-project |
| AKS API | **Private** |
| AKS networking | Azure CNI Overlay |
| Kubernetes | **1.35.8** verified current version |
| ACR | Three environment-specific Premium registries |
| SQL | sql-azure-project.database.windows.net |
| Key Vault | kv-azure-aks-project |
| Runner VM | vm-github-runner |
| GitHub runners | Self-hosted runners inside the Azure VNet |

## 2. Network Layout

    10.20.0.0/16
    |
    +-- snet-appgw             10.20.0.0/24
    +-- snet-aks               10.20.1.0/24
    +-- PrivateEndpointSubnet  10.20.2.0/24
    +-- snet-runner            10.20.3.0/24
    +-- DNSResolverInbound     10.20.254.0/28
    +-- GatewaySubnet          10.20.255.0/27

The VNet uses the private DNS resolver path. The inbound resolver endpoint is 10.20.254.4.

Shared private DNS zones include:

- privatelink.azurecr.io
- privatelink.database.windows.net
- privatelink.vaultcore.azure.net

Private endpoints are integrated with their corresponding DNS zones.

## 3. AKS Control Plane and Identity

Verified AKS settings:

    privateCluster = true
    localAccountsDisabled = true
    networkPlugin = azure
    networkPluginMode = overlay
    oidcIssuerProfile = true
    workloadIdentity = true
    kubernetesVersion = 1.35.8

Microsoft Entra integration is managed.

Azure RBAC for Kubernetes is disabled. Kubernetes RBAC is the authorization layer.

The configured administrator group object ID is:

    09f59b55-0f25-424b-a86f-d3233c48901e

The runner VM uses its system-assigned managed identity for Azure authentication. Private kubectl administration occurs from the VNet-connected VM/self-hosted runner.

## 4. Pod Networking

The cluster uses **Azure CNI Overlay**.

Current verified conceptual ranges include:

- Pod CIDR: 10.244.0.0/16
- Service CIDR: 10.0.0.0/16

Azure CNI Overlay keeps Pod addressing separate from the Azure VNet node subnet, conserving VNet IP space.

Do not confuse:

1. AKS API public/private access
2. Pod IPAM/CNI model
3. network policy
4. Azure load balancing

They are separate architectural decisions.

## 5. Private Resource Connectivity

### Azure Container Registry

Current registries:

    acrautocaredev01.azurecr.io
    acrautocareuat01.azurecr.io
    acrautocareprod01.azurecr.io

Each has a private endpoint in PrivateEndpointSubnet and uses the shared ACR private DNS zone.

The old acrazureproject.azurecr.io registry is legacy and must not be used for new configuration.

### Azure SQL

SQL server:

    sql-azure-project.database.windows.net

Databases:

- sqldb-autocare-dev
- sqldb-autocare-uat
- sqldb-autocare-prod

The SQL server uses a private endpoint and private DNS.

### Key Vault

Vault:

    kv-azure-aks-project

Private endpoint:

    PE-KV-AZURE-PROJECT

The vault uses private/restricted network access and Azure RBAC.

Application workloads should receive only the Key Vault permissions they need, such as Key Vault Secrets User, rather than administrative rights.

## 6. Runner Architecture

    Developer/admin workstation
              |
              | SSH
              v
    vm-github-runner
              |
              +-- private DNS
              +-- private AKS API
              +-- private ACR
              +-- private SQL
              +-- private Key Vault
              |
              +-- GitHub self-hosted runners

The VM has a public IP for SSH access, but its workload/admin network path is through the project VNet.

Three GitHub runner services are installed for the three application repositories:

- frontend
- API
- maintenance service

## 7. Application Architecture

    Browser
       |
       v
    React/Vite frontend
       |
       | /autocare/api
       v
    Node.js / Express API
       |
       +--> Azure SQL
       |
       +--> Python/FastAPI maintenance service

The maintenance service is internal to the cluster and is not intended to be directly exposed to browsers.

Frontend browser traffic uses the relative /autocare/api path. Nginx/Ingress/service routing provides the environment-specific backend path.

## 8. Environments

The current delivery environments are:

    dev / uat / prod

Do not use qa as the current environment name. Older Project-Azure-AKS documents used QA; that is historical.

Application repositories use environment-specific Kubernetes directories:

    k8s/
    ├── dev/
    ├── uat/
    └── prod/

## 9. Git and CI/CD Architecture

The application repositories use:

    feature -> PR -> dev -> PR -> uat -> PR -> main -> prod approval

Production uses a GitHub Environment approval gate.

Azure authentication uses GitHub OIDC and user-assigned managed identity rather than stored Azure client secrets.

The deployment workflow separates:

1. application validation
2. offline Kubernetes validation
3. image build
4. deployment
5. independent verification

The private AKS API is why the deployment runners are self-hosted inside the Azure VNet.

## 10. Current Verified Boundaries

Verified:

- private AKS cluster exists
- AKS nodes are Ready
- Azure CNI Overlay is configured
- OIDC and Workload Identity are enabled
- local Kubernetes accounts are disabled
- private ACRs are provisioned
- private SQL endpoint is provisioned
- private Key Vault endpoint is provisioned
- VNet private DNS resolver path is provisioned
- runner VM and self-hosted runners are operational
- application promotion workflows have completed successfully for frontend, API, and maintenance service

Do not infer that a resource is currently working merely because an older document says it was planned or because a resource exists in Azure. Use direct verification for runtime claims.

## 11. Documentation Ownership

This repository is now the project documentation home for:

- architecture
- Azure/AKS infrastructure decisions
- troubleshooting
- cross-repository operational incidents

The three application repositories remain the source of truth for application code and application-specific implementation documents.

See:

- docs/TROUBLESHOOTING.md — consolidated incident record
- docs/NETWORKING.md — networking concepts and current architecture notes
- docs/AKS_VERIFIED_STATE.md — verified cluster snapshot; refresh it whenever a new direct cluster verification is performed
