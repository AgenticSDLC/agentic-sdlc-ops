## Default Path (read this first — applies to almost every task)

1. The **live provider work item body** is the authoritative task spec. Local drafts (`.agentic/issues/drafts/*.md`) are reference only and are superseded by the live issue the moment it is published.
2. Read the live issue before doing anything else.
3. Read the repository's local project adapter (declared in `.agentic/project-adapter.md` or the path the adapter specifies). It is the authoritative source for branch naming, verification commands, test file guardrails, and stop-and-ask conditions. If the root adapter declares workspace adapters, identify the workspace from the issue's `Target Files` and use that workspace adapter for its verification commands and guardrails; use the root adapter only for monorepo-level defaults or as an explicitly documented fallback.
4. If the issue has no `topology:*` label, you are in `topology:combined` — one executor, one PR, default local execution. Skip the Split Topology section below; it does not apply.
5. Confirm the issue has the execution start label defined in the project adapter, and that the branch exists and is checked out locally. If not, stop and follow the stop-and-ask rules below. If a dedicated worktree for this issue already exists (see **Parallel Workstreams** below), work there instead of switching branches in a shared checkout.
6. State a short preflight plan: chosen approach, files to touch, how each acceptance criterion will be met, confirmation this stays within declared scope. No human approval is needed to proceed if the plan is in-scope and no stop signal is present.
7. Implement only what the issue requires. Do not expand scope (see **Ambiguity Resolution**). Before creating any new helper, utility, or component, check the project adapter's Canonical Utilities (Reuse Map) when one is defined and search the codebase for an existing equivalent — reuse it, or record why it does not fit in the PR's Prior Art & Reuse section. Duplicating an existing implementation is treated as a defect, not a style issue.
8. Run the repository's verification commands locally before pushing. Local results are fast feedback — they are not verification evidence and do not constitute task completion. Fix any failures, then push. CI owns verification from that point. Your job ends at `git push`.

Everything past this point is either detail behind these steps or guidance for less common situations. Treat any docs or sections explicitly required by the issue or project adapter as mandatory.

---

## Verification

Verification is owned by CI. The task is not complete when local checks pass — it is complete when the PR's required checks are green.

Do not declare the task complete. Do not present local command output as verification evidence. Do not assert that acceptance criteria are satisfied because the code that should satisfy them exists. The CI checks on the PR are the only valid completion signal.

**What you do before pushing:**

Run the repository's verification commands locally. This is fast feedback to catch failures before they reach CI — not a substitute for CI. Fix any failures locally, then push.

Write tests required by the issue or the repository's test coverage policy. Tests are executed by CI; you do not need to run them locally as evidence of passing. Ensure tests follow the repository's test patterns (declared in the project adapter) and are self-contained — each test must be able to run in isolation without shared state from other tests.

**What you do not do:**

- Run checks locally and report the output as proof of completion.
- Declare `✓ VERIFIED` or produce a "Task Complete" summary before CI has run.
- Treat a locally passing build as a substitute for CI green.

**Why:** an agent that verifies its own work has an incentive to rationalize past failures. CI has no such incentive. Delegating verification to CI removes self-certification from the completion path entirely.

---

## Repository-Specific Adapter

Read the project adapter before implementing work. It defines:

- execution start condition and lifecycle labels
- plan visibility mode
- human control signals
- branch naming
- required pre-read documents
- verification commands (what CI runs)
- test file guardrails
- evidence requirements
- repository-specific stop-and-ask conditions

If the project adapter conflicts with a general rule in this file, the project adapter takes precedence for that repository.

---

## Issue Lifecycle

Issue created → readiness validation → execution start label applied → implementation authorized → branch created → push → PR opened → CI runs → merge on green.

Agents may execute only when the execution start condition in the project adapter is met. Do not create additional branches or PRs unless the adapter explicitly allows it.

---

## Parallel Workstreams

Every issue's branch is `issue-<number>-<slug>` under both topologies — that alone does not enable running multiple issues at once, since one checkout can only have one branch switched in at a time. To work more than one issue concurrently, each issue needs its own git worktree:

