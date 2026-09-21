# Phase 1 — AKS Networking Design and Configuration Guide

> ## Current verified architecture — 2026-09-21
>
> **Important:** The original version of this document was written during the initial AKS portal design and contains historical alternatives. The current cluster is **private AKS**, not public AKS.
>
> Current verified networking:
>
> - AKS API endpoint: **Private**
> - Pod networking: **Azure CNI Overlay**
> - Pod CIDR: **10.244.0.0/16**
> - Service CIDR: **10.0.0.0/16**
> - VNet: **vnet-azure-project / 10.20.0.0/16**
> - AKS subnet: **snet-aks / 10.20.1.0/24**
> - Private DNS resolver inbound endpoint: **10.20.254.4**
> - Private endpoint subnet: **PrivateEndpointSubnet / 10.20.2.0/24**
>
> The historical sections below are retained as learning/reference material. Wherever they say that public AKS is "our choice", that statement is **historical and superseded** by the current private-cluster architecture.
>
> Current environment names are **dev / uat / prod**. Older references to qa are historical.

# Phase 1 — AKS Networking Design and Configuration Guide

## Status

**Status: Design and configuration guidance — no networking resources should be provisioned until the final SKU, quota, IP, and service-availability checks pass.**

This document explains the AKS **Networking** tab option-by-option: what each setting does, why it exists, how it works, when to use it, trade-offs, and the decision for this project.

> **Current project decision:** We are **not creating a private AKS cluster**. The AKS API server will remain public, with the option to protect it later using API server authorized IP ranges. The workload network will still use private Azure networking and internal Kubernetes Services where possible.

Azure's networking model has changed over time. The portal can expose a different subset of choices depending on region, Kubernetes version, cluster mode, and other selections. This document therefore covers both the choices visible in our portal and the current AKS networking models documented by Microsoft.

---

## 1. Our project networking goals

The project needs:

- One AKS cluster.
- Three namespaces: `dev`, `qa`, and `prod`.
- React frontend, Node.js backend, and Python backend.
- Azure SQL Database as a PaaS dependency.
- Kubernetes Services kept internal unless a component genuinely needs external exposure.
- A single external application entry point where practical.
- HTTPS/SSL.
- Path-based routing for `/dev/*`, `/qa/*`, and `/prod/*`.
- A design that works within Azure for Students quotas.
- A networking model that does not waste VNet IP addresses.
- A design that is understandable enough to learn rather than blindly accepting portal defaults.

### Current architecture direction

```text
Internet
   |
   | HTTPS : 443
   v
Application Gateway / chosen ingress layer
   |
   v
AKS Ingress
   |
   +--> /dev/*  --> dev namespace
   +--> /qa/*   --> qa namespace
   +--> /prod/* --> prod namespace
                 |
                 +--> internal Kubernetes Services
                       |
                       +--> React
                       +--> Node.js
                       +--> Python
                              |
                              v
                         Azure SQL
```

The application-facing Services should normally be `ClusterIP`, not individual public `LoadBalancer` Services.

---

# 2. Control-plane access: Public vs Private AKS

This setting controls **how clients reach the Kubernetes API server**. It is different from whether application Pods are private or public.

## Public AKS cluster — our choice

### What does it do?

The Kubernetes API server has a public endpoint. `kubectl`, automation, and administrators can reach the API server over the Internet, subject to authentication and any API server access restrictions.

### Why do we need it?

It makes initial administration much easier. A laptop, Cloud Shell, or a CI/CD runner can reach the API without first building VPN, private DNS, VNet peering, Bastion, or another private-connectivity path.

### When should we use it?

Use it for:

- Learning and student projects.
- Development clusters.
- Labs where the administrative network is not permanently connected to Azure.
- CI/CD designs where the runner has a stable public egress IP that can be authorized.

### Security requirement

A public API server should not mean "open to everyone." Use authentication/RBAC and, when practical, **API server authorized IP ranges** to restrict which source IPs can reach the API server.

Microsoft documents public-cluster API access and authorized IP ranges here:
https://learn.microsoft.com/en-us/azure/aks/api-server-authorized-ip-ranges

