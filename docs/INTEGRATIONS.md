# AKS Integrations and Monitoring Guide

## Purpose

This document explains the AKS **Integrations** tab: what each option does, why it exists, when to use it, cost behavior, and our project decision.

> Do not enable an integration just because the portal offers it. Some add operational complexity or separate Azure billing meters.

---

# 1. Azure Container Registry (ACR)

**Portal option:** Container registry

### What it does

ACR is a private Docker/OCI image registry. Our deployment flow will eventually be:

```text
Code -> Docker build -> ACR -> AKS pulls image -> Pod
```

Example images:

```text
frontend:v1
node-backend:v1
python-backend:v1
```

### Why we need it

AKS needs a reliable place to pull the images used by our deployments. ACR keeps images under our Azure environment and integrates with AKS identity/RBAC.

### Where to use it

Use it for real containerized applications, CI/CD, private images, repeated deployments, and Azure-native image management.

### Cost

ACR has Basic, Standard, and Premium tiers. Included storage is currently 10 GB, 100 GB, and 500 GB respectively. Pricing is tier/day plus applicable extra storage, build, and networking charges; exact amounts depend on region and offer. Microsoft also lists free-account ACR allowances, but we must verify whether our Azure for Students offer includes one.

Reference: https://azure.microsoft.com/en-us/pricing/details/container-registry/

### Our decision

**None for now.** We can create/attach ACR when we start pushing our React/Node/Python images. For a small project, Basic is the first tier to evaluate unless our subscription gives us a suitable free allowance.

---

# 2. Istio Service Mesh

**Portal option:** Enable Istio

### What it does

Istio adds a service-mesh layer for service-to-service traffic. It can provide mTLS, identity-based authentication, traffic routing, retries/failover, traffic policies, and service observability.

```text
React -> Node.js -> Python
          ^
          |
       Istio layer
```

Microsoft provides an officially supported Istio add-on for AKS.

Reference: https://learn.microsoft.com/en-us/azure/aks/istio-about

### Why we need it

Istio becomes valuable when there are many microservices and we need consistent service-to-service security, traffic management, or advanced observability.

### Where to use it

Good fit: large microservice platforms, mTLS requirements, canary/traffic splitting, complex service communication.

Poor fit: small applications and student clusters where normal Kubernetes Services/Ingress are enough.

### Cost

There is no useful single fixed "$X/month" figure. Istio adds cluster resource consumption and operational complexity. Its components run as part of the cluster and consume node resources.

### Our decision

**OFF.** Our React + Node.js + Python application is not large enough to justify a service mesh yet.

---

# 3. Azure Policy

**Portal option:** Azure Policy

### What it does

Azure Policy provides governance and compliance guardrails. Policies can audit or enforce rules for Azure resources and AKS/Kubernetes configurations.

Example:

```text
Deployment -> Azure Policy -> compliant / non-compliant / blocked
```

### Why we need it

It lets an organization enforce security and governance rules centrally instead of relying on every developer to remember them.

### Where to use it

Enterprise governance, compliance, security baselines, multi-team environments, and policy-as-code.

### Cost

Azure Policy itself is offered at **no additional cost for Azure resources**. Some separate guest-configuration/governance capabilities can have their own charges.

Reference: https://azure.microsoft.com/en-in/products/azure-policy

### Our decision

**OFF initially.** Useful later when we have defined the actual policies we want to enforce.

---

# 4. Azure Monitor

Azure Monitor is the umbrella observability service. The current portal section exposes three important capabilities:

```text
Azure Monitor
  |
  +-- Container Insights / Logs
  +-- Managed Prometheus / Metrics
  +-- Managed Grafana / Dashboards
```

Logs and metrics are different:

- **Logs:** "What happened?" Example: `database connection refused`.
- **Metrics:** "How much/how often/how fast?" Example: `CPU 82%`, `140 requests/sec`.

Reference: https://azure.microsoft.com/en-in/pricing/details/monitor/

---

# 5. Container Insights / Enable Container Logs

**Portal option:** Enable Container Logs

### What it does

Container Insights collects Kubernetes/container telemetry and sends relevant data to Azure Monitor/Log Analytics. It can provide container stdout/stderr logs, Kubernetes events, workload information, and performance data depending on configuration.

Microsoft recommends ContainerLogV2 for new Container Insights deployments and recommends controlling collection with Data Collection Rules to manage cost.

Reference: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-cost

### Why we need it

When a Pod fails, logs let us understand why without relying only on a live `kubectl logs` session.

```text
Pod logs/events -> Azure Monitor / Log Analytics -> search / troubleshooting / alerts
```

### Cost

