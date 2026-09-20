# Current Azure Infrastructure & GitHub Reconnection Audit

**Purpose:** Preserve the current Azure/AKS architecture and every known GitHub-to-Azure/application connection before the current Azure infrastructure is deleted and rebuilt.

**Status:** Snapshot of the current environment as audited on 2026-09-20.

> This document is a rebuild reference, not a Terraform/Bicep source of truth. Values marked **CURRENT** describe the existing environment. Values marked **RECREATE** must be recreated or revalidated after the new infrastructure is built.

---

## 1. Scope

This audit covers:

- Azure subscription, resource groups and AKS
- VNet/subnets/private networking
- ACR
- Key Vault
- Azure SQL
- Private Endpoints and Private DNS
- AKS managed identities
- Workload Identity and Key Vault CSI
- Application Gateway/ingress
- GitHub Actions OIDC
- Self-hosted GitHub runner
- GitHub Actions secrets/variables referenced by all three application repositories
- Kubernetes manifests and service-to-service connections
- Repository IDs, branches, environments and runner labels that participate in the deployment flow

Application repositories:

| Repository | GitHub repository ID | Image name | Runner label |
|---|---:|---|---|
| ABHAYTYAGIIi/autocare-frontend | 1371226897 | autocare-frontend | autocare-frontend |
| ABHAYTYAGIIi/autocare-api | 1371269400 | autocare-api | autocare-api |
| ABHAYTYAGIIi/autocare-maintenance-service | 1371271587 | autocare-maintenance-service | autocare-maintenance |

GitHub owner ID: **98732531**

---

# 2. Current Azure subscription and resource groups

## Subscription

- Subscription ID: `ee76ed75-7d2d-42c0-a82a-6471ce616b36`
- Tenant ID: `a3c9a20a-5f7c-4023-a4a6-f0c1281063e2`

## Main resource group

- Resource group: `rg-azure-aks`

## AKS managed resource group

- `MC_rg-azure-aks_aks-azure-project_centralindia`

The AKS managed resource group contains Azure-managed resources/identities associated with the cluster and ingress/secret-provider infrastructure.

---

# 3. Current AKS

- Cluster: `aks-azure-project`
- Kubernetes version: `1.35.7`
- Current mode: **Private AKS**
- Node count: 2
- VM size: `Standard_D2s_v6`
- AKS Entra-managed
- Azure RBAC for Kubernetes: disabled
- Local Kubernetes accounts: disabled
- AKS admin group object ID: `09f59b55-0f25-424b-a86f-d3233c48901e`

## GitHub Actions Kubernetes access

GitHub Actions uses Entra authentication followed by `kubelogin`.

The GitHub Actions identity is:

- UAMI: `id-autocare-github-actions`
- Client ID: `f88027d1-9765-4f66-84f7-ae11a5c442e5`
- Service principal/object ID: `cdf1ce3b-18be-4dd7-b1d6-e73dae8eb4b7`

Kubernetes authorization is provided by:

- ClusterRole: `autocare-github-actions`
- RoleBindings in namespaces:
  - dev
  - uat
  - prod

The ClusterRole contains namespace-scoped permissions required by the current pipelines, including deployments, services, configmaps, serviceaccounts, ingresses, SecretProviderClasses, pods, pod logs, pod attach and HPAs.

**RECREATE:** AKS must receive the equivalent Kubernetes RBAC after rebuild.

---

# 4. Current VNet and subnets

VNet:

- Name: `vnet-azure-project`
- Address space: `10.20.0.0/16`

Subnets:

| Subnet | CIDR | Current purpose |
|---|---|---|
| snet-appgw | 10.20.0.0/24 | Application Gateway |
| snet-aks | 10.20.1.0/24 | AKS |
| PrivateEndpointSubnet | 10.20.2.0/24 | Private Endpoints |
| snet-runner | 10.20.3.0/24 | GitHub self-hosted runner VM |
| DNSResolverInbound | 10.20.254.0/28 | Private DNS Resolver inbound |
| GatewaySubnet | 10.20.255.0/27 | VPN/Network Gateway subnet |

PrivateEndpointSubnet:

- CIDR: `10.20.2.0/24`
- Private endpoint network policies: Disabled
- Provisioning state: Succeeded

---

# 5. Self-hosted GitHub Actions runner

VM:

- Name: `vm-github-runner`
- Private IP: `10.20.3.4`
- Subnet: `snet-runner`
- Admin user: `azureuser`
- Public IP: none
- Managed identity: none

Installed tools include:

- Docker
- kubectl
- kubelogin
- Azure CLI

