# Private AKS Architecture — AutoCare

## Status

**Design baseline — provisioning not yet started.**

This document is the source of truth for the new **private AKS architecture** for AutoCare. Azure resources will be provisioned through the **Azure Portal**. This document records the decisions, prerequisites, resource names, IP plan, DNS, private integrations, identity relationships, and validation checkpoints so the environment can be rebuilt without relying on undocumented portal choices.

> This document describes the new private architecture. It replaces the earlier public-API-server AKS direction.

---

## 1. Project constraints

The project uses an Azure for Students subscription. The current project constraints are:

| Constraint | Project limit / decision |
|---|---|
| Region | `centralindia` |
| Resource group | `rg-azure-aks` |
| Regional vCPU budget | **4 vCPUs** |
| AKS system nodes | **2** |
| AKS node size | `Standard_D2s_v6` |
| AKS node vCPU | 2 per node |
| AKS total node vCPU | **4 vCPUs** |
| Public IPv4 budget | **3** |
| Application Gateway public IP | **1 reserved** |
| Other public IPs | Maximum 2 additional, only when required |
| Cluster model | **Private AKS control plane** |
| Container registry | **Private ACR** |
| Database | Azure SQL Database through a private endpoint |
| External application entry point | Azure Application Gateway |
| Application Services | Internal Kubernetes `ClusterIP` services |
| Environment model | One cluster, namespaces `dev`, `qa`, `prod` |

Azure VM quota is regional and also constrained by VM-family quota, so the two `Standard_D2s_v6` nodes consume the full 4-vCPU project budget. Quota and capacity are separate checks and both must be verified in the Azure Portal before deployment. See Microsoft's quota guidance for the distinction between quota and actual regional capacity.

---

## 2. Architecture at a glance

```text
                                      INTERNET
                                          |
                                   HTTPS : 443
                                          |
                               [ Public IP #1 ]
                                          |
                         +-------------------------------+
                         | Azure Application Gateway      |
                         | Public L7 entry point         |
                         | Subnet: snet-appgw            |
                         +---------------+---------------+
                                         |
                                  private VNet traffic
                                         |
                         +---------------v---------------+
                         | AKS Ingress / routing          |
                         |                                |
                         | +----------+  +----------+     |
                         | | dev      |  | qa       | ... |
                         | | namespace|  | namespace|     |
                         | +----------+  +----------+     |
                         +---------------+----------------+
                                         |
                         +---------------+----------------+
                         |        AKS node subnet         |
                         |        snet-aks                |
                         |                                |
                         |  Node 1  Standard_D2s_v6       |
                         |  Node 2  Standard_D2s_v6       |
                         |                                |
                         |  React / Node / Python Pods    |
                         +------+---------------+---------+
                                |               |
                       private  |               | private
                       endpoint  |               | endpoint
                                |               |
                    +-----------v--+       +----v-------------+
                    | Private ACR  |       | Azure SQL        |
                    | Premium      |       | Database         |
                    +--------------+       +------------------+
                         |                         |
                  PE + private DNS          PE + private DNS
                         |                         |
                         +----------- VNet --------+

AKS API server:

  Developer / CI runner
          |
          | private connectivity / AKS Run Command
          v
  Private AKS API endpoint
          |
          v
  AKS control plane
```

The Application Gateway is the only planned Internet-facing application entry point. The AKS API server is private and has no public API endpoint.

---

## 3. Why the cluster is private

A private AKS cluster places the Kubernetes API server behind private networking. The API server uses private IP addressing and communication between the API server and node pools remains on private networking.

This is different from making the application private:

- **Private AKS** protects the Kubernetes control plane endpoint.
- **Private ACR** keeps container image access on the VNet/private-link path.
- **Private SQL endpoint** keeps database traffic on private networking.
- **Application Gateway public frontend** is intentionally public because users need to reach the AutoCare application.

Microsoft documents that a private AKS cluster uses an API-server private endpoint and private DNS, and that the private endpoint is placed in the subnet used by the first node pool when using the private-link-based model.

Reference: https://learn.microsoft.com/en-us/azure/aks/private-clusters

