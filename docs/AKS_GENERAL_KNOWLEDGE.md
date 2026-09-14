# AKS General Knowledge — Cluster Types, Networking, and Azure Resources

> Purpose: a durable learning/reference document for understanding what an Azure Kubernetes Service (AKS) cluster is, what Azure creates around it, the different cluster/control-plane and networking models, and what each resource does.
>
> This is a **general AKS knowledge document**, not the project's deployment configuration. Project-specific decisions belong in `ARCHITECTURE.md`, `NETWORKING.md`, `AKS_CLUSTER_PRESETS.md`, and `INFRASTRUCTURE.md`.

---

## 1. What AKS Actually Is

Azure Kubernetes Service (AKS) is a managed Kubernetes service.

At a conceptual level, an AKS cluster has two major sides:

```text
                         AKS CLUSTER
                              |
                +-------------+-------------+
                |                           |
          CONTROL PLANE                 NODE SIDE
          Managed by Azure              Worker capacity
                |                           |
        API server / scheduler       Node pools / nodes
        controllers / etcd            Pods / containers
                |                           |
                +-------------+-------------+
                              |
                    Azure networking
                    + Azure resources
```

The important distinction is:

- **Control plane** = Kubernetes management/control functions. Azure operates these for AKS.
- **Node side / data plane** = worker nodes where our application workloads run. These are represented by Azure infrastructure resources such as VM Scale Sets, NICs, disks, and networking resources.

You interact with the cluster through the Kubernetes API server (`kubectl`, Helm, manifests, CI/CD, etc.), but you normally do not manage the AKS control-plane machines as ordinary VMs.

---

# 2. AKS Resource Hierarchy

A useful mental model is:

```text
Azure Subscription
|
+-- Resource Group (customer/project RG)
|   |
|   +-- AKS resource
|   +-- ACR
|   +-- VNet / subnets (if customer-managed)
|   +-- Azure SQL
|   +-- Application Gateway
|   +-- Log Analytics / Azure Monitor resources
|   +-- Key Vault, etc.
|
+-- AKS infrastructure resource group (MC_...)
    |
    +-- VM Scale Set(s)
    +-- VM/node networking resources
    +-- Load Balancer
    +-- Public IPs, where applicable
    +-- Disks
    +-- NSG / route resources, depending on networking design
    +-- Other AKS-managed infrastructure
```

The exact set of resources varies with AKS configuration and Azure features enabled.

---

# 3. The Two Resource Groups You Should Understand

## 3.1 Customer / main resource group

This is the resource group we deliberately create for the project, for example:

```text
rg-azure-aks
```

It is where we normally keep the top-level project resources we own, such as:

- AKS resource
- Azure Container Registry
- VNet/subnets when using a customer-managed VNet
- Application Gateway
- Azure SQL
- Key Vault
- monitoring resources
- other application infrastructure

The AKS resource itself represents the managed AKS service.

## 3.2 AKS infrastructure resource group (`MC_...`)

AKS creates a separate infrastructure resource group, normally named similar to:

```text
MC_<main-resource-group>_<aks-name>_<region>
```

Example from our portal work:

```text
MC_rg-azure-aks_aks-azure-project_centralindia
```

This resource group is used by AKS for infrastructure associated with the worker/data-plane side and supporting Azure resources.

Typical resources include:

- Virtual Machine Scale Sets for node pools
- VM/node NICs
- managed disks
- Azure Load Balancer resources
- public IP resources when required
- network security and routing resources depending on the selected network model
- other AKS-managed infrastructure

### Does the `MC_...` resource group contain the AKS control plane?

**Not as ordinary customer-visible control-plane VMs.**

The control plane is part of the AKS service and is managed by Azure. You should not expect to find an API-server VM, scheduler VM, controller-manager VM, or etcd VM in the `MC_...` resource group that you manage like your worker nodes.

The `MC_...` group is therefore best thought of as the **AKS-managed infrastructure resource group**, not the "control-plane resource group".

---

# 4. AKS Control Plane

The Kubernetes control plane is responsible for deciding and coordinating what the cluster should do.

Major conceptual components:

| Component | Purpose |
|---|---|
| Kubernetes API server | Main API endpoint for Kubernetes operations |
| Scheduler | Chooses suitable nodes for new Pods |
| Controller managers | Continuously reconcile desired vs actual state |
| etcd | Kubernetes cluster state database |
| Cloud/controller integrations | Coordinate Kubernetes resources with Azure resources |

