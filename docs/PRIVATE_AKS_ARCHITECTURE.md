# Private AKS Architecture — AutoCare

## Status

**Phase 1 — infrastructure provisioned and validated.**

This document is the current architecture baseline for the private AKS environment. It supersedes the earlier design baseline that described VPN Gateway, Azure Private DNS Resolver, and Key Vault private endpoint as deferred. Those components are now part of the deployed Phase 1 architecture.

Azure resources were provisioned primarily through the Azure Portal and validated with Azure CLI and `kubectl`. Values that were not captured during validation are explicitly marked rather than guessed.

---

## 1. Project constraints and current state

| Item | Current value |
|---|---|
| Region | `centralindia` |
| Primary resource group | `rg-azure-aks` |
| VNet | `vnet-azure-project` |
| AKS | `aks-azure-project` |
| AKS model | **Private AKS control plane** |
| AKS Kubernetes version observed | `v1.35.7` |
| AKS nodes observed | 2, both `Ready` |
| ACR | `acrazureproject.azurecr.io` |
| Azure SQL logical server | `sql-azure-project` |
| Key Vault | `kv-azure-aks-project` |
| Application Gateway | `appgw-azure-project` |
| Application Gateway tier | Standard V2 |
| Application Gateway subnet | `snet-appgw` — `10.20.0.0/24` |
| Ingress approach | Azure Application Gateway + Application Gateway Ingress Controller (AGIC) |
| AGIC deployment | `ingress-appgw-deployment` |
| AGIC namespace | `kube-system` |
| AKS DNS service | `10.0.0.10` |

---

## 2. Architecture at a glance

```text
                                      INTERNET
                                          |
                                          v
                              Application Gateway
                              appgw-azure-project
                              Standard V2
                                          |
                              Public frontend IP
                                          |
                              L7 listener / routing
                                          |
                                          v
                             AGIC / Kubernetes Ingress
                                          |
                                  Kubernetes Service
                                          |
                                          v
                                         PODS
                                          |
              +---------------------------+--------------------------+
              |                           |                          |
              v                           v                          v
        Private ACR                 Azure SQL                  Azure Key Vault
        acrazureproject             sql-azure-project          kv-azure-aks-project
              |                           |                          |
        Private Endpoint             Private Endpoint           Private Endpoint
              |                           |                          |
             NIC                         NIC                        NIC
              |                           |                          |
              +---------------------------+--------------------------+
                                          |
                                    Private DNS
                                          |
                              Azure Private DNS Resolver
                                          |
                              vnet-azure-project
                                          |
             +----------------------------+--------------------------+
             |                                                       |
             v                                                       v
       Private AKS API                                          AKS nodes
             |                                                       |
             |                                                   VMSS / LB
             |                                                       |
       kube-apiserver                                         AKS managed RG

ADMINISTRATOR PATH

Developer PC
    |
    | Point-to-Site VPN
    v
VPN Gateway
    |
    v
Azure VNet / private DNS
    |
    v
Private AKS API endpoint
    |
    v
kubectl
```

The architecture intentionally has two different traffic roles:

1. **Private administrative/control-plane path:** PC -> P2S VPN -> private AKS API.
2. **Public application entry path:** Internet -> Application Gateway -> AGIC -> Kubernetes Services -> Pods.

The Azure Load Balancer associated with AKS worker infrastructure remains a separate L4 infrastructure component. It is not replaced by Application Gateway.

---

## 3. Resource-group model

Azure resources associated with AKS do not all live in the project's primary resource group.

### 3.1 Primary project resource group

```text
rg-azure-aks
```

Contains the project's main resources, including the VNet, private networking components, PaaS services/private endpoints as configured, and Application Gateway.

### 3.2 AKS-managed node/infrastructure resource group

AKS automatically creates a separate resource group with a name similar to:

```text
MC_rg-azure-aks_aks-azure-project_centralindia_...
```

This managed resource group contains infrastructure required by the AKS node/data plane, such as:

- VM Scale Set / worker-node instances
- Node NICs
- Managed disks
- Azure Load Balancer
- Related public IP and network resources where applicable
- Other AKS-managed infrastructure

This is expected Azure AKS behavior. The `MC_...` resource group is not a second Kubernetes cluster; it is the Azure infrastructure layer managed by AKS.

### 3.3 Monitoring resource groups

Azure Monitor also creates/supports managed resource groups for monitoring resources. The environment observed components such as:

- Azure Monitor Agent / Container Insights components
- Managed Prometheus metrics components
- Data Collection Rules / endpoints
- Log Analytics resources

