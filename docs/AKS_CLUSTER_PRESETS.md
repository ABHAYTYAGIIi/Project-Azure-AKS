# AKS Cluster Presets — Purpose, Cost and When to Use Them

## 1. Why this document exists

The Azure Portal provides four AKS cluster configuration presets when creating an AKS cluster:

1. **Production Standard**
2. **Dev/Test**
3. **Production Economy**
4. **Production Enterprise**

These presets are **starting configurations**, not separate AKS products. They choose defaults for node sizes, node-pool scaling, networking, security, monitoring, identity, and related features. The selected preset can be modified during cluster creation.

The preset itself does not have a separate fixed monthly charge. The real cost comes from the Azure resources that the preset configures, especially AKS worker nodes, disks, networking, monitoring, and other enabled services. AKS cluster management can use the Free, Standard, or Premium pricing tier separately from these four portal presets.

---

## 2. Quick comparison

| Preset | Main purpose | System node size | Minimum system nodes in portal preset | User node pool | Security / management posture | Best use |
|---|---|---|---:|---|---|---|
| **Production Standard** | General production workloads using recommended AKS practices | Standard_D8ds_v5 | 2 | Standard_D8ds_v5 | Production-oriented | Normal production applications |
| **Dev/Test** | Development and testing | Standard_D4ds_v5 | 2 | None by default | Lightweight | Learning, labs, development and testing |
| **Production Economy** | Production at lower cost where interruptions can be tolerated | Standard_D8ds_v5 | 2 | Standard_D8as_v4, autoscaling 0–25 | Cost-conscious | Interruptible / flexible workloads |
| **Production Enterprise** | Highly controlled production environments | Standard_D16ds_v5 | 2 | Standard_D8ds_v5 | Stronger security and governance defaults | Enterprise / regulated workloads |

**Important:** These are Azure's current portal preset defaults, not requirements for every AKS cluster. The values can change as Azure evolves. Always verify the current portal configuration before deployment.

---

## 3. Production Standard

### What does it do?

Production Standard is Azure's general-purpose production preset. It is intended for most applications that serve production traffic and need a conventional AKS production baseline.

Current portal defaults include:

- System node pool: `Standard_D8ds_v5`
- System node autoscaling: 2–5 nodes
- User node pool: `Standard_D8ds_v5`
- User node autoscaling: 2–100 nodes
- Azure CNI Overlay networking
- Azure Policy enabled by default
- Azure Monitor enabled by default
- Secrets Store CSI Driver enabled by default
- Availability zones enabled where supported
- Kubernetes RBAC with local accounts in the current preset configuration

### Why would we need it?

Use it when the objective is a normal production AKS platform and the subscription has enough capacity for the recommended production baseline.

It gives a good starting point for a serious production application without requiring the operator to design every platform setting from scratch.

### Where should we use it?

Use for:

- Production web applications
- APIs
- Microservices
- Business applications
- Applications where availability and operational reliability matter

### Cost estimate for our region

The preset itself has no separate monthly price.

For Central India, a current public retail reference lists `Standard_D8ds_v5` at approximately **$0.488/hour**, or about **$356/month per node** using 730 hours/month. Two minimum system nodes would therefore be approximately **$712/month for VM compute alone**.

This excludes disks, networking, monitoring, Application Gateway, SQL Database, ACR, taxes, and other services. Actual Azure billing may differ.

**For our Azure for Students project:** this preset is far too large for our current 4-vCPU regional quota and student-resource constraints.

---

## 4. Dev/Test

### What does it do?

Dev/Test is designed for developing new workloads and testing existing workloads.

Current portal defaults include:

- System node pool: `Standard_D4ds_v5`
- System node autoscaling: 2–5 nodes
- No user node pool by default
- Azure CNI Overlay networking
- Fewer production-oriented add-ons enabled by default
- Local Kubernetes accounts with Kubernetes RBAC in the current preset

### Why would we need it?

