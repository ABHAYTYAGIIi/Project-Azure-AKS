# AKS Node / Infrastructure Resource Group — Complete Reference

> Purpose: a durable learning document explaining the AKS-managed infrastructure resource group (`MC_...`), what it is, what resources can appear inside it, how those resources relate to the AKS control plane and worker/data plane, who manages them, what creates them, what they cost, and what must or must not be changed.
>
> This document complements `docs/AKS_GENERAL_KNOWLEDGE.md`. The general document explains AKS cluster types and networking models; this document goes deeper into the Azure resource-group side of AKS.

---

## 1. The most important idea

When you create an AKS cluster, you normally end up with **two Azure resource groups**:

```text
Azure Subscription
|
+-- Your main/project resource group
|      |
|      +-- AKS managed-cluster resource
|      +-- ACR, VNet, SQL, Application Gateway, etc. (if we put them here)
|
+-- AKS node/infrastructure resource group
       |
       +-- VM Scale Set(s)
       +-- VM/node instances
       +-- NICs
       +-- Managed disks
       +-- Load Balancer resources
       +-- Public IPs where required
       +-- Networking resources where required
       +-- AKS-managed identities/resources where applicable
       +-- Other AKS infrastructure
```

Microsoft calls the second group the **node resource group**. Its default name looks like:

```text
MC_<main-resource-group>_<aks-cluster-name>_<region>
```

For our project, the portal showed a prospective name similar to:

```text
MC_rg-azure-aks_aks-azure-project_centralindia
```

The exact final resource set is configuration-dependent. **Do not assume every AKS cluster gets every resource listed in this document.**

Microsoft's current documentation confirms that the node resource group contains the cluster's infrastructure resources, including nodes, virtual networking, and storage, and that AKS automatically creates and deletes it with the cluster. citeturn0search0turn0search1

---

# 2. Does the `MC_...` resource group contain the AKS control plane?

## Short answer

**No — not as ordinary VMs/resources that you manage as the Kubernetes control plane.**

Microsoft hosts the AKS control plane as a managed service. This includes components such as:

- Kubernetes API server
- scheduler
- controller components
- etcd
- other managed control-plane services

Microsoft explicitly describes the control plane as Microsoft-hosted and separately describes the `MC_...` group as containing resources deployed into the customer's Azure subscription. citeturn2view1

So this is the correct mental model:

```text
                  AKS
                   |
        +----------+----------+
        |                     |
   CONTROL PLANE          NODE / DATA PLANE
   Microsoft-managed      In our subscription
        |                     |
   API server              VM Scale Set
   scheduler               VM instances
   controllers             NICs
   etcd                    disks
        |                  Azure networking
        |                     |
        +------ secure -------+
              communication
```

### Important nuance: identities

An AKS control-plane **managed identity** can exist as an Azure resource and can have permissions over the node resource group. That does **not** mean the control-plane VMs are inside the `MC_...` group.

Think:

```text
Control plane itself       -> Microsoft-managed service
Control plane identity     -> Azure identity resource/permission mechanism
Worker infrastructure     -> MC_... node resource group
```

AKS uses managed identities so the control plane and kubelet can interact with Azure resources without long-lived client secrets. citeturn0search2

---

# 3. Why does AKS create a second resource group?

AKS integrates Kubernetes with normal Azure infrastructure:

- Azure VMs
- VM Scale Sets
- networking
- storage
- load balancing
- public IPs
- identities
- other Azure services

Instead of putting those AKS-managed resources directly beside our application resources, Azure puts the cluster-lifecycle infrastructure in the node resource group.

This gives us a clean separation:

```text
OUR PROJECT RG
    = resources we intentionally organize and own

MC_... NODE RG
    = infrastructure AKS creates/manages for the cluster
```

Microsoft also states that the node resource group should contain resources that share the AKS cluster's lifecycle. When the cluster is deleted, AKS deletes the node resource group and its resources. citeturn2view0

---

# 4. Main/project resource group vs `MC_...` resource group

