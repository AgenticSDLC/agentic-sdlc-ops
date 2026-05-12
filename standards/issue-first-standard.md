# Issue-First Standard

## Purpose

This standard defines the portable issue-first operating model for repositories that use a repository control plane for executable work.

It is intentionally stack-agnostic and provider-aware. Toolchain details, verification commands, deployment steps, and environment-specific wrappers belong in a local project adapter, not in this standard.

## Source of Truth

- The live provider work item body is the authoritative task specification for execution.
- Local mirrors or planning copies may exist for convenience, but they are not authoritative during implementation.
- Repositories that want a standard local draft location should use `.agentic/issues/drafts/` for issue authoring before publication.
- If any local artifact disagrees with the live provider work item, the live provider work item wins.

## Local Draft Authoring

Repositories may use a local draft workflow before a work item is published to the active control plane.

Recommended default:

- local issue drafts live in `.agentic/issues/drafts/`
- draft files are optional authoring artifacts, not execution artifacts
- once the issue is published to the provider, the provider work item becomes authoritative
- repositories may keep the draft file as a convenience copy or published snapshot, but it must not override the live issue

## Required Issue Contract

Every executable task issue must include, at minimum:

- context
- requirements
- acceptance criteria
- target files or target subsystem scope

A consuming repository may require additional sections, but it should declare them in its local project adapter.

## Issue Lifecycle

Repositories should define an explicit label-based lifecycle for executable work.

Recommended lifecycle:

```text
issue created -> ready-for-build -> in-progress -> in-review -> done
```

Rules:

- execution must not begin until the repository-defined execution start condition is met
- the execution start condition must be documented in the local project adapter
- lifecycle labels should represent state, not taxonomy or team ownership
- supporting labels may exist, but they should not obscure the execution state

## PR Contract

Every implementation PR should:

- link the source provider work item
- expose the implementation plan or link to it
- mirror or restate the acceptance criteria
- record verification performed
- note risks, assumptions, or follow-up work when relevant

If the repository uses draft PRs during execution, that policy should be documented locally.

## Execution Visibility

Issue-first workflows should make execution intent visible before implementation proceeds.

Recommended default behavior:

- an executable issue defines the task contract
- the agent posts a preflight plan
- implementation begins automatically unless a hold signal is present
- progress and blockers are posted back into the issue or PR thread
- PR comments are treated as valid steering and interruption surfaces once a PR exists

This preserves human visibility without turning approval into a required bottleneck.

## Ambiguity Rule

Issue ambiguity must be resolved narrowly.

Agents and implementers must not use ambiguity as justification to:

- broaden scope beyond the issue contract
- change product direction
- introduce unrelated infrastructure or services
- modify unrelated areas of the repository

If the issue cannot be implemented safely under the narrowest reasonable interpretation, work must stop and clarification must be requested.

## Task Size Rule

Each executable issue should represent a single PR-sized unit of work.

If a task appears to require multiple phases, large architectural restructuring, or broad cross-cutting changes that are not explicitly scoped, it should be decomposed before implementation.

## Repository Responsibilities

Each consuming repository must define locally:

- exact lifecycle labels
- execution start condition
- whether `.agentic/issues/drafts/` is used for local issue authoring
- whether plans must be posted to issues, PRs, or both
- which comments or labels act as stop or hold signals
- which thread becomes authoritative for live steering once a PR exists
- branch naming rules if any
- verification commands and evidence requirements
- stack-specific stop conditions
- any required architecture or product documents that must be read before coding

Those details belong in the project adapter, not in this standard.
