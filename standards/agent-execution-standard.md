# Agent Execution Standard

## Purpose

This standard defines the portable execution rules for agents working from the issue-first model.

It does not define repository-specific commands. Those belong in the local project adapter.

## Execution Start Rule

Agents may implement code only when the repository-defined execution start condition has been met.

Typical examples include:

- a specific lifecycle label such as `in-progress`
- successful readiness validation
- an assigned branch or execution context

The exact rule must be declared in the local project adapter.

## Mandatory Preflight Plan

Before writing code, an agent must restate the implementation plan for repository traceability and self-checking. The preflight plan must include:

- the chosen implementation approach
- the files or subsystems expected to change
- how each acceptance criterion will be satisfied
- confirmation that the plan does not violate repository agent rules or the issue contract

Human approval is not required unless the repository explicitly says otherwise.

## Plan-First Visibility Rule

The preflight plan should be visible in the execution system before meaningful implementation begins.

Preferred locations:

- an issue comment
- a PR description
- an initial agent status comment

The purpose is visibility, not approval gating. Repositories should default to automatic execution after the plan is posted unless a hold signal exists.

## Interruptible Execution Rule

Execution should be autonomous by default and interruptible by design.

Repositories should define one or more control signals that allow humans to:

- stop execution
- redirect the approach
- request re-planning
- hold work for review
- pull the plug from the active PR or issue thread without becoming the default scheduler

Typical control signals include:

- issue or PR comments such as `stop`, `hold`, or `change approach`
- labels such as `hold` or `needs-human`

If a repository defines these signals, the agent must check for them at meaningful boundaries, such as:

- after posting the preflight plan
- before major implementation phases
- before marking a PR ready for review
- when reporting blockers or verification results

If a valid stop or hold signal appears, the agent must pause and report the paused state in the same visible thread.

## Scope Discipline

Agents must implement only the scoped issue contract.

Agents must not:

- expand the issue into a larger feature
- make unrelated cleanup changes
- choose a broader product interpretation than the issue requires
- treat missing details as permission to invent new behavior

If the task cannot be executed safely without widening scope, the agent must stop and request guidance.

## Completion Standard

Agent completion messages are never sufficient evidence that work is complete.

Completion depends on outcome-based verification:

- acceptance criteria must be satisfied
- required repository verification must pass
- required evidence artifacts must be produced where applicable

The local project adapter must define the exact commands, checks, and evidence expectations.

## Verification Rule

Agents must either:

- iterate until required verification passes, or
- stop and report the blocker concisely if the task cannot be completed safely

Agents must not claim success while required verification is failing or unrun.

## Human Steering Rule

Human feedback should be able to redirect execution without becoming a default bottleneck.

Recommended default:

- plan is posted
- execution starts automatically
- human may intervene at any time
- agent must honor valid stop or redirect signals

## Architectural Change Rule

If an issue appears to require architectural change beyond the scoped task, the agent must stop and request human guidance instead of implementing it implicitly.

## Local Adapter Requirement

Before implementation, an agent should read:

- the live provider work item
- the repository's local project adapter
- any required repository docs listed in that adapter

The adapter is the authoritative place for repository-specific execution rules.
