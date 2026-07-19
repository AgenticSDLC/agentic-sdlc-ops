# Combined Topology Runbook

## Issue Lifecycle

```
Issue created
  → ready-for-build  (scope validated)
  → in-progress      (execution begins, branch created by automation)
  → builder pushes
  → ready PR created/promoted with WORKFLOW_TOKEN
  → CI verifies current head
  → configured merge policy evaluates → merge
```

## When To Use

Use `topology:combined` when one executor should own planning, implementation, and PR handoff as a single issue-sized change.

This is the default topology. When no `topology:*` label is present, combined is assumed.

## Merge Policy

Default behavior is automation-first merge once current-head CI and the
combined-topology merge gate pass (if `policy-auto-merge` is configured).

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

## Parallel Workstreams

Every issue gets its own branch (`issue-<number>-<slug>`), but a single checkout can only have one branch switched in at a time — that is what actually blocks running multiple issues at once, not the branch model itself. To work more than one issue concurrently, give each issue its own git worktree instead of repeatedly switching branches in one directory:

```bash
agentic-sdlc issue worktree --issue <issue-id>
```

This creates an isolated working directory (default: a sibling directory named `<repo>-issue-<id>-<slug>`) with the issue branch already checked out. `agentic-sdlc runtime combined --issue <issue-id>` auto-detects that worktree and operates there — no need to `cd` first or pass `--target` — as long as you don't also pass an explicit `--target` pointing somewhere else (if you do and it doesn't match, the runtime refuses rather than guessing which checkout you meant). Start a session (Claude Code or otherwise) *inside* that worktree directory to work the issue in isolation from every other issue's in-progress changes.

The command fails closed if the automation-created remote issue branch does not exist or cannot be fetched. It never creates a substitute branch from local `main`.

Auto-detection does not expand an executor's filesystem permissions. For Codex or another sandboxed executor, start a new session with the worktree as a writable workspace root. If a suitable writable location is already approved, choose it explicitly:

```bash
agentic-sdlc issue worktree --issue <issue-id> --path <writable-dir>
```

When the issue reaches `done`:

```bash
agentic-sdlc issue worktree --issue <issue-id> --remove
```

`agentic-sdlc issue worktree --list` shows every active issue worktree.

## Prepare The Issue And Branch

If you are not using a dedicated worktree for this issue, prepare the branch in your current checkout:

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
- The checkout or dedicated worktree used for implementation is on the issue branch, not the base branch
- A shared control checkout may remain on the base branch when implementation runs in a dedicated worktree

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

If this is the first commit with content, the bootstrapper creates a ready PR
for combined topology using `WORKFLOW_TOKEN`, which allows every generated
`pull_request` validator to receive the event. If an existing combined PR is
still a draft, the next builder push promotes it idempotently.

Automatic readiness is suppressed by `merge:human-required`, `hold`,
`needs-human`, or a stop comment. Split-topology PRs remain drafts and follow
the split verifier handoff.

The builder ends at `git push`. CI owns verification from that point.

## Success Signals

- Issue scope implemented without expanding requirements
- Required CI passes for the current PR head
- Task-relevant evidence is available
- Combined PR is ready, or readiness is visibly suppressed by policy
- Configured merge policy evaluates after CI

## Troubleshooting

**Issue branch missing:**
- Confirm the issue has `in-progress`
- Inspect issue comments for the draft PR bootstrapper result
- Do not implement on the base branch

**Local checkout cannot switch cleanly:**
- Stop and ask for guidance instead of forcing through local state
- If this keeps happening because multiple issues are active at once, that is a sign you want `agentic-sdlc issue worktree --issue <id>` instead of sharing one checkout across issues

**Verification fails:**
- Iterate until checks pass, or report the blocker and pause for guidance

**Visible stop signal appears:**
- Honor `hold`, `needs-human`, or a comment containing `stop`
- Report paused state in the same visible thread

**PR does not auto-merge when expected:**
- Check for `merge:human-required`, `hold`, or `needs-human` on the issue
- Check for a `stop` comment on the issue or PR
- Confirm `WORKFLOW_TOKEN` exists and has pull-request/workflow permission
- Confirm every required validation workflow subscribes to `ready_for_review`
- Confirm `policy-auto-merge` retains `checks: read`
- Confirm its resolver found an open PR for the completed workflow head
- Confirm repeated evaluations share the same PR-head concurrency key
- If suppression is intentional, merge manually