| Area | Main/project RG | `MC_...` node RG |
|---|---|---|
| Created by | Us | AKS automatically |
| Example | `rg-azure-aks` | `MC_rg-azure-aks_aks-azure-project_centralindia` |
| Main purpose | Project-level resources | AKS infrastructure |
| AKS resource | Yes | No, the managed-cluster resource belongs to main RG |
| Worker VMs/VMSS | Normally no | Yes |
| Node NICs | Normally no | Yes |
| Node disks | Normally no | Yes |
| AKS Load Balancer | Often here | Yes, when AKS manages it |
| AKS-managed public IPs | Depending on design | Often yes |
| VNet/subnet | Could be here if we create it | Can be here depending on network setup |
| ACR | Usually here | No |
| Azure SQL | Usually here | No |
| Application Gateway | Usually here | Not necessarily; topology-dependent |
| Log Analytics/Azure Monitor workspaces | Usually here | Not inherently required to be here |
| Key Vault | Usually here | No, unless deliberately designed otherwise |
| Lifecycle | Project lifecycle | AKS cluster lifecycle |
| Safe place for arbitrary project resources | Yes | **No** |

Microsoft's FAQ states that the first resource group contains the Kubernetes service resource while the node resource group contains the infrastructure resources associated with the cluster. citeturn2view0

---

# 5. Resource inventory: what can appear in the `MC_...` group?

The exact inventory changes according to the AKS configuration. The following is the useful complete mental model.

| Resource | Typical purpose | Always present? | Managed by |
|---|---|---:|---|
| Virtual Machine Scale Set | Hosts a node pool | Yes for VM-based node pools | AKS |
| VMSS instances / node VMs | Individual worker nodes | Yes for VM-based node pools | AKS |
| Network Interface Cards | Connect worker nodes to Azure networking | Yes for normal VM nodes | AKS/Azure |
| Managed disks | Node OS/data disks | Yes for normal VM nodes | AKS/Azure |
| Azure Load Balancer | Kubernetes L4 load-balancing/outbound functions | Common, configuration-dependent | AKS |
| Public IP | Public frontend/outbound/node exposure where required | Conditional | AKS/Azure |
| Backend pools / probes / rules | Parts of the Load Balancer configuration | Conditional | AKS |
| Network security resources | Azure-level network filtering | Conditional | AKS/Azure/user topology |
| Route table / UDR | Azure routing | Conditional | AKS/Azure/user topology |
| Managed identities | Azure authorization for AKS components | Configuration-dependent | AKS/Azure |
| Private DNS resources/links | Private API/private endpoint DNS | Private-networking dependent | AKS/Azure/user |
| Other AKS-managed resources | Feature/add-on specific infrastructure | Conditional | AKS |

Microsoft documents the node resource group as containing infrastructure such as VMs, VM Scale Sets, storage, and virtual networking. citeturn0search1turn0search4

---

# 6. Virtual Machine Scale Set (VMSS)

## What is it?

A VM Scale Set is the Azure compute resource commonly used to implement an AKS node pool.

Conceptually:

```text
AKS node pool
      |
      v
Virtual Machine Scale Set
      |
      +-- node 0
      +-- node 1
      +-- node 2
```

Each VMSS instance represents a worker node.

## Why does AKS use VMSS?

A node pool needs a consistent way to:

- create nodes
- remove nodes
- scale nodes
- upgrade nodes
- replace unhealthy nodes
- maintain a common node configuration

VMSS provides the Azure compute mechanism while AKS controls the Kubernetes lifecycle.

## What runs on the node?

A worker node contains things such as:

- operating system
- kubelet
- container runtime
- networking components
- AKS system components
- Kubernetes Pods scheduled to that node

## Important rule

**Do not manually scale the VMSS using ordinary VMSS APIs.**

Use the AKS node-pool/cluster APIs instead. Microsoft explicitly states that VMSS API-based manual scaling is unsupported for AKS-managed node pools. citeturn2view0

Use concepts such as:

```text
AKS node pool scale
AKS autoscaler
AKS cluster operations
```

rather than:

```text
Manually change VMSS instance count
```

---

# 7. VMSS instances / worker nodes

A VMSS is the container for the worker nodes; the instances are the actual compute machines.

Example:

```text
VM Scale Set: aks-system-xxxxx-vmss
|
+-- Instance 0 -> Kubernetes node
+-- Instance 1 -> Kubernetes node
```

