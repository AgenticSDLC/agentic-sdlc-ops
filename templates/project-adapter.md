# Project Adapter

## Project Type

- replace with repository type

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files

Optional additions some repositories use:

- Task Class
- Target Subsystem

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

If the repository uses split or specialized execution, document whether this same visible plan artifact also serves as the handoff contract or whether a separate visible handoff artifact is required.

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

Also document:

- whether the repository uses topology mode names such as `combined`, `split`, and `specialized`
- whether topology is encoded with optional labels such as `topology:combined`, `topology:split`, and `topology:specialized`
- whether role labels are optional routing hints, ownership hints, or both

## Branch Naming

Document the branch naming convention and whether branch creation is automated.

## Required Pre-Read Docs

- list required architecture docs
- list required product or operations docs

## Verification Commands

List the exact checks that must pass before work is considered complete.

- command 1
- command 2

If the repository uses task classes, document whether verification changes by class and where those defaults live.

## User-Visible Change Policy

Describe extra requirements for user-visible changes.

## Evidence Requirements

List required artifacts.

- artifact 1
- artifact 2

## Environment Variables

Document any required or optional environment variables, secret sources, and safety rules, or link to a separate environment manifest.

## Automation Hooks

List the automation workflows that participate in the issue lifecycle.

- readiness validation
- branch bootstrap
- PR state sync
- plan posting or visibility check
- hold-signal detection

If the repository supports split or specialized execution, also document:

- the visible handoff artifact required between roles
- the visible execution owner responsible for final verification status and lifecycle advancement

## Stop-And-Ask Conditions

List repository-specific cases that require human guidance.

- condition 1
- condition 2

## Repo-Specific Constraints

Capture any local constraints that affect implementation.
