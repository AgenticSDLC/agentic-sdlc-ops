# Reference App Adapter

## Project Type

- web application
- product application

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files

## Execution Start Condition

Implementation may begin only when the issue has the `in-progress` label.

## State Labels

Lifecycle:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels used by the current workflow:

- `needs-details`
- `topology:combined`
- `agent-builder`
- `agent-planner`
- `agent-verifier`
- `agent-integrator`

Topology mode:

- default topology mode is `combined`
- the repository encodes that default with the optional supporting label `topology:combined`
- role labels are optional routing hints used by automation; they are not required lifecycle phases

## Branch Naming

- branch format: `issue-<number>-<slug>`
- branch creation is expected to be handled by repository automation when the issue enters `in-progress`
- do not create additional implementation branches unless explicitly instructed

## Required Pre-Read Docs

- local issue workflow documentation
- local smoke or end-to-end test guidance
- relevant architecture or product docs for the task at hand

## Verification Commands

Required baseline:

- `pnpm lint`
- `pnpm build`
- all task-relevant automated tests

Conditional verification:

- for user-visible changes, run Playwright smoke coverage

## User-Visible Change Policy

User-visible changes require Playwright smoke coverage before the task is considered complete.

## Evidence Requirements

For user-visible flows, produce one or more of:

- screenshots
- Playwright report
- trace
- video

## Automation Hooks

This reference app workflow uses automation for:

- readiness validation when `ready-for-build` is applied
- branch and draft PR bootstrap when `in-progress` is applied or the first push lands on the issue branch
- issue and PR state synchronization during review and merge

Visible coordination rules for non-combined flows:

- if the repository later adopts `topology:split` or `topology:specialized`, the visible preflight plan remains the default execution contract unless the adapter documents a separate handoff artifact
- one visible execution owner must be defined for the stage that advances lifecycle state, even when supporting roles contribute planning, verification, or integration work

## Stop-And-Ask Conditions

- architectural changes beyond the scoped task
- ambiguous issues that cannot be implemented safely under the narrowest interpretation
- tasks that exceed a single PR-sized unit of work

## Repo-Specific Constraints

Environment-specific authentication wrapper behavior is an execution wrapper detail, not part of the portable core standard.