---

## Private AKS cluster — not our current choice

### What does it do?

The Kubernetes API server uses private networking rather than a public API endpoint. Access must come from a machine or network that can reach the private endpoint/VNet.

### Why would we use it?

It is appropriate when the control plane must not be reachable through a public endpoint, especially for:

- Highly restricted production environments.
- Regulated workloads.
- Corporate networks with private connectivity.
- Environments where administration is intentionally performed only from connected Azure/on-premises networks.

### What is the trade-off?

You must provide a connectivity path for every administrator and deployment system. Common approaches include a VM in the VNet, VNet peering, VPN, ExpressRoute, Bastion-related connectivity, or other supported private connectivity mechanisms.

Microsoft notes that private clusters require network connectivity to the private API endpoint and that Microsoft-hosted Azure DevOps agents are not supported directly with private AKS clusters; self-hosted/connected runners are typical alternatives.

Reference:
https://learn.microsoft.com/en-us/azure/aks/private-clusters

### Why are we not choosing it now?

For this project it adds infrastructure and operational complexity before we have validated the basic AKS/application architecture. We want to learn the networking concepts without creating a private-connectivity problem that can block `kubectl` or CI/CD.

**Decision: OFF for this project.**

---

# 3. Public access: API Server Authorized IP Ranges

Portal option:

**Set authorized IP ranges**

## What does it do?

It restricts access to the **public Kubernetes API server** to specified public IP addresses/CIDR ranges.

It does not control application traffic to your Pods. It controls who can reach the Kubernetes control-plane API.

## Why do we need it?

Without authorized ranges, a public API endpoint can be reached from arbitrary source networks, although authentication and authorization are still required.

Authorized ranges add a network-level restriction:

```text
Allowed admin/CI IPs  ---> API server ---> allowed
Other Internet IPs    ---> API server ---> blocked
```

## How do we use it?

Typical entries are:

- The stable public IP of an administrator's network.
- The stable outbound IP of a self-hosted CI/CD runner.
- A corporate firewall/NAT public IP.

Microsoft recommends including the cluster egress IP and the IP ranges used to administer the cluster when appropriate.

## When should we enable it?

### For our project

**Initially: leave it OFF while building/testing access.**

Once we know the stable public IP used by our administration machine/runner, we can turn it ON and add that IP as `/32` or the required CIDR.

This avoids locking ourselves out because a home/mobile ISP changed the public IP.

### Important limitation

Authorized IP ranges apply to the **public** API server. They cannot be used to control access to a private API endpoint.

Reference:
https://learn.microsoft.com/en-us/azure/aks/api-server-authorized-ip-ranges

---

# 4. Container networking — the important choice

This is the setting that determines **how Pod IP addresses are allocated and how Pod traffic is routed**.

Do not confuse these concepts:

- **IPAM/networking model** = where Pod IPs come from.
- **Network dataplane** = how packets are forwarded.
- **Network policy engine** = how Pod-to-Pod traffic is allowed/blocked.
- **Load balancer** = how certain external/internal Service traffic is distributed.

Microsoft's current AKS documentation separates overlay networking from flat networking and recommends Azure CNI Overlay for most scenarios.

Reference:
https://learn.microsoft.com/en-us/azure/aks/plan-pod-networking

---

# 5. Azure CNI Overlay — recommended for our project

Portal label:

**Azure CNI Overlay**

## What does it do?

Nodes receive IP addresses from the Azure VNet subnet.

Pods receive IP addresses from a separate **Pod CIDR overlay range**, not directly from the VNet subnet.

Conceptually:

```text
Azure VNet
|
+-- AKS node subnet
|      |
|      +-- Node 1: VNet IP
|      +-- Node 2: VNet IP
|
+-- Pod overlay CIDR
       |
       +-- Pod A
       +-- Pod B
       +-- Pod C
```

Pod traffic inside the cluster uses the overlay network. When Pods communicate with destinations outside the cluster, traffic is translated/routed through the node networking as appropriate.

## Why do we need it?