The runner is inside the VNet. GitHub Actions itself is not directly entering the VNet from GitHub-hosted infrastructure. The GitHub job is executed by the self-hosted runner, and the runner has private network access to Azure resources.

**RECREATE:** The new runner must be registered with the labels:

- `autocare-frontend`
- `autocare-api`
- `autocare-maintenance`

Do **not** attach the GitHub Actions UAMI to the runner VM merely to make the pipeline work. The current design authenticates through GitHub OIDC.

---

# 6. Current Azure Container Registry

- ACR: `acrazureproject`
- Login server: `acrazureproject.azurecr.io`

Repositories currently used:

- `autocare-frontend`
- `autocare-api`
- `autocare-maintenance-service`
- `hello-world`
- `netshoot`

`netshoot:latest` exists and is used by pipeline health checks.

Runtime application images are private.

**RECREATE:** ACR must be recreated and the GitHub Actions identity must again receive ACR push permission.

---

# 7. Current Azure SQL

Server:

- `sql-azure-project.database.windows.net`

Databases:

- `sqldb-autocare-dev`
- `sqldb-autocare-uat`
- `sqldb-autocare-prod`

Current API connection settings in Kubernetes:

- Provider: `azure-sql`
- Port: `1433`
- User: `sqladmin`
- Encrypt: `true`
- Trust server certificate: `false`

The SQL password is **not stored in Git**. It is retrieved from Key Vault through the Secrets Store CSI/Workload Identity path.

**RECREATE:** If the SQL server name, database names or admin username changes, update the API ConfigMaps.

---

# 8. Current Key Vault

- Key Vault: `kv-azure-aks-project`

Secret used by the API:

- Secret object: `autocare-sql-password`

Application UAMI:

- UAMI: `id-autocare-app`
- Client ID: `037fe6d8-128e-4e44-bbda-2a910f758355`
- Principal ID: `a301234c-faf0-4280-99e3-c254f9b3cdbf`

Current role assignment:

- Role: **Key Vault Secrets User**
- Scope: `kv-azure-aks-project`

This identity has exactly the application Key Vault secret-read role observed during the audit.

---

# 9. Workload Identity + Secrets Store CSI flow

Current API flow:

```
autocare-api Pod
    |
    v
ServiceAccount: autocare-api
    |
    | azure.workload.identity/client-id
    v
id-autocare-app
    |
    | Key Vault Secrets User
    v
kv-azure-aks-project
    |
    v
autocare-sql-password
    |
    v
SecretProviderClass
    |
    v
Kubernetes Secret: autocare-api-secrets
    |
    v
DATABASE_PASSWORD
```

The API Deployment also uses:

- label: `azure.workload.identity/use: "true"`
- ServiceAccount: `autocare-api`
- Secrets Store CSI driver
- SecretProviderClass: `autocare-api-secrets`

The SecretProviderClass currently contains:

- provider: azure
- clientID: `037fe6d8-128e-4e44-bbda-2a910f758355`
- keyvaultName: `kv-azure-aks-project`
- tenantId: `a3c9a20a-5f7c-4023-a4a6-f0c1281063e2`
- objectName: `autocare-sql-password`
- objectType: `secret`
- generated Kubernetes secret: `autocare-api-secrets`
- generated key: `DATABASE_PASSWORD`

**RECREATE:** The new application UAMI client ID must be placed in both the SecretProviderClass and the ServiceAccount annotation.

---

# 10. AKS managed identities

## Main resource group: rg-azure-aks

| Identity | Client ID | Principal ID | Current purpose |
|---|---|---|---|
| aks-azure-project-identity | 3078efa1-9d70-4b37-a00d-4115cb176df7 | 1e9a133a-a270-46d3-b778-b9aba8f0a6e6 | AKS cluster identity |
| id-autocare-app | 037fe6d8-128e-4e44-bbda-2a910f758355 | a301234c-faf0-4280-99e3-c254f9b3cdbf | AutoCare workload → Key Vault |
| id-autocare-github-actions | f88027d1-9765-4f66-84f7-ae11a5c442e5 | cdf1ce3b-18be-4dd7-b1d6-e73dae8eb4b7 | GitHub Actions CI/CD |

## AKS managed resource group