```bash
agentic-sdlc issue worktree --issue <issue-id>
```

The command refuses unless the automation-created remote issue branch already exists; a worktree never substitutes for the lifecycle's branch-creation step.

`runtime combined`/`runtime split` auto-detect an existing worktree for the issue's branch and operate there without needing an explicit `--target` — they refuse rather than guess if you pass `--target` pointing somewhere else. Auto-detection selects a directory; it does not grant filesystem access. Start the executor with that worktree as a writable workspace root. For an already-running sandboxed session such as Codex, open a new session rooted at the worktree or create it with `--path <writable-dir>` in a location the session is allowed to edit. Remove the worktree once the issue reaches `done`: `agentic-sdlc issue worktree --issue <issue-id> --remove`.

---

## Topology

**Combined (default):** If the issue has no `topology:*` label, assume `topology:combined`. One executor handles implementation. CI handles verification. No role handoff is required.

**Split:** If the issue has `topology:split`, work is divided across roles with visible handoffs. Role labels (`agent-planner`, `agent-builder`, `agent-verifier`, `agent-integrator`) are routing hints. CI verification is still the floor — split topology adds a review layer on top of it, it does not replace it.

The split contract is three visible comment markers, and it is provider-neutral — CI gates read the markers, not the executor:

- `<!-- split-planner-complete -->` — closes the planner's handoff comment on the issue. **The builder must not start until this marker exists.** Entering `in-progress` is not sufficient.
- `<!-- split-verifier-pass -->` / `<!-- split-verifier-blocker -->` — the verifier's verdict, posted on the PR after auditing CI results. A pass must also carry `<!-- split-verifier-sha: <head-sha> -->` naming the exact commit audited — the gates reject unbound or stale attestations, so a new push always requires a fresh audit. `policy-auto-merge` and `policy-verifier-gate` act on these.

Role boundaries: the planner produces the handoff and never implements. The builder implements only what the handoff covers and **ends at `git push`** — it submits work for verification, it does not conduct it. The verifier audits CI checks and evidence and never adds implementation.

Any executor can play a role by following the runbook and posting the markers: Claude Code subagents (`.claude/agents/planner.md`, `builder.md`, `verifier.md`), the scripted CLI (`agentic-sdlc runtime split`), another agent session such as Codex reading this file, or a human. See the repository's split topology runbook for the full mechanics.

---

## Ambiguity Resolution

Never resolve issue ambiguity by inventing features, changing product direction, or choosing a broader implementation than requested. If an issue is ambiguous, choose the narrowest implementation that satisfies the explicit acceptance criteria and architectural constraints.

Do not use ambiguity to broaden a task into a feature, introduce unrelated systems, or modify unrelated areas of the codebase.

If the narrowest interpretation still cannot be implemented safely, stop and request clarification.

---

## Task Size

Each issue is a single PR-sized unit of work. If a task appears too large, ambiguous, or multi-phase, stop and request decomposition instead of expanding scope.

---

## Terminology

If the repository defines a terminology guide, read it before writing any user-facing text, variable names, or comments. Terminology violations are treated as failed acceptance criteria, not style notes.

---

## Autonomous Execution — and Its Limits

When an issue has the execution start label, proceed through implementation without waiting for human approval at each step. This is a default, not a license — it is bounded by the conditions below.

**Stop and request human guidance — do not proceed, do not guess — if any of these are true:**

- The expected branch is missing remotely, or the local checkout cannot switch to it cleanly.
- The issue is ambiguous in a way that would require scope expansion to resolve.
- The task implies an architectural change beyond what the issue contract covers.
- Required CI verification cannot be established (flaky CI, missing environment) — do not substitute local verification.
- A stop signal is present: a label defined as a stop signal in the project adapter, or an issue or PR comment containing `stop`, `hold`, or a redirect instruction.

If a stop signal appears mid-task, pause and report paused state in the visible thread. Do not continue while a stop signal is active.

---

## Final Rule

If a task appears to require architectural change beyond the issue's scope: stop and request human guidance. This is not a judgment call to weigh against momentum — it is a hard stop.