The biggest advantage for us is **VNet IP conservation**.

If every Pod consumed an IP directly from the Azure VNet subnet, a small subnet could run out of addresses quickly. Overlay networking separates Pod IP allocation from the VNet address space.

## Benefits

- Conserves Azure VNet IP space.
- Simpler IP planning.
- Good scalability.
- Recommended for most AKS scenarios.
- Works well for normal web/API/microservice workloads.
- Works with Application Gateway/AGIC when the required VNet relationship is satisfied.

## Trade-offs

Pods are not directly reachable from arbitrary external networks using their overlay IPs. External access normally comes through Kubernetes Services, load balancers, ingress, or other supported mechanisms.

## When should we use it?

Use it for:

- Most new AKS clusters.
- Student/lab clusters.
- Microservices.
- Web applications and APIs.
- Clusters where VNet IP space is limited.
- Large or potentially growing clusters.

**Project decision: USE Azure CNI Overlay.**

Reference:
https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay

---

# 6. Azure CNI Node Subnet — understand it, but don't choose it here

Portal label may appear as:

**Azure CNI Node Subnet**

This is a **legacy/older flat-networking model**.

## What does it do?

Pods receive IP addresses from the same Azure VNet subnet used for AKS networking.

Conceptually:

```text
Azure VNet subnet
|
+-- Node IP
+-- Node IP
+-- Pod IP
+-- Pod IP
+-- Pod IP
+-- ...
```

## Why would we use it?

It can be useful when Pods need strong/native VNet connectivity and the organization has deliberately planned a large enough subnet.

## Benefits

- Pods have VNet IP addresses.
- Strong native Azure networking integration.
- Connected Azure resources can interact with Pod IPs according to the networking configuration.

## Problems/trade-offs

Every Pod consumes VNet address space.

That means IP planning becomes important:

```text
More Pods
   |
   v
More VNet IPs required
   |
   v
Larger subnet required
```

A badly sized subnet can become an IP-exhaustion problem that is difficult to fix later.

## When should we use it?

Use only when there is a concrete requirement for this flat networking model and the VNet has enough IP capacity.

For a new general-purpose project, Microsoft currently recommends newer CNI options instead of relying on legacy Node Subnet behavior.

**Project decision: DO NOT USE unless a later requirement proves we need it.**

Reference:
https://learn.microsoft.com/en-us/azure/aks/concepts-network-legacy-cni

---

# 7. Azure CNI Pod Subnet — modern flat-network alternative

Portal availability can vary, so this option may not appear in exactly the same place in every portal experience.

## What does it do?

Pods receive IP addresses from a **dedicated Pod subnet**, separate from the node subnet but still inside the Azure VNet.

Conceptually:

```text
Azure VNet
|
+-- Node subnet
|     +-- Node IPs
|
+-- Pod subnet
      +-- Pod IPs
      +-- Pod IPs
      +-- Pod IPs
```

## Why would we use it?

It provides flat VNet connectivity for Pods while separating Pod IP allocation from the node subnet.

This is useful when external/connected networks need to reach Pod IPs directly or when the application requires native VNet semantics.

## Trade-off

You still need to reserve sufficient VNet IP space for Pods.

## When should we use it?

Use it when the workload specifically needs flat networking/direct Pod IP connectivity and the team is prepared to plan dedicated Pod-subnet capacity.

For our student project, the simpler **Azure CNI Overlay** model is a better fit.

Reference:
https://learn.microsoft.com/en-us/azure/aks/plan-pod-networking

---

# 8. Kubenet — legacy option

Kubenet is an older AKS networking model. It is important to learn because you will encounter it in older tutorials and existing clusters.

## What does it do?

Nodes get IPs from the Azure VNet subnet, while Pods use a separate address range. Routing and IP forwarding are used to connect Pod traffic.

```text
VNet subnet
|
+-- Node IP
+-- Node IP

Separate Pod CIDR
|
+-- Pod IP
+-- Pod IP
```

## Why was it useful?

It conserved VNet IP addresses because Pods did not consume VNet subnet addresses directly.