A node is where Pods actually execute.

For our project:

```text
AKS control plane
       |
       | schedules/reconciles
       v
Worker node
       |
       +-- React Pod
       +-- Node.js Pod
       +-- Python Pod
       +-- system Pods
```

The exact number of Pods per node depends on Kubernetes scheduling, resource requests/limits, node capacity, and AKS networking configuration.

---

# 8. Network Interface Cards (NICs)

Every normal Azure VM/node needs network connectivity.

The node NIC connects the worker VM to the Azure network.

Conceptually:

```text
VM / node
   |
   v
NIC
   |
   v
Subnet
   |
   v
VNet
```

The NIC is therefore the Azure networking attachment of the node.

## What does the NIC provide?

It participates in:

- private IP addressing
- subnet connectivity
- Azure routing
- NSG association where applicable
- connectivity to other Azure resources
- outbound/inbound network paths

The exact Pod networking behavior depends on the CNI/IPAM model.

For our project with **Azure CNI Overlay**, remember:

```text
Node IP
   -> Azure VNet/subnet address

Pod IP
   -> overlay Pod address space
```

The Pod IP is therefore not simply another ordinary node-subnet IP in the same way as flat Azure CNI networking.

---

# 9. Managed disks

Worker nodes need operating-system storage and may use disks for other node-level needs.

The `MC_...` group can therefore contain managed disk resources associated with VMSS instances.

Conceptually:

```text
VMSS node
   |
   +-- OS disk
   +-- optional data disk(s)
```

## Do not confuse node disks with Kubernetes persistent storage

These are related but different.

### Node OS disk

Used by the worker machine itself.

### Kubernetes persistent volume

Application storage requested through Kubernetes abstractions such as:

```text
PersistentVolumeClaim
        |
        v
CSI driver
        |
        v
Azure Disk / Azure Files / other supported storage
```

A Kubernetes workload should normally use the CSI/Kubernetes storage model rather than manually attaching random disks to an AKS VMSS instance.

---

# 10. Azure Load Balancer

AKS commonly creates or manages an Azure Load Balancer for cluster networking functions.

It is primarily a **Layer 4** load-balancing mechanism.

It can be involved when Kubernetes uses:

```yaml
kind: Service
type: LoadBalancer
```

Conceptually:

```text
Client
  |
  v
Azure Load Balancer
  |
  v
Kubernetes Service
  |
  +--> Pod
  +--> Pod
  +--> Pod
```

## Load Balancer vs Application Gateway

These are not the same thing.

### Azure Load Balancer

- Layer 4
- TCP/UDP oriented
- Kubernetes `LoadBalancer` Services commonly use it
- useful for direct service exposure

### Application Gateway

- Layer 7
- HTTP/HTTPS aware
- URL/path/host routing
- TLS termination capabilities
- better suited to application ingress patterns

For our architecture, we intend to keep application Services internal and use an application-facing ingress/Application Gateway layer rather than giving every backend a public Load Balancer.

---

# 11. Load Balancer frontend Public IP

If a Kubernetes Service or other AKS feature requires public exposure, a public IP can appear in the node resource group.

Example flow:

```text
Internet
   |
   v
Public IP
   |
   v
Azure Load Balancer frontend
   |
   v
Backend pool / Kubernetes nodes
   |
   v
Service
   |
   v
Pods
```

## Important

A public IP in the `MC_...` group does **not** automatically mean:

> "The whole AKS cluster is public."

It only means that a particular Azure resource has public exposure.

Possible public IP consumers include:

- Load Balancer frontend
- node public IP configuration if explicitly enabled
- other AKS-managed networking features

The Kubernetes API server's public/private status is a separate control-plane decision.

---

# 12. Load Balancer backend pools

The Load Balancer may contain backend pools that identify the node/network interfaces or related backend targets that receive traffic.

Conceptually:

```text
Public/Private frontend
        |
        v
Load Balancer rule
        |
        v
Backend pool
        |
        +--> node/NIC
        +--> node/NIC
```

The exact backend implementation varies with the AKS networking configuration and Azure Load Balancer generation.

