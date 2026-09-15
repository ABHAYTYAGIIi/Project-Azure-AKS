# AKS — Verified Project State

This document records only the AKS resources and Kubernetes state that were verified directly from the project cluster using `kubectl`.

## Cluster

| Item | Verified value |
|---|---|
| AKS cluster | `aks-azure-project` |
| Resource group | `rg-azure-aks` |
| Region | `centralindia` |
| Kubernetes version | `1.35.7` |
| Current kubectl context | `aks-azure-project` |

## Nodes

Two nodes were verified and both were in `Ready` state:

- `aks-agentpool-18752774-vmss000000`
- `aks-agentpool-18752774-vmss000001`

Both nodes reported Kubernetes version `v1.35.7`.

## System Pods / Components

The `kube-system` namespace was inspected and the following AKS/Kubernetes system components were observed running:

- CoreDNS
- kube-proxy
- Azure CNI / AKS networking components
- Azure Disk CSI components
- Azure File CSI components
- Cloud Node Manager
- Metrics Server
- Azure Monitor / `ama-*` metrics and logging components
- Konnectivity agents and autoscaler
- Azure Workload Identity webhook
- Eraser controller
- Retina networking observability agent
- CoreDNS autoscaler
- Container networking / IP management components

The observed system pods were running at the time of verification. One `ama-metrics-operator-targets` pod showed `2` restarts, with the pod still `2/2 Running`; this is recorded rather than treated as a failure.

## Verified Services

The following services were returned by `kubectl get services -A`:

- `default/kubernetes`
- `kube-system/ama-metrics-ksm`
- `kube-system/ama-metrics-operator-targets`
- `kube-system/azure-wi-webhook-webhook-service`
- `kube-system/kube-dns`
- `kube-system/metrics-server`
- `kube-system/network-observability`

These are cluster/system services observed during verification. No application service is recorded here unless it is deployed and verified separately.

## Verified Deployments

The following deployments were returned by `kubectl get deploy -A` and showed all desired replicas available at verification time:

- `ama-logs-rs` — `1/1`
- `ama-metrics` — `2/2`
- `ama-metrics-ksm` — `1/1`
- `ama-metrics-operator-targets` — `1/1`
- `azure-wi-webhook-controller-manager` — `2/2`
- `coredns` — `2/2`
- `coredns-autoscaler` — `1/1`
- `eraser-controller-manager` — `1/1`
- `konnectivity-agent` — `2/2`
- `konnectivity-agent-autoscaler` — `1/1`
- `metrics-server` — `2/2`

## Ingress

`kubectl get ingress -A` returned:

```text
No resources found
```

Therefore, **no Kubernetes Ingress resource is currently deployed**. This is the verified current state, not an error condition.

## Verification Commands

The project state above was verified with commands including:

```powershell
kubectl version --client
kubectl config current-context
kubectl get nodes
kubectl get nodes -o wide
kubectl get pods -A -o wide
kubectl get services -A
kubectl get deploy -A
kubectl get ingress -A
```

## Documentation Boundary

This file is project-specific. General explanations of AKS cluster types, Kubernetes networking, Kubernetes components, and related concepts remain in `docs/AKS_GENERAL_KNOWLEDGE.md` and are not mixed with this verified project state.
