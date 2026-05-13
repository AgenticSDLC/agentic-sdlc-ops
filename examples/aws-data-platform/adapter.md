# AWS Data Platform Adapter Example

## Project Type

- data platform
- serverless and analytics infrastructure

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files or Target Subsystem

Optional but recommended:

- Task Class

## Execution Start Condition

Implementation may begin when the issue has passed readiness validation and has the repository's active execution label, typically `in-progress`.

## State Labels

Lifecycle:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels may include:

- `topology:combined`
- `agent-builder`
- `data-platform`
- `data-contract`
- `migration-risk`

## Branch Naming

- document the local branch naming convention, for example `issue-<number>-<slug>`
- document whether branch creation or PR bootstrap is automated

## Required Pre-Read Docs

- platform architecture overview
- warehouse or data-contract documentation
- deployment and rollback playbooks
- environment and account boundary documentation

## Verification Commands

Representative examples:

- build or package validation
- synth or plan validation
- task-relevant integration or pipeline tests
- warehouse or contract validation where applicable

## User-Visible Change Policy

Not applicable by default. If the repository introduces user-facing surfaces, define additional review and verification rules explicitly.

## Evidence Requirements

Representative evidence may include:

- synth or plan output
- pipeline test results
- integration logs
- contract validation output

## Automation Hooks

Typical automation hooks may include:

- issue readiness validation
- PR contract validation
- branch or draft PR bootstrap
- issue and PR state sync

## Stop-And-Ask Conditions

- schema or data-contract changes with unclear downstream impact
- production data migration or replay design
- IAM or cross-account boundary changes
- warehouse cost or topology changes

## Repo-Specific Constraints

This example intentionally does not assume browser validation, preview deploys, Vercel, or other `web-app` defaults.