Do not manually redesign these backend pools. Kubernetes and AKS reconcile them from the cluster's desired state.

---

# 13. Health probes

Azure Load Balancer can use health probes to determine whether a backend is available.

Conceptually:

```text
Load Balancer
     |
     +--> health probe -> backend healthy?
     |
     +--> traffic -> healthy backend
```

Health probing is separate from Kubernetes application readiness probes.

### Kubernetes readiness probe

Answers:

> "Should Kubernetes send application traffic to this Pod?"

### Azure Load Balancer health probe

Answers a different infrastructure-level availability question for the load-balancing path.

The two can work together but are not the same feature.

---

# 14. Network Security Groups (NSGs)

An NSG is an Azure networking security control.

It contains allow/deny rules for network traffic associated with Azure network interfaces/subnets according to the applicable Azure networking model.

Example concept:

```text
Source
  |
  v
NSG rule
  |
  +-- allow
  +-- deny
  |
  v
NIC/subnet traffic
```

## NSG is NOT Kubernetes NetworkPolicy

This distinction matters:

```text
Azure NSG
    -> Azure infrastructure/network layer

Kubernetes NetworkPolicy
    -> Pod-to-Pod/application networking layer
```

Microsoft notes that AKS does not apply NSGs to its subnet or modify subnet NSGs, and that required rules must permit appropriate node/Pod communication for the selected networking model. citeturn2view0

## Project warning

Do not randomly edit an AKS-managed NSG in the `MC_...` group. AKS expects its infrastructure to remain consistent.

---

# 15. Route tables / User Defined Routes (UDRs)

A route table contains Azure network routes.

It answers questions such as:

> "When traffic leaves this subnet, where should it go?"

Conceptually:

```text
Node subnet
   |
   v
Route table
   |
   +--> VNet route
   +--> firewall
   +--> NVA
   +--> Internet/NAT path
   +--> other destination
```

## When might AKS need one?

Historically and in certain supported configurations, especially kubenet or user-defined-routing designs, AKS may use route tables/UDRs.

With our intended **Azure CNI Overlay** model, we should not assume a kubenet-style route table is required.

## Important

If a route table appears in the AKS node resource group, treat it as cluster-managed infrastructure unless we intentionally designed it as a customer-managed resource.

Do not delete routes because they "look unused".

---

# 16. Managed identities in and around the node resource group

Identity is one of the less visible but very important parts of AKS infrastructure.

AKS can use multiple managed identities.

## 16.1 Control-plane identity

The AKS control plane needs Azure permissions to manage cluster infrastructure.

For example, the control plane may need to manage:

- load balancers
- AKS-managed public IPs
- Azure Disk CSI operations
- Azure File CSI operations
- other Azure resources used by cluster features

Microsoft documents the control-plane managed identity as an identity used by AKS control-plane components to manage cluster resources. citeturn0search2

The identity is **not the control plane itself**.

## 16.2 Kubelet identity

The kubelet runs on worker nodes and can use a managed identity for Azure authentication.

A common example is pulling images from Azure Container Registry.

Conceptually:

```text
Node
 |
 +-- kubelet
       |
       v
Kubelet managed identity
       |
       v
Azure Container Registry
```

If AKS creates the kubelet identity automatically, Microsoft documents that a user-assigned kubelet identity is created in the node resource group unless a pre-created identity is supplied. citeturn0search3

## 16.3 Workload Identity

Workload Identity is different again.

It is for **Pods/applications**, not the node itself:

```text
Application Pod
      |
      | OIDC federation
      v
Microsoft Entra Workload ID
      |
      v
Azure resource
```

This is how an application can access Key Vault, Storage, etc. without embedding a long-lived Azure client secret.

---

# 17. Private DNS resources

Private DNS becomes important when AKS uses private networking patterns.

Examples include:

- private AKS API server
- private endpoints
- private Azure service access

The important chain is:

```text
Client
  |
  | DNS query
  v
Private DNS
  |
  | private IP answer
  v
Private endpoint/API
```

A private network can have correct routing and still fail if DNS resolves the wrong address.

For our current public AKS cluster, private API DNS is not required simply because we use Azure CNI Overlay.

---

# 18. Why the exact resource list changes