It reduces the starting infrastructure footprint compared with Production Standard and is intended for non-production environments.

This is the most relevant preset when the goal is:

- Learning AKS
- Building a student project
- Testing Kubernetes manifests
- Testing application deployments
- Practicing networking, Ingress and secrets

### Where should we use it?

Use for:

- Development clusters
- University projects
- Proofs of concept
- Training labs
- Temporary testing environments

Do not treat it as automatically equivalent to a production-hardened architecture.

### Cost estimate for our region

For Central India, a current public retail reference lists `Standard_D4ds_v5` at approximately **$0.244/hour**, or about **$178/month per node** using 730 hours/month.

With the preset's two-node minimum, the system-node compute would be approximately **$356/month**.

This is a VM-compute estimate only and excludes other Azure services and charges.

**For our project:** this is the most cost-conscious conventional preset, but even this preset's default two-node configuration would exceed our current 4-vCPU quota exactly once other AKS requirements and workloads are considered. We must configure the cluster carefully rather than blindly accepting the preset.

---

## 5. Production Economy

### What does it do?

Production Economy is intended for production traffic where cost is important and workloads can tolerate interruptions.

Current portal defaults include:

- System node pool: `Standard_D8ds_v5`
- System node autoscaling: 2–5 nodes
- User node pool: `Standard_D8as_v4`
- User node autoscaling: 0–25 nodes
- Azure CNI Overlay networking
- Microsoft Entra ID authentication with Azure RBAC in the current preset
- Production-oriented features with some cost-conscious defaults

The economy model is especially useful when workloads can make use of interruption-tolerant compute, including scenarios where Spot capacity is appropriate.

### Why would we need it?

It is useful when production workloads need to run economically and can tolerate interruptions or flexible capacity.

### Where should we use it?

Potential use cases:

- Batch processing
- Asynchronous workers
- Fault-tolerant background jobs
- Flexible workloads
- Cost-sensitive production workloads

Do **not** use interruption-prone capacity for components that cannot tolerate eviction without designing for it.

### Cost estimate for our region

`Standard_D8ds_v5` in Central India is approximately **$0.488/hour**, or about **$356/month per node** at 730 hours.

`Standard_D8as_v4` in Central India is approximately **$0.246/hour**, or about **$180/month per node** at 730 hours.

The preset's minimum user-node count is 0, so the minimum VM compute from the configured pools is approximately the two system nodes:

- 2 × D8ds_v5 ≈ **$712/month**
- User pool minimum = 0 nodes
- Approximate minimum VM compute ≈ **$712/month**

Again, this is not the price of the preset itself and excludes all other Azure resources.

**For our project:** this preset is not appropriate for our current student quota because the system nodes alone are much larger than our available regional CPU quota.

---

## 6. Production Enterprise

### What does it do?

Production Enterprise is intended for production environments requiring stronger permissions, security controls and hardened configuration.

Current portal defaults include:

- System node pool: `Standard_D16ds_v5`
- System node autoscaling: 2–5 nodes
- User node pool: `Standard_D8ds_v5`
- User node autoscaling: 2–100 nodes
- Private cluster enabled by default in the current preset
- Azure Policy enabled
- Azure Monitor enabled
- Secrets Store CSI Driver enabled
- Availability zones enabled where supported
- Azure CNI Overlay networking
- Microsoft Entra ID / Azure RBAC-oriented access model

### Why would we need it?

Use it when security, governance, access control and hardened production operation are more important than minimizing cost and infrastructure footprint.

### Where should we use it?

Examples:

- Enterprise applications
- Regulated workloads
- Strict security environments
- Organizations with centralized governance
- Production systems with strong compliance requirements

### Cost estimate for our region

`Standard_D16ds_v5` in Central India is approximately **$0.976/hour**, or about **$712/month per node** using 730 hours/month.

With two minimum system nodes:

- 2 × D16ds_v5 ≈ **$1,424/month** for system-node VM compute

The user node pool has a minimum of two nodes in this preset:

