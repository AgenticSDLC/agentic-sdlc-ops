# Getting Started: Web App

The shortest path from a fresh web app repo to a merged PR — driven entirely by a GitHub issue spec.

## Prerequisites

- Node.js 18+
- GitHub CLI (`gh`) authenticated
- An OpenAI or Anthropic API key
- A Next.js (or React Vite / Remix) repo with a GitHub remote

## Setup

### 1. Export your agent API key

The runtime uses an LLM to implement code. Export one or both:

```sh
export OPENAI_API_KEY=<your-key>
export ANTHROPIC_API_KEY=<your-key>
```

If both are set, `init` will ask you to choose. If one is set, it auto-selects.

### 2. Install the CLI

```sh
npx agentic-sdlc --help
```

Or install globally:

```sh
npm install -g agentic-sdlc
```

### 3. Create or open a web app repo

If starting fresh:

```sh
npx create-next-app@latest my-app
cd my-app
gh repo create my-app --public --source=. --remote=origin --push
```

If using an existing repo, just `cd` into it. It needs `lint` and `build` scripts in `package.json`.

### 4. Initialize the overlay

```sh
agentic-sdlc init --yes
```

This installs the lifecycle scaffolding:
- Agent contracts and project adapter (markdown)
- Issue and PR templates
- Lifecycle labels on GitHub
- Playwright for browser validation
- Starter e2e test

Commit and push:

```sh
git add -A && git commit -m "docs: apply agentic-sdlc overlay" && git push
```

### 5. Run doctor (optional)

```sh
agentic-sdlc doctor
```

Confirms overlay health and agent API key availability. Warnings are not blockers.

## Run It

### 6. Publish a spec

```sh
agentic-sdlc issue publish --spec pilot-web-app-combined
```

This creates a GitHub issue from the starter spec with lifecycle labels applied. Note the issue number in the output.

### 7. Run the runtime

```sh
agentic-sdlc runtime combined --issue <issue-number>
```

One command. Walk away. Come back to a merged PR and closed issue.

What happens:

1. ⛩️ **ready-for-build** — validates the issue spec, transitions to in-progress
2. 🤖 **in-progress** — creates branch, invokes the agent, implements the code, pushes
3. 🧪 **in-review** — runs lint + build + Playwright, creates PR, merges
4. 🏁 **done** — closes the issue

If any step fails, the runtime stops, posts the reason on the issue, and tells you what to fix. Rerun the same command after fixing.

### That's it.

Two commands: `issue publish` and `runtime combined`. Spec to merged PR.

## Auto-Merge Behavior

By default, the runtime auto-merges the PR after verification passes. To require manual review instead, add the `merge:human-required` label to the issue before running the runtime.

## Recovery

If the runtime fails partway through:

- **Rerun the same command** — it detects completed phases and resumes where it left off
- **Verification failed** — fix the code on the branch, then: `agentic-sdlc runtime combined --issue <n> --verify`
- **Finalize blocked** — merge the PR manually, then: `agentic-sdlc runtime combined --issue <n> --finalize`

## Writing Your Own Specs

Create a markdown file in `.agentic/issues/drafts/` with this structure:

```markdown
# [TASK] Your task title

## Context
Why this change is needed.

## Requirements
- what to do
- constraints

## Acceptance Criteria
- observable outcomes
- what tests should verify

## Target Files
- `path/to/file.tsx`
- `tests/relevant.spec.ts`
```

Then publish and run:

```sh
agentic-sdlc issue publish --spec your-spec-name
agentic-sdlc runtime combined --issue <n>
```

## What The Overlay Installs

The overlay is almost entirely markdown. No build plugins, no runtime dependencies.

| What | Type |
|------|------|
| `AGENTS.md` | Agent execution contract |
| `.agentic/project-adapter.md` | Repository config |
| `.agentic/issues/drafts/*.md` | Starter specs |
| `.github/ISSUE_TEMPLATE/` | Issue template |
| `.github/pull_request_template.md` | PR template |
| `docs/*.md` | Reference docs |
| `scripts/validate-*.js` | CI validators (ESM) |
| `playwright.config.ts` | Browser validation config |
| `tests/homepage.spec.ts` | Starter e2e test |

To remove: `git revert <commit>` — one commit undoes everything.

## Where To Read More

- [Preflight deep dive](preflight-deep-dive.md) — detailed runtime output walkthrough
- [Lifecycle](../public/LIFECYCLE.md) — flow and terminology
- [Design principles](design-principles.md) — architectural intent
- [Guidebook](https://agenticsdlc.github.io/agentic-sdlc-ops/) — values and principles