There is no universal fixed list called:

> "The 15 resources every AKS `MC_` group contains."

The inventory depends on choices such as:

- system node pool size
- user node pools
- VM SKU
- availability zones
- Azure CNI Overlay vs flat networking
- kubenet/legacy networking
- public vs private API access
- load balancer configuration
- outbound type
- NAT Gateway
- UDR/firewall architecture
- public IP configuration
- node public IPs
- CSI storage usage
- ingress/add-ons/extensions
- monitoring integrations
- other Azure integrations

Therefore, the right way to understand the `MC_...` group is:

```text
Base AKS
   |
   +-- node compute
   +-- node networking
   +-- node storage
   |
   +-- add feature
          |
          +-- more Azure resources may appear
```

---

# 19. What the `MC_...` group does NOT normally contain

Do not expect the following to appear as ordinary customer-managed infrastructure resources in the node resource group:

### Kubernetes API-server VM

You do not manage the API server as a normal VM.

### Scheduler VM

You do not manage it as a normal Azure VM.

### etcd VM

You do not manage the AKS etcd layer as an ordinary Azure VM.

### Kubernetes Pod as an Azure resource

Pods are Kubernetes resources, not individual Azure resources.

### Deployment as an Azure resource

A Kubernetes Deployment lives in the Kubernetes API/control plane, not as a standalone Azure resource in the `MC_...` group.

### Namespace as an Azure resource

Namespaces are Kubernetes logical resources, not Azure resource-group resources.

Conceptually:

```text
Azure subscription
 |
 +-- Azure resource groups/resources
 |
 +-- AKS service
       |
       +-- Kubernetes API
             |
             +-- Namespace
             +-- Deployment
             +-- Pod
             +-- Service
             +-- Ingress
```

Some Kubernetes objects can cause Azure resources to be created, but the Kubernetes object itself is not necessarily an Azure resource.

---

# 20. Kubernetes object -> Azure resource examples

This is one of the most useful AKS concepts.

## Service type LoadBalancer

```text
Kubernetes
Service type=LoadBalancer
        |
        v
AKS cloud integration
        |
        v
Azure Load Balancer / frontend / rules / probes
```

## PersistentVolumeClaim

```text
Kubernetes
PVC
 |
 v
CSI driver
 |
 v
Azure Disk / Azure Files resource
```

## Ingress / Application Gateway integration

Depending on the selected integration, Kubernetes resources can cause Azure Application Gateway configuration/resources to be created or updated.

## Workload Identity

```text
Kubernetes ServiceAccount
        |
        v
OIDC federation
        |
        v
Microsoft Entra identity
        |
        v
Azure resource access
```

This is why an AKS project spans both Kubernetes and Azure concepts.

---

# 21. Who manages what?

| Component | Primary manager | Should we manually edit it? |
|---|---|---|
| AKS control plane | Microsoft | No |
| AKS managed-cluster resource | Azure/AKS | Configure through AKS APIs/portal/IaC |
| Node pools | AKS | Yes, through AKS interfaces |
| VMSS | AKS | **Do not manually reconfigure as a normal VMSS** |
| VMSS instance count | AKS | Use AKS scaling |
| Node OS image | AKS | Use AKS node image/cluster upgrade mechanisms |
| Node NICs | AKS/Azure | No manual redesign |
| Node OS disks | AKS/Azure | No manual lifecycle management |
| AKS Load Balancer | AKS | Manage through Kubernetes/AKS configuration |
| AKS-created public IPs | AKS | Manage through supported AKS/Kubernetes configuration |
| AKS-managed routes | AKS | Do not casually edit/delete |
| AKS-managed NSG configuration | AKS/Azure | Do not casually edit/delete |
| Project VNet | Us, if BYO VNet | Yes, but design carefully |
| Project Application Gateway | Us/IaC | Yes, through supported integration/config |
| ACR | Us | Yes |
| Azure SQL | Us | Yes |
| Key Vault | Us | Yes |
| Log Analytics / Monitor workspaces | Us | Yes |

Microsoft explicitly warns that modifying resources in the node resource group is unsupported and can cause AKS operation failures. Azure-created tags also must not be modified. citeturn2view0