## Why shouldn't we choose it for a new project?

Microsoft has announced that **kubenet networking for AKS will be retired on March 31, 2028**. New designs should use Azure CNI Overlay instead.

Kubenet also has additional routing/UDR considerations and feature limitations compared with modern Azure CNI options.

**Project decision: DO NOT USE.**

Reference:
https://learn.microsoft.com/en-us/azure/aks/configure-kubenet

---

# 9. Quick comparison of networking models

| Model | Pod IP source | VNet IP consumption | Direct VNet Pod connectivity | New-project recommendation | Our project |
|---|---|---|---|---|---|
| **Azure CNI Overlay** | Separate Pod CIDR | Low | More limited than flat networking | **Recommended for most scenarios** | **USE** |
| **Azure CNI Pod Subnet** | Dedicated VNet Pod subnet | Medium/high | Yes | Recommended for flat-network requirements | Not needed |
| **Azure CNI Node Subnet** | Node/VNet subnet | High | Yes | Legacy | Do not use |
| **Kubenet** | Separate Pod CIDR + routing | Low | More limited | **Retiring 2028** | Do not use |

### Important terminology correction

A common source of confusion is calling these all simply "CNI types." Modern AKS separates:

1. **IPAM/networking model** — Overlay, Pod Subnet, Node Subnet, etc.
2. **Network dataplane** — Azure or Cilium.
3. **Network policy engine** — None, Azure, Calico, or Cilium depending on configuration.

That separation is important when designing AKS correctly.

---

# 10. Bring your own Azure virtual network

Portal option:

**Bring your own Azure virtual network**

## What does it do?

Instead of letting AKS manage/create the network automatically, you provide an existing Azure VNet and subnet configuration.

## Why would we use it?

Use BYO VNet when the surrounding architecture needs deliberate control over:

- VNet address space.
- Subnets.
- Application Gateway placement.
- Firewall/NAT Gateway placement.
- Private endpoints.
- Routing.
- NSGs.
- Peering.
- Hub-and-spoke architecture.

## When should we use it?

For a simple learning cluster, AKS-managed networking is easier.

For **our planned architecture**, BYO VNet is useful because the project includes a separate Application Gateway/ingress architecture and explicitly planned subnets. Azure documentation for Application Gateway/AGIC requires the relevant networking relationship, and CNI Overlay deployments using AGIC need the gateway and AKS networking to be placed appropriately.

Reference:
https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview

## Trade-off

BYO VNet gives control but makes us responsible for IP planning, subnet sizing, routing, and supporting network resources.

**Project direction: LIKELY USE BYO VNet once the VNet/Application Gateway design is finalized.**

Do not create the VNet until the required subnet sizes and IP consumption are confirmed.

---

# 11. DNS name prefix

Portal option:

**DNS name prefix**

## What does it do?

It contributes to the DNS/FQDN used for the AKS API endpoint and cluster-related access.

Example conceptually:

```text
aks-azure-project-dns + Azure AKS DNS domain
```

## Why do we need it?

Humans and tools use a DNS name rather than memorizing an API server IP address.

## How should we choose it?

Use a short, unique, descriptive name such as:

`aks-azure-project-dns`

Avoid putting secrets or sensitive information into the name.

## Public vs private cluster note

For our current **public** cluster, the API server has a public endpoint/FQDN.

For a private cluster, DNS becomes more involved because the API endpoint resolves through private networking/private DNS mechanisms.

**Project value: KEEP a simple descriptive prefix.**

---

# 12. Cilium dataplane and network policy engine

Portal option shown in our screenshot:

**Enable Cilium dataplane and network policy engine**

This setting is important because it combines two related but distinct ideas:

- Packet forwarding/data plane.
- Kubernetes network-policy enforcement.

## What is a dataplane?

The dataplane is the part of the node networking stack that actually handles network packets.

AKS can use an Azure CNI dataplane or the **Cilium** dataplane.

Cilium uses eBPF-based networking technology rather than relying on the traditional iptables model for its dataplane.

## Why use Cilium?

