# Azure for Students — Quota Analysis

## Verified 2026-09-14

| Item | Central India | Current | Limit | Impact |
|---|---|---:|---:|---|
| Total Regional vCPUs | `centralindia` | 0 | 4 | **AKS blocker** |
| Standard Public IPv4 | `centralindia` | 0 | 3 | Sufficient for 1 Application Gateway |
| Basic Public IPv4 | `centralindia` | 0 | 0 | Not required |

## AKS Decision

Current AKS documentation requires a system node pool to have at least two nodes, and each system-node VM SKU must provide at least 4 vCPUs and 4 GB RAM. B-series VMs are not supported for system node pools.

Therefore:

```text
Minimum documented system pool
2 nodes × 4 vCPU = 8 vCPU

Subscription quota
4 vCPU

Result
4 < 8 → AKS cannot be provisioned correctly with the current quota.
```

We will **not** create an unsupported one-node or B-series system pool just to fit the student quota.

## Public Entry Point

The Standard Public IPv4 quota is sufficient for the planned design:

```text
Internet
   |
   | HTTPS
   v
Application Gateway v2
   |
   v
Private AKS
```

Only the Application Gateway receives a public IP. Application services remain internal Kubernetes `ClusterIP` services.

## Resolution Required Before AKS

The project can proceed with AKS after one of these occurs:

1. Regional vCPU quota is increased to at least 8.
2. An approved subscription with at least 8 regional vCPUs is provided.
3. The assignment requirements are formally changed.

Until then, we can build and validate the application, containers, Kubernetes manifests, and infrastructure-as-code without provisioning the blocked AKS resource.
