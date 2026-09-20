# Current Azure Infrastructure & GitHub Reconnection Audit

**Purpose:** Preserve the current Azure/AKS architecture and every known GitHub-to-Azure/application connection before the current Azure infrastructure is deleted and rebuilt.

**Status:** Rebuild/reconnection document updated on 2026-09-20. It preserves the audited legacy baseline and records confirmed replacement-infrastructure changes as they are created.

> This document is a rebuild reference, not a Terraform/Bicep source of truth. Values marked **CURRENT** describe the existing environment. Values marked **RECREATE** must be recreated or revalidated after the new infrastructure is built.

## Rebuild update — 2026-09-20

The Azure rebuild is now in progress. The following replacement-infrastructure changes are **confirmed**, not historical values:

### Confirmed new ACR architecture

Three environment-specific Azure Container Registries have been created:

| Environment | ACR | Login server | SKU | Private Endpoint |
|---|---|---|---|---|
| DEV | `acrautocaredev01` | `acrautocaredev01.azurecr.io` | Premium | `PE-ACR-DEV-01` |
| UAT | `acrautocareuat01` | `acrautocareuat01.azurecr.io` | Premium | `PE-ACR-UAT-01` |
| PROD | `acrautocareprod01` | `acrautocareprod01.azurecr.io` | Premium | `PE-ACR-PROD-01` |

All three ACRs use private access and the existing `PrivateEndpointSubnet` (`10.20.2.0/24`). The shared Private DNS zone is:

`privatelink.azurecr.io`

The new ACR naming convention is:

`acr` + `autocare` + `<environment>` + `01`

These names intentionally replace the previous single-ACR model `acrazureproject`.

### Confirmed new runner design

`vm-github-runner` is now the engineering/admin workspace and self-hosted GitHub Actions runner.

- Azure region: Central India
- Subnet: `snet-runner` (`10.20.3.0/24`)
- Admin user: `azureuser`
- Public IP: **required**
- Managed identity: **none**
- Microsoft Entra VM login: **disabled**
- SSH key authentication: **enabled**
- Azure CLI authentication from the VM: `az login`
- The GitHub Actions UAMI `id-autocare-github-actions` is **not** attached to the VM.
- The VM is intended to reach private ACR, SQL, Key Vault and AKS through the VNet.

The VM's replacement private/public IP addresses are not recorded here until verified from Azure.

### Confirmed private DNS resolver configuration

- DNS Resolver inbound subnet: `DNSResolverInbound` (`10.20.254.0/28`)
- Inbound endpoint IP: `10.20.254.4`
- VNet custom DNS: `10.20.254.4`

### Confirmed SQL rebuild status

The SQL data layer has now been created and verified:

- SQL server: `sql-azure-project`
- SQL hostname: `sql-azure-project.database.windows.net`
- DEV database: `sqldb-autocare-dev`
- UAT database: `sqldb-autocare-uat`
- PROD database: `sqldb-autocare-prod`
- SQL private endpoint: `PE-SQL-AZURE-PROJECT`
- Private DNS zone: `privatelink.database.windows.net`

The SQL private endpoint is associated with the **SQL server**, not an individual database. Therefore the single private endpoint provides private access to all three databases on `sql-azure-project`; separate SQL private endpoints for DEV/UAT/PROD are not required.

SQL authentication was retained because the application configuration uses the documented SQL administrator username `sqladmin`. Microsoft Entra authentication remains available on the server.

The SQL password is not stored in Git and will be recreated/managed through Key Vault as part of the application Workload Identity/Secrets Store CSI flow.

### Rebuild status of remaining data-plane resources

The SQL server, three SQL databases, Key Vault, their private endpoints, and the rebuilt AKS/Application Gateway are **not marked complete in this document until they are actually created and verified**.


---

## 1. Scope

This audit covers:

- Azure subscription, resource groups and AKS
- VNet/subnets/private networking
- Three environment-specific ACRs
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

## Replacement runner design

VM:

