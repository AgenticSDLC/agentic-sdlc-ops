# Split Topology Runbook

## Execution Sequence

| Step | Action | Who |
|------|--------|-----|
| 1 | Reconcile the local draft | Agent / Human |
| 2 | Create the GitHub Issue | Agent / Human |
| 3 | Add topology and readiness labels | Agent / Human |
| 4 | Wait for readiness validation to pass | Agent / Human |
| 5 | Move issue to `in-progress` | Agent / Human |
| 6 | Planner posts visible handoff | Planner |
| 7 | Builder implements from handoff | Builder |
| 8 | Builder verifies and pushes | Builder |
| 9 | Verifier reports pass or blocker (optional) | Verifier |
| 10 | PR review and closeout | Human |

The chain is linear. Each step depends on the previous one completing. If a step does not produce its expected output, the sequence stops — it does not fall through to the next step.

## When To Use

Use `topology:split` when planning and implementation should be visibly separated without changing the repository lifecycle.

This topology adds a planner-to-builder handoff on the issue before code exists.

Add `agent-verifier` when the task has meaningful verification or evidence requirements.

## 1. Reconcile The Draft

If the work starts from a local draft in `.agentic/issues/drafts/`, verify it is current before publishing.

Before running `gh issue create`:

1. Read the draft in full.
2. Check the project's verification commands, target files, and test guardrails for any conflicts.
3. Identify outdated references (wrong target files, stale assumptions).
4. Patch the draft to resolve all conflicts.

Publishing a draft without reconciliation is not permitted.

## 2. Create The Issue

After reconciliation, publish the draft:

```bash
gh issue create \
  --title "[TASK] <task title>" \
  --body-file .agentic/issues/drafts/<task-file>.md \
  --label "task,agent-planner"
```

Notes:
- Local front matter (`title:`, `labels:`) is ignored by `gh issue create`
- Pass the real title and labels explicitly
- `agent-planner` communicates intended routing for the first phase
- Add `agent-verifier` at creation time if a distinct verifier phase is already intended
- Add `merge:human-required` if a human must approve before merge
- Workflow labels (`ready-for-build`, `topology:split`, `in-progress`) are added next
- Once published, the live GitHub Issue is authoritative

## 3. Add Topology And Readiness Labels

```bash
gh issue edit <issue-id> \
  --add-label "ready-for-build,topology:split"
```

Optional — add `merge:human-required` if human review is required before merge:

```bash
gh issue edit <issue-id> --add-label merge:human-required
```

## 4. Wait For Readiness Validation

After labeling, wait briefly and verify the readiness check passed:

```bash
sleep 10 && gh issue view <issue-id> \
  --json labels,comments \
  --jq '{labels: [.labels[].name], comments: [.comments[].body]}'
```

Expected result:
- Comment body contains `Issue Readiness Check: Passed`
- `ready-for-build` is present
- `needs-details` is not present

If validation fails, fix the reported issues and re-apply `ready-for-build`.

## 5. Start Execution

Only after readiness passes:

```bash
gh issue edit <issue-id> \
  --remove-label ready-for-build \
  --add-label in-progress
```

For `topology:split`, this transition starts the planner phase. The builder does not begin until the visible planner handoff exists.

## 6. Planner Phase

The planner leaves a visible handoff artifact on the issue before any code is written.

The planner handoff must include:
- Chosen approach
- Exact files or surfaces expected to change
- Acceptance-criteria mapping
- Confirmation that the work stays within the issue contract

The planner closes the handoff with the `<!-- split-planner-complete -->` HTML comment marker. This marker may be hidden in GitHub's rendered UI but is present in the raw comment body.

Builder does not begin just because the issue entered `in-progress`. Builder begins only after the visible planner handoff with `<!-- split-planner-complete -->` exists.

If the handoff does not appear, treat that as a blocked split trigger. Do not proceed to the builder phase without it.

## 7. Builder Phase

Before implementing, the builder confirms the start conditions:

- Issue still has `in-progress`
- Visible planner handoff exists on the issue
- Remote issue branch exists (`issue-<number>-<slug>`)
- Local checkout has switched to the issue branch

```bash
gh issue view <issue-id> --comments
git fetch origin
git ls-remote --heads origin "issue-<issue-id>-<slug>"
git switch --track "origin/issue-<issue-id>-<slug>"
git branch --show-current
```

If the handoff is missing, the builder must not proceed.

Builder rules:
- Implement only what the planner handoff and issue contract cover
- Do not widen the issue scope during implementation
- Keep the change PR-sized
- Once a PR exists, use the PR as the primary steering surface

## 8. Builder Verification

Run the project's required verification commands (see your project adapter):

```bash
# Examples — adapt to your project
<lint command>
<build command>
<test command>
```

For user-visible changes, also run the E2E smoke lane and produce evidence.

Acceptance criteria gate: before pushing, read every acceptance criterion from the issue and confirm each is satisfied in the running application — not assumed from a passing build.

Push after verification:

```bash
git add <files>
git commit -m "feat(issue-<id>): <short description>"
git push origin "issue-<issue-id>-<slug>"
```

The first push with content triggers the draft PR bootstrapper. Later pushes update the same PR.

## 9. Optional Verifier Phase

If `agent-verifier` is used, the verifier:

- Confirms required verification ran
- Confirms evidence exists
- Reports pass or blocker status on the issue or PR

Verifier completion markers (must appear in the raw comment body):
- `<!-- split-verifier-pass -->` — verification passed; `policy-auto-merge` will trigger merge if configured
- `<!-- split-verifier-blocker -->` — merge is blocked; `policy-verifier-gate` will report failure

The verifier role is separate from implementation. It confirms evidence exists; it does not add new implementation work.

## 10. PR Review And Closeout

Before approving the PR, review the diff:

```bash
gh pr diff <pr-id> --name-only
gh pr diff <pr-id>
```

Expected result:
- Changed files match the Target Files from the issue
- No scope creep beyond the planner handoff
- No unrelated files touched

If the diff review surfaces problems, post a PR comment describing each issue so the builder can address them. The PR is the steering surface once it exists.

## Success Signals

- Planner handoff exists and matches the issue scope
- Builder implemented from the handoff without widening scope
- Verification passes
- Evidence exists for user-visible work
- If `agent-verifier` is used, pass or blocker status is reported on the issue or PR
- Draft PR exists or was updated from the issue branch

## Troubleshooting

**Planner handoff missing:**
- Do not start builder execution
- Confirm the issue is `in-progress` with `topology:split` and `agent-planner`
- Treat the missing handoff as a failed planner trigger and escalate

**Builder started too early:**
- Stop and confirm the planner handoff before continuing

**Visible stop signal appears:**
- Honor `hold`, `needs-human`, or a comment containing `stop`
- Report paused state in the same visible thread

**Issue branch missing:**
- Confirm the issue has `in-progress`
- Inspect issue comments for the draft PR bootstrapper result
- Do not implement on the base branch

**Local checkout cannot switch cleanly:**
- Stop and ask for guidance instead of forcing through local state
