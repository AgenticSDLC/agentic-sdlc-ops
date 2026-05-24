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

### CI Gate For Verifier

When a repository uses an autonomous verifier role, the verifier must not pass until repository-defined CI checks have completed successfully.

The recommended pattern:

- CI workflows post a named commit status (e.g. `ci/playwright-smoke`) on the PR head SHA
- The verifier reads the commit status API and requires the named status to be present and green
- If the status is missing (CI hasn't completed), the verifier fails without posting a blocker marker and will be re-dispatched when CI completes
- If the status is `failure`, the verifier posts a blocker
- If the status is `success`, the verifier may proceed to evaluate pass conditions

This prevents auto-merge before CI validates the PR. Without this gate, the verifier may pass based on stale or absent check results.

The commit status context name is repository-specific and should be documented in the project adapter.

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