---

# 22. Why manually editing the `MC_...` group is dangerous

Imagine AKS believes the cluster should have:

```text
3 nodes
1 load balancer
2 public IP associations
specific routes
specific tags
specific VMSS configuration
```

Then someone manually changes Azure infrastructure:

```text
Delete a NIC
Change a VMSS property
Delete a public IP
Delete a route
Change an AKS-managed tag
Manually scale VMSS
```

Now Azure and AKS disagree about the desired state.

Possible consequences include:

- failed node operations
- failed upgrades
- load balancer provisioning failures
- autoscaling problems
- cluster reconciliation problems
- deletion problems

Microsoft explicitly states that modifying resources under the node resource group is unsupported. citeturn2view0

The safe rule is:

> **Change the AKS configuration, not the generated infrastructure underneath it.**

---

# 23. Cost: does the `MC_...` resource group cost money?

The resource group itself is a logical container and is not what you pay for.

The Azure resources inside it can incur charges.

Typical billable infrastructure includes things such as:

- worker VMs/VMSS compute
- managed disks
- public IPs where applicable
- load-balancing/networking services according to the selected SKU/usage
- NAT Gateway if used
- other enabled Azure networking services

The AKS control plane itself has its own AKS pricing/tier model; worker infrastructure is billed as Azure infrastructure.

Microsoft notes that AKS agent nodes are billed as standard Azure VMs and that the node resource group contains infrastructure that incurs subscription charges. citeturn0search7turn2view0

For an Azure for Students subscription, the important lesson is:

```text
AKS cost
   != only the AKS resource

Total infrastructure cost
   = compute
   + storage
   + networking
   + optional services
```

---

# 24. Lifecycle: what happens when the cluster is deleted?

The node resource group is tied to the AKS cluster lifecycle.

Conceptually:

```text
Create AKS
   |
   +--> create MC_... RG
   |
   +--> create VMSS
   +--> create nodes
   +--> create networking/storage

Delete AKS
   |
   +--> remove cluster
   +--> remove node resource group
   +--> remove its AKS-managed resources
```

Microsoft states that deleting the cluster also deletes the node resource group and its resources. citeturn2view0

This is why you should **not place unrelated long-lived project resources** in the `MC_...` group.

If you need something to survive cluster deletion, keep it in the main/project resource group or another deliberate resource group.

---

# 25. Why this matters for our project

Our project architecture contains resources with different lifecycles:

```text
PROJECT LIFECYCLE
|
+-- ACR
+-- Azure SQL
+-- Application Gateway
+-- VNet
+-- monitoring workspaces
+-- Key Vault
|
CLUSTER LIFECYCLE
|
+-- AKS
+-- node pools
+-- VMSS
+-- node NICs
+-- node disks
+-- AKS load balancer
+-- AKS-managed public IPs
```

The distinction helps us avoid accidental deletion or accidental coupling.

If we delete and recreate the AKS cluster during learning, we generally want to keep resources such as ACR and Azure SQL.

Therefore:

```text
rg-azure-aks
   = project-owned resources

MC_...
   = disposable AKS infrastructure
```

That is a much better mental model than thinking of `MC_...` as a second application resource group.

---

# 26. Relation to our networking decisions

The `MC_...` resource group and our AKS networking choices are directly related.

## Public vs private API

This decides how clients reach the Kubernetes API server.

It does **not** decide whether Pods use overlay networking.

## Azure CNI Overlay

This decides how Pod IPs are allocated and routed.

It does **not** make the AKS API public/private.

## Network Policy

This controls Pod traffic policy.

It does **not** replace NSGs.

## Load Balancer

This exposes/distributes Layer 4 traffic.

It does **not** replace Application Gateway/Ingress for HTTP path routing.

## Outbound type

This decides how cluster/node traffic reaches external destinations.

It may cause different Azure networking resources to appear in or around the node resource group.

The correct architecture is therefore:

```text
AKS
|
+-- Control-plane access
|      +-- Public / Private
|
+-- Pod networking
|      +-- Azure CNI Overlay / other supported model
|
+-- Policy
|      +-- None / Azure / Calico / Cilium capabilities
|
+-- Service exposure
|      +-- ClusterIP / LoadBalancer / etc.
|
+-- Ingress
|      +-- Application Gateway / supported ingress
|
+-- Egress
       +-- Load Balancer / NAT / UDR / Firewall etc.
```

