# Workflow Mapping Guidance

This document explains how to map the reusable standard onto repository automation.

## Readiness Validation

Purpose:

- confirm the issue is executable before implementation begins

Typical checks:

- required issue sections are present
- required labels or assignee rules are satisfied
- task scope appears PR-sized

Possible outcomes:

- readiness passes and the issue remains eligible for execution
- readiness fails and a blocking label such as `needs-details` is applied

## Branch Bootstrap

Purpose:

- create or prepare the implementation branch when the issue enters the execution state

Typical behavior:

- derive branch name from issue number and title
- create the branch if it does not exist
- avoid creating duplicate execution branches

## Plan Visibility Mapping

Purpose:

- make the implementation plan visible before meaningful code changes begin

Typical behavior:

- require a preflight plan comment on the issue
- or require the PR description to expose the plan before review
- optionally verify plan presence before later lifecycle transitions

## Draft PR Bootstrap

Purpose:

- create a draft PR after the issue branch has real commits ahead of the base branch

Typical behavior:

- link the source issue in the PR body
- initialize a standard PR template
- keep the PR in draft until verification and review are appropriate

## PR And Issue State Sync

Purpose:

- keep lifecycle labels aligned with PR review and merge state

Typical behavior:

- move linked issues to `in-review` when the PR is ready for review
- move linked issues to `done` when the PR merges
- optionally close linked issues on merge

## Human Control Signal Mapping

Purpose:

- allow visible interruption or steering without making humans a required approval gate

Typical behavior:

- detect labels such as `hold` or `needs-human`
- detect issue or PR comments such as `stop`, `hold`, or `change approach`
- pause further automation or require re-planning when a valid control signal appears
- post visible status when execution is paused

## Verification Mapping

Purpose:

- make the repository's completion gates explicit and automatable

Map locally:

- mandatory verification commands
- conditional checks by change type
- evidence artifact publication
- environment requirements for CI or local runs

## Important Boundary

The reusable kit defines the operating pattern. Each repository still owns:

- exact workflow implementations
- stack-specific commands
- deployment integrations
- evidence publication details
