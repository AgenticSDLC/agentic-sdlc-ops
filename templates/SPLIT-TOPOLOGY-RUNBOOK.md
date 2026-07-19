# Split Topology Runbook

## Execution Sequence

| Step | Action | Who |
|------|--------|-----|
| 1 | Reconcile the local draft | Agent / Human |
| 2 | Create the GitHub Issue | Agent / Human |
| 3 | Add topology and readiness labels | Agent / Human |
| 4 | Wait for readiness validation to pass | Agent / Human |
| 5 | Readiness validator auto-transitions the issue to `in-progress` | Automation |
| 6 | Planner posts visible handoff | Planner |
| 7 | Builder implements from handoff | Builder |
| 8 | Builder pushes; CI verifies | Builder / CI |
| 9 | Verifier audits CI results, reports pass or blocker (optional) | Verifier |
| 10 | PR review and closeout | Human |

The chain is linear. Each step depends on the previous one completing. If a step does not produce its expected output, the sequence stops — it does not fall through to the next step.

**Verification is owned by CI, not the builder.** The builder's job ends at `git push`. The only valid completion signal is a green check on the PR from an automated process the builder did not run and cannot control. Agents submit work for verification; they do not conduct it.

## Reference Executors

The split contract is provider-neutral: labels, the visible comment markers, and the CI policy gates. Any executor that reads the issue and posts the markers can play a role. Three reference executors exist:

1. **Claude Code subagents** — `.claude/agents/planner.md`, `builder.md`, `verifier.md` (installed by the overlay). Each role runs with its own model and ends by posting its marker comment via `gh`. This is the recommended interactive path.
2. **`agentic-sdlc runtime split`** — scripted execution via the CLI using the configured agent backend (OpenAI or Anthropic API). Auto-detects the next role from the marker trail; `--role` forces a specific phase.
3. **Any other agent session (e.g. Codex) or a human** — follow this runbook directly and post the markers via `gh`. The CI gates cannot tell the difference, by design.

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
- `needs-details` is not present

If validation fails, fix the reported issues and re-apply `ready-for-build`.

## 5. Automation Starts Execution

Do **not** move the issue to `in-progress` manually. When readiness passes, the readiness validator itself removes `ready-for-build` and adds `in-progress` (this is the auto-transition `WORKFLOW_TOKEN` exists for — see `docs/operations/SETUP-PREREQS.md`).

Confirm the transition happened:

```bash
gh issue view <issue-id> --json labels --jq '[.labels[].name]'
```

Expected: `in-progress` present, `ready-for-build` absent. If the issue is stuck in `ready-for-build` with a passing readiness comment, the auto-transition failed — check the validator run logs and the `WORKFLOW_TOKEN` secret rather than swapping the labels by hand.

For `topology:split`, this transition starts the planner phase. The builder does not begin until the visible planner handoff exists.

## Parallel Workstreams

Split's phases run as separate invocations over time — planner now, builder later, verifier later still — which makes a shared, single checkout even more fragile than in combined: whatever branch happens to be switched in when the builder phase finally runs might belong to a different issue entirely. Give each issue its own worktree before starting the planner phase:

```bash
agentic-sdlc issue worktree --issue <issue-id>
```

`agentic-sdlc runtime split --issue <issue-id>` (any role, any phase) auto-detects that worktree and operates there regardless of which directory you invoke it from — as long as you don't also pass an explicit `--target` pointing elsewhere, in which case it refuses rather than guessing. This means the planner, builder, and verifier phases for one issue can run hours apart, or a different session can pick up the builder phase, without anyone needing to remember which branch was checked out last.

The command fails closed if the automation-created remote issue branch does not exist or cannot be fetched. It never creates a substitute branch from local `main`.

Auto-detection does not expand an executor's filesystem permissions. For Codex or another sandboxed executor, start a new session with the worktree as a writable workspace root, or pass `--path <writable-dir>` when creating it if the executor already has an approved writable location.

Remove the worktree once the issue reaches `done`: `agentic-sdlc issue worktree --issue <issue-id> --remove`. List active ones with `agentic-sdlc issue worktree --list`.

## 6. Planner Phase

The planner leaves a visible handoff artifact on the issue before any code is written.

The planner handoff must include:
- Chosen approach
- Exact files or surfaces expected to change
- Prior art & reuse: what existing utilities, components, or patterns were searched for (start from the adapter's Canonical Utilities / Reuse Map when one is defined); for each hit, reuse it or justify concretely why it does not fit. The builder is bound by these decisions — this section is required, and a handoff without it does not authorize the builder.
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
- The checkout or dedicated worktree used for implementation is on the issue branch

If you are not using a dedicated worktree for this issue (see Parallel Workstreams above), prepare the branch manually:

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

## 8. Builder Push — CI Verifies

While implementing, the builder may run the project's lint/build/test locally as a fast feedback loop. Local results are development feedback, not verification evidence — reporting local output as proof of correctness is self-certification and is not permitted.

The builder's job ends at push:

```bash
git add <files>
git commit -m "feat(issue-<id>): <short description>"
git push origin "issue-<issue-id>-<slug>"
```

The first push with content triggers the draft PR bootstrapper. Later pushes update the same PR. CI then runs the repository-defined verification (lint, build, tests, E2E lanes) against the pushed head. Work is complete when repository-defined verification succeeds in CI — not when code is generated, and not when the builder believes it works.

If CI fails, the builder fixes and pushes again. The builder never posts verification claims about its own output.

## 9. Optional Verifier Phase

If `agent-verifier` is used, the verifier audits — it does not rerun or re-implement:

- Confirms required CI checks completed successfully for the PR's current head
- Confirms required evidence exists (E2E output, screenshots for user-visible work)
- Confirms the diff matches the planner handoff scope
- Reports pass or blocker status on the PR

Verifier completion markers (must appear in the raw comment body, posted on the PR):
- Pass — **two** markers, together: `<!-- split-verifier-pass -->` plus `<!-- split-verifier-sha: <head-sha> -->` binding the attestation to the audited commit. The policy gates reject a pass with no SHA line (unbound) or with a SHA older than the current head (stale) — a new commit always requires a fresh audit. Get the SHA with `gh pr view <pr> --json headRefOid --jq .headRefOid`.
- `<!-- split-verifier-blocker -->` — merge is blocked; `policy-verifier-gate` will report failure. No SHA line needed.

If `policy-auto-merge` is configured with `AGENTIC_AUTO_MERGE_MODE=auto`, a
valid bound pass triggers merge once required checks are green. Split topology
always requires this attestation; combined topology does not. Repositories
that want the attestation to come from an independent identity (not the
builder's account) can set `VERIFIER_ALLOWLIST` in
`scripts/merge-gate-policy.mjs` — see
`docs/operations/SETUP-PREREQS.md`.

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
- Builder implemented from the handoff without widening scope, and stopped at push
- CI verification passes for the PR's current head
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
- If this keeps happening because multiple issues are active at once, that is a sign you want `agentic-sdlc issue worktree --issue <id>` instead of sharing one checkout across issues — this is especially likely in split, since planner and builder phases run at different times
