# Azure AutoCare — Troubleshooting Record

## Purpose

**Project-Azure-AKS** is the documentation source of truth for cross-cutting Azure/AKS architecture and troubleshooting. Application-specific implementation remains in the three application repositories.

Documentation states are:
- **Current** — applies to the present architecture.
- **Verified** — directly observed and tested.
- **Historical** — retained for incident history but not a current design decision.

Never copy an old resource name, environment name, AKS networking decision, or Kubernetes version into new configuration without checking its status.

---

# 1. GitHub Actions Stage 2 — Kubernetes Validation Contacted Private AKS

**Status:** Verified / resolved  
**Source:** `autocare-maintenance-service/docs/CI-CD-PIPELINE.md`

### Symptom
```text
AzureCLICredential: ERROR: Please run 'az login' to setup account
exec: executable kubelogin failed with exit code 1
```

### Root cause
The initial `kubectl` schema-validation/dry-run path contacted the Kubernetes API to obtain the schema. Because AKS is private, that path required private network access, `kubelogin`, and Azure authentication.

This did **not** prove that the manifests were invalid. It proved that the selected validation method was not offline.

### Resolution
Use offline Kubernetes schema validation with `kubeconform`. Keep Azure authentication and private AKS access in the deployment/verification stages.

---

# 2. AGIC — Managed Identity Assignment Failed

**Status:** Verified / resolved  
**Source:** `autocare-frontend/docs/SSL-INGRESS-KEYVAULT.md`

### Symptom
```text
LinkedAuthorizationFailed
Microsoft.ManagedIdentity/userAssignedIdentities/assign/action
```

### Root cause
The Application Gateway Ingress Controller identity could configure Application Gateway but could not assign/use the dedicated Application Gateway Key Vault identity.

### Resolution
Grant the AGIC identity:

`Managed Identity Operator`

scoped only to `id-appgw-keyvault`.

Keep these identities separate:
- Application Gateway identity → reads the Key Vault certificate/secret.
- AGIC identity → configures Application Gateway and assigns/uses the App Gateway identity.
- Human/operator identity → performs administrative certificate/import work.

---

# 3. Application Gateway Failed — Key Vault Private DNS Zone Group Missing

**Status:** Verified / resolved  
**Source:** `autocare-frontend/docs/SSL-INGRESS-KEYVAULT.md`

### Symptom
```text
ApplicationGatewayKeyVaultSecretException
```

### Investigation
The Key Vault private DNS record set existed but had no private endpoint IP. The private endpoint was approved, but it had no DNS zone group.

### Root cause
The private endpoint was not associated with:

`privatelink.vaultcore.azure.net`

through a Private DNS Zone Group.

### Resolution
Use:

```text
Key Vault Private Endpoint
        |
        v
DNS Zone Group
        |
        v
privatelink.vaultcore.azure.net
```

Then verify the A record resolves to the private endpoint IP.

---

# 4. Application Gateway Certificate Access Denied After RBAC Was Correct

**Status:** Verified / project-specific resolution  
**Source:** `autocare-frontend/docs/SSL-INGRESS-KEYVAULT.md`

### Symptom
```text
ApplicationGatewayKeyVaultSecretAccessDenied
```

### Verified RBAC
The Application Gateway identity had `Key Vault Secrets User` scoped to the target Key Vault.

### Final tested configuration
The project kept Key Vault private:

```text
publicNetworkAccess = Disabled
defaultAction       = Deny
bypass              = AzureServices
```

This is a **project-tested configuration**, not a universal rule for every private Key Vault deployment. Do not enable general public Key Vault access merely to make Application Gateway work.

---

# 5. Dockerized API — Production Mode Rejected In-Memory Database

**Status:** Verified / resolved  
**Source:** `autocare-api/docs/DOCKER-INTEGRATION-VERIFICATION.md`

### Symptom
```text
Error: Production requires DATABASE_PROVIDER=azure-sql; in-memory persistence is not permitted.
```