---

## 4. Resource naming standard

Names below are the planned names. Azure services with globally unique naming requirements may use a generated suffix.

### Core resources

| Resource | Planned name |
|---|---|
| Resource group | `rg-azure-aks` |
| VNet | `vnet-azure-project` |
| AKS | `aks-azure-project` |
| AKS node subnet | `snet-aks` |
| Application Gateway subnet | `snet-appgw` |
| Private endpoint subnet | `snet-private-endpoints` |
| Application Gateway | `appgw-autocare` |
| Application Gateway public IP | `pip-appgw-autocare` |
| ACR | `<globally-unique-acr-name>` |
| ACR private endpoint | `pe-acr-autocare` |
| SQL server | `<globally-unique-sql-server-name>` |
| SQL database | `autocare` |
| SQL private endpoint | `pe-sql-autocare` |

### Kubernetes names

| Resource | Planned name |
|---|---|
| Development namespace | `dev` |
| QA namespace | `qa` |
| Production namespace | `prod` |
| Frontend service | `frontend` |
| API service | `api` |
| Maintenance service | `maintenance-service` |

Do not place passwords, connection strings, tokens, or other secrets in resource names or this document.

---

## 5. VNet and IP plan

### VNet

```text
VNet: vnet-azure-project
CIDR: 10.20.0.0/16
```

### Subnets

| Subnet | CIDR | Purpose |
|---|---|---|
| `snet-aks` | `10.20.0.0/20` | AKS nodes; private AKS API private endpoint is expected here for the private-link-based model |
| `snet-appgw` | `10.20.16.0/24` | Application Gateway only |
| `snet-private-endpoints` | `10.20.17.0/24` | ACR and Azure SQL private endpoints |

The remaining VNet address space is intentionally unallocated for future needs.

### Kubernetes networking

Target AKS networking remains:

```text
Network plugin: Azure CNI
Network mode:   Overlay
Service CIDR:   10.0.0.0/16
DNS service IP: 10.0.0.10
Pod CIDR:       10.244.0.0/16
```

Azure CNI Overlay keeps Pod IP allocation separate from the Azure VNet address space, conserving VNet addresses for nodes, gateways, private endpoints, and other Azure resources.

Reference: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay

> These values are the planned baseline. The Azure Portal's final validation must be checked before creating the cluster.

---

## 6. Public IP budget

The project has a **3-public-IP budget**.

### Planned allocation

```text
Public IP #1 -> Application Gateway frontend
Public IP #2 -> AKS outbound connectivity if the selected outbound mode requires it
Public IP #3 -> RESERVED
```

We do not create the third public IP just because it is available.

### Important distinction

A private AKS control plane does **not** mean the nodes cannot have outbound Internet connectivity. Application traffic and control-plane access are private, while node egress can still use an Azure-managed outbound path.

The final AKS outbound configuration must be checked during portal creation. If AKS uses a Standard Load Balancer outbound configuration, Azure may create/use a public outbound IP. That IP is part of the subscription's public-IP budget.

Application Gateway itself needs one public frontend IP when it is the Internet-facing entry point.

Microsoft confirms that Application Gateway v2 can use a public frontend IP and route to private backend addresses.

Reference: https://learn.microsoft.com/en-us/azure/application-gateway/configuration-frontend-ip

---

## 7. Private DNS architecture

DNS is a first-class part of this architecture. A private endpoint without correct DNS resolution is not a complete private integration.

### 7.1 AKS private API DNS

For the initial design, use the **AKS-managed private DNS zone** created as part of private-cluster creation rather than introducing a custom DNS server or custom AKS private DNS zone.

This keeps the design simpler and avoids unnecessary custom DNS identity/role configuration.

AKS creates the private endpoint and private DNS zone for the private API server by default in the cluster-managed resource group. The zone is linked to the VNet hosting the cluster.

Do not manually delete or modify the AKS-managed private DNS resources.

Reference: https://learn.microsoft.com/en-us/azure/aks/private-clusters

### 7.2 ACR private DNS

Create:

