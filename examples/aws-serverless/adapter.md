# AWS Serverless Adapter Example

## Project Type

- serverless platform
- infrastructure and data services

## Issue Required Sections

- Context
- Requirements
- Acceptance Criteria
- Target Files

## Execution Start Condition

Implementation may begin when the issue has passed readiness validation and has the repository's execution label, typically `in-progress`.

## State Labels

Lifecycle:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels may include:

- `agent-builder`
- `infra`
- `data-platform`
- `migration-risk`

## Branch Naming

- branch format should be documented locally, for example `issue-<number>-<slug>` or another repository convention
- if automation creates branches, document which workflow owns that behavior

## Required Pre-Read Docs

- infrastructure architecture overview
- environment and account boundary documentation
- deployment safety or migration playbooks
- data contract documentation if the change affects pipelines or warehouse schemas

## Verification Commands

Representative examples:

- infrastructure synthesis or validation command
- unit test suite
- integration test suite relevant to changed services
- deployment or plan validation where required by the repository

## User-Visible Change Policy

Do not assume browser smoke coverage. If the repository exposes user-facing surfaces, define the relevant policy locally.

## Evidence Requirements

Representative evidence may include:

- synth or plan output
- integration test report
- deployment preview or sandbox result
- structured logs for critical flows

## Automation Hooks

Typical automation hooks may include:

- readiness validation
- branch bootstrap
- PR state sync
- preview deployment or plan generation

## Stop-And-Ask Conditions

- production data migrations with unclear rollback
- IAM or cross-account boundary changes
- changes that alter network topology or environment isolation
- warehouse schema or ETL contract changes with downstream impact

## Repo-Specific Constraints

This example intentionally avoids any default assumption about Playwright, `pnpm`, Vercel, or browser-based smoke testing.