Current Microsoft guidance recommends Cilium for modern AKS network policy because it provides strong Kubernetes-native policy support and additional capabilities such as Layer 7 policy/FQDN filtering in supported configurations.

## When should we use it?

Use Cilium when:

- You want modern eBPF-based networking.
- You need advanced network-policy capabilities.
- You want to learn the current AKS networking direction.
- The chosen AKS features and region support it.

## Why might we leave it off for our first deployment?

Our first goal is to establish a working, understandable cluster. Adding Cilium changes the dataplane and policy model at the same time, which increases the learning surface.

We can learn Cilium separately after the basic cluster is healthy.

**Project decision for first cluster: LEAVE Cilium disabled unless a later requirement specifically needs it.**

Reference:
https://learn.microsoft.com/en-us/azure/aks/use-network-policies

---

# 13. Network policy engine

Portal choices shown in our configuration:

- **None**
- **Calico**
- **Azure**

With the Cilium dataplane/policy configuration, Cilium becomes the relevant policy technology instead.

## What is network policy?

Network policy controls which Pods may communicate with which other Pods.

Example:

```text
Internet
   |
   v
Ingress
   |
   v
Frontend Pod  ---> Backend Pod ---> Database/API dependency
                    |
                    X
             Other namespace blocked
```

By default, Kubernetes networking is generally permissive between Pods unless policies are applied.

---

## 13.1 None

### What does it do?

No Kubernetes network-policy enforcement is enabled.

### Why use it?

- Simplest configuration.
- Easiest initial debugging.
- Useful for a learning lab where policy is not yet being taught.

### Risk

Pod-to-Pod communication is not restricted by network policy.

### Our use

**Reasonable for the first infrastructure-only deployment**, but we should add policies before treating the application as production-hardened.

---

## 13.2 Azure network policy

### What does it do?

Azure provides the policy implementation for Kubernetes network policies.

### Why use it?

- Azure-native approach.
- Good fit when using Azure CNI.
- Useful for restricting east-west Pod traffic.

### Example policy goal

Allow:

```text
frontend -> backend
backend  -> database
```

Block unnecessary traffic:

```text
frontend -X-> database
qa       -X-> prod
```

### When should we use it?

Use it when you want Azure-native Pod segmentation without adopting Calico.

### Our use

**Potential second-stage choice** after the cluster and application routing are stable.

---

## 13.3 Calico

### What does it do?

Calico is an open-source Kubernetes networking and network-security solution that can enforce network policies.

### Why use it?

Use it when you need Calico-specific capabilities, existing organizational knowledge, or a policy model that is already standardized around Calico.

### Trade-off

It introduces another networking technology into the platform and is not necessary for this project's basic architecture.

**Project decision: Do not select Calico for the first cluster. Learn it as an alternative.**

---

# 14. Network policy comparison

| Policy engine | Main purpose | Complexity | When to use | Project |
|---|---|---:|---|---|
| **None** | No Pod network-policy enforcement | Low | Initial labs/simple clusters | **Start here** |
| **Azure** | Azure-native Kubernetes network policies | Medium | Azure CNI + Pod segmentation | Possible later |
| **Calico** | Open-source network policy/security | Medium/high | Calico-specific requirements | Learn, don't deploy initially |
| **Cilium** | eBPF dataplane + modern policy | Medium/high | Advanced modern networking/policy | Later if required |

Microsoft currently recommends Cilium for modern network-policy use cases, but our first deployment can remain deliberately simple.

---

# 15. Load balancer: Standard

The portal currently shows:

**Load balancer: Standard**

## What does it do?

Azure Load Balancer provides Layer 4 load balancing for supported Kubernetes `Service` objects of type `LoadBalancer` and can also participate in AKS outbound connectivity.

## Why Standard?

AKS no longer supports the Basic Load Balancer for current configurations. Standard Load Balancer is the current supported choice.

## When do we need it?

Even if our application is exposed through Application Gateway, AKS may still use its load-balancing infrastructure for cluster networking/egress depending on the selected outbound architecture.

For application exposure, we prefer a single ingress layer rather than creating a separate public `LoadBalancer` Service for every application.