```text
Private DNS zone:
privatelink.azurecr.io
```

Link it to:

```text
vnet-azure-project
```

The private endpoint creates private DNS records so that the normal ACR hostname resolves to the private endpoint rather than requiring a public route.

For the private ACR architecture, the registry REST endpoint and regional data endpoint records must resolve correctly. Microsoft documents the ACR private DNS records and private endpoint model for network-isolated/private ACR scenarios.

Reference: https://learn.microsoft.com/en-us/azure/aks/network-isolated

### 7.3 Azure SQL private DNS

Create:

```text
Private DNS zone:
privatelink.database.windows.net
```

Link it to:

```text
vnet-azure-project
```

The application must continue using the normal SQL server FQDN:

```text
<sql-server-name>.database.windows.net
```

Do **not** replace the SQL hostname in the application with the private-link hostname. Azure SQL's documented behavior requires the normal `database.windows.net` FQDN for client connections while DNS resolves it privately.

Reference: https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview

---

## 8. Private ACR architecture

### ACR requirements

The registry must support Private Link. Azure Container Registry private endpoints require the **Premium** ACR SKU.

Planned model:

```text
AKS node
   |
   | DNS: <registry>.azurecr.io
   v
Private DNS: privatelink.azurecr.io
   |
   v
Private endpoint
   |
   v
ACR Premium
```

### ACR configuration

| Setting | Target |
|---|---|
| SKU | Premium |
| Public network access | Disabled after private connectivity is validated |
| Private endpoint | `pe-acr-autocare` |
| PE subnet | `snet-private-endpoints` |
| Private DNS | `privatelink.azurecr.io` |
| VNet link | `vnet-azure-project` |
| Authentication | AKS kubelet managed identity with `AcrPull` |

### AKS-to-ACR identity

The AKS kubelet identity should receive only the required `AcrPull` role on the ACR resource.

Conceptually:

```text
AKS kubelet managed identity
             |
             | AcrPull
             v
        Private ACR
```

No registry password should be stored in Kubernetes for normal AKS image pulls when managed identity integration is available.

Reference: https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration

---

## 9. Azure SQL private architecture

Azure SQL remains a PaaS service. We do not run SQL Server inside AKS.

Target path:

```text
Node.js API Pod
     |
     | <sql-server>.database.windows.net:1433
     v
Azure DNS resolution
     |
     v
privatelink.database.windows.net
     |
     v
SQL Private Endpoint
     |
     v
Azure SQL logical server / database
```

### SQL configuration

| Setting | Target |
|---|---|
| SQL server | `<globally-unique-sql-server-name>` |
| Database | `autocare` |
| Private endpoint | `pe-sql-autocare` |
| PE subnet | `snet-private-endpoints` |
| Private DNS | `privatelink.database.windows.net` |
| Public network access | Disabled after private connectivity is validated |

Azure's portal workflow for SQL private endpoints explicitly supports private DNS integration and recommends the `privatelink.database.windows.net` zone. Public network access is a separate setting and must be disabled if the goal is private-only SQL access.

Reference: https://learn.microsoft.com/en-us/azure/private-link/tutorial-private-endpoint-sql-portal

---

## 10. Application Gateway architecture

Application Gateway is the **only planned public application entry point**.

```text
Internet
   |
   | HTTPS
   v
Public IP #1
   |
Application Gateway
   |
   | private VNet traffic
   v
AKS ingress / services
```

### Application Gateway subnet

```text
snet-appgw
10.20.16.0/24
```

This subnet is dedicated to Application Gateway and should not contain AKS nodes or private endpoints.

### Application routing

The target external paths remain:

```text
https://<domain>/dev/*
https://<domain>/qa/*
https://<domain>/prod/*
```

Within each namespace:

```text
/<environment>/        -> React frontend
/<environment>/api/*   -> Node.js API
```

The Python maintenance service remains internal and is called by the Node.js API.

Application Gateway/AGIC can route to private backend addresses and can share one public IP across multiple HTTP/HTTPS routes. Microsoft recommends Application Gateway for HTTP-like application ingress patterns where a shared L7 entry point is required.

