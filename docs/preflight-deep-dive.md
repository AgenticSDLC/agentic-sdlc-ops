# Preflight Deep Dive

What happens when you run `agentic-sdlc runtime combined --issue <n>` — and how to read the output.

This is the moment the lifecycle starts executing. The CLI reads your published issue, validates it, and sets up everything needed for implementation.

## Example Output

```
Combined Runtime
----------------
Repository: your-org/your-app
Issue: #2
Title: [TASK] Pilot the combined web-app flow
Lifecycle: in-progress
Preflight Comment: published
Branch: issue-2-pilot-the-combined-web-app-flow
Branch Action: created
Branch Push: published
PR Base: main
PR Sync: created
Implementation: skipped
PR: #3
PR URL: https://github.com/your-org/your-app/pull/3
Verification: skipped
Review Transition: skipped

Next
----
Runtime handoff complete. Implement the bounded change on the issue branch, or rerun with `--implement` to invoke the configured execution backend, then rerun with `--verify` when you want to publish results and advance to `in-review`.
```

## Line By Line

| Output | What It Means |
|--------|---------------|
| **Repository** | The GitHub repo the CLI is operating against. |
| **Issue** | The issue number you passed with `--issue`. |
| **Title** | Confirms which issue was picked up. |
| **Lifecycle: in-progress** | ⛩️ The issue passed the readiness gate and transitioned from `ready-for-build` to `in-progress`. This means: required sections (Requirements, Acceptance Criteria, Target Files) have content, no hold labels are blocking, and a topology label is present. |
| **Preflight Comment: published** | 📋 A structured plan was posted as a comment on the issue. This plan is extracted from your issue body — it makes the approach visible to anyone watching. |
| **Branch** | The issue branch name. Convention: `issue-<number>-<slugified-title>`. |
| **Branch Action: created** | A new branch was created from your base branch. If the branch already existed, this would say `reused`. |
| **Branch Push: published** | The branch was pushed to the remote so GitHub can see it. |
| **PR Base: main** | The target branch the PR will merge into. |
| **PR Sync: created** | 🤖 A draft PR was opened linking the issue branch to the base branch. If a PR already existed, this would say `updated`. |
| **Implementation: skipped** | You didn't pass `--implement`, so no code changes were made. This is expected — preflight sets up the workspace, implementation is a separate step. |
| **PR** | The PR number that was created. |
| **PR URL** | Direct link to the draft PR on GitHub. |
| **Verification: skipped** | You didn't pass `--verify`, so no checks were run. This is expected at this stage. |
| **Review Transition: skipped** | The issue was not moved to `in-review` because verification hasn't happened yet. |

## What Happened On GitHub

After this command completes, go look at your repo. You'll see:

1. **Issue #2** now has the `in-progress` label (previously `ready-for-build`)
2. **Issue #2** has a new comment titled "Preflight Plan" containing your requirements, acceptance criteria, target scope, and verification plan
3. **A new branch** exists: `issue-2-pilot-the-combined-web-app-flow`
4. **Draft PR #3** is open, linked to the issue branch, targeting `main`

All of this is visible to your team. Anyone watching the repo can see what's being worked on, what the plan is, and where the code will land.

## The Preflight Plan Comment

The plan comment posted to your issue looks something like:

```markdown
## Preflight Plan

Issue: #2 [TASK] Pilot the combined web-app flow

### Approach
Implement the narrowest change that satisfies the issue contract without broadening scope.

### Target Scope
- `app/page.tsx` or `src/app/page.tsx`

### Requirements To Satisfy
- add a visible heading to the homepage
- stay within a single page file
- avoid routing, auth, API, or architecture changes

### Acceptance Criteria
- the homepage renders an `<h1>` with the text "Welcome to your-app"
- Playwright can assert the heading is visible
- `npm run build` passes
- task-relevant verification is recorded in the PR

### Verification Plan
- npm run lint
- npm run build
- npx playwright test

### Guardrails
- Do not broaden scope beyond the issue contract.
- Stop if hold/needs-human or architecture-boundary concerns appear.
```

This is the contract for implementation. It's public, traceable, and extracted directly from what you wrote in the issue.

## What "Skipped" Means

Skipped does not mean failed. It means you haven't asked for that step yet. The combined runtime is designed to run in stages:

1. **Preflight** — `runtime combined --issue <n>` (what you just ran)
2. **Implement** — `runtime combined --issue <n> --implement`
3. **Verify** — `runtime combined --issue <n> --verify`
4. **Finalize** — `runtime combined --issue <n> --finalize`

Each step builds on the previous one. You control the pace.

## What If Preflight Fails?

If the readiness gate blocks, you'll see an error instead of `Lifecycle: in-progress`. Common reasons:

- **Missing sections** — your issue body is missing Requirements, Acceptance Criteria, or Target Files
- **Hold label present** — someone added `hold` or `needs-human` to the issue
- **No topology label** — the issue needs `topology:combined` or `topology:split`

Fix the issue on GitHub, then rerun the same command. It's safe to retry.

## What To Do Next

You're now on the issue branch with a draft PR open. Next step is implementation:

```sh
agentic-sdlc runtime combined --issue <issue-number> --implement --implementation-command "<your command>"
```

See [getting-started-web-app.md](getting-started-web-app.md) step 8 for details.