| Identity | Client ID | Principal ID | Current purpose |
|---|---|---|---|
| aks-azure-project-agentpool | 77163a23-d305-4d13-af89-c807c7636e52 | ef5d2715-e4f2-4587-9911-772d92caa75a | AKS kubelet/agent pool |
| ingressapplicationgateway-aks-azure-project | 92cd5635-23e5-4c75-81a4-75b8fe8a1d06 | f429f1cf-b85c-4fab-a3ef-8f6c30349352 | Application Gateway/ingress |
| azurekeyvaultsecretsprovider-aks-azure-project | 459f37d7-0dee-483f-bb03-c12a6ae0b14a | 59124315-1959-4faa-810b-7e6996f5a611 | AKS Key Vault Secrets Provider infrastructure |
| id-appgw-keyvault | 2e33ab56-a642-40c3-ac3a-890c3542779a | 7cfe5d8c-aec6-4c49-b37d-68265fa24109 | Application Gateway → Key Vault integration |

The AKS kubelet identity observed in `az aks show` is:

- Client ID: `77163a23-d305-4d13-af89-c807c7636e52`
- Object ID: `ef5d2715-e4f2-4587-9911-772d92caa75a`

---

# 11. Private Endpoints

Current private endpoints in `PrivateEndpointSubnet`:

- `PE-ACR-AZURE-PROJECT`
- `PE-KV-AZURE-PROJECT`
- `PE-SQL-AZURE-PROJECT`

The ACR private endpoint currently has two IP configurations; Key Vault and SQL each have one. This is why the subnet inspection showed four IP configurations for three private endpoints.

**RECREATE:** Recreate the three private endpoint connections against the new ACR, Key Vault and SQL resources.

---

# 12. Private DNS

Main resource group DNS zones:

| Private DNS zone | Record sets observed | VNet links |
|---|---:|---:|
| privatelink.azurecr.io | 3 | 1 |
| privatelink.database.windows.net | 2 | 1 |
| privatelink.vaultcore.azure.net | 2 | 1 |

AKS managed resource group DNS zone:

- `2fb54672-d6e4-4a69-a2b6-2f8b7ba19de0.privatelink.centralindia.azmk8s.io`
- 2 record sets
- 1 VNet link

**RECREATE:** Private DNS zones/links must be recreated correctly if the private networking model is retained.

---

# 13. GitHub OIDC

Current GitHub OIDC provider:

- Issuer: `https://token.actions.githubusercontent.com`
- Audience: `api://AzureADTokenExchange`
- GitHub owner ID: `98732531`

The OIDC token belongs to the GitHub Actions job/runtime context temporarily. It is not stored inside the Azure UAMI.

The authentication sequence is:

```
GitHub Actions job
    |
    | requests OIDC token
    v
GitHub OIDC provider
    |
    | short-lived JWT
    v
Microsoft Entra ID
    |
    | validates federated identity credential
    v
id-autocare-github-actions
    |
    v
Azure access token / Azure permissions
```

---

# 14. Current GitHub repository IDs

These repository IDs are part of the immutable OIDC subject strings.

| Repository | ID |
|---|---:|
| autocare-frontend | 1371226897 |
| autocare-api | 1371269400 |
| autocare-maintenance-service | 1371271587 |

Do not replace repository IDs with repository names when recreating federated credentials.

Current subject pattern:

```
repo:ABHAYTYAGIIi@98732531/<repo>@<repo-id>:environment:<environment>
```

and:

```
repo:ABHAYTYAGIIi@98732531/<repo>@<repo-id>:ref:refs/heads/<branch>
```

Environments/branches currently used:

- dev
- uat
- main → prod

---

# 15. GitHub Actions secrets referenced

All three repositories reference:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Important:

- `AZURE_CLIENT_ID` points to the GitHub Actions UAMI and must change if that UAMI is recreated.
- `AZURE_TENANT_ID` remains the current tenant if the same Entra tenant is used.
- `AZURE_SUBSCRIPTION_ID` remains the current subscription if the same Azure subscription is used.

Actual secret values are intentionally not stored in this document.

---

# 16. GitHub Actions variables referenced

All three repositories use the following repository variables:

- `ACR_LOGIN_SERVER`
- `ACR_NAME`
- `AKS_CLUSTER_NAME`
- `AZURE_RESOURCE_GROUP`
- `IMAGE_NAME`

Current expected values:

### Frontend

```
IMAGE_NAME=autocare-frontend
```

### API

```
IMAGE_NAME=autocare-api
```

### Maintenance

```
IMAGE_NAME=autocare-maintenance-service
```

Current Azure-dependent values:

```
ACR_NAME=acrazureproject
ACR_LOGIN_SERVER=acrazureproject.azurecr.io
AKS_CLUSTER_NAME=aks-azure-project
AZURE_RESOURCE_GROUP=rg-azure-aks
```

These are the values that must be revalidated after the rebuild.

