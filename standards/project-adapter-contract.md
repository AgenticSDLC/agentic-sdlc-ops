# Project Adapter Contract

Every repository that adopts this workflow kit should publish a local project adapter. The adapter is the repository-specific execution contract layered on top of the portable standards.

## Required Fields

### `project_type`

Describe the repository at a high level.

Examples:

- web application
- API service
- serverless platform
- data platform
- infrastructure repository

### `issue_required_sections`

List the required issue sections for executable tasks in that repository.

Minimum baseline:

- context
- requirements
- acceptance criteria
- target files or target subsystem scope

### `issue_draft_location`

State whether the repository uses a standard local draft location before issue publication.

Recommended default:

- `.agentic/issues/drafts/`

Document:

- whether local issue drafts are used at all
- whether the default path is used or overridden
- what happens to the draft after publication to GitHub

### `execution_start_condition`

State exactly when implementation may begin.

Examples:

- issue has `in-progress`
- issue has passed readiness validation and is assigned
- issue has both `agent-builder` and `in-progress`

### `plan_visibility_mode`

State where the preflight plan must be posted before implementation proceeds.

Examples:

- issue comment
- PR description
- issue comment and PR description

### `human_control_signals`

List the repository-specific comments, labels, or status markers that should stop or redirect execution.

Examples:

- comment containing `stop`
- label `hold`
- label `needs-human`
- PR comment requesting re-plan

Document:

- whether issue comments, PR comments, or both are valid control surfaces
- whether a PR becomes the preferred steering surface after it exists
- what the agent must do after detecting a stop or hold signal

### `state_labels`

List the repository's execution-state labels and any important supporting labels.

Include:

- lifecycle order
- meaning of each state label
- optional supporting labels used by automation or routing

### `branch_naming`

Document the repository's expected branch naming pattern, if one exists.

Include:

- naming format
- branch creation source if automated
- any restrictions on creating additional branches

### `required_pre_read_docs`

List the repository documents agents must read before implementing work.

Examples:

- architecture docs
- product constraints
- security rules
- workflow or operations docs

### `verification_commands`

List the exact verification required before work is considered complete.

Include:

- mandatory commands
- conditional checks by change type
- any environment prerequisites

### `user_visible_change_policy`

Explain what extra verification or review applies to user-visible changes.

Examples:

- browser smoke coverage required
- screenshots required
- manual QA checklist required

### `evidence_requirements`

Document the artifacts required to demonstrate verification.

Examples:

- test reports
- traces or screenshots
- deploy preview link
- integration logs

### `automation_hooks`

Describe the repository automation that participates in the lifecycle.

Examples:

- readiness validator
- branch bootstrapper
- PR state sync
- deployment previews
- plan-posting automation
- hold-signal detection

### `stop_and_ask_conditions`

List repository-specific conditions under which the agent must stop and request guidance.

Examples:

- architectural changes
- production data migrations
- permissions model changes
- infrastructure boundary changes

### `repo_specific_constraints`

Capture any other local rules that materially affect execution.

Examples:

- forbidden directories
- required ownership boundaries
- deployment windows
- protected systems

## Recommended Format

A local project adapter may be Markdown, YAML, or another repository-native format, but it should be easy for both humans and agents to read.

The adapter should be committed to the repository and referenced from that repository's `AGENTS.md` or equivalent contributor guidance.