## Cost

Standard Load Balancer pricing is usage based. Microsoft lists charges for load-balancing rules and data processed; there is no hourly charge merely for having a Standard Load Balancer with no configured rules.

Reference:
https://azure.microsoft.com/en-in/pricing/details/load-balancer/

**Project decision: KEEP Standard.**

---

# 16. Outbound/egress networking — important even if the portal hides it

Outbound networking determines how AKS nodes and Pods reach destinations outside the cluster.

Examples:

- Container registries.
- OS package repositories.
- Azure APIs.
- External APIs.
- Azure SQL endpoints.
- Monitoring services.

Microsoft currently documents these main outbound types:

1. `loadBalancer`
2. `managedNATGateway`
3. `userAssignedNATGateway`
4. `userDefinedRouting`
5. `none` for isolated scenarios
6. `block` in supported preview/isolated scenarios

Reference:
https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype

---

## 16.1 Load Balancer outbound

### What?

Outbound traffic exits through the AKS-managed Standard Load Balancer and its public IP configuration.

### Why?

It is the straightforward/default-style architecture for many AKS clusters.

### Use when

- You want a simple cluster.
- You don't need a dedicated NAT Gateway.
- The outbound traffic volume is modest.

**Likely project choice:** yes, unless quota/cost testing shows a better option.

---

## 16.2 Managed NAT Gateway

### What?

AKS uses Azure NAT Gateway for outbound connectivity.

### Why?

NAT Gateway provides scalable, predictable outbound connectivity and many more concurrent outbound flows per public IP than a basic load-balancer egress design.

### Trade-off

It is a separate billable Azure resource. NAT Gateway has resource-hour and data-processing charges, and public IP/bandwidth charges may also apply.

Reference:
https://azure.microsoft.com/en-in/pricing/details/azure-nat-gateway

### When?

Use when the application has significant outbound traffic or needs a predictable/scalable egress architecture.

**Project decision:** probably unnecessary for the first student cluster unless another requirement forces it.

---

## 16.3 User-assigned NAT Gateway

### What?

You create/manage the NAT Gateway and associate it with the AKS subnet.

### Why?

Useful when you need explicit control of outbound IP addresses and network infrastructure.

### When?

Advanced BYO-VNet architecture, centralized networking, firewall allowlists, or predictable enterprise egress.

**Project decision:** not needed initially.

---

## 16.4 User-defined routing

### What?

AKS does not automatically provide the complete egress path. You define routing through a route table, firewall, NVA, or another network appliance.

### Why?

It provides maximum control over egress.

### When?

Enterprise networks, forced tunneling, centralized Azure Firewall, hub-and-spoke architectures, and other advanced designs.

### Why not us?

It adds substantial network complexity that is not required for the student project.

**Project decision: DO NOT USE initially.**

---

# 17. Application Gateway and public IP implications

Our project originally planned to expose applications through Azure Application Gateway.

Application Gateway is separate from the AKS node-networking model.

For an internet-facing Application Gateway, a public frontend IP is normally required. Current Application Gateway v2 supports public and private frontend configurations, but a public frontend is required for an Internet-facing endpoint.

Application Gateway v1 retired on **April 28, 2026**; new designs should use a current v2 SKU.

References:

- https://learn.microsoft.com/en-us/azure/application-gateway/overview-v2
- https://learn.microsoft.com/en-us/azure/application-gateway/configuration-frontend-ip

## Our quota implication

The project currently observes:

- General public-IP quota in Central India: **3**, usage **0**.
- Standard IPv4 quota observed in the portal: **0**, usage **0**.

This means the Application Gateway public-IP requirement still needs to be validated before deployment.

**Do not create Application Gateway until the exact public-IP SKU/quota requirement is confirmed for the subscription.**

---

# 18. VNet and subnet planning

For the final BYO VNet architecture, the logical layout is:

```text
Azure VNet
|
+-- Application Gateway subnet
|
+-- AKS node subnet
|
+-- Optional Pod subnet (only for Azure CNI Pod Subnet)
|
+-- Optional private-endpoint subnet(s)
```