---

# 17. GitHub Actions pipeline structure

All three repositories use one environment-neutral workflow:

```
.github/workflows/pipeline.yaml
```

Pipeline:

1. Validate
2. Kubernetes Validation
3. Build Image
4. Deploy to AKS
5. Independent Verify

Branch mapping:

```
dev  -> dev
uat  -> uat
main -> prod
```

The workflow intentionally builds a fresh image per environment branch.

It does not use build-once/promote.

---

# 18. Workflow authentication details

Deployment jobs use:

```yaml
permissions:
  contents: read
  id-token: write
```

Azure login:

```yaml
uses: azure/login@v3
```

AKS authentication:

```bash
az aks get-credentials
kubelogin convert-kubeconfig -l azurecli
```

The kubeconfig is written under:

```
${RUNNER_TEMP}/kubeconfig
```

and cleanup is performed with `if: always()`.

The workflow does not store a static Kubernetes password or static ACR password.

---

# 19. Kubernetes deployment/image connection

The workflow constructs:

```
<ACR_LOGIN_SERVER>/<IMAGE_NAME>:<environment>-<GITHUB_SHA>
```

Example pattern:

```
acrazureproject.azurecr.io/autocare-api:prod-<SHA>
```

The Kubernetes manifests contain:

```
IMAGE_PLACEHOLDER
```

The workflow renders a temporary copy and replaces the placeholder before applying the manifest.

This keeps immutable image references out of the committed deployment YAML.

---

# 20. Application service-to-service connections

## Frontend → API

Frontend browser base:

```
/autocare/api
```

Nginx upstream:

```
http://autocare-api:3000
```

Kubernetes service name:

```
autocare-api
```

## API → Maintenance service

API ConfigMap:

```
MAINTENANCE_SERVICE_URL=http://autocare-maintenance-service:8001
```

Kubernetes service name:

```
autocare-maintenance-service
```

These are Kubernetes internal DNS names and do not need Azure hostnames.

---

# 21. Frontend ingress

Ingress class:

```
azure-application-gateway
```

Dev host:

```
dev.autocare.local
```

Dev SSL certificate annotation:

```
autocare-dev-tls
```

Dev also has SSL redirect enabled.

UAT and production currently do not specify an ingress host in the checked manifests.

**RECREATE/REVALIDATE:** The new Application Gateway/ingress controller must provide the expected ingress class and certificate integration.

---

# 22. Current Kubernetes application names

These names are important because the workflows and application-to-application DNS depend on them.

### Frontend

- Deployment: `autocare-frontend`
- Service: `autocare-frontend`

### API

- Deployment: `autocare-api`
- Service: `autocare-api`
- ServiceAccount: `autocare-api`
- SecretProviderClass: `autocare-api-secrets`
- generated Kubernetes Secret: `autocare-api-secrets`
- ConfigMap: `autocare-api-config`

### Maintenance

- Deployment: `autocare-maintenance-service`
- Service: `autocare-maintenance-service`

Namespaces:

- dev
- uat
- prod

---

# 23. Health checks used by CI/CD

Frontend:

```
http://autocare-frontend:8080/autocare/
```

API:

```
http://autocare-api:3000/api/health
```

Maintenance:

```
http://autocare-maintenance-service:8001/health
```

The temporary health-check pods use:

```
<ACR_LOGIN_SERVER>/netshoot:latest
```

Therefore `netshoot:latest` must exist in the new ACR or the verification stage will fail.

---

# 24. What must be recreated vs what should remain stable

## Must be recreated in Azure

- Resource group/resources
- VNet/subnets
- AKS
- ACR
- Key Vault
- SQL
- Private Endpoints
- Private DNS
- Application Gateway/ingress
- AKS managed identities
- GitHub Actions UAMI
- Application UAMI
- Workload Identity configuration
- Key Vault Secrets Provider
- Azure RBAC assignments
- Kubernetes RBAC
- OIDC federated credentials
- Runner VM and runner registration

## GitHub objects that should remain

- Repositories
- Repository IDs
- dev/uat/main branches
- GitHub Environments
- Environment approval rules
- Branch protection
- Workflow files
- GitHub Actions secret names
- GitHub Actions variable names
- Production approval model

## Values to update if Azure names change

- `AZURE_CLIENT_ID`
- `ACR_NAME`
- `ACR_LOGIN_SERVER`
- `AKS_CLUSTER_NAME`
- `AZURE_RESOURCE_GROUP`
- API `DATABASE_HOST`
- API `DATABASE_NAME`
- API `DATABASE_USER`
- API SecretProviderClass `clientID`
- API SecretProviderClass `keyvaultName`
- API ServiceAccount workload identity client ID
- Frontend App Gateway certificate name
- Frontend hostname if DNS changes

