# Project Adapter

## Project Type

- web application

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files

## Issue Draft Location

- optional local drafts in `.agentic/issues/drafts/`
- live provider work items remain the source of truth after publication

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

## Merge Policy

- default behavior is auto-merge after required verification and policy checks pass
- `merge:human-required` is the explicit human-in-the-middle merge gate
- `hold` and `needs-human` are pause or interruption controls, not the primary long-term merge policy label

## State Labels

Lifecycle:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels:

- `topology:combined`
- `topology:split`
- `agent-builder`
- `frontend`
- `backend`
- `full-stack`
- `config-only`
- `docs-only`
- `merge:human-required`
- `hold`
- `needs-human`

## Branch Naming

- `issue-<number>-<slug>`

## Implementation Backend Contract

- bounded implementation command: `agentic:implement` when the repository defines it
- runtime owns branch integrity checks, commit creation, push, and PR synchronization
- implementation command must stay on the issue branch
- implementation command must not create extra branches or mutate PR state directly
- implementation success requires changes to remain within declared `Target Files` or mapped subsystem scope

## Required Pre-Read Docs

{{required_pre_read_docs}}

## Verification Commands

{{verification_commands}}

## Canonical Utilities (Reuse Map)

The curated map of where established capabilities live. Agents must check
this map and search the codebase before creating any new helper, utility, or
component — reuse the canonical implementation, or justify the divergence in
the PR's Prior Art & Reuse section.

Fill in and maintain for this repository (examples):

- dates/formatting → `<path>`
- API client / fetch wrappers → `<path>`
- shared UI components → `<path>`
- validation / schemas → `<path>`
- test fixtures & helpers → `<path>`

Deprecated patterns (do not use — encode as lint rules when possible):

- `<old pattern>` → use `<current pattern>` instead

Keep this map small and current. Every reuse failure caught in review should
either add an entry here or a lint rule — not just a one-off fix.

## Scope Rules

- `Target Files` should use concrete file or directory paths when possible
- `Target Subsystem` may use repository-recognized subsystem names when the profile maps them to concrete paths
- `docs-only` and `config-only` labels narrow the declared scope further; they do not widen it

## Browser Validation

- command: `{{browser_validation_command}}`
- provider: `{{browser_validation_provider}}`
- status: `{{browser_validation_status}}`

## Validation Mode

- `{{validation_mode}}`

Validation mode meanings:

- `local-only`
  - lint and build run locally, with no required hosted preview gate
- `preview-required`
  - a preview deploy and human review are expected before merge
- `production-gated`
  - preview validation plus explicit human approval is required before merge or deploy

## Preview Deployment

- provider: `{{preview_provider}}`
- status: `{{preview_status}}`

## Human QA Gate

- `{{human_qa_gate}}`

## User-Visible Change Policy

- screenshots required for user-visible changes
- Playwright coverage required for navigation, forms, cart, checkout, account, or pricing presentation changes
- preview link required if preview deployments exist

## Evidence Requirements

- screenshots
- verification summary
- trace or video for browser automation
- preview deployment link if available

## Automation Hooks

- issue readiness validation
- draft PR bootstrapper
- issue and PR state sync

## Stop-And-Ask Conditions

- authentication or session model changes
- billing or payment provider changes
- tax, shipping, fulfillment, or refund behavior changes not explicitly scoped in the issue
- PII collection, retention, or deletion behavior changes
- checkout flow changes beyond the scoped acceptance criteria
- architectural changes beyond the named subsystem

## Repo-Specific Constraints

- keep framework and hosting assumptions local
