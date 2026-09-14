# AKS Resource Groups & Monitoring Resources — Our Portal Snapshot

> Purpose: short, practical reference for the Azure resource groups and Azure resources we can see around our AKS project. This complements `AKS_GENERAL_KNOWLEDGE.md` and `AKS_NODE_RESOURCE_GROUP.md`.

## 1. Important: we are seeing more than two resource groups

The simple AKS explanation often starts with **two** resource groups:

1. our main/project resource group
2. the AKS `MC_...` node/infrastructure resource group

Our portal now shows additional resource groups because we enabled Azure Monitor / Managed Prometheus features. They are **supporting monitoring infrastructure**, not additional AKS clusters.

Our current portal view shows these four groups:

| Resource group | Role | Why it exists |
|---|---|---|
| `rg-azure-aks` | **Main/project RG** | Holds the AKS managed-cluster resource and project-level monitoring resources |
| `MC_rg-azure-aks_aks-azure-project_centralindia...` | **AKS node/infrastructure RG** | Holds worker-node infrastructure created/managed by AKS |
| `DefaultResourceGroup-CIN` | **Default Log Analytics RG** | Holds the default Log Analytics workspace used by Container Insights/log collection |
| `MA_defaultazuremonitorworkspace-cin_...` | **Azure Monitor managed RG** | Holds monitoring data-collection infrastructure for the Azure Monitor workspace, such as DCR/DCE resources |

The exact generated names can vary. Azure Monitor documents that a default Azure Monitor workspace can be created in a default regional resource group when one is not supplied, and that an Azure Monitor workspace creates a managed `MA_...` resource group containing monitoring collection resources. citeturn0search0turn0search8

---

# 2. The four groups as a mental model

```text
Azure Subscription
|
+-- rg-azure-aks
|     |
|     +-- AKS managed cluster
|     +-- Azure Monitor workspace
|     +-- Prometheus rule groups
|     +-- Data Collection Rules (DCRs)
|     +-- other project resources
|
+-- MC_rg-azure-aks_aks-azure-project_centralindia...
|     |
|     +-- VM Scale Set
|     +-- worker nodes / VMSS instances
|     +-- NICs
|     +-- disks
|     +-- VNet / subnet resources as applicable
|     +-- Load Balancer
|     +-- Public IP
|     +-- NSG
|     +-- AKS managed identity
|
+-- DefaultResourceGroup-CIN
|     |
|     +-- Log Analytics workspace
|
+-- MA_defaultazuremonitorworkspace-cin_...
      |
      +-- Data Collection Endpoint (DCE)
      +-- Data Collection Rule (DCR)
```

This is a much better picture of what Azure is doing than thinking that "AKS = one resource".

---

# 3. `rg-azure-aks` — our main/project resource group

This is the resource group we intentionally chose for the project.

### Resources visible in our portal

| Resource | Short meaning |
|---|---|
| `aks-azure-project` | The AKS `managedClusters` resource; represents/configures the AKS service |
| `defaultazuremonitorworkspace-...` | Azure Monitor workspace used for Managed Prometheus metrics |
| `KubernetesRecordingRules...` | Prometheus recording-rule group; precomputes useful metric expressions for dashboards/queries |
| `NodeAndKubernetesRecordingR...` | Another Prometheus recording-rule group for node/Kubernetes metrics |
| `MSCI-...` / `MSProm-...` resources | Azure Monitor data-collection configuration used by monitoring integrations |

### Key point

The **AKS resource is here**, but the worker VMs are not normally here. The worker infrastructure is in the `MC_...` node resource group.

---

# 4. `MC_...` — AKS node/infrastructure resource group

This is the group most directly connected to the **worker/data plane**.

Our portal snapshot shows six important resources:

| Resource seen | What it does |
|---|---|
| `aks-agentpool-...-vmss` | **Virtual Machine Scale Set** backing the AKS node pool; provides worker-node capacity |
| `139927cb-...` | **Public IP address** used by an Azure networking resource; public exposure does not automatically mean the Kubernetes API is public |
| `aks-agentpool-...-nsg` | **Network Security Group**; Azure-level network filtering |
| `aks-azure-project-agentpool-...` | **Managed Identity** associated with AKS/node-pool Azure permissions |
| `aks-vnet-...` | **Azure Virtual Network** providing the Azure network boundary for the nodes |
| `kubernetes` | **Azure Load Balancer** used for Kubernetes/Azure L4 networking functions |