### Root cause
The container was using a production runtime configuration while still configured for the Development in-memory repository.

### Resolution
Local Docker integration used:

```text
NODE_ENV=development
DATABASE_PROVIDER=memory
```

Production requires:

`DATABASE_PROVIDER=azure-sql`

A successful memory-backed local test does not prove Azure SQL connectivity.

---

# 6. Docker API → Maintenance Service — localhost Was the Wrong Address

**Status:** Verified / resolved for Windows Docker testing  
**Source:** `autocare-api/docs/DOCKER-INTEGRATION-VERIFICATION.md`

### Root cause
`localhost` inside the API container refers to the API container itself, not the Windows host or another container.

### Local Docker resolution
```text
MAINTENANCE_SERVICE_URL=http://host.docker.internal:8001
```

### AKS rule
Do not use `host.docker.internal` in AKS. Use the Kubernetes Service DNS name for the maintenance service.

---

# 7. Frontend Docker/Nginx Proxy — Local Path Works, AKS Upstream Must Be Kubernetes DNS

**Status:** Verified  
**Source:** `autocare-frontend/docs/frontend-docker-testing.md`

The validated local path was:

```text
Browser
  -> Frontend nginx :8080
  -> /autocare/api/*
  -> AutoCare API :3000
  -> Maintenance service :8001
```

The frontend should continue to use the relative `/autocare/api` path.

Local Docker may use a Docker-specific upstream. AKS must use Kubernetes Service DNS instead.

---

# 8. PowerShell — npm.ps1 Execution Policy Blocked npm

**Status:** Verified / resolved  
**Source:** `autocare-api/docs/DOCKER-INTEGRATION-VERIFICATION.md`

### Symptom
PowerShell blocked `npm.ps1` under the local execution-policy configuration.

### Resolution
Use the Windows command shim:

```powershell
npm.cmd ci
npm.cmd test
```

This avoided changing the machine-wide PowerShell execution policy.

Result: 9 API tests passed, 0 failed.

---

# 9. Local Frontend — localhost vs 127.0.0.1

**Status:** Verified  
**Source:** `Project-Azure-AKS/docs/APPLICATION_VERIFICATION.md`

The documented local CORS configuration allows:

`http://localhost:5173`

The verified local URL is:

`http://localhost:5173/autocare/`

Do not treat `127.0.0.1` as interchangeable when validating this specific CORS configuration.

---

# 10. AKS VM Managed Identity Authenticated but kubectl Was Forbidden

**Status:** Current incident  
**Source:** Project operational troubleshooting

### Symptom
```text
kubectl get nodes -o wide

Error from server (Forbidden): nodes is forbidden:
User "8d7ce85e-77a1-4b7c-bf26-7d162e0a74a5"
cannot list resource "nodes" at the cluster scope
```

### What this proves
The VM managed identity authenticated to AKS. The failure is Kubernetes authorization, not proof of a DNS/network/authentication failure.

### Current cluster authorization model
- Microsoft Entra managed integration
- Azure RBAC for Kubernetes disabled
- local Kubernetes accounts disabled
- Kubernetes RBAC for authorization
- administrator group object ID: `09f59b55-0f25-424b-a86f-d3233c48901e`

### Important
A `member check` returning true was inconsistent with the group member listing. The VM identity was therefore **not** documented as successfully added until authoritative directory/RBAC verification is completed.

---

# 11. VM Managed Identity Could Not Add Itself to the Entra Admin Group

**Status:** Current incident  
**Source:** Project operational troubleshooting

### Symptom
```bash
az ad group member add \
  --group 09f59b55-0f25-424b-a86f-d3233c48901e \
  --member-id 8d7ce85e-77a1-4b7c-bf26-7d162e0a74a5
```

returned:

`Insufficient privileges to complete the operation.`

### Root cause
Azure resource Contributor permissions do not automatically grant Microsoft Entra directory permissions for group membership management.

### Rule
Keep these authorization planes separate:

```text
Azure RBAC
    !=
Microsoft Entra directory permissions
```

