# Adoption Checklist

Use this checklist to bring the workflow kit into a target repository.

## 0. GitHub Settings Prerequisites

Complete `templates/SETUP-PREREQS.md` (installed to `docs/operations/SETUP-PREREQS.md`) before publishing the first issue. In short:

- Org-level Actions permissions: "Read and write" + "Allow GitHub Actions to create and approve pull requests" — without this the draft PR bootstrapper cannot create PRs.
- `WORKFLOW_TOKEN` secret: a PAT for the readiness auto-transition. For org-owned repos a fine-grained token's Resource Owner must be the organization, not a personal account. Track the expiry date.
- Delete GitHub's 9 default labels (`bug`, `documentation`, …) before creating the catalog — `agentic-sdlc doctor` warns while they remain.

## 1. Install The Baseline Artifacts

Copy into the target repository:

- `templates/issue-template.md`
- `templates/pr-template.md`
- `templates/AGENTS.md`
- `templates/project-adapter.md`

Optional but recommended depending on repository shape:

- `templates/task-classes.md`
- `templates/platform-actors.md`
- `templates/label-catalog.md`
- `templates/gh-cli-sop.md`
- `templates/issue-first-workflow.md`
- `templates/env-manifest.md`

## 2. Publish A Local Project Adapter

Create the repository's local adapter and fill in:

- issue draft location if local drafting is used
- execution start condition
- plan visibility mode
- human control signals
- lifecycle labels
- branch naming
- preread docs
- verification commands
- evidence requirements
- task classes if the repository uses them
- environment variable guidance if execution depends on local or hosted secrets
- stop-and-ask conditions
- repository-specific constraints

## 3. Create Labels

Add the lifecycle labels and any required supporting labels from the repository's chosen operating model. Every task issue needs a topology label and at least one `agent-*` routing label at publish time; hold back `ready-for-build` on issues with upstream dependencies (`issue publish --state none`).

## 4. Map Automation

Implement or adapt repository automation for:

- readiness validation
- branch bootstrap
- draft PR creation if used
- PR and issue state synchronization
- PR contract validation
- commit message or PR title validation if used
- visible plan posting or plan-presence validation if required
- hold or stop signal handling

## 5. Update Local Docs

Make sure agents and contributors can find:

- the local project adapter
- the local issue draft location if the repository uses one
- required architecture and product docs
- repository-specific workflow rules

## 6. Run A Pilot Issue

Run one small issue through the full lifecycle:

- create issue from the template
- confirm the preflight plan is visible before implementation
- validate readiness
- move to execution state
- complete implementation on the issue branch
- run required verification
- confirm PR and issue state transitions behave as expected
- confirm a PR or issue comment can pause or redirect execution

## 7. Record Deviations Explicitly

If the repository needs to diverge from the core standard, document the deviation in the local adapter instead of relying on tribal knowledge.