---

# 25. Pre-destruction checklist

Before deleting the current Azure environment:

- [ ] Capture GitHub repository variables and their current values.
- [ ] Record GitHub secret names; do not expose secret values in this repository.
- [ ] Record current OIDC federated credential subjects.
- [ ] Record Azure role assignments for all relevant identities.
- [ ] Record Kubernetes ClusterRole and RoleBindings.
- [ ] Record ACR repository names.
- [ ] Record Key Vault secret names.
- [ ] Record SQL database names and admin username.
- [ ] Record Application Gateway certificate names.
- [ ] Record DNS names.
- [ ] Record runner labels.
- [ ] Record the runner registration/recreation procedure.
- [ ] Preserve GitHub Environment protection rules.
- [ ] Preserve branch protection.

---

# 26. Post-rebuild validation

Run in this order:

1. Azure resources created.
2. Private DNS resolution verified from VNet.
3. ACR private access verified.
4. Key Vault private access verified.
5. SQL private access verified.
6. AKS reachable from self-hosted runner.
7. GitHub OIDC login succeeds.
8. ACR push succeeds.
9. AKS authentication succeeds.
10. Kubernetes RBAC permits required deployment operations.
11. Key Vault Workload Identity succeeds.
12. API receives `DATABASE_PASSWORD`.
13. API connects to SQL.
14. API reaches maintenance service.
15. Frontend reaches API.
16. Application Gateway reaches frontend.
17. CI/CD health checks pass.
18. Actual end-to-end application path passes for dev, UAT and prod.

---

# 27. Important distinction: Azure identity roles

Do not combine these identities during rebuild.

### GitHub Actions identity

```
id-autocare-github-actions
```

Purpose:

```
GitHub Actions -> Azure -> ACR / AKS
```

### AutoCare application identity

```
id-autocare-app
```

Purpose:

```
AutoCare API workload -> Key Vault
```

### AKS identities

These belong to AKS infrastructure and should be recreated according to the new AKS deployment:

- AKS cluster identity
- kubelet/agentpool identity
- Application Gateway identity
- Key Vault Secrets Provider identity

The Key Vault Secrets Provider configuration is not itself the Azure authorization. The workload identity supplies the Azure identity used for the application's Key Vault access.

---

# 28. Known repository artifacts requiring separate review

The application repositories contain both the active environment-specific manifests:

```
k8s/dev/
k8s/uat/
k8s/prod/
```

and older `k8s/base/` / `k8s/overlays/` artifacts.

The active workflows deploy directly from:

```
k8s/${ENVIRONMENT}/
```

The older base/overlay artifacts are therefore not part of the current deployment path and should be reviewed separately before being deleted.

Do not treat them as live Azure dependencies without verifying their contents and references.

---

# 29. Rebuild source-of-truth rule

When rebuilding Azure:

**Prefer keeping stable names where there is no reason to change them.**

If we keep the current names for ACR, AKS, resource group, Key Vault and SQL server, many GitHub and Kubernetes values can remain unchanged.

If names are intentionally changed, update the exact locations documented above rather than searching and replacing arbitrary strings across the repositories.

After each Azure component is recreated, verify its actual Azure value and then update the corresponding GitHub variable, secret, Kubernetes manifest or Azure federated credential.

---

# 30. Final dependency chain

```
                    GITHUB
                       |
                 GitHub Actions
                       |
                 OIDC JWT (short-lived)
                       |
                       v
             Microsoft Entra ID
                       |
                       v
          id-autocare-github-actions
                 /             \
                /               \
           AcrPush           AKS Cluster User
              |                    |
              v                    v
             ACR                  AKS
                                  |
                 +----------------+----------------+
                 |                |                |
              Frontend           API          Maintenance
                 |                |                |
                 |                |                |
                 |           Workload Identity     |
                 |                |                |
                 |         id-autocare-app         |
                 |                |                |
                 |           Key Vault             |
                 |                |                |
                 |          SQL password           |
                 |                |                |
                 +---------> Azure SQL <------------+
```

The network path is:

```
GitHub job
   |
   v
self-hosted runner VM
   |
   v
VNet 10.20.0.0/16
   |
   +--> private AKS
   +--> private ACR
   +--> private Key Vault
   +--> private SQL
   +--> Application Gateway
   +--> Private DNS
```

This is the baseline that the replacement infrastructure should reconnect to.