Do not weaken tenant-wide security controls merely to let a VM perform directory administration.

---

# 12. Interactive Azure Login From Runner VM Was Blocked by Security Defaults

**Status:** Current incident  
**Source:** Project operational troubleshooting

Interactive `az login` from the runner VM was blocked by the tenant's Security Defaults.

The supported VM automation path is:

```bash
az login --identity
```

The VM managed identity successfully returned the project subscription through that path.

This is a tenant authentication-policy boundary, not evidence that the VM managed identity is broken.

---

# 13. Cloud Shell Could Manage Azure but Could Not Reach Private AKS

**Status:** Current incident  
**Source:** Project operational troubleshooting

### Symptom
`az aks get-credentials` and `kubelogin` succeeded far enough to configure the context, but `kubectl` could not resolve the private AKS API hostname.

Observed failure included:

```text
lookup ...privatelink.centralindia.azmk8s.io ... no such host
```

### Root cause
Cloud Shell is not automatically on this project's VNet/private-DNS path.

### Correct administration split
- Cloud Shell → Azure/Entra administration.
- Runner VM inside VNet → private AKS kubectl and private-resource testing.
- Self-hosted GitHub runners → CI/CD against private AKS.

Do not interpret Cloud Shell's private-DNS failure as an AKS cluster failure.

---

# 14. VM SKU Unsupported in Selected Availability-Zone Configuration

**Status:** Historical / verified during AKS creation  
**Source:** `Project-Azure-AKS/docs/AKS_GENERAL_KNOWLEDGE.md`

A `D2as_v6` size was shown as unsupported for the selected availability-zone configuration.

The problem concerned VM SKU availability, region, zone, and node-pool placement.

It was not caused by Azure CNI Overlay.

Keep these decisions separate:

```text
VM SKU availability
    !=
AKS API public/private access
    !=
Pod CNI/IPAM model
```

---

# 15. Private Key Vault Portal Access — RBAC and Network Are Separate

**Status:** Current architecture behavior  
**Source:** Project operational troubleshooting

A private/restricted Key Vault can reject access from a machine that has the correct Azure RBAC role but is not on the private network path.

Think in two separate questions:

```text
RBAC
  -> Am I authorized?

Network
  -> Can I reach the service?
```

Both must succeed.

For this architecture, use a VNet-connected administration/testing path for private-resource operations rather than making the Key Vault public.

---

# 16. Private Endpoint Troubleshooting — DNS Is Part of Connectivity

**Status:** Current

For private ACR, SQL, Key Vault, and the private AKS API, troubleshoot in this order:

1. Confirm the Private Endpoint exists and is approved.
2. Confirm the correct Private DNS zone.
3. Confirm the intended DNS integration/zone group.
4. Confirm the hostname resolves to the private IP.
5. Test from a machine that is actually on the VNet/private network path.
6. Then investigate application credentials/RBAC.

A private endpoint without correct DNS integration can look like an authentication or application failure even when the Azure resource itself is healthy.

---

# 17. Historical ACR Name — Do Not Reuse It

**Status:** Documentation warning

Older documents reference:

`acrazureproject.azurecr.io`

That registry belongs to the earlier architecture.

The current environment-specific registries are:

```text
acrautocaredev01.azurecr.io
acrautocareuat01.azurecr.io
acrautocareprod01.azurecr.io
```

The legacy registry name must not be copied into current deployment configuration.

---

# 18. Historical AKS Public/Private Documentation Conflict

**Status:** Documentation issue found during audit

Older Project-Azure-AKS documentation stated that the AKS API should be public.

The current verified cluster is private:

```text
privateCluster = true
localAccountsDisabled = true
networkPlugin = azure
networkPluginMode = overlay
workloadIdentity = true
oidcIssuerProfile = true
kubernetesVersion = 1.35.8
```

Therefore, old statements such as `"Public AKS cluster — our choice"` are historical and must not be used as the current architecture decision.

---

# 19. Historical Kubernetes Version Drift