### Do not create extra subnets just because Azure allows them.

Every subnet should have a reason:

- AKS nodes.
- Application Gateway.
- Private endpoints.
- Firewall/NAT/network appliances.
- Other explicitly required infrastructure.

For Azure CNI Overlay, the Pod CIDR is separate from the VNet, which reduces the VNet address pressure.

---

# 19. How the settings fit together

A useful mental model is:

```text
                 AKS Networking
                       |
        +--------------+--------------+
        |                             |
   Control plane                 Data plane
        |                             |
  Public / Private           Azure CNI Overlay
        |                    Azure CNI Pod Subnet
  Authorized IPs             Azure CNI Node Subnet
                             Kubenet (legacy)
                                      |
                         +------------+------------+
                         |                         |
                    Cilium dataplane         Azure dataplane
                         |
                  Network policy engine
                         |
             None / Azure / Calico / Cilium
```

And separately:

```text
Application exposure
        |
        +--> ClusterIP (internal)
        |
        +--> LoadBalancer Service (L4)
        |
        +--> Ingress / Application Gateway (L7)

Outbound/egress
        |
        +--> Load Balancer
        +--> NAT Gateway
        +--> User Defined Routing
        +--> None/isolated scenarios
```

This separation prevents a common AKS mistake: assuming that "networking" is one single switch.

---

# 20. Our exact first-cluster configuration

For the first deployment, the target is:

| Setting | Decision | Reason |
|---|---|---|
| AKS API access | **Public** | Easier administration and CI/CD while learning |
| Private cluster | **OFF** | Avoid private-connectivity complexity initially |
| Authorized IP ranges | **OFF initially** | Avoid lockout while IP/network is still changing |
| Container networking | **Azure CNI Overlay** | Best balance of modern support, IP conservation, and simplicity |
| BYO VNet | **Likely ON** | Needed for deliberate subnet/Application Gateway architecture |
| DNS prefix | `aks-azure-project-dns` style | Simple and descriptive |
| Cilium dataplane | **OFF initially** | Keep first deployment simple |
| Network policy | **None initially** | Establish baseline before adding Pod segmentation |
| Load balancer | **Standard** | Current supported AKS choice |
| Outbound | **Load Balancer initially** | Simplest student-friendly egress unless final architecture requires NAT/UDR |
| Application Services | **ClusterIP** | Avoid unnecessary public IPs |
| External entry point | **Application Gateway / chosen ingress layer** | One controlled public entry point |

### Why not turn everything on?

Because every networking feature should answer a specific requirement.

We are intentionally learning the architecture in layers:

1. Make AKS networking work.
2. Validate Pods and Services.
3. Validate internal DNS/service communication.
4. Add ingress.
5. Add Application Gateway if the quota/resource design permits it.
6. Add network policies.
7. Add stricter API access controls.
8. Add advanced egress only if needed.

---

# 21. Decision guide: what should I choose?

### "I just want a normal new AKS cluster."

Use **Azure CNI Overlay**.

### "I need Pods to behave like first-class VNet IPs."

Consider **Azure CNI Pod Subnet** or another flat-network model.

### "I found an old tutorial saying Azure CNI Node Subnet."

Understand it, but prefer the modern networking options unless you have a specific requirement.

### "I found an old tutorial saying kubenet."

Do not start a new project with it. It is scheduled for retirement on March 31, 2028.

### "I need strict Pod-to-Pod isolation."

Use a supported network-policy engine. For a modern design, evaluate **Cilium**; Azure and Calico are other options depending on requirements.

### "I need the API server reachable only from my office/VPN/CI runner."

Use a public API server with **authorized IP ranges**, or choose a private cluster if the entire architecture requires private control-plane connectivity.

### "I need a predictable outbound IP."

Evaluate **NAT Gateway** or a controlled egress architecture rather than relying blindly on changing outbound behavior.

### "I need a public website with multiple paths/apps."

Use an **Ingress/L7 gateway** rather than giving every Service its own public IP.

---

# 22. Cost impact of networking choices

