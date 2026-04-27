# Web App Adapter Example

This example shows the recommended generated default for the `web-app` profile when used for a customer-facing storefront.

Default execution model:

- control plane: GitHub
- execution environment: local
- topology: combined

## Project Type

- web application

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files

## Execution Start Condition

Implementation may begin when the issue has `in-progress` and does not have `hold` or `needs-human`.

## Plan Visibility Mode

- issue comment

## Human Control Signals

Labels:

- `hold`
- `needs-human`

Comments:

- `stop`
- `hold`
- `change approach`
- `re-plan`

Issue comments and PR comments are both valid control surfaces.

Once a PR exists, the PR thread becomes the preferred steering surface.

## State Labels

Lifecycle:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels may include:

- `topology:combined`
- `topology:split`
- `agent-builder`
- `frontend`
- `backend`
- `full-stack`
- `config-only`
- `docs-only`
- `needs-details`
- `hold`
- `needs-human`

If the repository later adopts split or specialized execution, document whether topology is tracked as a mode only or also encoded with optional labels such as `topology:split` and `topology:specialized`. Keep those labels separate from lifecycle state.

## Branch Naming

- `issue-<number>-<slug>`

## Required Pre-Read Docs

- `README.md`
- architecture overview if present
- design system or UI constraints if present
- commerce constraints if present
- local workflow documentation if present

## Verification Commands

Recommended default storefront verification:

- lint
- production build
- task-relevant automated tests
- browser smoke tests for navigation, forms, cart, checkout, account, or pricing presentation changes

## User-Visible Change Policy

- screenshots required for user-visible changes
- browser smoke coverage required for navigation, forms, cart, checkout, account, or pricing presentation changes
- preview link required if preview deployments exist

## Evidence Requirements

- screenshots
- verification summary
- trace or video for browser automation
- preview deployment link

## Automation Hooks

Typical automation hooks may include:

- issue readiness validation
- branch bootstrap
- draft PR creation
- PR state synchronization

If split or specialized execution is enabled, also document the visible handoff artifact between roles and the visible execution owner that can advance lifecycle state after verification.

## Stop-And-Ask Conditions

- authentication model changes
- billing or payment provider changes
- tax, shipping, fulfillment, or refund behavior changes not explicitly scoped in the issue
- PII collection, retention, or deletion behavior changes
- checkout flow changes beyond the scoped acceptance criteria
- architectural changes beyond the issue contract

## Repo-Specific Constraints

Keep framework and hosting assumptions local. Do not place them in the portable standard.