There is **no single fixed monthly Container Insights price**. Azure Monitor/Log Analytics charges depend mainly on telemetry ingestion, log plan, retention, and queries. High-volume AKS resource/audit logging can become expensive.

Reference: https://azure.microsoft.com/en-in/pricing/details/monitor/

### Cost Preset

The portal's Cost Preset controls the amount/type of telemetry collected. More telemetry gives more visibility but can increase ingestion cost.

### Our decision

**ON, cost-conscious.** Logs are important for learning/debugging, but we should not collect every possible log category at high volume.

---

# 6. Managed Prometheus

**Portal option:** Enable Prometheus metrics

### What it does

Azure Monitor managed service for Prometheus provides a managed Prometheus-compatible metrics platform for Kubernetes. We do not have to operate our own Prometheus server inside AKS.

It can collect Kubernetes and application metrics such as request rate, errors, latency, CPU/memory-related metrics, and service health.

Reference: https://learn.microsoft.com/en-us/azure/architecture/aws-professional/eks-to-aks/monitoring

### Why we need it

Prometheus is the right kind of tool for numerical/time-series metrics. It complements, rather than replaces, container logs.

### Cost

Managed Prometheus is consumption based. Azure Monitor Workspace metrics are billed by samples ingested and samples processed for queries. Ingestion includes 18 months of data retention. Therefore there is no honest universal monthly price without knowing sample volume.

Reference: https://azure.microsoft.com/en-in/pricing/details/monitor/

### Our decision

**ON.** The screenshot already has it checked, and it is useful for learning real Kubernetes monitoring without operating Prometheus ourselves.

---

# 7. Managed Grafana

### What it does

Grafana is the visualization layer for metrics and other telemetry.

```text
AKS -> Prometheus metrics -> Azure Monitor Workspace -> Managed Grafana -> dashboards
```

It provides dashboards, graphs, correlations, and shared monitoring views.

Reference: https://azure.microsoft.com/en-in/products/managed-grafana/

### Why we need it

Raw metrics are useful, but Grafana turns them into dashboards that are easier to understand and operate.

### Cost

Managed Grafana has its own pricing model. Microsoft documents pricing based on the Grafana tier/instance and active users. Standard tiers use Standard Units plus active-user charges. A new instance has a documented 30-day free period subject to the stated limits.

Reference: https://azure.microsoft.com/en-gb/pricing/details/managed-grafana/

### Our decision

**OFF initially.** We can add it later when we specifically want Kubernetes dashboards. This avoids adding another managed service to a small student cluster before we actually use it.

---

# 8. Recommended settings for our project

| Integration | Setting | Why |
|---|---|---|
| Azure Container Registry | **None now** | Create/attach when container images are ready |
| Istio | **OFF** | Unnecessary complexity for our application size |
| Azure Policy | **OFF initially** | Governance can be added after requirements are defined |
| Container Insights / Logs | **ON, cost-conscious** | Important for debugging |
| Managed Prometheus | **ON** | Useful Kubernetes/application metrics |
| Managed Grafana | **OFF initially** | Adds another managed service/cost; enable when needed |

---

# 9. Where to use what

## Small student/dev cluster

```text
AKS
 |
 +-- Azure CNI Overlay
 +-- Container Insights (controlled logs)
 +-- Managed Prometheus
 +-- ACR when images are ready
 |
 +-- No Istio
 +-- No unnecessary Grafana
 +-- No unnecessary policy enforcement
```

## Production microservices platform

Potentially:

```text
AKS
 |
 +-- Appropriate CNI model
 +-- ACR
 +-- Azure Policy
 +-- Container Insights
 +-- Managed Prometheus
 +-- Managed Grafana
 +-- Istio when service-mesh requirements justify it
```

Do not copy a production stack blindly. Choose each feature from a concrete requirement.

---

# 10. Cost rule

AKS cluster management can be free, but the worker-node compute and attached Azure services are billed separately. Azure Monitor, ACR, Managed Grafana, networking, storage, and other services can have their own meters.

For this project, watch these cost areas most closely:

1. AKS VM/node compute.
2. Azure Monitor log ingestion/retention.
3. ACR after any applicable free allowance is exhausted.
4. Managed Grafana if enabled.
5. Networking/storage services added later.

Reference: https://azure.microsoft.com/en-in/pricing/purchase-options/azure-account/

---

# 11. Final decision for the current portal screen

```text
Azure Container Registry
    -> None for now

Istio
    -> OFF

Azure Policy
    -> OFF initially

Container Logs / Container Insights
    -> ON, cost-conscious preset

Managed Prometheus
    -> ON

Managed Grafana
    -> OFF initially
```

These choices keep the first AKS cluster understandable and cost-conscious while still giving us useful observability. ACR and Grafana can be added later without rebuilding the application architecture.