**Status:** Documentation issue found during audit

Older documents record Kubernetes `1.35.7`.

The current verified cluster reports `1.35.8`.

Do not silently present 1.35.7 as the current cluster version. Any hard-coded schema-validator version should be deliberately reconciled with the actual cluster version.

---

# 20. Historical Environment Naming Drift

**Status:** Documentation issue found during audit

Older Project-Azure-AKS documents use:

`dev / qa / prod`

The current delivery architecture uses:

`dev / uat / prod`

Use `uat` in current architecture and deployment documentation. Keep `qa` only where it is explicitly historical.

---

# 21. Troubleshooting Method — Identify the Failed Layer First

Use this order before changing infrastructure:

```text
1. DNS
2. Network reachability
3. Azure authentication
4. Azure RBAC
5. Kubernetes authentication
6. Kubernetes RBAC
7. Kubernetes object state
8. Pod/container runtime
9. Application configuration
10. Application dependency
```

Examples:

- `kubectl ... Forbidden` → investigate Kubernetes RBAC first.
- Private hostname does not resolve → investigate private DNS first.
- `kubelogin` says Azure login is required → determine which pipeline/host is performing the operation before adding authentication.
- Application Gateway cannot read Key Vault → check identity, RBAC, private endpoint, DNS, networking, then AGIC reconciliation.
- Application fails database initialization → check database provider/runtime configuration before changing AKS networking.

---

# 22. Current Private-AKS Administration Model

| Task | Current path |
|---|---|
| Azure/Entra administration outside VNet | Authorized human/admin session or Cloud Shell |
| Private AKS `kubectl` | Runner VM / self-hosted runner inside VNet |
| Private ACR | VNet-connected runner/VM |
| Private SQL | VNet-connected runtime/administration path |
| Private Key Vault | VNet-connected path |
| GitHub Actions deployment | Self-hosted GitHub runners inside VNet |
| Kubernetes authorization | Microsoft Entra + Kubernetes RBAC |

This separation is intentional and should be preserved during troubleshooting.

---

# 23. Source Documents Audited

### Project-Azure-AKS
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/NETWORKING.md`
- `docs/PROJECT.md`
- `docs/AKS_VERIFIED_STATE.md`
- `docs/AKS_GENERAL_KNOWLEDGE.md`
- `docs/AKS_CLUSTER_PRESETS.md`
- `docs/AKS_NODE_RESOURCE_GROUP.md`
- `docs/AKS_RESOURCE_GROUPS_AND_MONITORING.md`
- `docs/INFRASTRUCTURE.md`
- `docs/INTEGRATIONS.md`
- `docs/APPLICATION_VERIFICATION.md`
- `docs/CHANGELOG.md`

### autocare-frontend
- `docs/SSL-INGRESS-KEYVAULT.md`
- `docs/frontend-docker-testing.md`
- `docs/AKS-DEPLOYMENT.md`
- `docs/DOCKER-DEEP-DIVE.md`
- `docs/smoke-test.md`

### autocare-api
- `docs/DOCKER-INTEGRATION-VERIFICATION.md`
- `docs/AKS-DEPLOYMENT.md`
- `docs/DOCKER-DEEP-DIVE.md`
- `docs/promotion-smoke-test.md`

### autocare-maintenance-service
- `docs/CI-CD-PIPELINE.md`
- `docs/AKS-DEPLOYMENT.md`
- `docs/DOCKER-DEEP-DIVE.md`
- `docs/promotion-smoke-test.md`

The three application repositories do not have one consolidated troubleshooting document; their troubleshooting is distributed across CI/CD, TLS/Ingress, Docker, and deployment documents.

---

# 24. Going Forward

1. Record new cross-cutting Azure/AKS incidents here.
2. Keep application-specific implementation details in the owning application repository.
3. Link the original source document when an incident originated elsewhere.
4. Mark changed architecture decisions as historical rather than silently leaving contradictory current statements.
5. Do not commit credentials or other secret material.
