# Combined Topology Runbook

## Issue Lifecycle

```
Issue created
  → ready-for-build  (scope validated)
  → in-progress      (execution begins, branch created by automation)
  → branch has commits → draft PR created automatically
  → PR review → merge
```

## When To Use

Use `topology:combined` when one executor should own planning, implementation, and PR handoff as a single issue-sized change.

This is the default topology. When no `topology:*` label is present, combined is assumed.

## Merge Policy

Default behavior is automation-first merge once the verifier gate passes (if `policy-auto-merge` is configured).

To require a human reviewer to merge: add `merge:human-required` to the issue.

Runtime pause signals:
- `hold` — pause execution, suppresses auto-merge
- `needs-human` — interrupt signal, suppresses auto-merge

The `hold` and `needs-human` labels are temporary. Use `merge:human-required` as the deliberate long-term policy label.

## Prerequisites

Before starting execution:

- The live GitHub Issue is the source of truth
- Issue has the `in-progress` label
- Issue satisfies the required contract sections (Context, Requirements, Acceptance Criteria, Target Files)
- Automation-created issue branch exists remotely (`issue-<number>-<slug>`)
- Local checkout can switch cleanly to the issue branch

## Publish From Draft

If the work starts from a local draft in `.agentic/issues/drafts/`, reconcile the draft before publishing.

Before running `gh issue create`, verify the draft is current:

1. Read the draft in full.
2. Check the project's verification commands, target files, and test guardrails for any conflicts.
3. Identify outdated references (wrong target files, stale assumptions).
4. Patch the draft to resolve all conflicts.

Publishing a draft without reconciliation is not permitted.

After reconciliation, publish:

```bash
gh issue create \
  --title "[TASK] <task title>" \
  --body-file .agentic/issues/drafts/<task-file>.md \
  --label "task,topology:combined,agent-builder"
```

Do not include `ready-for-build` at publish time for tasks with upstream dependencies. Add it separately once the dependency chain is clear:

```bash
gh issue edit <number> --add-label "ready-for-build"
```

**Readiness validation requires before `ready-for-build` passes:**
- A topology label (`topology:combined` or `topology:split`)
- An agent routing label (`agent-builder`, `agent-planner`, etc.) or an assignee

Notes:
- Local front matter (`title:`, `labels:`) is ignored by `gh issue create`
- Pass the real title and labels explicitly in the command
- Once published, the live GitHub Issue is authoritative

## Prepare The Issue And Branch

```bash
gh issue view <issue-id> --comments
git fetch origin
git ls-remote --heads origin "issue-<issue-id>-<slug>"
git switch --track "origin/issue-<issue-id>-<slug>"
git branch --show-current
```

Expected result:
- Issue comments show the branch-ready note or an existing draft PR
- Remote branch exists
- Local checkout is on the issue branch, not the base branch

## Write A Preflight Plan

Before editing files, restate the execution plan:

- Chosen implementation approach
- Files that will change
- Acceptance-criteria mapping
- Confirmation the plan stays within the issue contract

No human approval needed to proceed if the plan is in-scope.

## Implement The Scoped Change

- Edit only what the issue contract requires
- Keep the change PR-sized
- Do not create extra branches or PRs
- Once a PR exists, use the PR as the primary steering surface

## Verify The Change

Run the project's required verification commands (see your project adapter):

```bash
# Examples — adapt to your project
<lint command>
<build command>
<test command>
```

For user-visible changes, also run the E2E smoke lane and produce evidence.

### Acceptance Criteria Gate (mandatory)

Before pushing, confirm every acceptance criterion from the issue is satisfied in the running application — not assumed from a passing build:

1. Read each criterion from the issue body
2. Verify it is demonstrably true (you observed the behavior)
3. If any criterion is not satisfied, implement it before pushing

## Push And Hand Off To The PR

After verification:

```bash
git add <files>
git commit -m "feat(issue-<id>): <short description>"
git push origin "issue-<issue-id>-<slug>"
```

If this is the first commit with content, the draft PR bootstrapper creates the draft PR automatically. Later pushes update the same PR.

## Success Signals

- Issue scope implemented without expanding requirements
- Verification passes
- Task-relevant evidence available
- Draft PR exists or was updated from the issue branch

## Troubleshooting

**Issue branch missing:**
- Confirm the issue has `in-progress`
- Inspect issue comments for the draft PR bootstrapper result
- Do not implement on the base branch

**Local checkout cannot switch cleanly:**
- Stop and ask for guidance instead of forcing through local state

**Verification fails:**
- Iterate until checks pass, or report the blocker and pause for guidance

**Visible stop signal appears:**
- Honor `hold`, `needs-human`, or a comment containing `stop`
- Report paused state in the same visible thread

**PR does not auto-merge when expected:**
- Check for `merge:human-required`, `hold`, or `needs-human` on the issue
- Check for a `stop` comment on the issue or PR
- If suppression is intentional, merge manually
