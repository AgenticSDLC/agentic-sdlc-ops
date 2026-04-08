Execution Source of Truth

Agents must treat the live GitHub Issue body as the authoritative task specification for implementation work.

Local planning files may exist, but they are not authoritative during execution.

If the repository uses local issue drafts before publication, the recommended location is `.agentic/issues/drafts/`.

If local planning artifacts differ from the live GitHub Issue, the GitHub Issue takes precedence.

Agents must read the live issue before implementing work.

Issue Lifecycle

Agents may implement work only after the repository-defined execution start condition has been met.

That condition must be declared in the repository's local project adapter.

Agents must not create additional branches or PRs unless the repository's local rules explicitly allow it.

Mandatory Preflight Plan

Before writing code, agents must restate the implementation plan, including:

- chosen implementation approach
- files or subsystems that will be modified
- how each acceptance criterion will be satisfied
- confirmation that the plan does not violate repository agent rules

Agents may proceed automatically after the preflight plan unless the repository requires human approval.

Plan Visibility Rule

The preflight plan should be posted in the repository's chosen visible execution surface before meaningful implementation begins.

Typical locations:

- issue comment
- PR description
- agent status comment

This is a visibility requirement, not an approval requirement by default.

Interruptible Execution Rule

Execution should be autonomous by default and interruptible by design.

If the repository defines stop, hold, or redirect signals through labels or comments, agents must honor them at meaningful checkpoints.

Examples:

- comment containing `stop`
- label `hold`
- label `needs-human`
- comment requesting a new plan

Once a PR exists, repositories may treat the PR thread as the preferred steering surface. Agents should follow the local adapter.

Ambiguity Resolution Rule

Agents must choose the narrowest implementation that satisfies the explicit issue contract.

Agents must not use ambiguity to:

- broaden the scope
- change product direction
- introduce unrelated systems or providers
- modify unrelated parts of the codebase

If the task still cannot be implemented safely, agents must stop and request clarification.

Task Size Rule

Each executable issue should be a single PR-sized unit of work.

If a task appears too large, multi-phase, or architecturally broad, agents must stop and request task decomposition instead of expanding scope.

Verification Rule

A task is not complete unless:

- acceptance criteria pass
- required repository verification passes
- required evidence artifacts are produced when applicable

The exact verification commands and evidence requirements must be defined in the local project adapter.

Human Steering Rule

Humans should be able to steer execution without becoming the default bottleneck.

Recommended default:

- plan posted visibly
- execution continues automatically
- human intervention is available at any time
- agent must stop or redirect when valid control signals appear
- human review happens in the issue or PR thread, not as a required pre-execution approval gate

Architectural Change Rule

If the issue appears to require architectural change beyond the scoped task, agents must stop and request human guidance instead of implementing it implicitly.

Local Adapter Rule

Every repository using this template should maintain a local project adapter that defines:

- execution start condition
- plan visibility mode
- human control signals
- lifecycle labels
- branch naming
- required preread documents
- verification commands
- evidence requirements
- repository-specific stop conditions
