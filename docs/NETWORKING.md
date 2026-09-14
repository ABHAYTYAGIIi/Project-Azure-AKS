# Phase 1 — Networking Design

## Status

**Status: Design only — no Azure networking resources should be provisioned yet.**

The networking design is intentionally quota-conscious because this project uses an Azure for Students subscription. Actual subscription quotas must be checked before selecting the final CIDRs, VM SKU, node count, and public IP allocation.

## Objectives

- Run AKS as a private cluster where supported by the subscription and selected region.
- Expose the application through a single public Application Gateway.
- Use HTTPS/SSL at the external entry point.
- Avoid public exposure of individual application services.
- Support three Kubernetes namespaces: `dev`, `qa`, and `prod`.
- Use Kubernetes Ingress for path-based routing.
- Keep the network design simple enough for the Student subscription.
- Leave enough subnet IP capacity for AKS and Application Gateway without unnecessarily over-allocating address space.

## Target Traffic Flow

```text
Internet
   |
   | HTTPS : 443
   v
Application Gateway
   |
   | HTTP/HTTPS to backend as designed
   v
AKS Ingress
   |
   +--> /dev/*  --> dev namespace
   |
   +--> /qa/*   --> qa namespace
   |
   +--> /prod/* --> prod namespace
   |
   +--> internal Kubernetes Services
              |
              +--> React
              +--> Node.js
              +--> Python
                         |
                         v
                    Azure SQL PaaS
```

## Planned VNet Layout

The final CIDRs will be selected after quota/IP requirements are verified. The logical layout is:

```text
Azure VNet
|
+-- Application Gateway subnet
|
+-- AKS node subnet
|
+-- Optional private-endpoint subnet(s), only if required
```

We should avoid creating extra subnets unless they have a clear purpose.

## Public IP Strategy

The design targets **one public IP for the Application Gateway** where the selected Application Gateway architecture permits this.

Individual Kubernetes application Services should use internal `ClusterIP` Services and should not each receive a public IP.

Planned exposure:

```text
Public IP
   |
   +--> Application Gateway
          |
          +--> Ingress
                 |
                 +--> dev
                 +--> qa
                 +--> prod
```

## Private AKS API

The AKS API server is intended to be private. This means administration and, later, CI/CD must have a network path to the private Kubernetes API.

Phase 1 administration will be performed from an approved machine/network path that can reach the private API.

Phase 2 CI/CD will require a runner architecture with network access to the private AKS API. A self-hosted GitHub Actions runner inside the Azure network is the current design under consideration.

## DNS

Private AKS networking requires DNS to be considered during the design. The exact private DNS configuration will be selected when the AKS private-cluster configuration is created.

For external application access, the chosen application domain will resolve to the Application Gateway public IP.

## Azure SQL Connectivity

Azure SQL is a PaaS dependency and is not deployed inside AKS.

The preferred design is to keep database access restricted and avoid unnecessary public exposure. If private connectivity is required/available within the Student subscription and regional service constraints, private connectivity will be evaluated. Otherwise, firewall/network access will be tightly restricted according to the selected Azure SQL configuration.

## IP Planning Checklist

Before provisioning:

- [ ] Check Azure for Students regional vCPU quota.
- [ ] Check Public IP quota.
- [ ] Check the selected region supports the required AKS features.
- [ ] Check the selected region supports the intended Application Gateway/Ingress integration.
- [ ] Check available AKS VM SKUs.
- [ ] Choose VNet CIDR.
- [ ] Choose Application Gateway subnet CIDR.
- [ ] Choose AKS subnet CIDR.
- [ ] Estimate AKS IP consumption for the selected networking model.
- [ ] Reserve capacity without over-sizing the Student subscription network.
- [ ] Confirm Azure SQL networking options and regional availability.

## Important Decision

**Do not provision the VNet or AKS cluster until the actual subscription quotas have been inspected.** The final network ranges and AKS networking mode must be based on those facts rather than assumed Azure defaults.

## Phase 1 Principle

Use the smallest viable architecture that satisfies the assignment while preserving sound security boundaries. Do not add load balancers, public IPs, subnets, private endpoints, or other infrastructure without a concrete requirement.