# Parallel Issue Execution Runbook

This runbook describes how to execute multiple issue-first workstreams safely, observe their progress, and close them without mixing branches or treating local checks as verification.

It applies to GitHub as the control-plane provider and to repositories that installed the Agentic SDLC worktree capability. Repository instructions and the live issue remain authoritative.

## The Three Concurrency Layers

Parallel delivery has three independent capacity layers:

| Layer | What runs concurrently | Primary control |
|---|---|---|
| Workstreams | Planner, builder, or combined executors working on different issues | One issue branch and worktree per issue |
| Workflows | GitHub workflows admitted for different PRs and events | Workflow triggers, concurrency groups, and policy |
| Runner jobs | Individual workflow jobs actually executing | Number and capacity of eligible runners |

Success at one layer does not imply success at another. Three builders can push concurrently and GitHub can queue three workflow sets concurrently, while one self-hosted runner still executes only one job at a time.

## Preconditions

Before starting:

1. Read each live issue. A published issue supersedes its local draft.
2. Read the target repository's `AGENTS.md` and project adapter.
3. Confirm each issue has its configured execution-start state and no stop, hold, redirect, or human-required signal.
4. Confirm automation created the expected remote issue branch.
5. Choose issues with independent target files or subsystems for the first parallel run.
6. Confirm every executor can write to its assigned worktree path.
7. Confirm at least one eligible CI runner is online.

Do not create a substitute branch when the lifecycle-owned remote branch is missing. Stop and repair the lifecycle trigger.

## 1. Select Independent Work

A low-risk pilot uses two or three small issues whose target files do not overlap. Each issue should be independently mergeable and should not depend on another pilot issue landing first.

Record:

- issue number and topology
- expected issue branch
- target files or subsystem
- expected PR
- executor assignment
- local worktree path

For split topology, the planner, builder, and verifier are sequential roles within one issue. Parallelism comes from running different issues at the same time, not from violating the planner-to-builder handoff.

## 2. Confirm Remote Branches

The worktree command fails closed until the lifecycle-created branch exists remotely:

```sh
git fetch origin
git ls-remote --heads origin "issue-<number>-*"
```

If no matching branch exists, inspect readiness and branch-bootstrap automation. Do not branch from local `main` as a workaround.

## 3. Create One Worktree Per Issue

Create an isolated checkout for each issue:

```sh
agentic-sdlc issue worktree --issue <number>
```

Use an explicit path when the executor has a bounded writable root:

```sh
agentic-sdlc issue worktree \
  --issue <number> \
  --path <writable-root>/<repository>-issue-<number>
```

List the resulting worktrees:

```sh
agentic-sdlc issue worktree --list
```

In every worktree, confirm:

```sh
git status --short --branch
git branch --show-current
```

The checked-out branch must match the issue. A worktree selects a directory; it does not expand an agent sandbox. Start each executor with that worktree as an allowed writable root.

## 4. Start Executors Concurrently

Give every executor the same bounded preflight contract:

- read the live issue and adapter
- remain inside declared target scope
- reuse existing utilities and patterns
- run repository-defined local feedback commands
- commit and push only its issue branch
- stop at `git push`

Combined topology uses one executor for the issue. Split topology follows the planner, builder, and verifier markers defined by the [split topology runbook](../templates/SPLIT-TOPOLOGY-RUNBOOK.md).

Do not let multiple executors share a checkout. Branch switching in a shared checkout defeats issue isolation even when the branches themselves are independent.

## 5. Confirm Push And PR Handoff

After each builder pushes:

1. Confirm the PR head SHA matches the branch head.
2. Confirm the PR targets the expected base branch.
3. Confirm changed files match the live issue's target files.
4. Confirm the PR is ready for the repository's validation event.

Useful commands:

```sh
gh pr view <pr> --json headRefName,headRefOid,baseRefName,isDraft,state
gh pr diff <pr> --name-only
```

If a combined-topology PR remains a draft after the configured builder-complete signal, do not assume CI will run. Inspect the lifecycle automation. A manual `gh pr ready <pr>` is an exception path and requires explicit operator authorization.

When `ready_for_review` is the authoritative validation event, every required workflow must subscribe to it or be dispatched through an equivalent trusted event. A ready PR with only some workflows started is not verified.

## 6. Monitor CI

CI owns verification. Local lint, build, and test results are fast feedback only.

Inspect each PR:

```sh
gh pr checks <pr>
```

Inspect active and queued runs:

```sh
gh run list --limit 50
```

Inspect the self-hosted runner pool:

```sh
gh api repos/<owner>/<repository>/actions/runners \
  --jq '.runners[] | {name,status,busy,labels:[.labels[].name]}'
```

Expected signals:

- all required checks are attached to the current PR head
- the runner is `online`
- a busy runner continues accepting new work after each job
- no required workflow remains in `action_required`, `queued`, or `pending` after the queue drains
- a new push invalidates older-head evidence and starts fresh checks

## Runner Capacity

One registered GitHub Actions runner normally executes one job at a time. Workflow matrices and multiple PRs create multiple queued jobs; they do not make one runner execute those jobs concurrently.

### When One Runner Is Enough

Keep one runner when:

- delivery volume is low
- queue wait is acceptable
- the goal is avoiding hosted-runner quota usage
- jobs are resource-heavy enough that concurrent execution would contend for the same host
- the runner is a pilot or recovery path rather than a service-level commitment

One runner is a throughput bottleneck, but not a correctness defect, when it remains online and drains the queue successfully.

### When To Add Runner Instances

Consider more eligible runners when:

- runner queue saturation is sustained
- end-to-end task lead time is dominated by queue wait
- independent PRs routinely block each other
- the host has enough CPU, memory, disk I/O, and Docker capacity
- runner availability needs redundancy

Start with two runner instances and measure before scaling further. Browser tests, application builds, Docker services, and database integration tests can exhaust a developer workstation quickly.

Each instance needs:

- a unique runner name
- a unique work directory and persistent registration state
- the intended repository or organization scope
- the labels selected by generated workflows
- independent cleanup behavior

Do not share one runner work directory or registration volume across concurrent runner processes.

Track [runner availability and queue saturation](observability.md#external-dependency-metrics) alongside task lead time. Scale from measured wait and host utilization, not PR count alone.

## 7. Audit Merge Policy

Green CI and merge authorization are separate decisions.

For combined topology:

- CI is the verification authority.
- Generated merge policy should require current-head checks and configured human-control gates.
- A split verifier attestation should not be required unless policy explicitly adds that review layer.

For split topology:

- CI remains the verification floor.
- Both pass and blocker reports require their verdict marker plus `<!-- split-verifier-sha: <head-sha> -->`.
- For one unchanged current head, the latest valid authorized verdict wins. A later pass records the re-audit that resolves an earlier blocker without rewriting history; a later blocker closes an earlier pass.
- Any new push makes earlier bound verdicts stale and keeps the new head closed until its own valid pass.
- Legacy unbound blockers remain fail closed until a newer authorized current-head pass supersedes them; a later legacy blocker closes the gate again.
- When an allowlist is configured, it applies to both new SHA-bound verdict types. Unauthorized bound reports cannot authorize or permanently block a merge.

Inspect final PR state:

```sh
gh pr view <pr> \
  --json state,isDraft,mergeStateStatus,autoMergeRequest,headRefOid
```

An open, clean, fully green PR with no auto-merge request indicates a policy or event-chain problem, not an implementation failure.

## 8. Clean Up

Do not remove an issue worktree merely because its branch was pushed. Wait until the issue reaches the repository's terminal state.

```sh
gh issue view <number> --json state,labels
agentic-sdlc issue worktree --issue <number> --remove
```

Then confirm:

```sh
agentic-sdlc issue worktree --list
git status --short --branch
```

Keep open-issue worktrees intact so follow-up pushes stay isolated.

## Troubleshooting

| Symptom | Likely layer | Fail-closed response |
|---|---|---|
| Expected remote issue branch is missing | Lifecycle/bootstrap | Stop; repair branch creation before making a worktree |
| Worktree points at the wrong branch | Local isolation | Stop; do not implement or push |
| PR remains draft after builder push | Lifecycle event chain | Inspect builder-complete and ready-transition automation |
| Only some checks start after PR becomes ready | Workflow triggers | Confirm every required workflow handles the authoritative event |
| Jobs remain queued and runner is offline | Runner availability | Restore the eligible runner; do not substitute local results |
| Jobs drain slowly on one online runner | Runner capacity | Measure queue saturation; add isolated runner instances if justified |
| Checks API returns `Resource not accessible by integration` | Generated workflow permissions | Add the least privilege required by the API, commonly `checks: read` for check-run enumeration |
| One PR creates many repeated policy runs | Workflow event design | Coalesce by PR and head SHA or trigger from one authoritative aggregate gate |
| Combined PR is green but policy asks for a split verifier pass | Topology policy | Treat as generated policy mismatch; do not fabricate an attestation |
| Split verifier pass is rejected after a push | Evidence freshness | Audit the new head and publish a new SHA-bound attestation |
| Historical split blocker still blocks after a fixed-head pass | Verifier verdict policy | Confirm both workflows use the shared ordered verdict evaluator; retain the old report and post a newer valid current-head pass |
| Legacy blocker has no SHA | Upgrade compatibility | Leave the audit history intact; a newer authorized current-head pass supersedes it, while a later legacy blocker closes the gate again |
| Auto-merge is blocked by hold or human-required policy | Human control | Leave the PR open until the signal is explicitly resolved |
| Local tests pass but required CI is missing or red | Verification | Task remains unverified; do not self-certify |

## Responsibility Boundary

The generated SDLC layer owns:

- lifecycle events and state transitions
- topology-aware review and merge policy
- generated workflow permissions and event contracts
- worktree safety behavior

The downstream repository owns:

- required check names and verification commands
- application-specific CI services and secrets
- host capacity selected for self-hosted runners
- additional human approval policy

A downstream application should configure these seams, not independently redesign the lifecycle.

## Completion Checklist

- Every issue used its own branch and worktree.
- Every diff remained within its live issue.
- Builders stopped at push.
- Required CI passed for each current head.
- Topology-specific review policy passed.
- Merge behavior matched configured policy.
- Terminal issues reached `done`.
- Completed worktrees and branches were cleaned up.
- Runner queue time and resource saturation were recorded for capacity planning.
