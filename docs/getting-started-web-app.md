# Getting Started: Web App Overlay

Use this page for the shortest path from a fresh web app repo to the first issue-driven PR.

Scope: this guide is for combined topology, specifically - one agentic runtime path for planning, building, and verification.

NOTE: For split topology, with "independent" agents (planner/builder/verifier), use the dedicated split guide instead of this combined topology page.

For detailed lifecycle and architecture explanation, see [public/LIFECYCLE.md](../public/LIFECYCLE.md).

## 🚀 Quickstart: Combined Topology - Issue To PR Merge Lifecycle Automation 🤖

This document uses GitHub as the target repo. GitLab will be supported in the future. If the target repository does not have a GitHub origin remote and `gh` access, stop here and wire GitHub first.

1. Set up your agent API key.

The runtime uses an LLM to implement code changes. Export your API key before proceeding:

```sh
export OPENAI_API_KEY=<your-key>
```

This is the only credential the runtime needs beyond GitHub CLI access.

2. Create or open a scaffolded web app repo with GitHub remote.

```sh
cd ~[YOURWORKSPACE]/yourFolder
npx create-next-app@latest your-app-name
cd your-app-name
gh repo create your-app-name --public --source=. --remote=origin --push
```

`create-next-app` automatically initializes git and commits the scaffold. No manual `git init` or `git add` needed.

3. Link the CLI locally (one time).

```sh
cd ~[YOURWORKSPACE]/agentic-sdlc-ops
pnpm link --global
agentic-sdlc --help
```

4. Initialize the overlay in the target repo.

```sh
cd ~[YOURWORKSPACE]/yourFolder/your-app-name
agentic-sdlc init
```

`init` will detect your API key and confirm the agent backend. It also offers to install Playwright for browser validation.

5. Run doctor.

```sh
agentic-sdlc doctor
```

Doctor checks overlay health, confirms your agent API key is available, and reports any warnings. Warnings are not blockers — continue to the next step.

6. Preview Github Issue -> publish --dry-run.

```sh
agentic-sdlc issue publish --spec pilot-web-app-combined --dry-run
```

- explicit path also works -> .agentic/issues/drafts:

```sh
agentic-sdlc issue publish --spec .agentic/issues/drafts/pilot-web-app-combined.md --dry-run
```

7. Publish the issue (live - no dry-run).

```sh
agentic-sdlc issue publish --spec pilot-web-app-combined
```

NOTE: You'll get an issue number in the output. This is important for the next step. If you miss it, you can find the issue in your GitHub Issues list for the repository, or run:

```sh
agentic-sdlc issue list
```

to see recent issues (if your CLI version supports it).

8. 🚀 Run the runtime.

```sh
agentic-sdlc runtime combined --issue <issue-number>
```

This is the "run it and forget it" step. One command does everything:

- ⛩️ validates the issue is ready (required sections filled in, no hold labels, topology label present)
- transitions the issue from `ready-for-build` to `in-progress`
- publishes a visible plan as a comment on the issue
- creates the issue branch and opens a draft PR
- 🤖 invokes the configured agent backend to implement the code changes
- runs lint, build, and browser validation
- advances the issue to `in-review`

When it finishes, you'll have a PR with code changes, passing verification, and the issue in `in-review`.

🚏 If any step fails, the runtime stops, publishes the reason on the issue, and tells you what to fix. Rerun the same command after fixing.

For a detailed walkthrough of the output, see [preflight-deep-dive.md](preflight-deep-dive.md).

9. Merge and finalize.

After reviewing the PR and merging it on GitHub:

```sh
agentic-sdlc runtime combined --issue <issue-number> --finalize
```

This advances the issue to `done` and closes it. The lifecycle is complete.

## Recovery

If the runtime fails partway through:

- **Implementation failed** — fix the issue contract or agent config, rerun step 8
- **Verification failed** — fix the code on the branch, then: `agentic-sdlc runtime combined --issue <issue-number> --verify`
- **Finalize blocked** — merge the PR first, then rerun with `--finalize`

## Validation Mode: Keep It Simple

Validation mode controls what proof is required before merge.

| Mode               | What It Checks                                                          | When To Use It                                           | Merge Expectation                            |
| ------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| `local-only`       | local lint, local build, browser validation command (for web-app)       | initial bootstrap, early repo bring-up                   | local proof only                             |
| `preview-required` | everything in `local-only` plus hosted preview validation by a human    | team can deploy preview environments per PR              | preview must be validated before merge       |
| `production-gated` | everything in `preview-required` plus explicit production approval gate | mature repos with release controls and change management | merge/deploy requires approval gate evidence |

Example mindset for `preview-required`:

- PR opens and your platform posts a preview URL (for example, Vercel preview deployment).
- A human reviewer opens the preview URL and checks the acceptance criteria in a real browser.
- Reviewer records that validation in the PR (comment/checklist/approval based on team policy).
- Only then is the PR treated as merge-ready.

Recommended default for a new repo: start at `local-only`, then move to `preview-required` as soon as preview deployments and human QA are reliable.

Where this is configured: `.agentic/project-adapter.md`.

## Where To Read More

- Lifecycle flow and terminology: [public/LIFECYCLE.md](../public/LIFECYCLE.md)
- Product direction: [docs/vision.md](vision.md)
- Design intent: [docs/design-principles.md](design-principles.md)
- Workflow mapping reference: [adoption/workflow-mapping.md](../adoption/workflow-mapping.md)
- Runtime output explained: [preflight-deep-dive.md](preflight-deep-dive.md)

## Remove Global Link (Optional)

```sh
cd ~[YOURWORKSPACE]/agentic-sdlc-ops
pnpm unlink --global agentic-sdlc-ops
```
