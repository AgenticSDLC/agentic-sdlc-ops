# Optional `web-app` Environment Wiring Accelerator

## Summary

Add an optional `wire-up` product direction to `agentic-sdlc-ops` for `web-app` projects only.

The command’s purpose is narrow: make a repo preview-ready by coordinating provider configuration, wiring metadata, and cross-system environment relationships so that normal GitHub pushes can trigger working Vercel preview deployments. It is not part of the core operating standard, not required for adoption, and not a general-purpose deployment platform.

## Key Changes

- Position `sdlc-ops wire-up ...` as an optional accelerator layered on top of `init` and `doctor`.
- Keep the core thesis unchanged:
  - `init` installs the operating contract
  - `doctor` validates repo readiness and conformance
  - `wire-up` prepares provider configuration for preview-ready web app delivery
- Scope `wire-up` to `web-app` only in v1.
- Define `wire-up` as:
  - manual, intentional, and infrequent
  - idempotent on repeated runs
  - focused on setup/sync of provider relationships, wiring metadata, and required configuration state
  - compatible with Vercel’s normal PR/branch preview behavior after setup
- Define `doctor` to optionally inspect wire-up-related readiness and obvious drift for repos that opt into this accelerator.
- Keep provider mutation boundaries explicit:
  - `sdlc-ops` owns project metadata, guardrails, readiness checks, and orchestration entrypoint
  - external systems such as Stripe Projects own the actual cross-provider config/secret syncing
  - repo-local/provider-native infrastructure remains authoritative for runtime infrastructure and hosting state

## Public Interfaces

- New optional CLI surface:
  - `sdlc-ops wire-up ...`
- Profile gating:
  - available only for `web-app`
- Wiring adapter expectation:
  - wire-up consumes structured wiring metadata declared through a local wiring-adapter
  - the wiring-adapter acts as the repo-native contract describing providers, environments, required relationships, and environment wiring expectations
  - the wiring-adapter is intentionally provider-aware but provider-authoritative systems remain the source of truth for runtime infrastructure state
- `doctor` behavior:
  - when wiring metadata is present, report missing required relationships or incomplete preview-readiness signals
  - when wiring metadata is absent, do not fail non-`wire-up` adopters by default

## Non-Goals

- `wire-up` is not a runtime hosting platform
- `wire-up` is not a replacement for Terraform, Pulumi, or provider-native IaC
- `wire-up` does not become the authority for provider infrastructure state
- `wire-up` does not continuously reconcile or mutate production infrastructure
- `wire-up` is not intended to replace existing CI/CD systems

The purpose of the accelerator is environment wiring coordination and preview-readiness convergence, not full infrastructure lifecycle ownership.

## Test Scenarios

- New `web-app` repo can adopt `init`, then opt into `wire-up`, then receive working preview deployments through normal Git pushes.
- Existing `web-app` repo can adopt `wire-up` without changing the core issue-first workflow contract.
- Re-running `wire-up` with unchanged metadata produces no harmful side effects.
- Changing provider metadata and re-running `wire-up` converges config safely.
- `doctor` distinguishes:
  - no wire-up accelerator configured
  - wire-up configured and healthy
  - wire-up configured but incomplete or drifted
- Non-`web-app` profiles do not expose or imply `wire-up`.

## Assumptions

- The primary story is preview-ready setup, not full production promotion orchestration.
- The buyer value is relief from configuration hell and faster time to a correctly wired preview environment.
- This remains an optional accelerator, not a core standard requirement.
- Stripe Projects is a plausible first integration because it already models project-centric provider orchestration and secret coordination, but the command should be framed as an extensible environment wiring coordination surface rather than a Stripe-locked product identity.

## Directional Thesis

agentic-sdlc-ops introduces the concept of Environment Wiring as Code:

a contract-driven approach for declaring and coordinating the external environment relationships required by modern applications.