These managed resource groups are separate from the project's primary resource group and should not be treated as application resource groups.

---

## 4. VNet and subnet architecture

### VNet

```text
vnet-azure-project
```

The VNet is the private network boundary for the project.

The exact VNet CIDR was not re-captured during the final validation session and is therefore not restated here as a verified value.

### Confirmed subnet

| Subnet | CIDR | Purpose | NSG / delegation observed |
|---|---|---|---|
| `snet-appgw` | `10.20.0.0/24` | Dedicated Application Gateway subnet | No NSG; no delegation observed |

### Private endpoint subnet

The Azure Portal shows the subnet used for private endpoint deployment as:

```text
PrivateEndpointSubnet
```

Its exact CIDR was not captured in the final validation output.

### AKS/node subnet

The AKS node subnet exists in the VNet. Its exact final name and CIDR were not captured in the final validation output and are intentionally not guessed here.

### Important subnet rule

`snet-appgw` is dedicated to Application Gateway. AKS nodes and private endpoints should not be placed into that Application Gateway subnet.

---

## 5. Point-to-Site VPN architecture

The administrator access model uses an **Azure VPN Gateway with Point-to-Site (P2S) configuration**.

```text
Administrator PC
      |
      | VPN client / P2S
      v
Azure VPN Gateway
      |
      v
vnet-azure-project
      |
      +--> Private AKS API
      +--> Private DNS / Resolver
      +--> Private Azure resources
```

This VPN is important because the AKS API server is private.

### Observed behavior

When the VPN automatically disconnected, this command failed:

```powershell
kubectl get no
```

with a DNS error for the private AKS API hostname.

After the VPN was reconnected, `kubectl` access returned to normal and the nodes were visible as `Ready`.

This provides practical validation that the administrator path is dependent on the private network/VPN path rather than a public AKS API endpoint.

The exact VPN Gateway resource name, SKU, public IP and GatewaySubnet CIDR were not captured in the final validation output.

---

## 6. Private AKS control plane

The cluster is:

```text
aks-azure-project
```

and uses a **private AKS control plane**.

The private API server is exposed through the AKS private endpoint/private DNS architecture rather than a public Kubernetes API endpoint.

### Observed node state

```text
aks-agentpool-13605033-vmss000000   Ready   v1.35.7
aks-agentpool-13605033-vmss000001   Ready   v1.35.7
```

### Kubernetes DNS

Pods queried:

```text
10.0.0.10
```

for cluster DNS resolution.

The private AKS API FQDN observed during the project resolves through the private DNS path when the administrator is connected to the private network.

---

## 7. Azure Private DNS Resolver

Azure Private DNS Resolver is part of the deployed Phase 1 architecture.

Its purpose is to provide private DNS resolution between the VNet, private endpoints, Azure services, and connected clients/workloads.

The important flow is:

```text
AKS Pod / private client
        |
        v
DNS resolution
        |
        v
Private DNS Resolver / Azure DNS path
        |
        v
Private DNS zone
        |
        v
Private endpoint IP
```

The exact Private DNS Resolver resource name, inbound/outbound endpoint names, and endpoint IP addresses were not captured in the final validation output.

The resolver is nevertheless operationally confirmed by the successful private DNS lookups from an AKS Pod described below.

---

## 8. Private DNS zones

The architecture uses Azure Private DNS zones for Private Link services.

### ACR

```text
privatelink.azurecr.io
```

### Azure SQL

```text
privatelink.database.windows.net
```

### Key Vault

```text
privatelink.vaultcore.azure.net
```

### AKS private API

The private AKS API also uses its private DNS architecture. The exact AKS-managed zone name is intentionally not hard-coded here because it is generated/managed by AKS.

### DNS design principle

Applications continue to use the normal Azure service hostname. DNS maps that hostname through the Private Link namespace to a private IP.

For example:

```text
sql-azure-project.database.windows.net
        |
        v
sql-azure-project.privatelink.database.windows.net
        |
        v
10.20.2.6
```

---

## 9. Private Endpoint architecture

Private Endpoints provide the private network attachment from the VNet to Azure PaaS services.

Conceptually:

```text
Azure PaaS service
       |
       v
Private Endpoint
       |
       v
Private Endpoint NIC
       |
       v
Private IP in VNet
       |
       v
Private DNS record
```

Phase 1 uses this pattern for:

- Azure Container Registry
- Azure SQL
- Azure Key Vault