Most networking settings themselves do **not** have a simple "AKS networking monthly price." Instead, they may create or require other billable Azure resources.

| Choice | Typical cost impact |
|---|---|
| Public AKS API | No separate "public cluster" fee; supporting network resources still matter |
| Private AKS | Can introduce Private Link/private DNS/connectivity resources and operational complexity |
| Authorized IP ranges | No major separate service fee; improves API access control |
| Azure CNI Overlay | Primarily an AKS networking configuration; avoids consuming many VNet IPs |
| Azure CNI Node Subnet | May force larger subnets/IP planning; no simple fixed monthly networking fee |
| Azure CNI Pod Subnet | Requires additional VNet IP capacity; cost is mainly supporting infrastructure, not a simple per-Pod fee |
| Cilium | No simple separate per-cluster networking fee; resource/operational impact should be considered |
| Standard Load Balancer | Usage-based rules/data processing charges; no hourly charge merely for an empty Standard Load Balancer |
| NAT Gateway | Billable resource hours + data processing + applicable public IP/bandwidth charges |
| BYO VNet | VNet itself is not the expensive part; attached gateways, firewalls, NAT, private endpoints, etc. can be |
| Application Gateway | Separate billable Azure service; this is one of the significant costs in our planned architecture |

Use the Azure Portal pricing shown for the exact subscription/region before deployment rather than relying on a generic monthly estimate.

---

# 23. Student-subscription constraints to keep in mind

Current observed project constraints:

- Primary region: **Central India (`centralindia`)**.
- Regional regular vCPU quota: **4 vCPUs**, usage observed at 0.
- General public-IP quota: **3**, usage observed at 0.
- Standard IPv4 public-IP quota: **0**, usage observed at 0 in the portal.

These numbers are subscription/region observations, not universal Azure limits.

The selected VM SKU must also be available in the selected region and compatible with any availability-zone selection.

---

# 24. Important 2026 change: default outbound access

Azure has changed VM default outbound behavior. Starting **March 31, 2026**, AKS no longer relies on default outbound access for new AKS-managed-VNet VM scenarios. New cluster networking should therefore have an explicit, supported outbound path rather than assuming every VM automatically has Internet access.

This is another reason to understand the outbound type instead of treating it as an invisible Azure default.

Reference:
https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype

---

# 25. Final project networking decision

For the first working cluster we will use the following principle:

> **Public AKS API + Azure CNI Overlay + Standard Load Balancer + simple egress + internal Kubernetes Services + controlled external ingress.**

We are deliberately **not** using a private AKS API, Kubenet, unnecessary public LoadBalancer Services, or advanced UDR/NAT architecture until a concrete requirement justifies them.

The goal is not to select the most complicated or most "enterprise" option. The goal is to select the smallest architecture that is technically correct, secure enough for the project's stage, explainable, and compatible with the Azure for Students subscription.

---

# 26. References

Microsoft Learn:

- AKS networking concepts: https://learn.microsoft.com/en-us/azure/aks/concepts-network
- Plan Pod networking: https://learn.microsoft.com/en-us/azure/aks/plan-pod-networking
- Azure CNI Overlay: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Legacy CNI models: https://learn.microsoft.com/en-us/azure/aks/concepts-network-legacy-cni
- Kubenet: https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Network policies: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- API server authorized IP ranges: https://learn.microsoft.com/en-us/azure/aks/api-server-authorized-ip-ranges
- Private AKS clusters: https://learn.microsoft.com/en-us/azure/aks/private-clusters
- AKS outbound types: https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype
- NAT Gateway for AKS: https://learn.microsoft.com/en-us/azure/aks/nat-gateway
- Application Gateway v2: https://learn.microsoft.com/en-us/azure/application-gateway/overview-v2
- Application Gateway/AGIC: https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- Azure Load Balancer pricing: https://azure.microsoft.com/en-in/pricing/details/load-balancer/
- Azure NAT Gateway pricing: https://azure.microsoft.com/en-in/pricing/details/azure-nat-gateway

**Last reviewed:** 2026-09-14
