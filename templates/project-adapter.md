# Project Adapter

## Project Type

- replace with repository type

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files

## Issue Draft Location

Document whether the repository uses local issue drafts before publication.

Recommended default:

- `.agentic/issues/drafts/`

Also document:

- whether draft files are optional or required during issue creation
- what happens to the draft after publication to GitHub

## Execution Start Condition

Describe exactly when implementation may begin.

## Plan Visibility Mode

Describe where the preflight plan must be posted before implementation proceeds.

Examples:

- issue comment
- PR description
- both issue comment and PR description

## Human Control Signals

List the comments or labels that should stop, hold, or redirect execution.

- `hold`
- `needs-human`
- comment containing `stop`

Also document:

- whether issue comments, PR comments, or both are valid
- whether the PR becomes the preferred steering surface after creation
- what status update the agent must post after pausing

## State Labels

Lifecycle:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels:

- list local supporting labels here

## Branch Naming

Document the branch naming convention and whether branch creation is automated.

## Required Pre-Read Docs

- list required architecture docs
- list required product or operations docs

## Verification Commands

List the exact checks that must pass before work is considered complete.

- command 1
- command 2

## User-Visible Change Policy

Describe extra requirements for user-visible changes.

## Evidence Requirements

List required artifacts.

- artifact 1
- artifact 2

## Automation Hooks

List the automation workflows that participate in the issue lifecycle.

- readiness validation
- branch bootstrap
- PR state sync
- plan posting or visibility check
- hold-signal detection

## Stop-And-Ask Conditions

List repository-specific cases that require human guidance.

- condition 1
- condition 2

## Repo-Specific Constraints

Capture any local constraints that affect implementation.
