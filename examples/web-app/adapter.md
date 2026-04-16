# Generic Web App Adapter Example

## Project Type

- web application

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files

## Execution Start Condition

Implementation may begin when the issue reaches the repository's execution state, commonly `in-progress`, after any required readiness validation.

## State Labels

Lifecycle:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels may include:

- `topology:combined`
- `agent-builder`
- `frontend`
- `backend`
- `needs-details`

If the repository later adopts split or specialized execution, document whether topology is tracked as a mode only or also encoded with optional labels such as `topology:split` and `topology:specialized`. Keep those labels separate from lifecycle state.

## Branch Naming

Document the local branch naming pattern and whether automation creates the issue branch.

## Required Pre-Read Docs

- application architecture overview
- design system or UI constraints
- authentication and data access rules
- local workflow documentation

## Verification Commands

Representative examples:

- lint
- build
- task-relevant automated tests
- browser smoke tests for user-visible changes if required by the repository

## User-Visible Change Policy

Repositories should define whether user-visible changes require smoke coverage, visual evidence, or manual QA.

## Evidence Requirements

Representative examples:

- screenshots
- test report
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
- billing or payments behavior changes beyond scoped acceptance criteria
- architectural changes beyond the issue contract

## Repo-Specific Constraints

Keep framework and hosting assumptions local. Do not place them in the portable standard.