- Name: `vm-github-runner`
- Subnet: `snet-runner`
- Address space: `10.20.3.0/24`
- Admin user: `azureuser`
- Public IP: **YES**
- Managed identity: **none**
- Microsoft Entra VM login: **disabled**
- SSH key authentication: **enabled**
- Azure location: Central India

The VM is both:

1. the engineering/admin workspace used to operate the private Azure environment; and
2. the self-hosted GitHub Actions runner.

The user will operate Azure CLI, kubectl, kubelogin, Docker and Git from this VM rather than directly from the local Windows PC.

The VM uses:

- Azure CLI with interactive `az login`
- Docker
- kubectl
- kubelogin
- Git

The VM has private network access to the VNet resources and is intended to reach:

- private ACR
- private SQL
- private Key Vault
- private AKS

The GitHub Actions UAMI `id-autocare-github-actions` must **not** be attached to this VM. GitHub Actions continues to authenticate to Azure through GitHub OIDC.

**RECREATE/REGISTER:** The runner must use the labels:

- `autocare-frontend`
- `autocare-api`
- `autocare-maintenance`

The replacement VM's actual private and public IP addresses must be recorded after Azure verification.

# 6. Azure Container Registry — replacement architecture

The rebuild no longer uses one shared ACR. It uses one private Premium ACR per environment.

| Environment | ACR name | Login server | SKU | Private Endpoint |
|---|---|---|---|---|
| DEV | `acrautocaredev01` | `acrautocaredev01.azurecr.io` | Premium | `PE-ACR-DEV-01` |
| UAT | `acrautocareuat01` | `acrautocareuat01.azurecr.io` | Premium | `PE-ACR-UAT-01` |
| PROD | `acrautocareprod01` | `acrautocareprod01.azurecr.io` | Premium | `PE-ACR-PROD-01` |

Each environment ACR is intended to contain the application repositories:

- `autocare-frontend`
- `autocare-api`
- `autocare-maintenance-service`

Private networking:

- VNet: `vnet-azure-project`
- Private endpoint subnet: `PrivateEndpointSubnet`
- Private DNS zone: `privatelink.azurecr.io`
- Access model: **Private access**

The GitHub Actions UAMI will need ACR push permission on all three replacement registries.

The previous single ACR:

- `acrazureproject`
- `acrazureproject.azurecr.io`

is now a **legacy/historical reference** and must not be used by the rebuilt deployment.

The previous pipeline health-check image `netshoot:latest` was present in the old ACR. Its placement in the new environment-specific ACRs must be verified/implemented consistently with the rebuilt workflow before CI verification.

**Naming convention:**

`acrautocare<environment>01`

Examples:

```text
acrautocaredev01
acrautocareuat01
acrautocareprod01
```

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

## Confirmed replacement ACR private endpoints

The three replacement ACR private endpoints are:

- `PE-ACR-DEV-01` → `acrautocaredev01`
- `PE-ACR-UAT-01` → `acrautocareuat01`
- `PE-ACR-PROD-01` → `acrautocareprod01`

All three use:

- VNet: `vnet-azure-project`
- Subnet: `PrivateEndpointSubnet`
- CIDR: `10.20.2.0/24`
- Target sub-resource: `registry`
- Private DNS integration: enabled

## Remaining private endpoints

The replacement Key Vault and SQL private endpoints are part of the rebuild but are **not marked complete until created and verified**.

The old private endpoint names remain historical:

- `PE-ACR-AZURE-PROJECT`
- `PE-KV-AZURE-PROJECT`
- `PE-SQL-AZURE-PROJECT`

For the new ACR architecture, the approved naming convention is:

- `PE-ACR-DEV-01`
- `PE-ACR-UAT-01`
- `PE-ACR-PROD-01`

The new Key Vault and SQL private endpoint names will be recorded here after creation.

# 12. Private DNS

## Confirmed replacement DNS design

Shared private DNS zones are used by the private endpoints rather than creating one zone per environment.

