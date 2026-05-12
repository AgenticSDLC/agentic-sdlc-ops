# Lifecycle Contract

## Purpose

This contract defines the portable lifecycle semantics for executable work in `agentic-sdlc-ops`.

It is intentionally control-plane neutral. A provider such as GitHub or GitLab may publish lifecycle state through different primitives, but it must preserve the same lifecycle meaning and transition rules.

## Canonical States

The default execution lifecycle is:

```text
issue created -> ready-for-build -> in-progress -> in-review -> done
```

These state names are part of the public lifecycle contract for the first execution release.

## State Meanings

### `ready-for-build`

The work item has enough bounded task definition to be checked for execution readiness.

Implementation must not begin in this state.

### `in-progress`

Implementation is authorized to begin.

This state means the readiness bar has already been satisfied according to the active policy, profile, and repository adapter.

### `in-review`

Implementation is complete enough for review and verification evidence is available or in progress.

Repositories may define additional review expectations, but they must not redefine this state to mean "work is still being implemented."

### `done`

Repository-defined completion conditions have been satisfied and the bounded work item is complete.

## Transition Rules

Allowed forward transitions:

- `ready-for-build` -> `in-progress`
- `in-progress` -> `in-review`
- `in-review` -> `done`

Lifecycle implementations may support explicit interruption or redirection handling, but they must not silently skip required forward-state meaning.

## Required Invariants

- implementation begins only after `in-progress`
- readiness validation happens before `in-progress`
- lifecycle state is visible in the active control plane
- non-lifecycle labels or metadata must be preserved when lifecycle state changes
- lifecycle state and topology are separate concerns

## Interruption And Redirection

Human control signals such as hold, stop, or re-plan may pause execution at any stage before `done`.

Those signals are part of policy and adapter behavior, not new lifecycle states by default.

## Provider Mapping

Each control-plane provider must declare how it publishes:

- work item identity
- lifecycle state
- transition results
- discussion and steering surfaces
- verification status

Different providers may use different mechanisms, but the lifecycle meanings above remain stable.
