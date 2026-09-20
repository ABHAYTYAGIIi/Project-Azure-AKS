# Rebuild Value Classification — Reuse vs Azure-Generated

**Purpose:** Separate values into stable values we should deliberately reuse, and values Azure will generate again during a rebuild.

## 1. SAFE TO REUSE EXACTLY

| Area | Value | Reuse |
|---|---|---|
| GitHub owner | ABHAYTYAGIIi | YES |
| GitHub owner ID | 98732531 | YES |
| Repositories | autocare-frontend / autocare-api / autocare-maintenance-service | YES |
| Repository IDs | 1371226897 / 1371269400 / 1371271587 | YES |
| Branches | dev / uat / main | YES |
| GitHub Environments | dev / uat / prod | YES |
| Runner labels | autocare-frontend / autocare-api / autocare-maintenance | YES |
| Secret names | AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_SUBSCRIPTION_ID | YES |
| Variable names | ACR_LOGIN_SERVER / ACR_NAME / AKS_CLUSTER_NAME / AZURE_RESOURCE_GROUP / IMAGE_NAME | YES |
| VNet | vnet-azure-project | YES |
| VNet CIDR | 10.20.0.0/16 | YES |
| Subnets | snet-appgw, snet-aks, PrivateEndpointSubnet, snet-runner, DNSResolverInbound, GatewaySubnet | YES |
| Subnet CIDRs | 10.20.0.0/24, 10.20.1.0/24, 10.20.2.0/24, 10.20.3.0/24, 10.20.254.0/28, 10.20.255.0/27 | YES |
| Kubernetes namespaces | dev / uat / prod | YES |
| Kubernetes application names | autocare-frontend / autocare-api / autocare-maintenance-service | YES |
| Internal service DNS | http://autocare-api:3000 and http://autocare-maintenance-service:8001 | YES |
| SQL databases | sqldb-autocare-dev / sqldb-autocare-uat / sqldb-autocare-prod | YES |
| SQL user | sqladmin | YES |
| Key Vault secret | autocare-sql-password | YES |
| ACR repositories | autocare-frontend / autocare-api / autocare-maintenance-service / hello-world / netshoot | YES |
| OIDC issuer | https://token.actions.githubusercontent.com | YES |
| OIDC audience | api://AzureADTokenExchange | YES |

These are application/GitHub choices or intentionally selected Azure names/configuration. Keeping them minimizes downstream changes.

## 2. AZURE RESOURCE NAMES WE SHOULD TRY TO REUSE

| Resource | Current name | Reuse same name? |
|---|---|---|
| Resource Group | rg-azure-aks | YES |
| AKS | aks-azure-project | YES |
| ACR | acrazureproject | YES |
| Key Vault | kv-azure-aks-project | YES |
| SQL server | sql-azure-project | YES |
| Runner VM | vm-github-runner | YES |
| Application UAMI | id-autocare-app | YES |
| GitHub Actions UAMI | id-autocare-github-actions | YES |
| App Gateway → Key Vault identity | id-appgw-keyvault | YES |
| Private endpoints | PE-ACR-AZURE-PROJECT / PE-KV-AZURE-PROJECT / PE-SQL-AZURE-PROJECT | YES |

If the same Azure resource name is available and there is no architectural reason to change it, reusing it is preferable. It reduces changes to GitHub variables, Kubernetes manifests and documentation.

## 3. VALUES DERIVED FROM STABLE NAMES

If the names remain unchanged, these values can normally remain unchanged:

- ACR name: acrazureproject
- ACR login server: acrazureproject.azurecr.io
- SQL server host: sql-azure-project.database.windows.net
- SQL database names: sqldb-autocare-dev / sqldb-autocare-uat / sqldb-autocare-prod
- Kubernetes internal service names and URLs

These are not Azure-generated random values. They are based on names/configuration we selected.

## 4. AZURE WILL GENERATE NEW VALUES — DO NOT TRY TO PRESERVE THEM

After deletion and recreation, expect new values for:

- Azure resource IDs
- Managed Identity client IDs
- Managed Identity principal/object IDs
- AKS cluster identity IDs
- AKS kubelet/agent-pool identity IDs
- Application Gateway identity IDs
- Key Vault Secrets Provider identity IDs
- Private Endpoint resource IDs
- Private IP addresses assigned to the runner/private endpoints
- Application Gateway public IP address if its public IP resource is recreated
- Certificate versions, thumbprints and underlying certificate material
- Azure-managed AKS private DNS zone name/ID when it contains an Azure-generated GUID

### Critical rule

**Reuse the identity/resource NAME, but do not expect its Azure-generated ID to survive.**

Example:

- Keep UAMI name: id-autocare-app
- New client ID: capture it after recreation
- New principal/object ID: capture it after recreation
- Reassign Key Vault Secrets User
- Update the API ServiceAccount and SecretProviderClass clientID references

## 5. GITHUB ACTIONS UAMI

Keep the name:

    id-autocare-github-actions

Current IDs are historical values:

- Client ID: f88027d1-9765-4f66-84f7-ae11a5c442e5
- Principal/object ID: cdf1ce3b-18be-4dd7-b1d6-e73dae8eb4b7

After recreation, the name can remain the same but the IDs normally change.

Therefore:

1. Capture the new client ID.
2. Update the GitHub secret AZURE_CLIENT_ID.
3. Recreate the federated identity credentials on the new UAMI.
4. Reapply AcrPush and AKS Cluster User permissions.

Do not change the GitHub repository IDs or OIDC subject structure; those belong to the existing GitHub repositories.

## 6. APPLICATION UAMI

Keep the name:

    id-autocare-app

Current historical IDs:

- Client ID: 037fe6d8-128e-4e44-bbda-2a910f758355
- Principal ID: a301234c-faf0-4280-99e3-c254f9b3cdbf

After recreation:

- capture the new client ID
- capture the new principal ID
- assign Key Vault Secrets User
- update ServiceAccount annotation
- update SecretProviderClass clientID

## 7. OIDC — WHAT STAYS AND WHAT IS RECREATED

Stable:

- Issuer: https://token.actions.githubusercontent.com
- Audience: api://AzureADTokenExchange
- GitHub owner: ABHAYTYAGIIi
- GitHub owner ID: 98732531
- Existing repository IDs
- Existing repository/branch/environment names

Recreated:

- Azure federated identity credential objects on the new UAMI

Subject pattern remains:

    repo:ABHAYTYAGIIi@98732531/<repo>@<repo-id>:environment:<environment>

and:

    repo:ABHAYTYAGIIi@98732531/<repo>@<repo-id>:ref:refs/heads/<branch>

## 8. PRIVATE DNS

These zone names can be reused:

- privatelink.azurecr.io
- privatelink.database.windows.net
- privatelink.vaultcore.azure.net

But their records and VNet links must be recreated/revalidated.

The current AKS private DNS zone:

    2fb54672-d6e4-4a69-a2b6-2f8b7ba19de0.privatelink.centralindia.azmk8s.io

should NOT be treated as a reusable fixed value. The GUID portion is Azure-generated and a new private AKS can receive a different managed zone.

## 9. PRIVATE IPs AND PUBLIC IP

Current runner private IP:

    10.20.3.4

Do not depend on this exact address after rebuilding the VM. Preserve the subnet and network design instead.

Historical Application Gateway public IP:

    4.247.238.128

Do not use this as the new source of truth. If the public IP resource is recreated, the address may change. Capture the actual new address and update DNS/documentation if necessary.

## 10. TLS / CERTIFICATES

Names we can keep:

- autocare-dev-tls
- autocare-uat-tls
- autocare-prod-tls

Hostnames we can keep if the DNS design remains the same:

- dev.autocare.local
- uat.autocare.local
- prod.autocare.local

But certificate material, versions and thumbprints are not stable rebuild values. Recreate/import the certificates and revalidate Application Gateway bindings.

## 11. SQL

Stable/reusable:

- Server name: sql-azure-project
- Host: sql-azure-project.database.windows.net
- Databases: sqldb-autocare-dev / sqldb-autocare-uat / sqldb-autocare-prod
- User: sqladmin
- Port: 1433
- Provider: azure-sql
- Encrypt: true
- Trust server certificate: false

Not a Git value:

- SQL password

The password must be securely recreated/retained and placed in Key Vault. Never put it in this repository.

## 12. KEY VAULT

Keep:

- Key Vault name: kv-azure-aks-project
- Active secret name: autocare-sql-password

Recreate/revalidate:

- Key Vault resource ID
- Private endpoint
- Private DNS record/link
- RBAC assignment
- secret value

Do not automatically recreate the legacy names autocare-uat-sql-password or autocare-prod-sql-password. The second repository audit identified those as legacy Kustomize values; the active deployment path uses autocare-sql-password in all environments.

## 13. KUBERNETES RBAC

Stable:

- ClusterRole: autocare-github-actions
- Namespaces: dev / uat / prod

Recreated:

- RoleBindings must be recreated against the new Entra identity/object ID.
- Permissions should remain equivalent to the currently working ClusterRole.

## 14. AZURE ROLE ASSIGNMENTS

Role names can remain:

- AcrPush
- Azure Kubernetes Service Cluster User Role
- Key Vault Secrets User

But principal IDs and resource scopes must be reconnected to the new resource instances and identities.

## 15. FINAL QUICK CLASSIFICATION

### Keep exactly the same

- GitHub repositories and repository IDs
- GitHub owner ID
- branches and GitHub Environments
- runner labels
- GitHub secret/variable names
- Azure resource names where available
- VNet CIDR and subnet CIDRs
- Kubernetes namespaces/names
- internal Kubernetes service URLs
- SQL database names and username
- Key Vault active secret name
- ACR repository names
- OIDC issuer/audience and subject structure

### Same NAME, new Azure-generated ID/value

- managed identity client IDs
- managed identity principal/object IDs
- Azure resource IDs
- AKS-generated identities
- private endpoint IDs
- private IPs
- Application Gateway public IP address
- certificate versions/thumbprints
- Azure-managed AKS private DNS zone

### Must be recreated/revalidated

- federated identity credentials
- Azure RBAC assignments
- Kubernetes RoleBindings
- private endpoint connections
- private DNS records and VNet links
- Key Vault secret value
- SQL password
- ACR image contents
- Application Gateway certificate bindings
- runner registration
- Workload Identity configuration

## 16. REBUILD DECISION RULE

Before changing a repository value, ask:

> Did a human-selected value actually change, or did Azure simply generate a new identifier for the replacement resource?

If the resource NAME is unchanged but its Azure ID/client ID/principal ID/IP changed, update only the generated-value references.

Do not redesign working names or application DNS just because the underlying Azure resource was recreated.

## 17. REBUILD FLOW

    OLD RESOURCE
        |
        v
    delete/rebuild
        |
        v
    NEW RESOURCE WITH SAME HUMAN-SELECTED NAME
        |
        +--> Azure generates new IDs/IPs/identity IDs
        |
        v
    capture new generated values
        |
        v
    reconnect GitHub / Kubernetes / RBAC / Private DNS
        |
        v
    run existing CI/CD
        |
        v
    validate real application path

**Bottom line:** Preserve names and intentional configuration wherever practical. Accept Azure-generated identifiers as new values and reconnect them instead of trying to force the old identifiers back into the new infrastructure.