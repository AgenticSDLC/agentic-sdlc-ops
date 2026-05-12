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
- `hold`
- `needs-human`

## Branch Naming

- `issue-<number>-<slug>`

## Required Pre-Read Docs

{{required_pre_read_docs}}

## Verification Commands

{{verification_commands}}

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