References:

- https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- https://learn.microsoft.com/en-us/azure/aks/plan-application-networking

---

## 11. AKS control-plane access

A private cluster changes how administration works.

The laptop cannot simply reach the Kubernetes API over the public Internet because the API endpoint is private.

### Initial management strategy

Use **Azure Portal → AKS → Run command** for cluster administration when direct private network access is not available.

Microsoft documents AKS Run Command/command invoke specifically for private clusters and notes that it can run `kubectl` and `helm` commands through the Azure API without requiring a VPN or ExpressRoute path from the administrator's machine.

Reference: https://learn.microsoft.com/en-us/azure/aks/access-private-cluster

### Future CI/CD strategy

The GitHub Actions runner must have private network access to the AKS API if it performs direct Kubernetes operations.

The project should therefore use a **self-hosted GitHub Actions runner inside the AKS/VNet environment** or another connected execution environment rather than assuming a GitHub-hosted runner can directly reach the private API.

Because the project has only 4 regional vCPUs and those are consumed by the two AKS nodes, adding a separate VM runner is not part of the initial architecture. A runner-as-a-workload inside AKS can be evaluated later without adding another VM.

---

## 12. Secrets and configuration

### ConfigMaps

Use ConfigMaps for non-sensitive values such as:

- environment name
- internal service names
- application feature flags
- non-secret API configuration
- public path/base-path configuration

### Secrets

Use Kubernetes Secrets and/or Azure Key Vault integration for:

- SQL credentials if SQL authentication is used
- application secrets
- certificates/private keys
- tokens

Never commit actual secret values to GitHub.

### Key Vault

Azure Key Vault with a private endpoint is a possible future integration if we decide to move sensitive runtime values out of Kubernetes Secrets. It is **not a mandatory prerequisite for the first private AKS deployment**.

If introduced, the additional private DNS zone would be:

```text
privatelink.vaultcore.azure.net
```

---

## 13. Managed identities and permissions

The architecture should use managed identities instead of long-lived Azure credentials wherever possible.

Expected identity relationships:

```text
AKS control-plane identity
    |
    +--> required network/private DNS permissions during cluster setup

AKS kubelet identity
    |
    +--> AcrPull on ACR

Application workload identity (future, if needed)
    |
    +--> narrowly scoped Azure resource permissions
```

Do not give the AKS kubelet identity broad Owner/Contributor access to the subscription.

If a custom private DNS zone is selected later instead of the AKS-managed default, the required identity and Private DNS Zone Contributor/Network Contributor permissions must be explicitly planned. For the initial build we avoid that additional complexity by using the AKS-managed private DNS zone.

---

## 14. Required integrations

| Integration | Private? | Required now? | Mechanism |
|---|---:|---:|---|
| AKS API server | Yes | Yes | Private AKS + private DNS |
| AKS → ACR | Yes | Yes | ACR Premium + Private Endpoint + `AcrPull` |
| API → Azure SQL | Yes | Yes | SQL Private Endpoint + private DNS |
| Internet → application | No | Yes | Application Gateway public IP |
| Application Gateway → AKS | Yes | Yes | VNet/private backend routing |
| Node egress → Azure/Internet | Outbound path | Yes | AKS outbound configuration |
| AKS → Key Vault | Not initially | No | Future private endpoint/workload identity |
| GitHub Actions → AKS | Private | Phase 2 | Self-hosted runner / connected execution environment |

---

## 15. Provisioning order in Azure Portal

The order matters because several resources depend on networking or identity.

### Phase A — subscription and quota validation

1. Confirm subscription is Azure for Students.
2. Confirm `centralindia` is available.
3. Confirm total regional vCPU quota is at least 4.
4. Confirm the relevant D-series family quota permits two `Standard_D2s_v6` nodes.
5. Confirm public IPv4 quota has room for the planned Application Gateway and AKS outbound IP.
6. Confirm ACR Premium and required AKS/Application Gateway features are available to the subscription.

### Phase B — network foundation

Create:

1. `vnet-azure-project`
2. `snet-aks`
3. `snet-appgw`
4. `snet-private-endpoints`

