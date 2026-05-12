# Policy Contract

## Purpose

This contract defines the public policy surface that decides when work is executable, what evidence is required, and how failure or blockers are represented.

Policy is distinct from:

- lifecycle semantics
- repository adapter inputs
- profile capabilities
- provider implementation details

## Policy Responsibilities

Policy determines:

- what makes a work item executable
- what must be true before advancing to `in-progress`
- what evidence is required before advancing to `in-review`
- what completion conditions must be met before `done`
- how blockers, holds, and failures are surfaced

## Ownership Model

Policy may come from multiple layers:

- universal lifecycle policy
- profile policy
- repository adapter policy

Each rule should be owned by exactly one layer.

## Required Policy Areas

### Readiness

Defines the checks required before `ready-for-build` may become `in-progress`.

Examples:

- required issue sections are present
- topology selection is valid
- repository-specific constraints are satisfied

### Verification

Defines the checks and evidence required before `in-review`.

Examples:

- lint/build/test commands
- browser validation
- screenshots or trace artifacts
- preview deployment evidence

### Completion

Defines the repository-specific bar for `done`.

Examples:

- PR merged
- required checks green
- closure comment posted

### Interrupts And Blockers

Defines:

- valid hold or stop signals
- how blockers are published
- how contract failure differs from runtime failure

## Failure Model

Policy evaluation must distinguish:

- contract failure
- verification failure
- runtime failure
- human hold or redirect

The public runtime must publish these visibly rather than stalling silently.