## API server

The API server is the front door to Kubernetes.

Examples of operations that go through it:

```bash
kubectl get nodes
kubectl get pods
kubectl apply -f deployment.yaml
kubectl create namespace dev
```

The API server is **not the same thing as the application entry point**.

For our application architecture, these are separate:

```text
User/browser
    |
    v
Application Gateway / Ingress
    |
    v
Application services

Administrator / CI/CD
    |
    v
AKS Kubernetes API server
```

---

# 5. AKS Cluster / Control-Plane Access Types

One important AKS distinction is whether the Kubernetes API server is exposed publicly or privately.

## 5.1 Public AKS cluster

The API server has a public endpoint.

Conceptually:

```text
Laptop / CI system
       |
       | HTTPS 443
       v
Public AKS API endpoint
       |
       v
AKS control plane
```

A public endpoint does **not** mean the application itself must be public.

We can have:

```text
Public Kubernetes API
        |
        +-- administrative access

Public Application Gateway
        |
        +-- application traffic
```

The two public endpoints have different purposes.

For a public API server, **authorized IP ranges** can be used to restrict which source IPs can access the API server.

## 5.2 Private AKS cluster

The Kubernetes API server is reachable through a private endpoint/private networking path rather than a normal public API endpoint.

Conceptually:

```text
Laptop / VM / CI runner
        |
     VPN / VNet / ExpressRoute
        |
        v
Private AKS API endpoint
        |
        v
AKS control plane
```

Private AKS improves API-plane isolation but creates an important operational requirement: whatever needs to run `kubectl` or otherwise reach the API server must have suitable network connectivity and DNS resolution.

### Public vs private is about the API/control plane

Do **not** confuse this with pod networking.

These are independent decisions:

```text
Decision A: How do I reach the AKS API server?
    -> Public or Private

Decision B: How do Pods receive IP addresses?
    -> Azure CNI Overlay / Pod Subnet / Node Subnet / legacy kubenet

Decision C: How do Pods get network-policy enforcement?
    -> None / Azure / Calico / Cilium depending on supported configuration

Decision D: How does application traffic enter?
    -> LoadBalancer / Ingress / Application Gateway, etc.
```

This separation is one of the most important AKS networking concepts.

---

# 6. Worker Nodes and Node Pools

The worker side is where our workloads actually execute.

A **node pool** is a group of worker nodes with a common configuration.

Conceptually:

```text
AKS
|
+-- System node pool
|     +-- Node 1
|     +-- Node 2
|
+-- User node pool
      +-- Node 1
      +-- Node 2
```

A node is normally backed by an Azure VM/VM Scale Set instance.

The node runs components such as:

- container runtime
- kubelet
- networking components
- system Pods
- application Pods, depending on scheduling

## System vs user node pools

### System node pool

Intended for critical AKS/Kubernetes system Pods.

### User node pool

Intended primarily for application workloads.

For a small learning/student cluster, we may deliberately keep the architecture simple rather than immediately creating many node pools.

---

# 7. Important Azure Resources Around an AKS Cluster

## 7.1 AKS resource

The `Microsoft.ContainerService/managedClusters` resource represents the AKS cluster configuration and managed service.

It contains configuration such as:

- Kubernetes version
- node pools
- identity configuration
- networking configuration
- API-server access configuration
- add-ons/integrations
- RBAC configuration
- DNS prefix
- load balancer/outbound settings
- monitoring configuration

It does not mean that every underlying Kubernetes/Azure resource is physically represented by this single resource.

## 7.2 Virtual Machine Scale Set (VMSS)

Node pools commonly use VM Scale Sets.

A VMSS provides the scalable VM capacity on which worker nodes run.

```text
Node pool
   |
   v
VM Scale Set
   |
   +-- VM/node 0
   +-- VM/node 1
   +-- VM/node 2
```

When you scale a node pool, AKS changes the number of VMSS instances.

## 7.3 Network Interface Cards (NICs)

Each node needs network connectivity.

The node's NIC connects it to the Azure VNet/subnet and therefore to other Azure networking components.

The exact pod-networking behavior depends on the chosen CNI/IPAM model.

## 7.4 Managed disks

Worker nodes can use managed disks for OS and attached storage requirements.

