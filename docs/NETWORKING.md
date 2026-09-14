# Phase 1 — Networking Design

## Status

**Status: Design only — no Azure networking resources should be provisioned yet.**

The networking design is quota-conscious because this project uses an Azure for Students subscription. The current observed regular regional compute quota is **4 vCPUs** in the checked regions, with current usage at 0. The subscription UI also indicates that quota adjustment is not currently eligible. This constraint must guide the final AKS node size and count.

## Region Decision

**Working primary region: Central India (`centralindia`).**

Central India is shown in the subscription's regional quota list with a 4-vCPU regular regional quota and is a supported AKS region. Before provisioning, the exact VM SKU and all required supporting Azure services must still be validated for the subscription and region.

The project will use one primary region. We will not introduce a second AKS region unless a later requirement makes it necessary.

## Confirmed Public IP Constraint

The Azure portal's Networking quota view for Central India shows multiple public-IP quota types. The general public-IP quota visible in the screenshot includes a limit of **3**, with current usage **0**. However, the specific **Public IPv4 Addresses - Standard** quota shows:

```text
Current usage: 0
Quota:         0
```

This is important because the modern Application Gateway v2 architecture requires a Standard SKU public IP for an internet-facing frontend. Microsoft documents that Application Gateway v2 uses Standard SKU public IPs, and Application Gateway v1 is no longer an appropriate new-deployment option. citeturn0search1turn0search0

**Current status: Application Gateway deployment is blocked until we confirm whether the Student subscription can obtain a Standard public IP quota increase.** We will not work around this by using a deprecated Application Gateway v1 design.

The next action is to inspect the quota-adjustment option for the **Public IPv4 Addresses - Standard** row. If Azure allows a quota request, we will request only the minimum required capacity: **1 Standard public IPv4 address**.

## Objectives

- Run AKS as a private cluster where supported by the subscription and selected region.
- Expose the application through a single public Application Gateway.
- Use HTTPS/SSL at the external entry point.
- Avoid public exposure of individual application services.
- Support three Kubernetes namespaces: `dev`, `qa`, and `prod`.
- Use Kubernetes Ingress for path-based routing.
- Keep the network design simple enough for the Student subscription.
- Leave enough subnet IP capacity for AKS and Application Gateway without unnecessarily over-allocating address space.
- Keep AKS compute within the observed 4-vCPU regional quota.

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

- [x] Check Azure for Students regional vCPU quota — **4 vCPUs observed in the checked regions; current usage 0**.
- [x] Select a working region — **Central India (`centralindia`)**.
- [x] Check Public IP quota — **general public-IP quota 3; Standard IPv4 quota 0 in Central India**.
- [ ] Determine whether Standard public IP quota can be increased from 0.
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

**Do not provision the VNet or AKS cluster until the Standard public IP requirement, required VM SKU availability, and networking requirements have been verified.** The final network ranges and AKS networking mode must be based on those facts rather than assumed Azure defaults.

## Phase 1 Principle

Use the smallest viable architecture that satisfies the assignment while preserving sound security boundaries. Do not add load balancers, public IPs, subnets, private endpoints, or other infrastructure without a concrete requirement.