Other resources can appear here depending on the exact cluster configuration: NICs, managed disks, backend pools, health probes, route tables, additional public IPs, and other AKS-managed infrastructure.

### Control-plane reminder

The `MC_...` group does **not** mean "control-plane resource group". The AKS control plane remains a Microsoft-managed service. The group mainly contains customer-visible worker/data-plane infrastructure and supporting Azure resources.

---

# 5. `DefaultResourceGroup-CIN` — Log Analytics support group

Our screenshot shows a **Log Analytics workspace** in this group.

### What is Log Analytics?

Log Analytics is the query/storage side used by Azure Monitor for log data.

For AKS, Container Insights can send container/node/cluster log data into a Log Analytics workspace.

Think:

```text
AKS / nodes / containers
        |
        | logs
        v
Container Insights
        |
        v
Log Analytics workspace
        |
        v
KQL queries / Azure Monitor
```

### Why is it separate?

Azure Monitor can create a default Log Analytics workspace/resource group when you don't provide an existing workspace. The resource group is therefore monitoring infrastructure, not AKS worker infrastructure.

---

# 6. `MA_...` — Azure Monitor managed resource group

Our screenshot shows a resource group beginning with:

```text
MA_defaultazuremonitorworkspace-cin_...
```

This is associated with the **Azure Monitor workspace** used by Managed Prometheus.

Microsoft documents that creating an Azure Monitor workspace creates a managed `MA_<workspace>_<location>_managed` resource group containing a **Data Collection Endpoint (DCE)** and **Data Collection Rule (DCR)**. These resources support data collection and are lifecycle-managed with the workspace. citeturn0search8turn0search9

### DCR — Data Collection Rule

A DCR describes **what telemetry should be collected and how it should be processed/routed**.

For Managed Prometheus, it is part of the configuration that gets Prometheus metrics into the Azure Monitor workspace.

### DCE — Data Collection Endpoint

A DCE is a network/ingestion endpoint used by supported Azure Monitor data collection flows.

Simple mental model:

```text
AKS metrics
    |
    v
Monitoring collection
    |
    +--> DCR = collection/config rules
    |
    +--> DCE = collection endpoint when required
    |
    v
Azure Monitor workspace
```

---

# 7. Azure Monitor workspace vs Log Analytics workspace

These are **not the same thing**.

| Workspace | Main purpose in our setup |
|---|---|
| **Azure Monitor workspace** | Stores/query Prometheus-compatible metrics |
| **Log Analytics workspace** | Stores/query logs and events, including Container Insights data |

So:

```text
METRICS
AKS -> Managed Prometheus -> Azure Monitor workspace

LOGS
AKS -> Container Insights -> Log Analytics workspace
```

Azure's current AKS monitoring documentation describes Managed Prometheus as storing metrics in an Azure Monitor workspace and Container Insights as using a Log Analytics workspace for logs. citeturn0search0turn0search12

---

# 8. Prometheus recording-rule groups

The resources visible in `rg-azure-aks` with names similar to:

```text
KubernetesRecordingRules...
NodeAndKubernetesRecordingRules...
```

are **Azure Managed Prometheus rule groups**.

A rule group can contain:

- recording rules
- alert rules

A **recording rule** precomputes a PromQL expression and stores the resulting time series so commonly used queries/dashboards can be evaluated more efficiently.

Example concept:

```text
Raw Prometheus metrics
        |
        v
Recording rule
        |
        v
Precomputed time series
        |
        v
Dashboard / query
```

Microsoft documents that Managed Prometheus rule groups are Azure resources and can contain alert and recording rules. citeturn0search2

---

# 9. Why did these monitoring resources appear?

On our AKS creation screen we enabled:

```text
Container Logs       -> ON
Managed Prometheus   -> ON
Control-plane metrics -> ON
Grafana              -> OFF
```

That explains why Azure is provisioning monitoring infrastructure in addition to the normal AKS resources.

The important distinction is:

```text
AKS infrastructure
    -> MC_... node RG

Log monitoring
    -> Log Analytics workspace / DefaultResourceGroup-CIN

Prometheus metrics
    -> Azure Monitor workspace
    -> MA_... managed RG
    -> DCR/DCE
    -> Prometheus rule groups
```

---

# 10. One resource can participate in several layers

Do not assume that every Azure resource corresponds to one Kubernetes concept.

For example:

```text
Kubernetes Service
       |
       v
Azure Load Balancer
       |
       +-- Public IP (if public)
       +-- frontend
       +-- rule
       +-- health probe
       +-- backend pool
       |
       v
AKS nodes
       |
       v
Pods
```

Likewise:

```text
AKS Pods / Nodes
       |
       v
Monitoring agents / collection
       |
       +-- DCR / DCE
       |
       +-- Azure Monitor workspace (metrics)
       |
       +-- Log Analytics workspace (logs)
```

---

# 11. What belongs to what?

| Layer | Main resources in our project |
|---|---|
| **AKS service/control configuration** | `aks-azure-project` in `rg-azure-aks` |
| **Worker/data plane** | VMSS, nodes, NICs, disks in `MC_...` |
| **Azure networking** | VNet, NSG, Load Balancer, Public IP in/around `MC_...` |
| **Prometheus metrics** | Azure Monitor workspace + DCR/DCE + rule groups |
| **Container logs** | Log Analytics workspace + Container Insights |
| **Application workloads** | Kubernetes Pods/Deployments/Services; not ordinary Azure RG resources |
| **Control plane** | Microsoft-managed AKS service; not a set of customer-managed VMs in `MC_...` |

---

# 12. What we should NOT manually delete

Do not delete resources simply because they look unfamiliar.

Especially avoid manually deleting or modifying:

- VMSS
- AKS node NICs
- AKS managed disks
- AKS Load Balancer components
- AKS-managed NSGs
- AKS-managed identities
- Azure Monitor DCR/DCE resources
- monitoring workspaces used by the cluster

Use the AKS or Azure Monitor configuration that created them when you want to change or remove them.

The safest mental rule is:

> **If Azure created it as part of AKS/Monitor integration, first understand its owner and lifecycle before changing it.**

---

# 13. Final picture for our project

```text
                         AZURE SUBSCRIPTION
                                |
        +-----------------------+------------------------+
        |                       |                        |
        v                       v                        v
   rg-azure-aks             MC_...                  Monitoring RGs
        |                       |                        |
        |                       |              +---------+---------+
        |                       |              |                   |
        |                 VMSS / nodes     DefaultResourceGroup   MA_...
        |                 NICs / disks           |                 |
        |                 VNet / NSG             |             DCR / DCE
        |                 Load Balancer          |                 |
        |                 Public IP              |                 |
        |                                       Log Analytics      |
        |                                                          |
   AKS resource                                                    |
   Azure Monitor workspace <--------------- Prometheus metrics ----+
   Prometheus rule groups

                    AKS CONTROL PLANE
                    Microsoft-managed
                           |
                           v
                    Kubernetes API
                           |
                           v
                    Worker nodes in MC_...
                           |
                           v
                         Pods
```

This is the model to keep in mind when exploring the Azure portal: **AKS is the managed Kubernetes service; `MC_...` is the worker/infrastructure side; the `DefaultResourceGroup-...` and `MA_...` groups are monitoring support infrastructure.**

---

## Related project documents

- `docs/AKS_GENERAL_KNOWLEDGE.md` — AKS fundamentals, cluster/control-plane access, networking models, services, ingress, egress, identity, storage, monitoring
- `docs/AKS_NODE_RESOURCE_GROUP.md` — deep resource-by-resource explanation of the `MC_...` node resource group
- `docs/NETWORKING.md` — project networking decisions
- `docs/INTEGRATIONS.md` — AKS integrations and monitoring decisions