Each decision can influence which Azure resources AKS creates or manages.

---

# 27. A concrete example for our future cluster

Suppose we eventually create:

```text
AKS name: aks-azure-project
Region: centralindia
API: Public
Pod networking: Azure CNI Overlay
Cilium: Off initially
Network Policy: None initially
Load Balancer: Standard
System node pool: 1 node
```

A simplified infrastructure picture might look like:

```text
rg-azure-aks
|
+-- AKS managed cluster resource
+-- ACR
+-- VNet/subnets (if BYO VNet)
+-- Application Gateway (if created here)
+-- Azure SQL
+-- Monitor resources
+-- Key Vault (if created)
|
+-- MC_rg-azure-aks_aks-azure-project_centralindia
    |
    +-- system node pool VMSS
    |     |
    |     +-- node VM
    |     +-- NIC
    |     +-- OS disk
    |
    +-- Azure Load Balancer
    |     +-- frontend(s)
    |     +-- backend configuration
    |     +-- health probes/rules as required
    |
    +-- public IP(s) if required by enabled features
    |
    +-- AKS-managed networking resources if required
    |
    +-- managed identity resources where applicable
```

This is a **conceptual example**, not a promise that every listed resource will be created with exactly those names.

---

# 28. How to inspect the `MC_...` group safely

The Azure Portal is useful for learning because you can expand the resource group and inspect each resource.

For each resource, ask:

1. **What Azure resource type is this?**
2. **Which AKS feature caused it to exist?**
3. **Is it compute, networking, storage, identity, or another category?**
4. **Does it belong to a node pool, cluster-wide networking, or an add-on?**
5. **Is it AKS-managed or customer-managed?**
6. **What would break if it disappeared?**
7. **Which AKS configuration controls it?**

Do not start by changing it.

Start by tracing it back to the AKS configuration that created it.

---

# 29. Useful CLI inspection commands

Once the cluster exists, these commands help map AKS to Azure resources.

## Show the cluster

```bash
az aks show \
  --resource-group rg-azure-aks \
  --name aks-azure-project
```

## Show the node resource group

```bash
az aks show \
  --resource-group rg-azure-aks \
  --name aks-azure-project \
  --query nodeResourceGroup \
  --output tsv
```

## List resources in the node resource group

```bash
az resource list \
  --resource-group MC_rg-azure-aks_aks-azure-project_centralindia \
  --output table
```

## Show node pools

```bash
az aks nodepool list \
  --resource-group rg-azure-aks \
  --cluster-name aks-azure-project \
  --output table
```

## Show Kubernetes nodes

```bash
kubectl get nodes -o wide
```

The useful learning exercise is to compare:

```text
az aks nodepool list
        |
        v
VMSS in MC_...
        |
        v
VMSS instances
        |
        v
kubectl get nodes
```

That connects Azure infrastructure to Kubernetes objects.

---

# 30. Safe vs unsafe operations

## Safe approach

Change:

```text
AKS portal settings
AKS CLI
Azure Resource Manager/IaC
Kubernetes manifests
Kubernetes APIs
```

Examples:

```bash
az aks scale ...
az aks nodepool add ...
az aks nodepool scale ...
az aks update ...
kubectl apply -f ...
```

## Unsafe approach

Do not treat the `MC_...` resources like ordinary standalone Azure VMs.

Avoid manually:

```text
Deleting the VMSS
Deleting a node NIC
Deleting AKS-managed public IPs
Changing AKS-managed routes
Changing generated LB configuration directly
Changing Azure-created AKS tags
Manually scaling VMSS instances
```

Microsoft explicitly documents these node-resource-group resources as AKS-managed infrastructure and warns that modifying them can cause cluster failures. citeturn2view0

---

# 31. The control-plane communication path

A subtle but important point is that the control plane does communicate with worker nodes even though the control-plane VMs are not visible in our subscription as ordinary VMs.