The exact generated Private Endpoint and NIC resource names are not repeated where they were not captured in the final CLI output.

---

## 10. Azure Container Registry

### Resource

```text
acrazureproject
acrazureproject.azurecr.io
```

The registry is integrated privately with AKS.

### Architecture

```text
AKS kubelet
    |
    | image pull
    v
acrazureproject.azurecr.io
    |
    v
privatelink.azurecr.io
    |
    v
ACR Private Endpoint
    |
    v
ACR
```

### Actual validation

A small `hello-world` image was pulled from Docker Hub on the administrator PC, tagged/pushed to ACR, and then deployed from:

```text
acrazureproject.azurecr.io/hello-world:latest
```

The AKS node successfully reported:

```text
Successfully pulled image
```

This is stronger validation than a DNS-only test: the Kubernetes node actually retrieved the image from the private ACR path.

---

## 11. Azure SQL private integration

### Resource

```text
sql-azure-project
```

### DNS

From an AKS Pod:

```text
sql-azure-project.database.windows.net
    -> sql-azure-project.privatelink.database.windows.net
    -> 10.20.2.6
```

### Network validation

The following test succeeded from the AKS Pod:

```powershell
kubectl exec -it network-test -- nc -vz sql-azure-project.database.windows.net 1433
```

Result:

```text
Connection to sql-azure-project.database.windows.net (10.20.2.6)
1433 port [tcp/ms-sql-s] succeeded!
```

This validates private DNS and TCP network reachability to SQL.

It does not by itself validate SQL credentials, TLS configuration, database permissions, or application queries.

---

## 12. Azure Key Vault private integration

### Resource

```text
kv-azure-aks-project
```

### Confirmed configuration

```text
Region: Central India
Pricing tier: Standard
Public network access: Disabled
Permission model: Azure role-based access control
Connectivity: Private endpoint
```

### Private DNS

From an AKS Pod:

```text
kv-azure-aks-project.vault.azure.net
    -> kv-azure-aks-project.privatelink.vaultcore.azure.net
    -> 10.20.2.7
```

The Private DNS zone is:

```text
privatelink.vaultcore.azure.net
```

The private DNS zone was created successfully and a VNet link was observed provisioning for `vnet-azure-project`.

### Phase 1 conclusion

Key Vault is not a future/deferred component anymore. The **Key Vault Private Endpoint and private DNS integration are part of the actual Phase 1 architecture**.

A future workload-identity test can validate that an application Pod is authorized to read a specific secret. That is an authorization/application test, separate from the network validation already performed.

---

## 13. Application Gateway

### Resource

```text
appgw-azure-project
```

### Confirmed properties

| Property | Value |
|---|---|
| Tier | Standard V2 |
| VNet | `vnet-azure-project` |
| Subnet | `snet-appgw` |
| Subnet CIDR | `10.20.0.0/24` |
| Public frontend IP observed | `4.247.238.128` |

Application Gateway is the intended **public L7 application entry point**.

```text
Internet
   |
   v
Public IP
   |
   v
Application Gateway
   |
   v
AGIC / Ingress
   |
   v
Kubernetes Service
   |
   v
Pod
```

The Application Gateway lives in the project's VNet/subnet, while Azure may place the gateway's managed supporting resources into the AKS/application infrastructure resource group model. Resource-group placement does not change the VNet relationship.

---

## 14. Application Gateway Ingress Controller (AGIC)

The project uses the **Application Gateway + Kubernetes Ingress Controller approach**.

It does **not** introduce a new Gateway API architecture.

The Kubernetes-side deployment observed is:

```text
Namespace: kube-system
Deployment: ingress-appgw-deployment
```

The controller connects Kubernetes Ingress definitions with Azure Application Gateway configuration.

Conceptually:

```text
Kubernetes Ingress object
          |
          v
       AGIC
          |
          v
Application Gateway configuration
          |
          v
Listener / routing / backend
```

The Application Gateway is therefore an Azure resource, while AGIC is the Kubernetes controller that reconciles Kubernetes ingress configuration with that Azure resource.

---

## 15. Azure Load Balancer vs Application Gateway

These are not the same component and both can exist in the architecture.

### Azure Load Balancer

The AKS-managed Load Balancer is part of the node/data-plane infrastructure in the `MC_...` resource group.

It provides L4 network load-balancing functionality for AKS infrastructure and Kubernetes services that require it.

### Application Gateway

Application Gateway is the dedicated L7 HTTP/HTTPS application ingress layer.

It provides capabilities such as:

- HTTP/HTTPS listeners
- Host/path routing
- TLS termination
- Web application routing
- Backend health probing
- Integration with AGIC

Therefore:

```text
AKS infrastructure LB  = L4 / Azure-Kubernetes infrastructure
Application Gateway     = L7 / application ingress
```

The Application Gateway is not simply replacing the AKS Load Balancer.

---

## 16. Monitoring and Prometheus metrics

Azure Monitor monitoring is part of Phase 1.

The Kubernetes system namespace was observed to contain components including:

```text
ama-metrics
ama-metrics-ksm
ama-metrics-node
ama-logs
metrics-server
```

Azure Monitor resources observed/used by the architecture include the monitoring workspace and managed collection resources such as Data Collection Rules/Endpoints and Log Analytics resources.

### Managed Prometheus

The project uses **Azure Monitor Managed Prometheus** rather than requiring a self-managed Prometheus server deployment in the application namespaces.

The `ama-metrics*` workloads are the Kubernetes-side metric collection components.

### Important distinction

```text
Kubernetes metrics collection
        |
        v
Azure Monitor Agent / Managed Prometheus
        |
        v
Azure Monitor workspace
        |
        +--> queries / dashboards / alerts as configured
```

The project repository documents this monitoring architecture. No claim is made here that a standalone self-managed Prometheus server is stored in the application repository.

---

## 17. Kubernetes system components relevant to Phase 1

The following Kubernetes-side components were observed in `kube-system` during validation:

- CoreDNS
- Azure CNI / networking components
- CSI Azure Disk/File drivers
- Cloud Node Manager
- Kube-proxy
- Metrics Server
- Azure Monitor Agent / Managed Prometheus components
- `ingress-appgw-deployment`
- Other standard AKS control/data-plane add-ons

These components are not application workloads. They support the AKS platform, networking, storage, ingress and observability layers.

---

## 18. Identity and access model

The architecture uses Azure managed identities and RBAC where supported rather than distributing long-lived Azure credentials.

Important relationships include:

```text
AKS / kubelet identity
        |
        +--> ACR image-pull authorization

Application workload identity (where implemented)
        |
        +--> narrowly scoped Azure resource permissions

Human administrator
        |
        +--> Azure RBAC + Kubernetes RBAC
```

During validation, the current Kubernetes identity returned:

```text
kubectl auth can-i delete nodes
yes
```

This confirms the current identity has cluster-level permission to delete nodes. It is an observation of the configured RBAC state, not a recommended routine operation.

---

## 19. Secrets and Key Vault direction

The private Key Vault foundation is now present.

Sensitive configuration should not be committed to GitHub.

The intended progression is:

```text
Application Pod
      |
      v
Workload identity
      |
      v
Azure RBAC
      |
      v
Private Key Vault
      |
      v
Secret / certificate / key
```

Non-sensitive configuration can remain in Kubernetes ConfigMaps. Sensitive values should use an appropriate secret-management mechanism, with Key Vault available as the Azure-managed secret store.

---

## 20. Verified traffic flows

### 20.1 Administrator -> private AKS API

```text
PC
 -> P2S VPN
 -> VPN Gateway
 -> VNet/private DNS
 -> Private AKS API
 -> kubectl
```

### 20.2 AKS -> ACR

```text
AKS node
 -> acrazureproject.azurecr.io
 -> private DNS
 -> ACR Private Endpoint
 -> ACR
 -> container image
```

**Validated with an actual `hello-world` image pull.**

### 20.3 AKS -> Azure SQL

```text
Pod
 -> sql-azure-project.database.windows.net
 -> privatelink.database.windows.net
 -> 10.20.2.6
 -> SQL Private Endpoint
 -> Azure SQL
```

**Validated with DNS lookup and TCP/1433 connectivity.**

### 20.4 AKS -> Key Vault

```text
Pod
 -> kv-azure-aks-project.vault.azure.net
 -> privatelink.vaultcore.azure.net
 -> 10.20.2.7
 -> Key Vault Private Endpoint
 -> Key Vault
```

**Validated with private DNS resolution.**

### 20.5 Internet -> application

```text
Internet
 -> Application Gateway public frontend
 -> listener/routing rule
 -> AGIC-managed backend
 -> Kubernetes Service
 -> application Pod
```

The remaining end-to-end HTTP/HTTPS application test belongs to the application/ingress phase.

---

## 21. Validation checklist