| Private DNS zone | Purpose |
|---|---|
| `privatelink.azurecr.io` | All three replacement ACR private endpoints |
| `privatelink.database.windows.net` | Replacement SQL private endpoint |
| `privatelink.vaultcore.azure.net` | Replacement Key Vault private endpoint |

The ACR zone is shared by:

- `PE-ACR-DEV-01`
- `PE-ACR-UAT-01`
- `PE-ACR-PROD-01`

The project intentionally creates/integrates these private DNS zones as part of private endpoint setup rather than creating empty zones in advance.

## Private DNS Resolver

- Resolver inbound subnet: `DNSResolverInbound`
- Subnet CIDR: `10.20.254.0/28`
- Inbound endpoint IP: `10.20.254.4`
- VNet custom DNS: `10.20.254.4`

Important distinction:

`10.20.254.0/28` is the resolver subnet.  
`10.20.254.4` is the DNS Resolver inbound endpoint IP and the VNet custom DNS server.

The AKS managed private DNS zone is generated by AKS and its final value must be recorded after the replacement AKS cluster is created.

**VERIFY:** DNS resolution for ACR, SQL and Key Vault private endpoints must be tested from the replacement runner/AKS network after those resources are created.

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

Current/replacement Azure-dependent values:

```
AKS_CLUSTER_NAME=aks-azure-project
AZURE_RESOURCE_GROUP=rg-azure-aks
```

The ACR values are now environment-specific:

| Environment | ACR_NAME | ACR_LOGIN_SERVER |
|---|---|---|
| dev | `acrautocaredev01` | `acrautocaredev01.azurecr.io` |
| uat | `acrautocareuat01` | `acrautocareuat01.azurecr.io` |
| prod | `acrautocareprod01` | `acrautocareprod01.azurecr.io` |

**REQUIRED WORKFLOW/GITHUB UPDATE:** The current variable names `ACR_NAME` and `ACR_LOGIN_SERVER` are retained, but their values must become environment-specific through the GitHub Environment configuration or equivalent workflow logic. Do not keep one repository-wide ACR value.

GitHub Actions supports environment-level configuration variables and environment-level values take precedence over repository-level values when the same variable is defined at multiple levels.

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

Example pattern for PROD:

```
acrautocareprod01.azurecr.io/autocare-api:prod-<SHA>
```

Equivalent environment mappings:

