# DevOps Environment Promotion Change Record

## Purpose

This document is the living record for changes made to the AutoCare GitHub Actions / AKS environment-promotion model.

It records what changed, why the change was required, the current pull requests, and the promotion sequence that must be followed.

---

## 2026-09-20 — Kubernetes Environment Configuration Remediation

### Background

The three application repositories use one environment-neutral CI/CD workflow with Kubernetes manifests separated by environment:

```text
k8s/
  dev/
  uat/
  prod/
```

The deployment workflow selects the directory from the GitHub branch:

```text
dev  -> k8s/dev  -> Kubernetes namespace dev
uat  -> k8s/uat  -> Kubernetes namespace uat
main -> k8s/prod -> Kubernetes namespace prod
```

The workflow mapping itself was correct.

The problem was that the UAT and Production manifest directories had originally been copied from Development without changing all environment-specific values.

### Issue discovered

The copied UAT and Production manifests contained Development-specific configuration.

Affected configuration included:

- UAT manifests using `namespace: dev`
- Production manifests using `namespace: dev`
- API UAT ConfigMap using `DATABASE_NAME: sqldb-autocare-dev`
- API Production ConfigMap using `DATABASE_NAME: sqldb-autocare-dev`
- Frontend UAT/Production Ingress retaining Development-only host/TLS configuration:
  - `dev.autocare.local`
  - `autocare-dev-tls`

This was a semantic configuration problem rather than a Kubernetes schema problem. Kubeconform can validate that the manifests are structurally valid without knowing that an environment manifest is targeting the wrong namespace or database.

### Permanent fix added to Development

New fixes were prepared on the `dev` branch through:

- Frontend PR #12
- API PR #13
- Maintenance PR #13

The fixes make the environment directories internally consistent:

| Environment | Kubernetes namespace | API database |
|---|---|---|
| dev | `dev` | `sqldb-autocare-dev` |
| uat | `uat` | `sqldb-autocare-uat` |
| prod | `prod` | `sqldb-autocare-prod` |

Frontend UAT/Production manifests no longer contain the Development-only Ingress host/TLS settings because UAT/Production hostnames and certificates have not yet been provisioned. No fictitious UAT/Production certificate names are being introduced.

### CI validation guard

Stage 2 validation now includes an environment-specific Kubernetes configuration check.

The guard verifies that:

1. The namespace values in `k8s/<environment>` match the environment being deployed.
2. UAT and Production manifests cannot silently retain `namespace: dev`.

This complements kubeconform:

- **kubeconform** validates Kubernetes schema correctness.
- **environment guard** validates the repository's environment-specific namespace convention.

### UAT remediation

The earlier `dev -> uat` promotion had already merged the copied manifests before the semantic configuration problem was discovered.

Therefore, separate remediation PRs were created directly against the current `uat` branch:

- Frontend PR #13
- API PR #14
- Maintenance PR #14

These PRs correct the UAT branch without attempting to re-merge the already-merged historical PRs.

---

## Current Pull Requests

As of 2026-09-20, the application repositories have six relevant open remediation/fix PRs.

| Repository | PR | Target | Purpose |
|---|---:|---|---|
| `autocare-frontend` | #12 | `dev` | Permanent UAT/Production manifest and CI validation fix |
| `autocare-frontend` | #13 | `uat` | Remediate already-promoted UAT/Production manifests |
| `autocare-api` | #13 | `dev` | Permanent UAT/Production manifest and CI validation fix |
| `autocare-api` | #14 | `uat` | Remediate already-promoted UAT/Production manifests |
| `autocare-maintenance-service` | #13 | `dev` | Permanent UAT/Production manifest and CI validation fix |
| `autocare-maintenance-service` | #14 | `uat` | Remediate already-promoted UAT/Production manifests |

These PRs are intentionally still open until the required review and merge sequence is completed.

---

## Required Promotion Sequence

The repository branch protection requires approval from a user other than the latest pusher.

Therefore the merge sequence is:

### Step 1 — Development fixes

Reviewer:

`abhay-reviewer`

Approves:

- Frontend #12
- API #13
- Maintenance #13

Repository owner:

`ABHAYTYAGIIi`

Merges the three approved PRs into `dev`.

The reviewer must not merge these PRs because doing so can make the reviewer the latest change actor and cause the next approval gate to fail.

### Step 2 — Verify Development

After the three `dev` merges:

- confirm all three Development GitHub Actions pipelines are successful
- verify the resulting Kubernetes manifests/deployments
- do not promote to UAT until Development is healthy

### Step 3 — UAT remediation

Reviewer:

`abhay-reviewer`

Approves:

- Frontend #13
- API #14
- Maintenance #14

Repository owner:

`ABHAYTYAGIIi`

Merges the three approved remediation PRs into `uat`.

### Step 4 — Verify UAT

After the UAT remediation pipelines run:

- verify UAT pods
- verify deployments and services
- verify the environment-specific configuration
- test the actual AutoCare application path in UAT

Only after UAT is healthy should the normal `uat -> main` production promotion be handled.

---

## Why the Remediation Uses Two PR Sets

The two PR sets have different purposes.

### PRs targeting `dev`

These establish the **permanent source-of-truth correction** so that future promotions from Development contain the correct UAT and Production configuration.

### PRs targeting `uat`

These repair the **already-promoted UAT branch**. They are necessary because the earlier `dev -> uat` PRs were already merged.

The old merged PRs must not be re-merged.

---

## Long-Term Promotion Model

The intended Git flow remains:

```text
feature
   |
   | PR + approval
   v
 dev
   |
   | PR + approval
   v
 uat
   |
   | PR + approval
   v
 main
   |
   | GitHub Environment approval
   v
 production deployment
```

The Kubernetes environment mapping remains:

```text
Git branch     GitHub Environment     Kubernetes manifests     Kubernetes namespace

dev       ->    dev               ->    k8s/dev/              -> dev
uat       ->    uat               ->    k8s/uat/              -> uat
main      ->    prod              ->    k8s/prod/             -> prod
```

The production GitHub Environment approval is separate from pull-request approval.

---

## Prevention Rules

Future environment manifest changes should follow these rules:

1. Never copy `k8s/dev` into another environment and assume the configuration is complete.
2. Every environment directory must use its own namespace.
3. Environment-specific database names must match the target environment.
4. Do not invent hostnames, TLS certificate names, or other infrastructure values that have not been provisioned.
5. Keep schema validation and semantic environment validation as separate checks.
6. Review environment-specific manifests before promotion.
7. Preserve the protected promotion flow rather than bypassing branch protection for convenience.
8. Record remediation work here when a previously promoted configuration needs correction.

---

## Status

At the time this record was created:

- The permanent fixes are open as PRs targeting `dev`.
- The UAT remediation fixes are open as PRs targeting `uat`.
- No PR from this remediation set has been declared merged here.
- The next action is reviewer approval followed by owner merge in the sequence documented above.