Kubernetes persistent storage can also use Azure-managed storage through CSI drivers, depending on the workload.

## 7.5 Azure Load Balancer

AKS commonly uses the Azure Load Balancer for Kubernetes `Service` objects of type `LoadBalancer` and for related cluster networking functions.

It is a Layer 4 load-balancing resource.

It is different from an HTTP/HTTPS Layer 7 ingress controller/Application Gateway.

## 7.6 Public IP

A public IP can be associated with resources such as:

- public AKS API endpoint
- Azure Load Balancer frontend
- Application Gateway
- NAT Gateway or other Azure networking components

A public IP is therefore not synonymous with "the AKS cluster is public."

## 7.7 Network Security Group (NSG)

An NSG provides network-level filtering rules for Azure network interfaces/subnets.

It is primarily an Azure networking control.

It is not the same as Kubernetes NetworkPolicy.

## 7.8 Route table / User Defined Routes (UDRs)

A route table controls network routes associated with Azure subnets.

Some legacy AKS networking designs, particularly kubenet, rely on route-table configuration.

Modern Azure CNI Overlay does not require the same kubenet-style user-defined route architecture for pod routing.

## 7.9 VNet

The Azure Virtual Network provides the private Azure network boundary for the cluster nodes and related resources.

A VNet contains subnets.

## 7.10 Subnet

A subnet is an IP address range within the VNet.

With overlay networking, the node subnet primarily needs to provide IP addresses for nodes because Pod IPs come from a separate overlay CIDR.

With flat networking, Pod IP consumption can be much more directly tied to Azure VNet/subnet address space.

## 7.11 Private DNS

Private DNS is especially important for private connectivity patterns, including private AKS API endpoints and other Azure private endpoints.

DNS is often the invisible reason that a private network design appears to be "not working" even when routing is correct.

---

# 8. AKS Networking — The Big Picture

AKS networking is easier when separated into layers.

```text
NETWORKING
|
+-- 1. Control-plane/API access
|      +-- Public API
|      +-- Private API
|
+-- 2. Pod IPAM / CNI model
|      +-- Azure CNI Overlay
|      +-- Azure CNI Pod Subnet
|      +-- Azure CNI Node Subnet (legacy)
|      +-- kubenet (legacy)
|
+-- 3. Network data plane / policy
|      +-- Azure CNI / Azure CNI powered by Cilium
|      +-- NetworkPolicy options
|
+-- 4. Kubernetes Services
|      +-- ClusterIP
|      +-- NodePort
|      +-- LoadBalancer
|
+-- 5. Ingress / Layer 7
|      +-- Ingress controller
|      +-- Application Gateway / related integration
|
+-- 6. Outbound / egress
       +-- Load Balancer managed outbound
       +-- NAT Gateway
       +-- user-defined routing / firewall patterns
       +-- other supported outbound configurations
```

The terms above are related, but they are **not interchangeable**.

---

# 9. The Networking Models — What We Previously Called the "Three Types"

Older AKS discussions commonly group the major choices as:

1. Azure CNI Overlay
2. Azure CNI / flat networking using the node subnet
3. kubenet

Current AKS documentation is more precise and distinguishes **Azure CNI Overlay**, **Azure CNI Pod Subnet**, **Azure CNI Node Subnet (legacy)**, and **kubenet (legacy)**.

Therefore, the old "three types" explanation should be treated as a simplified learning model, not the complete current list.

For new AKS designs, Azure recommends modern Azure CNI options, with **Azure CNI Overlay** being the common general-purpose choice.

---

# 10. Azure CNI Overlay

## What it is

Pods receive IP addresses from a private overlay CIDR that is separate from the Azure VNet/subnet used by the nodes.

Example:

```text
Azure VNet
10.0.0.0/16
|
+-- AKS node subnet
|   10.0.1.0/24
|      |
|      +-- Node 1: 10.0.1.4
|      +-- Node 2: 10.0.1.5
|
+-- Pod overlay CIDR
    10.244.0.0/16
       |
       +-- Pod: 10.244.x.x
       +-- Pod: 10.244.x.x
```

The Pod addresses are not consuming ordinary VNet subnet IPs in the same way as flat Azure CNI networking.

## Why it exists

The main goal is to reduce VNet IP pressure and simplify scaling.