AKS uses a secure tunnel mechanism for control-plane-to-node communication. Microsoft currently documents Konnectivity as the main tunnel mechanism. citeturn2view0

Conceptually:

```text
Microsoft-managed AKS control plane
            |
            | secure tunnel
            v
        Worker node
            |
            v
          kubelet
```

This explains why:

> "I don't see the API server VM in my Azure resource group"

is not a problem.

The API server is managed by the AKS service rather than exposed as a VM we administer.

---

# 32. Control plane vs node resource group — final mental model

Memorize this:

```text
                    AKS
                     |
        +------------+------------+
        |                         |
        v                         v
  CONTROL PLANE              NODE / DATA PLANE
  Microsoft-managed          Customer subscription
        |                         |
        +-- API server            +-- VMSS
        +-- scheduler             +-- VM nodes
        +-- controllers           +-- NICs
        +-- etcd                  +-- disks
        |                         +-- networking
        |                         +-- load balancer
        |                         +-- public IPs
        |                         +-- other AKS infra
        |
        | secure communication
        +------------------------->

                    Azure subscription
                         |
                         +-- Main RG
                         |     +-- AKS resource
                         |     +-- ACR
                         |     +-- SQL
                         |     +-- App Gateway
                         |     +-- VNet etc.
                         |
                         +-- MC_... RG
                               +-- worker infrastructure
```

The most important sentence is:

> **The `MC_...` resource group is the AKS-managed node/infrastructure resource group, not the Kubernetes control-plane resource group.**

---

# 33. What we should remember for this project

For our learning cluster:

- We are **not** creating a private AKS cluster right now.
- The Kubernetes API will therefore be public initially.
- We are using **Azure CNI Overlay** for Pod networking.
- Cilium is off initially.
- Network Policy is none initially.
- Standard Load Balancer is selected.
- We should not manually edit the `MC_...` resources.
- We should use AKS settings/API/IaC to change node pools and networking.
- The `MC_...` group is disposable cluster infrastructure.
- ACR, Azure SQL, Application Gateway, VNet, monitoring workspaces, and other long-lived project resources should be kept in deliberate project resource groups rather than the AKS node resource group.

---

# 34. Final checklist: when you see a resource in `MC_...`

Use this checklist:

### Compute

- Is it a VMSS?
- Which node pool does it represent?
- How many node instances does it contain?
- What VM SKU is being used?

### Networking

- Is it a NIC?
- Is it a Load Balancer?
- Is it a public IP?
- Is it a route table?
- Is it an NSG or another networking resource?
- Which CNI/outbound/exposure decision caused it?

### Storage

- Is it a managed disk?
- Is it an OS disk or application storage?
- Is a CSI driver involved?

### Identity

- Is it the control-plane identity?
- Is it the kubelet identity?
- What Azure permissions does it have?

### Lifecycle

- Does it share the AKS cluster lifecycle?
- Would deleting the AKS cluster delete it?
- Is it safe for us to modify?

### Rule

> **If AKS created it in the node resource group, understand it first and modify it only through the supported AKS configuration path.**

---

# Official Microsoft references

- AKS FAQ / node resource group: https://learn.microsoft.com/en-us/azure/aks/faq
- AKS core concepts: https://learn.microsoft.com/en-us/azure/aks/core-aks-concepts
- AKS availability zones and cluster components: https://learn.microsoft.com/en-us/azure/aks/reliability-availability-zones-configure
- AKS managed identities: https://learn.microsoft.com/en-us/azure/aks/managed-identity-overview
- AKS networking: https://learn.microsoft.com/en-us/azure/aks/concepts-network
- AKS Pod networking: https://learn.microsoft.com/en-us/azure/aks/plan-pod-networking

---

## Relationship to `AKS_GENERAL_KNOWLEDGE.md`

`AKS_GENERAL_KNOWLEDGE.md` answers the broad question:

> **What is AKS, what are the cluster/control-plane types, what are the networking types, and what Azure resources surround AKS?**

This document answers the deeper infrastructure question:

> **What exactly is the `MC_...` node/infrastructure resource group, what can be inside it, how does each resource relate to the worker/data plane, and why should we not manually modify it?**

Together they provide the general AKS knowledge base for this project.