### Phase C — private ACR

1. Create Premium ACR.
2. Create ACR private endpoint in `snet-private-endpoints`.
3. Create/link `privatelink.azurecr.io`.
4. Verify private DNS resolution.
5. Configure AKS kubelet identity integration/`AcrPull` after the AKS identity exists.
6. Disable public ACR access only after private connectivity is proven.

### Phase D — private AKS

Create AKS with:

- private cluster enabled
- Azure CNI Overlay
- BYO VNet/subnet
- 2-node system pool
- `Standard_D2s_v6`
- standard load balancer/outbound configuration compatible with the public-IP budget
- AKS-managed private DNS initially
- managed identity
- Azure RBAC as appropriate

Do not change networking choices casually after cluster creation. Some AKS networking and private DNS choices are architectural decisions rather than simple application settings.

### Phase E — Azure SQL

1. Create Azure SQL logical server/database.
2. Create SQL private endpoint.
3. Link `privatelink.database.windows.net` to the VNet.
4. Verify private DNS resolution.
5. Disable public network access after private connectivity is validated.
6. Store SQL credentials/configuration securely.

### Phase F — Application Gateway

1. Create one public IP.
2. Create Application Gateway in `snet-appgw`.
3. Configure HTTPS listener/certificate.
4. Connect it to the AKS ingress model.
5. Configure path-based routing.
6. Keep backend Kubernetes services internal.

### Phase G — Kubernetes application

Create namespaces:

```text
kubectl create namespace dev
kubectl create namespace qa
kubectl create namespace prod
```

Then deploy the application to `dev` first:

```text
ConfigMap
Secrets
Frontend Deployment + Service
API Deployment + Service
Maintenance Deployment + Service
Ingress
```

QA and Production are promotion targets and should not be populated until Development is stable.

---

## 16. Validation checklist

### Network

- [ ] VNet exists with the planned CIDR.
- [ ] AKS subnet exists.
- [ ] Application Gateway subnet exists.
- [ ] Private endpoint subnet exists.
- [ ] No unexpected public IPs were created.

### Private AKS

- [ ] `enablePrivateCluster` is true.
- [ ] API server has private addressing.
- [ ] Private DNS zone exists and is linked correctly.
- [ ] Cluster can be administered through Azure Portal Run Command.
- [ ] Two nodes are `Ready`.

### ACR

- [ ] ACR SKU is Premium.
- [ ] Private endpoint is approved/connected.
- [ ] `privatelink.azurecr.io` is linked to the VNet.
- [ ] Registry FQDN resolves to private IP from the cluster.
- [ ] Kubelet identity has `AcrPull`.
- [ ] AKS can pull the AutoCare images.
- [ ] Public ACR access is disabled after validation.

### SQL

- [ ] SQL private endpoint is connected.
- [ ] `privatelink.database.windows.net` is linked to the VNet.
- [ ] `<server>.database.windows.net` resolves privately from the cluster.
- [ ] API can connect to SQL over the private endpoint.
- [ ] Public SQL network access is disabled after validation.

### Application Gateway

- [ ] Exactly one planned public IP is used by Application Gateway.
- [ ] HTTPS listener works.
- [ ] Gateway can reach private AKS backends.
- [ ] `/dev/*` routes correctly.
- [ ] `/dev/api/*` routes correctly.
- [ ] Python maintenance service is not publicly exposed.

### Application

- [ ] Frontend loads.
- [ ] API health endpoint works.
- [ ] Customer CRUD works.
- [ ] Vehicle operations work.
- [ ] Maintenance analysis works.
- [ ] API → maintenance service works internally.
- [ ] API → SQL works privately.

---

## 17. Failure modes to avoid

### Failure: private AKS created but nobody can run kubectl

Cause: administrator machine has no private network path.

Mitigation: use Azure Portal Run Command initially; later provide a connected/self-hosted runner.

### Failure: ACR is private but image pulls fail

Check:

1. ACR is Premium.
2. Private endpoint is connected.
3. Private DNS zone exists and is linked to the VNet.
4. Registry/data endpoint DNS records resolve privately.
5. Kubelet identity has `AcrPull`.
6. Public access was not disabled before private connectivity was verified.

### Failure: SQL private endpoint exists but API cannot connect

Check DNS first. The application should use the normal `<server>.database.windows.net` hostname, which should resolve to the private endpoint through the private DNS zone.

### Failure: unexpected public IP consumption

Inspect:

- Application Gateway frontend IP.
- AKS outbound configuration.
- Any Kubernetes `LoadBalancer` Services.
- Any future Bastion/VPN/NAT design.

Never create a public `LoadBalancer` Service for React/API/maintenance just to make an application reachable. Application Gateway is the intended external entry point.

### Failure: student quota exceeded

Check both:

- Total regional vCPU quota.
- VM-family quota for the selected node size.

Do not add a VM-based CI runner while the AKS node pool consumes the full 4-vCPU budget.

---

## 18. What is deliberately NOT part of the first build

The following are intentionally deferred:

- Azure Firewall
- VPN Gateway
- ExpressRoute
- Hub/spoke topology
- Azure Private DNS Resolver
- Dedicated management VM
- Dedicated VM-based GitHub Actions runner
- Key Vault private endpoint
- Multi-region ACR
- ACR geo-replication
- Separate AKS clusters for QA/Production
- Network-isolated AKS outbound `none`/`block` architecture

These features can be added later if a requirement justifies their cost, quota, or operational complexity.

---

## 19. Final target architecture

```text
                         ┌───────────────────────────┐
                         │         Internet          │
                         └─────────────┬─────────────┘
                                       │
                                 HTTPS / 443
                                       │
                              [Public IP #1]
                                       │
                         ┌─────────────▼─────────────┐
                         │   Application Gateway     │
                         │   snet-appgw              │
                         └─────────────┬─────────────┘
                                       │ private
                                       │
                    ┌──────────────────▼──────────────────┐
                    │             Azure VNet              │
                    │          10.20.0.0/16                │
                    │                                     │
                    │  ┌───────────────────────────────┐  │
                    │  │ snet-aks 10.20.0.0/20         │  │
                    │  │                               │  │
                    │  │ AKS private control plane     │  │
                    │  │ Node 1: D2s_v6               │  │
                    │  │ Node 2: D2s_v6               │  │
                    │  │                               │  │
                    │  │ dev / qa / prod              │  │
                    │  │ React / API / Python         │  │
                    │  └───────────────┬───────────────┘  │
                    │                  │                  │
                    │  ┌──────────────▼───────────────┐  │
                    │  │ snet-private-endpoints      │  │
                    │  │ 10.20.17.0/24                │  │
                    │  │                               │  │
                    │  │ PE -> Private ACR            │  │
                    │  │ PE -> Azure SQL              │  │
                    │  └───────────────────────────────┘  │
                    │                                     │
                    └─────────────────────────────────────┘

Private DNS:
  AKS-managed private zone
  privatelink.azurecr.io
  privatelink.database.windows.net

Public IP budget:
  #1 Application Gateway
  #2 AKS outbound (if required by selected outbound mode)
  #3 reserved
```

---

## 20. References

- Private AKS clusters: https://learn.microsoft.com/en-us/azure/aks/private-clusters
- Private AKS connectivity: https://learn.microsoft.com/en-us/azure/aks/private-cluster-connect
- AKS Run Command/private cluster access: https://learn.microsoft.com/en-us/azure/aks/access-private-cluster
- Azure CNI Overlay: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- ACR/private network-isolated AKS: https://learn.microsoft.com/en-us/azure/aks/network-isolated
- Private endpoint DNS: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Azure SQL private endpoint: https://learn.microsoft.com/en-us/azure/private-link/tutorial-private-endpoint-sql-portal
- Azure SQL Private Link: https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview
- Application Gateway ingress controller: https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- AKS application networking: https://learn.microsoft.com/en-us/azure/aks/plan-application-networking
- Azure VM quotas: https://learn.microsoft.com/en-us/azure/virtual-machines/quotas