- 2 × D8ds_v5 ≈ **$712/month**

Therefore the approximate minimum VM compute represented by the preset is around **$2,136/month**, before storage, networking, monitoring, Application Gateway, SQL Database, ACR, taxes and other services.

**For our project:** this is completely inappropriate for an Azure for Students subscription. It is included in this document so we understand why it exists and when enterprise organizations would choose it.

---

## 7. Important distinction: Preset vs AKS pricing tier

Do not confuse these four portal presets with AKS pricing tiers.

### Portal configuration presets

- Production Standard
- Dev/Test
- Production Economy
- Production Enterprise

These mainly change the starting cluster configuration.

### AKS management pricing tiers

AKS separately provides:

- **Free** — cluster management is free; you still pay for consumed Azure resources.
- **Standard** — paid management tier with uptime SLA features.
- **Premium** — paid management tier with additional long-term-support capabilities.

For a student learning project, the **Free AKS management tier** is normally the cost-conscious choice if the required features and assignment goals allow it. The worker nodes and other Azure resources still generate charges.

---

## 8. Which preset should our project use?

### Our project requirements

We have:

- Azure for Students subscription
- Central India region
- Regional vCPU quota currently observed at **4 vCPUs**
- Standard public IPv4 quota currently observed at **3** with 0 used
- One AKS cluster
- Three namespaces: `dev`, `qa`, `prod`
- React frontend
- Node.js backend
- Python backend
- Azure SQL Database
- ConfigMaps and Secrets
- Ingress with path-based routing
- Application Gateway
- HTTPS / SSL
- Phase 2 GitHub Actions CI/CD

### Decision

**We should NOT simply select any of the four presets and deploy it unchanged.**

All four current portal presets are designed for substantially larger production-style node pools than our Azure for Students quota comfortably supports.

For this project, we should use **AKS Standard mode with a deliberately quota-conscious custom configuration**, while borrowing the relevant best practices from the production presets:

- private AKS API where compatible
- Azure CNI Overlay where appropriate
- RBAC
- workload/resource limits
- readiness/liveness probes
- Secrets Store CSI Driver only if needed and affordable
- Azure Policy where feasible
- controlled ingress
- no unnecessary public IPs
- namespace isolation
- documented resource quotas

The assignment is about learning Azure + AKS + Kubernetes + DevOps. We should understand what the production presets do, but we should not blindly deploy their large default node pools on a student subscription.

---

## 9. Cost methodology

All monthly examples above use:

`monthly estimate = hourly VM price × 730 hours`

They are **rough retail VM-compute estimates**, not guaranteed Azure invoices.

Actual project cost depends on:

- Azure for Students credits and eligible services
- VM capacity and SKU availability
- actual running hours
- disks
- public IPs
- Application Gateway
- Azure SQL Database
- ACR tier/storage
- monitoring/log analytics
- data transfer/egress
- taxes
- Azure pricing changes

We should use the Azure Portal pricing shown for our exact subscription and configuration as the final cost check before deployment.

---

## 10. Sources

- Microsoft Learn — AKS limits, SKUs, regions and cluster configuration presets: https://learn.microsoft.com/en-us/azure/aks/quotas-skus-regions
- Microsoft Learn — AKS cost optimization: https://learn.microsoft.com/en-us/azure/aks/best-practices-cost
- Microsoft Learn — AKS pricing tiers: https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers
- Microsoft Learn — AKS core concepts and cluster modes: https://learn.microsoft.com/en-us/azure/aks/core-aks-concepts

VM price references used for rough Central India estimates:

- Standard_D4ds_v5: approximately $0.244/hour in Central India.
- Standard_D8ds_v5: approximately $0.488/hour in Central India.
- Standard_D8as_v4: approximately $0.246/hour in Central India.
- Standard_D16ds_v5: approximately $0.976/hour in Central India.

These VM prices should be rechecked in the Azure Portal immediately before provisioning.