| Validation | Result | Meaning |
|---|---|---|
| `kubectl get nodes` | 2 nodes `Ready` | AKS worker plane healthy at validation time |
| Private AKS API | Working over VPN | Private administration path operational |
| VPN disconnect test | API hostname became unresolvable | Confirms dependence on private access path |
| ACR image pull | Successful | AKS can pull from ACR |
| SQL DNS lookup | `10.20.2.6` | Private SQL DNS works |
| SQL TCP/1433 | Succeeded | Private SQL network path works |
| Key Vault DNS lookup | `10.20.2.7` | Private Key Vault DNS works |
| Key Vault public access | Disabled | Public network access is blocked |
| Application Gateway | Created | Azure L7 ingress resource exists |
| AGIC deployment | Running | Kubernetes-side ingress controller exists |
| Managed Prometheus components | Running | Monitoring/metrics foundation exists |

---

## 22. Phase 1 architecture is complete

Phase 1 now contains the intended private infrastructure foundation:

```text
+---------------------------------------------------------------+
|                        Azure Subscription                    |
|                                                               |
|  rg-azure-aks                                                 |
|  +---------------------------------------------------------+  |
|  | vnet-azure-project                                      |  |
|  |                                                         |  |
|  |  snet-appgw 10.20.0.0/24                               |  |
|  |       |                                                 |  |
|  |       +--> Application Gateway                          |  |
|  |                                                         |  |
|  |  AKS subnet                                             |  |
|  |       |                                                 |  |
|  |       +--> Private AKS                                  |  |
|  |                                                         |  |
|  |  Private Endpoint subnet                                |  |
|  |       |                                                 |  |
|  |       +--> ACR PE/NIC                                   |  |
|  |       +--> SQL PE/NIC                                   |  |
|  |       +--> Key Vault PE/NIC                             |  |
|  |                                                         |  |
|  |  Private DNS Resolver                                   |  |
|  |       |                                                 |  |
|  |       +--> ACR / SQL / Key Vault private DNS zones      |  |
|  +---------------------------------------------------------+  |
|                                                               |
|  MC_... AKS managed resource group                            |
|       +--> VMSS / nodes / NICs / disks / Load Balancer       |
|                                                               |
|  Monitoring managed resources                                 |
|       +--> Azure Monitor / Managed Prometheus / Log Analytics |
+---------------------------------------------------------------+

Administrator PC
      |
      +--> P2S VPN -> VPN Gateway -> Private AKS API

Internet
      |
      +--> Application Gateway -> AGIC -> Kubernetes Services
```

The infrastructure foundation is therefore complete. The next work is application-facing: deploy the application workloads, expose them through internal Kubernetes Services, configure the required Ingress rules/listeners/backend routing, configure HTTPS/TLS as required, and perform an end-to-end application request test.

---

## 23. Items intentionally not guessed in this document

The following values were not captured in the final validation evidence and should be obtained from Azure if exact inventory is required:

- Exact VNet CIDR in the final deployed state.
- Exact AKS/node subnet name and CIDR.
- Exact `PrivateEndpointSubnet` CIDR.
- VPN Gateway exact resource name, SKU, public IP and GatewaySubnet CIDR.
- Private DNS Resolver resource name, endpoint names and endpoint IPs.
- Generated Private Endpoint resource names and NIC names.
- ACR Private Endpoint IP address.
- Complete generated `MC_...` resource-group suffix and full resource inventory.
- Exact Azure Monitor workspace/DCR/DCE generated resource names.
- Complete Application Gateway listener, probe, backend-pool and routing-rule configuration.

These omissions are deliberate: architecture documentation should distinguish verified deployed values from planned or inferred values.

---

## 24. Historical note

An earlier version of this document listed the following as intentionally deferred:

- VPN Gateway
- Azure Private DNS Resolver
- Key Vault private endpoint

Those statements are **obsolete** for the current environment.

They were design-stage decisions from before provisioning. The actual Phase 1 environment now includes all three:

```text
P2S VPN Gateway              -> DEPLOYED
Azure Private DNS Resolver   -> DEPLOYED / IN USE
Key Vault Private Endpoint   -> DEPLOYED / DNS VALIDATED
```

This section is retained only to prevent future readers from mistaking the historical design baseline for the current architecture.

---

## 25. Repository documentation relationship

This file is the current private-AKS architecture baseline for the project repository:

```text
docs/PRIVATE_AKS_ARCHITECTURE.md
```

Other repository documents may contain earlier planning assumptions. When there is a conflict between a historical planning statement and this current architecture baseline, the deployed Azure/Kubernetes state and the latest validated evidence should be treated as authoritative.