This is especially useful when a cluster can have many Pods but the Azure VNet has a limited amount of address space.

## Advantages

- Efficient use of VNet address space
- Strong scalability
- Simpler IP planning than flat Pod-subnet models
- Good general-purpose choice for new AKS clusters
- Pod overlay CIDR can be reused across clusters when appropriately planned

## Trade-off

Pods are not ordinary directly addressable VNet IPs from every external network.

Traffic leaving the cluster is normally SNATed to the node IP when appropriate, while Kubernetes Services/load balancers provide supported inbound exposure.

## Our project

We selected **Azure CNI Overlay** because it is a sensible general-purpose model for our small student-subscription cluster and avoids consuming large amounts of VNet IP space for Pods.

---

# 11. Azure CNI Pod Subnet

Azure CNI Pod Subnet is a **flat networking** model.

Pods receive IP addresses from a dedicated Azure subnet rather than a separate overlay CIDR.

Conceptually:

```text
VNet
|
+-- Node subnet
|     +-- Nodes
|
+-- Pod subnet
      +-- Pod IPs
      +-- Pod IPs
      +-- Pod IPs
```

## Why use it

It is useful when Pods need stronger direct Azure VNet connectivity and directly addressable pod IPs are important.

## Cost/complexity

The price is mainly **IP planning**.

If the cluster grows, Pods consume actual Azure subnet addresses, so the subnet must be sized accordingly.

This can become a significant design consideration for large clusters.

---

# 12. Azure CNI Node Subnet — Legacy Flat Networking

With Azure CNI Node Subnet, Pods receive IP addresses from the node subnet.

Conceptually:

```text
VNet
|
+-- AKS subnet
    |
    +-- Node IP
    +-- Node IP
    +-- Pod IP
    +-- Pod IP
    +-- Pod IP
```

## Why it existed

This model gives Pods Azure VNet IP addresses and direct connectivity characteristics useful for workloads that need them.

## Main problem

The node subnet must have enough IP space for both nodes and Pods.

That makes IP planning much more important and can result in address exhaustion.

It is now considered a legacy CNI model and should generally not be the first choice for a new deployment.

---

# 13. Kubenet — Legacy

Kubenet is another legacy networking model.

Pods use a separate address range, while Azure routing is used to connect the Pod network to the node/VNet environment.

Historically, kubenet was attractive because it consumed fewer Azure VNet IP addresses.

However, it has additional routing complexity and is being retired for AKS.

**Important current status:** AKS kubenet networking is scheduled for retirement on **March 31, 2028**. New designs should therefore prefer Azure CNI Overlay rather than starting with kubenet.

---

# 14. Overlay vs Flat Networking

The easiest comparison is:

| Concept | Overlay | Flat |
|---|---|---|
| Pod IP source | Separate Pod CIDR | Azure VNet/subnet |
| VNet IP consumption by Pods | Low | Higher |
| IP planning | Simpler | More demanding |
| Scalability | Strong | Depends heavily on subnet size |
| Direct Pod addressability from connected networks | More limited | Stronger |
| General new AKS choice | Azure CNI Overlay | Pod Subnet when flat networking is required |

The key question is not "which one is better?".

It is:

> **Do my Pods need to behave like first-class IP addresses in the Azure VNet, or do I prefer scalable Pod networking with a separate overlay address space?**

---

# 15. CNI / IPAM vs Cilium — Another Important Distinction

A common AKS learning mistake is treating Cilium as simply another IP-address model.

It is better to separate:

```text
IPAM / Pod networking
        |
        +-- Azure CNI Overlay
        +-- Azure CNI Pod Subnet
        +-- Azure CNI Node Subnet

Data plane / networking technology
        |
        +-- Azure CNI networking
        +-- Azure CNI Powered by Cilium
```

Cilium can provide the network data plane and policy functionality in supported AKS configurations.

It is not simply "the fourth type of Pod CIDR".

For our first learning cluster, keeping Cilium disabled lets us understand basic AKS networking before adding a more advanced networking data plane.

---

# 16. Network Policies

Network policy controls **which Pods can communicate with which other Pods**.

Without network policies, Pods can generally communicate without restrictive policy rules.

Example desired policy:

```text
React frontend
      |
      | allowed
      v
Node API
      |
      | allowed
      v
Python service
      |
      | restricted / controlled
      v
Database-facing components
```

AKS exposes network-policy choices such as:

- None
- Azure network policy
- Calico
- Cilium-based policy capabilities in supported configurations

## NetworkPolicy is not an NSG

### Azure NSG

Controls Azure network traffic at the network/subnet/NIC layer.

### Kubernetes NetworkPolicy

Controls Pod-to-Pod traffic according to Kubernetes policy semantics.

A useful mental model:

```text
Azure NSG
    = Azure infrastructure/network boundary

Kubernetes NetworkPolicy
    = Pod/application network boundary
```

---

# 17. Kubernetes Service Networking

Kubernetes Services provide stable access to dynamic Pods.

## ClusterIP

Default internal service type.

```text
Pod A
  |
  v
ClusterIP Service
  |
  +--> Pod B
  +--> Pod C
```

This is the normal choice for internal application components.

## NodePort

Exposes a service on a port on each node.

It is useful for learning and certain scenarios but is generally not the preferred application-facing production exposure mechanism when a load balancer or ingress is available.

## LoadBalancer

Requests an external Azure load-balancing resource/integration.

```text
Internet / client
       |
       v
Azure Load Balancer
       |
       v
Kubernetes Service
       |
       +--> Pods
```

Use it when a service genuinely needs Layer 4 external exposure.

---

# 18. Ingress and Application Gateway

Ingress is a Layer 7 HTTP/HTTPS routing concept.

Example:

```text
Internet
   |
   v
Application Gateway
   |
   v
Ingress
   |
   +-- /dev   -> dev service
   +-- /qa    -> qa service
   +-- /prod  -> prod service
```

This is different from the Azure Load Balancer.

### Load Balancer

Primarily Layer 4 TCP/UDP exposure and distribution.

### Ingress / Application Gateway

HTTP/HTTPS-aware Layer 7 routing.

For our application architecture, Application Gateway is intended to be the external application entry point rather than giving each backend service its own public IP.

---

# 19. Outbound / Egress Networking

Outbound networking answers:

> How does a Pod/node reach something outside the cluster?

Examples:

```text
Pod
 |
 +--> Internet
 +--> Azure service
 +--> Azure SQL
 +--> VNet resource
 +--> on-premises network
```

Possible AKS/Azure outbound designs include supported combinations involving:

- Azure Load Balancer managed outbound
- NAT Gateway
- user-defined routing
- Azure Firewall / network virtual appliance patterns
- other supported Azure egress configurations

The correct choice depends on requirements such as:

- fixed outbound public IP
- centralized inspection
- firewall requirements
- cost
- simplicity
- scale

For a small learning cluster, avoid adding a complex firewall/NAT architecture unless the project actually requires it.

---

# 20. DNS in AKS

DNS is fundamental to Kubernetes networking.

Inside a cluster, Pods commonly access Services by Kubernetes DNS names rather than hard-coded Pod IPs.

Example:

```text
node-api.dev.svc.cluster.local
```

Conceptually:

```text
Pod
 |
 | DNS query
 v
CoreDNS / cluster DNS
 |
 v
Kubernetes Service IP
 |
 v
Backend Pod
```

This is why Pod IPs should generally not be hard-coded in applications.

Azure private DNS becomes especially important for private endpoints and private AKS API connectivity.

---

# 21. IP Address Planning

An AKS network plan normally considers at least:

```text
VNet CIDR
|
+-- Node subnet
|
+-- Pod CIDR / Pod subnet, depending on model
|
+-- Kubernetes Service CIDR
|
+-- DNS service IP
```

Example conceptual plan:

```text
VNet:              10.0.0.0/16
Node subnet:       10.0.1.0/24
Pod overlay CIDR:  10.244.0.0/16
Service CIDR:      10.0.10.0/24
DNS service IP:    10.0.10.10
```

These are examples only. CIDRs must be selected so they do not conflict with connected networks and are large enough for the intended scale.

With Azure CNI Overlay, the node subnet primarily needs to accommodate node IPs, while Pod IPs come from the overlay range.

---

# 22. Why VM Size and Networking Are Separate Decisions

A previous portal issue showed this clearly.

We searched for:

```text
D2as_v6
```

Azure showed the VM size as unsupported in the selected availability-zone configuration.

That problem is about:

- VM SKU availability
- region
- availability zone
- node-pool placement

It is **not caused by Azure CNI Overlay**.

Likewise:

```text
Public vs Private API
```

is independent of:

```text
Azure CNI Overlay vs flat networking
```

A cluster can therefore be conceptually:

```text
Public API + Azure CNI Overlay
```

or:

```text
Private API + Azure CNI Overlay
```

Those are perfectly valid combinations.

---

# 23. Resource-by-Resource Mental Model

When Azure creates an AKS cluster, think through the resources in this order:

```text
1. Subscription
      |
2. Main resource group
      |
3. AKS managed-cluster resource
      |
4. Control plane (managed by Azure)
      |
5. Node pools
      |
6. VM Scale Sets / worker nodes
      |
7. VNet + subnet
      |
8. NICs
      |
9. Load balancer / public IP where needed
      |
10. Routing / NSG resources where needed
      |
11. Pod networking / CNI
      |
12. Kubernetes Services
      |
13. Ingress / Application Gateway if used
      |
14. Workloads / Pods
```

This ordering helps separate Azure infrastructure from Kubernetes objects.

---

# 24. Azure Resources vs Kubernetes Resources

This distinction is essential.

## Azure resources

Examples:

- Resource Group
- AKS managed cluster
- VNet
- subnet
- VM Scale Set
- NIC
- Load Balancer
- Public IP
- NAT Gateway
- Application Gateway
- Azure SQL
- ACR
- Key Vault
- Log Analytics workspace
- Azure Monitor workspace

## Kubernetes resources

Examples:

- Namespace
- Pod
- Deployment
- ReplicaSet
- StatefulSet
- DaemonSet
- Service
- Ingress
- ConfigMap
- Secret
- ServiceAccount
- Role / RoleBinding
- NetworkPolicy
- PersistentVolume / PersistentVolumeClaim

Some Kubernetes resources cause Azure resources to be created or configured.

For example:

```text
Kubernetes Service type=LoadBalancer
              |
              v
Azure Load Balancer configuration
```

That is why AKS feels like two systems working together.

---

# 25. Identity Resources

AKS also uses Azure identities to access Azure resources.

Important concepts include:

- managed identity for the AKS cluster
- kubelet identity
- Microsoft Entra ID integration
- Azure RBAC for Kubernetes authorization where enabled
- Workload Identity for Pods

## Workload Identity

Workload Identity allows an application running in a Pod to obtain Azure identity-based access without putting a long-lived client secret inside the container.

Conceptually:

```text
Pod
 |
 | federated identity / OIDC
 v
Microsoft Entra ID
 |
 v
Azure resource
```

This is preferable to embedding Azure credentials in application configuration.

---

# 26. Storage Resources

AKS workloads may need persistent storage.

Common Azure-backed storage concepts include:

- Azure Managed Disks
- Azure Files
- CSI drivers
- PersistentVolumes
- PersistentVolumeClaims

The important separation is:

```text
Kubernetes
  PVC
   |
   v
CSI driver
   |
   v
Azure storage resource
```

The application should normally request storage through Kubernetes abstractions rather than manually attaching disks to Pods.

---

# 27. Monitoring Resources

AKS can integrate with Azure Monitor and related services.

Common pieces include:

```text
AKS
 |
 +--> Container Insights / logs
 |
 +--> Log Analytics workspace
 |
 +--> Azure Monitor workspace
 |       |
 |       +--> Managed Prometheus metrics
 |
 +--> Managed Grafana (optional)
```

These solve different monitoring needs:

- **Logs** answer: "What happened?"
- **Metrics** answer: "How much/how often?"
- **Dashboards** answer: "What is the current state?"
- **Alerts** answer: "When should we be notified?"

Monitoring is separate from networking, although network metrics and flow information can be part of observability.

---

# 28. Common AKS Terms That Are Easy to Confuse

