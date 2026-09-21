# Project Azure AKS

Azure + Kubernetes + DevOps architecture and troubleshooting documentation for the AutoCare project.

> **Repository role:** This repository is the cross-project documentation home for **architecture, Azure/AKS infrastructure decisions, and troubleshooting**. The three application repositories remain the source of truth for application code and application-specific implementation.

## Current Architecture

- AKS cluster: **aks-azure-project**
- AKS API: **private cluster**
- AKS networking: **Azure CNI Overlay**
- Kubernetes version: **1.35.8** currently verified
- VNet: **vnet-azure-project / 10.20.0.0/16**
- Environments: **dev / uat / prod**
- Three environment-specific Premium ACRs
- Private endpoints and private DNS for ACR, SQL, and Key Vault
- VNet-connected self-hosted GitHub Actions runners
- Microsoft Entra integration with Kubernetes RBAC
- OIDC + Workload Identity enabled
- Local Kubernetes accounts disabled

See docs/ARCHITECTURE.md for the current architecture and docs/TROUBLESHOOTING.md for the consolidated incident record.

## Documentation Status Rules

- **Verified** — directly observed through commands/tests.
- **Current** — applies to the present architecture.
- **Historical** — retained for learning or incident history and must not be reused as current configuration.
- **Planned** — intended future work that has not been verified.

## Documentation

Key documents:

- docs/ARCHITECTURE.md — current Azure/AKS/application architecture
- docs/TROUBLESHOOTING.md — consolidated troubleshooting and incident record
- docs/NETWORKING.md — AKS networking concepts plus current networking state
- docs/AKS_VERIFIED_STATE.md — verified AKS cluster snapshot
- docs/AKS_GENERAL_KNOWLEDGE.md — general AKS/Kubernetes learning reference
- docs/AKS_CLUSTER_PRESETS.md — AKS portal presets and trade-offs
- docs/AKS_NODE_RESOURCE_GROUP.md — AKS managed infrastructure resource group
- docs/AKS_RESOURCE_GROUPS_AND_MONITORING.md — resource-group and monitoring notes
- docs/INFRASTRUCTURE.md — infrastructure reference
- docs/INTEGRATIONS.md — AKS integrations and monitoring
- docs/APPLICATION_VERIFICATION.md — original local application verification evidence
- docs/CHANGELOG.md — historical project changes

## Important Historical Notes

Some older documents were written before the current infrastructure rebuild. In particular:

- Public AKS was previously documented as the chosen API model; the current cluster is private.
- qa was previously used as an environment name; the current delivery model uses uat.
- Kubernetes 1.35.7 was previously recorded; the current verified cluster is 1.35.8.
- acrazureproject.azurecr.io was an earlier ACR; current configuration uses environment-specific ACRs.

These older statements are preserved where useful for project history, but they are not current configuration.

## Project Scope

The three application repositories are:

- autocare-frontend
- autocare-api
- autocare-maintenance-service

Use this repository for cross-cutting architecture and troubleshooting rather than duplicating application implementation details.