```
dev  -> acrautocaredev01.azurecr.io
uat  -> acrautocareuat01.azurecr.io
prod -> acrautocareprod01.azurecr.io
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

The temporary health-check pods historically use:

```
<ACR_LOGIN_SERVER>/netshoot:latest
```

The old shared ACR contained `netshoot:latest`. Because the new architecture has one ACR per environment, the rebuilt pipeline must either provide `netshoot:latest` in each environment ACR or deliberately change the health-check image source. This must be verified before CI/CD validation.

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
- Private DNS Resolver configuration
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

**Keep stable names where the rebuild has intentionally retained them, and explicitly document every deliberate change.**

Stable/reused names currently include:

- `rg-azure-aks`
- `vnet-azure-project`
- `aks-azure-project` (target name; revalidate after AKS rebuild)
- `sql-azure-project` (target name; not yet rebuilt)
- `kv-azure-aks-project` (target name; not yet rebuilt)
- `vm-github-runner`
- `id-autocare-app`
- `id-autocare-github-actions`

Deliberate naming changes:

- one old ACR `acrazureproject` → three environment-specific ACRs
- ACR DEV → `acrautocaredev01`
- ACR UAT → `acrautocareuat01`
- ACR PROD → `acrautocareprod01`
- ACR private endpoints → `PE-ACR-DEV-01`, `PE-ACR-UAT-01`, `PE-ACR-PROD-01`

If a name is intentionally changed, update the exact GitHub variable, workflow, Kubernetes manifest, Azure federated credential or documentation location that depends on it. Do not perform blind repository-wide replacement.

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

---

# 31. Second repository re-audit — additional findings

A second, deeper audit was performed after the first version of this document was created. This audit inspected repository trees, active workflows, documentation, and the legacy k8s/base and k8s/overlays files in all three application repositories.

The following items were missed by the first audit and are important for the Azure rebuild/reconnection.

## 31.1 Historical Application Gateway public IP

Files:

    autocare-frontend/docs/AKS-DEPLOYMENT.md
    autocare-api/docs/AKS-DEPLOYMENT.md
    autocare-maintenance-service/docs/AKS-DEPLOYMENT.md

All three documents contain the historical Application Gateway public IP:

    4.247.238.128

They also contain historical public endpoint examples such as:

    http://4.247.238.128/autocare/
    http://4.247.238.128/autocare/api/health

RECONNECT IMPACT: a recreated Application Gateway can receive a different public IP. These documents must be updated if the public endpoint changes. Do not use this IP as the source of truth for the new deployment.

## 31.2 Frontend SSL/TLS documentation contains UAT-specific Azure dependencies

File:

    autocare-frontend/docs/SSL-INGRESS-KEYVAULT.md

Documented values/architecture include:

    uat.autocare.local
    autocare-uat-tls
    id-appgw-keyvault
    privatelink.vaultcore.azure.net

The document also records the tested Application Gateway → Key Vault certificate retrieval model, including the App Gateway identity, AGIC identity, Key Vault RBAC, private endpoint, private DNS and AzureServices bypass behavior.

RECONNECT IMPACT: these are important historical TLS/Application Gateway dependencies that must be deliberately recreated or revalidated.

## 31.3 Legacy frontend overlays contain all three environment hostnames and certificate names

Files:

    autocare-frontend/k8s/overlays/dev/ingress-patch.yaml
    autocare-frontend/k8s/overlays/uat/ingress-patch.yaml
    autocare-frontend/k8s/overlays/prod/ingress-patch.yaml

Known values:

    dev.autocare.local  -> autocare-dev-tls
    uat.autocare.local  -> autocare-uat-tls
    prod.autocare.local -> autocare-prod-tls

All three also use ssl-redirect=true.

Important: the current active workflow deploys k8s/dev, k8s/uat or k8s/prod directly, so these legacy overlays are not currently driving deployment. They still contain infrastructure references and must be classified during repository cleanup.

## 31.4 Legacy frontend manifests hardcode the old ACR

Legacy files under autocare-frontend/k8s/base and autocare-frontend/k8s/overlays contain:

    acrazureproject.azurecr.io/autocare-frontend

The overlays use static tag:

    v2

These are not the current GitHub Actions image references. The active workflow constructs the image from GitHub Variables and the commit SHA.

## 31.5 Legacy API base contains old Workload Identity, Key Vault and ACR values

Files:

    autocare-api/k8s/base/secretproviderclass.yaml
    autocare-api/k8s/base/serviceaccount.yaml
    autocare-api/k8s/base/deployment.yaml

Known hardcoded values include:

    clientID: 037fe6d8-128e-4e44-bbda-2a910f758355
    keyvaultName: kv-azure-aks-project
    tenantId: a3c9a20a-5f7c-4023-a4a6-f0c1281063e2
    azure.workload.identity/client-id: 037fe6d8-128e-4e44-bbda-2a910f758355
    image: acrazureproject.azurecr.io/autocare-api

These are legacy references but will still be found by repository-wide searches after the Azure rebuild.

## 31.6 Significant legacy API secret-name discrepancy

Legacy API overlays contain different Key Vault secret object names:

    dev  -> autocare-sql-password
    uat  -> autocare-uat-sql-password
    prod -> autocare-prod-sql-password

The currently active environment-specific manifests use:

    autocare-sql-password

for dev, UAT and prod.

This is a real discrepancy between the active deployment path and the legacy Kustomize artifacts. Do not assume all four secret names exist in the current or future Key Vault. The active deployment path is the current source of truth; legacy names should be treated as historical until explicitly verified.

## 31.7 Legacy API overlays duplicate old SQL configuration

Legacy API overlays contain:

    DATABASE_HOST=sql-azure-project.database.windows.net
    DATABASE_NAME=sqldb-autocare-dev
    DATABASE_NAME=sqldb-autocare-uat
    DATABASE_NAME=sqldb-autocare-prod
    DATABASE_USER=sqladmin
    DATABASE_PROVIDER=azure-sql
    DATABASE_PORT=1433
    DATABASE_ENCRYPT=true
    DATABASE_TRUST_SERVER_CERTIFICATE=false

These values therefore exist in both active ConfigMaps and legacy Kustomize configuration.

## 31.8 Legacy API overlays hardcode old ACR and static image tags

Legacy API overlays use:

    acrazureproject.azurecr.io/autocare-api:v1

The active workflow instead creates:

    <ACR_LOGIN_SERVER>/<IMAGE_NAME>:<environment>-<GITHUB_SHA>

Therefore the legacy overlays are not the current image source.

## 31.9 Legacy maintenance-service manifests hardcode old ACR and static tags

Files under autocare-maintenance-service/k8s/base and k8s/overlays contain:

    acrazureproject.azurecr.io/autocare-maintenance-service

and the overlays use:

    v1

Again, these are legacy references, not the active GitHub Actions image construction path.

## 31.10 Repository documentation is partly stale relative to the active deployment

The active workflow currently uses:

    offline kubeconform
    k8s/dev, k8s/uat, k8s/prod
    GitHub OIDC
    image artifacts
    rendered IMAGE_PLACEHOLDER + one kubectl apply
    automatic rollback
    independent verification

Some repository documents still describe:

    manual image build/push
    kubectl set image
    Kustomize as a future model
    the old Application Gateway public IP
    old static image tags

Therefore documentation is not the authoritative current deployment implementation. For the rebuild, the active .github/workflows/pipeline.yaml and active k8s/<environment>/ manifests are more relevant.

## 31.11 API Docker documentation is stale

autocare-api/docs/DOCKER-DEEP-DIVE.md states that main did not contain a Dockerfile and that the Dockerfile explanation was pending.

The current tree does contain autocare-api/Dockerfile, and docs/DOCKER-INTEGRATION-VERIFICATION.md documents it as:

    FROM node:22-bookworm-slim
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci --omit=dev
    COPY --chown=node:node src ./src
    ENV NODE_ENV=production
    EXPOSE 3000
    USER node
    CMD ["npm", "start"]

This is not an Azure dependency, but it confirms that some repository documentation is stale.

# 32. Consolidated repository-wide Azure reference inventory

GitHub Actions secrets referenced by all three repositories:

    AZURE_CLIENT_ID
    AZURE_TENANT_ID
    AZURE_SUBSCRIPTION_ID

GitHub Actions variables referenced by all three repositories:

    ACR_LOGIN_SERVER
    ACR_NAME
    AKS_CLUSTER_NAME
    AZURE_RESOURCE_GROUP
    IMAGE_NAME

Active API Azure references:

    sql-azure-project.database.windows.net
    sqldb-autocare-dev
    sqldb-autocare-uat
    sqldb-autocare-prod
    sqladmin
    kv-azure-aks-project
    037fe6d8-128e-4e44-bbda-2a910f758355
    a3c9a20a-5f7c-4023-a4a6-f0c1281063e2

Legacy Azure references:

    acrazureproject.azurecr.io
    sql-azure-project.database.windows.net
    kv-azure-aks-project
    037fe6d8-128e-4e44-bbda-2a910f758355

Application Gateway/TLS references:

    azure-application-gateway
    autocare-dev-tls
    autocare-uat-tls
    autocare-prod-tls
    dev.autocare.local
    uat.autocare.local
    prod.autocare.local

Historical public endpoint:

    4.247.238.128

Private DNS zones:

    privatelink.vaultcore.azure.net
    privatelink.azurecr.io
    privatelink.database.windows.net

# 33. Active vs legacy source-of-truth

| Area | Active current deployment | Legacy/historical artifact |
|---|---|---|
| Environment manifests | k8s/dev, k8s/uat, k8s/prod | k8s/base, k8s/overlays |
| Image selection | GitHub workflow + SHA tag | Kustomize static tags |
| ACR | GitHub Variables | Hardcoded old ACR hostname |
| API Key Vault identity | Active SecretProviderClass + ServiceAccount | Same old values in base |
| API SQL config | Active ConfigMaps | Kustomize generators |
| Frontend host/cert | Active dev manifest currently has dev host/cert | Legacy overlays define dev/uat/prod |
| Deployment method | GitHub Actions | Historical manual/Kustomize instructions |
| Production approval | GitHub Environment | Not implemented by legacy artifacts |

# 34. Revised pre-destruction rule

Before deleting Azure, capture not only the active workflow values but also:

    historical Application Gateway public IP
    Application Gateway certificate names
    environment hostnames
    legacy Key Vault secret object names
    legacy ACR hostname
    legacy image tags
    current Key Vault/Workload Identity IDs
    SQL host/database/user values
    GitHub Actions variables
    GitHub Actions secret names
    OIDC subjects
    runner labels

# 35. Revised post-rebuild stale-reference scan

After the new infrastructure is created, verify the active deployment path first.

Then scan all three repositories for old values. A PowerShell equivalent is:

    rg -n "acrazureproject|aks-azure-project|rg-azure-aks|kv-azure-aks-project|sql-azure-project|037fe6d8-128e-4e44-bbda-2a910f758355|4.247.238.128|autocare-dev-tls|autocare-uat-tls|autocare-prod-tls|dev.autocare.local|uat.autocare.local|prod.autocare.local"

Every remaining match must be classified as:

1. intentionally retained historical documentation;
2. active configuration that must be updated;
3. obsolete legacy configuration that should be removed; or
4. test/example data intentionally not connected to Azure.

Do not blindly replace every match.

# 36. Second-audit conclusion

The first audit captured the main live Azure dependencies. The second audit found additional repository-wide references in historical documentation and legacy Kustomize artifacts, including old ACR names, old Workload Identity/Key Vault values, old SQL settings, environment-specific legacy Key Vault secret names, Application Gateway certificate/hostname values, and the historical public IP.

The active GitHub Actions workflow plus active k8s/<environment>/ manifests remain the current deployment path. The legacy artifacts and documentation must be explicitly classified before old Azure values are removed.

# 37. Rebuild change log — confirmed 2026-09-20

This section records the replacement-infrastructure changes that supersede the original single-ACR/runner assumptions in this document.

## ACR

Old model:

```text
acrazureproject
```

Replacement model:

```text
DEV  -> acrautocaredev01
UAT  -> acrautocareuat01
PROD -> acrautocareprod01
```

All three are Premium/private-access registries with private endpoints in `PrivateEndpointSubnet`.

## ACR private endpoints

```text
PE-ACR-DEV-01
PE-ACR-UAT-01
PE-ACR-PROD-01
```

All use the shared:

```text
privatelink.azurecr.io
```

## Runner

The runner VM has changed from the old audit assumption of no public IP to the deliberate replacement design:

- `vm-github-runner`
- Public IP: required
- Managed identity: none
- Entra VM login: disabled
- SSH key authentication: enabled
- Admin user: `azureuser`
- Workspace + self-hosted runner role combined

The public IP is for controlled SSH/workspace access; private Azure resources remain accessed through the VNet.

## Still pending

The following must be added to this document only after actual Azure creation/verification:

- replacement SQL server and databases
- replacement Key Vault and secret
- SQL private endpoint
- Key Vault private endpoint
- replacement AKS
- replacement Application Gateway/ingress
- recreated UAMI IDs/client IDs and role assignments
- recreated GitHub OIDC federated credentials
- updated GitHub environment variables
- runner registration and final IPs
- end-to-end private DNS validation