| Term | Meaning |
|---|---|
| AKS cluster | Managed Kubernetes environment |
| Control plane | Kubernetes management components |
| Node | Worker machine running workloads/system components |
| Node pool | Group of similarly configured nodes |
| VMSS | Azure VM infrastructure commonly backing node pools |
| Pod | Smallest Kubernetes workload execution unit |
| CNI | Container networking interface/implementation |
| IPAM | How IP addresses are allocated to Pods/nodes |
| Overlay | Pods use a separate Pod CIDR from the VNet |
| Flat networking | Pods use Azure VNet/subnet addresses |
| Service | Stable Kubernetes network endpoint for Pods |
| Ingress | HTTP/HTTPS routing abstraction |
| Load Balancer | Azure/Kubernetes Layer 4 exposure mechanism |
| NSG | Azure network filtering |
| NetworkPolicy | Kubernetes Pod traffic filtering |
| Egress | Outbound traffic |
| Ingress | Inbound/application routing traffic |
| Public cluster | Publicly reachable Kubernetes API endpoint |
| Private cluster | Private Kubernetes API endpoint |
| `MC_...` resource group | AKS-managed infrastructure resource group |
| ACR | Azure Container Registry for container images |
| Workload Identity | Pod-to-Azure identity mechanism |

---

# 29. Our Current Learning-Cluster Networking Direction

For the current portal exercise, the intended configuration is:

| Setting | Current direction | Reason |
|---|---|---|
| AKS API endpoint | **Public** | Easier learning/admin access for the first cluster |
| Authorized IP ranges | **Off initially** | Avoid adding complexity before basic cluster operation is proven |
| Pod networking | **Azure CNI Overlay** | Modern general-purpose model with efficient VNet IP usage |
| Cilium | **Off initially** | Learn baseline AKS networking before adding an advanced data plane |
| Network policy | **None initially** | Add deliberately after basic networking is understood |
| Load balancer | **Standard** | Normal current Azure choice for the cluster |

Important: this is a **project decision**, not a definition of what AKS requires.

We can later deliberately introduce:

- authorized API IP ranges
- private API access
- network policies
- Cilium
- NAT Gateway
- Application Gateway
- more advanced egress controls

without changing the fundamental AKS concepts above.

---

# 30. Recommended Learning Order

To understand AKS without mixing concepts, learn it in this order:

```text
1. Kubernetes control plane
        |
2. Node pools and nodes
        |
3. Pods and Deployments
        |
4. Kubernetes Services
        |
5. AKS Azure resources / MC_ resource group
        |
6. VNet and subnets
        |
7. Pod IPAM / CNI models
        |
8. Public vs private API access
        |
9. Network policies
        |
10. Load Balancer and Ingress
        |
11. Egress / NAT / Firewall
        |
12. Identity / Workload Identity
        |
13. Storage
        |
14. Monitoring
        |
15. Production architecture
```

This order prevents the common mistake of treating every Azure networking feature as one giant "networking setting".

---

# 31. Key Takeaways

1. **AKS is managed Kubernetes.** Azure manages the control plane; we operate the workloads and configuration.
2. **The `MC_...` resource group is not the control-plane VM group.** It contains AKS-managed infrastructure resources, especially worker-side infrastructure and supporting Azure resources.
3. **Public/private AKS describes API-server/control-plane access**, not Pod IP networking.
4. **Azure CNI Overlay is a Pod networking/IPAM model**, not an API access model.
5. **Azure CNI Pod Subnet and Node Subnet are flat networking models.** Node Subnet is legacy.
6. **Kubenet is legacy and is scheduled for retirement on March 31, 2028.**
7. **Cilium is a networking data-plane/policy technology**, not simply another Pod CIDR model.
8. **NSG and Kubernetes NetworkPolicy are different controls.**
9. **Load Balancer and Ingress/Application Gateway solve different traffic-routing problems.**
10. **Networking, identity, storage, monitoring, and compute are separate architectural layers even though AKS integrates them.**

---

# 32. Official Microsoft References

- AKS networking concepts: https://learn.microsoft.com/en-us/azure/aks/concepts-network
- AKS CNI networking overview: https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview
- Plan Pod networking: https://learn.microsoft.com/en-us/azure/aks/plan-pod-networking
- Azure CNI Overlay: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Legacy CNI networking: https://learn.microsoft.com/en-us/azure/aks/concepts-network-legacy-cni
- AKS control-plane networking: https://learn.microsoft.com/en-us/azure/aks/plan-control-plane-networking
- AKS IP address planning: https://learn.microsoft.com/en-us/azure/aks/concepts-network-ip-address-planning

---

## Document Scope Note

This document is intentionally broader than the project's deployment instructions. It exists so that when we encounter an AKS portal option, Azure resource, networking term, or architecture decision, we can first understand **what it is → why it exists → how it works → what resource it creates/affects → when we need it → what trade-off it introduces** before deciding whether to enable it in the project.
