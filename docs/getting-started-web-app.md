# Getting Started: Web App Overlay

This guide covers the expected path for applying `agentic-sdlc-ops` to a scaffolded web application.

This is an overlay workflow. It does not create the app itself.

## Shared Responsibility

Adopting this kit is a shared-responsibility model.

`agentic-sdlc-ops` is responsible for:

- installing the SDLC overlay
- generating the local execution contract
- enforcing the issue and PR workflow shape
- checking for missing repo-level operating pieces

The user or adopting repository is still responsible for:

- choosing and configuring the remote hosting platform
- setting up CI and required status checks
- connecting preview deployments for user-visible review
- defining and enforcing human QA gates
- maintaining provider credentials, secrets, and cloud access

This distinction matters because a repository can be fully healthy from an overlay perspective while still lacking preview deploys, CI, or hosted human validation.

## Execution Model

For the default `web-app` path, keep these three concepts separate:

- control plane: GitHub
- execution environment: local machine
- topology: `combined`

That means:

- the issue, labels, and PR live on GitHub
- implementation, lint, and build run locally
- there is no dispatcher or remote runner in the default path
- one execution path handles planning, implementation, and verification

## Prerequisites

Before running `agentic-sdlc init --profile web-app`, the target repository should already have:

- a local project directory
- a git repository
- a scaffolded web app
- a `package.json`
- a working lint command
- a working build command

Optional but HIGHLY recommended:

- a GitHub remote already configured
- an initial commit already pushed
- `gh` authenticated for the target GitHub account when you want labels installed automatically

## Example Target

Example scaffold-first flow:

```sh
cd ~[YOURWORKSPACE]/frontier-sdlc
npx create-next-app@latest temp-app
cd temp-app
git init
git add .
git commit -m "Initial scaffold"
gh repo create temp-app --public --source=. --remote=origin --push
```

## Link The CLI Locally

During local development of `agentic-sdlc-ops`, link the CLI once from this repository:

```sh
cd ~[YOURWORKSPACE]/agentic-sdlc-ops
pnpm link --global
```

Then verify the command is visible:

```sh
agentic-sdlc --help
```

This expects `PNPM_HOME` to be on your shell `PATH`.

Check:

```sh
echo $PNPM_HOME
```

Expected example:

```sh
~/Library/pnpm
```

## Apply The Overlay

From the target project directory:

```sh
cd ~[YOURWORKSPACE]/frontier-sdlc/temp-app
agentic-sdlc init
```

The CLI should infer the obvious in a scaffolded Next.js repo:

- `profile: web-app`
- `stack: nextjs-npm`
- standard install mode

Use explicit flags only when you want to override detection.

When a GitHub remote exists and `gh` is authenticated, `init` should also install the standard issue lifecycle and routing labels automatically.

If the repository is not connected to GitHub yet, use:

```sh
agentic-sdlc init --local-only
```

Rerunning `agentic-sdlc init` should also be safe and useful over time:

- weak existing `AGENTS.md` files are strengthened with a managed overlay block
- legacy generated project adapters are upgraded in place
- older custom project adapters keep their local notes and receive an appended managed block when the web-app contract gains new required sections

## Verify The Overlay

Run:

```sh
cd ~[YOURWORKSPACE]/frontier-sdlc/temp-app
agentic-sdlc doctor
```

`doctor` should verify both the local overlay files and the standard GitHub labels when GitHub is connected.

This does not imply GitHub Actions or a GitHub runner is executing the task. By default, GitHub is the control plane and execution remains local.

## Publish The First Issue

Once the overlay is installed, publish a local draft into GitHub with:

```sh
agentic-sdlc issue publish --draft pilot-web-app-flow
```

This should:

- read a draft such as `.agentic/issues/drafts/pilot-web-app-combined.md`
- create the GitHub issue
- ensure the standard label set exists
- apply default initial labels:
  - `ready-for-build`
  - `topology:combined`
  - `agent-builder`
  - `frontend`

If you want to start the issue in a different lifecycle state or add routing labels explicitly, use overrides such as:

```sh
agentic-sdlc issue publish --draft pilot-web-app-split --topology split
agentic-sdlc issue publish --draft add-dummy-page --state in-progress --label full-stack
```

Use `--dry-run` when you want to inspect the resolved title and labels without creating the issue:

```sh
agentic-sdlc issue publish --draft add-dummy-page --dry-run
```

## Validation Modes

The generated adapter should make validation mode explicit.

Typical progression:

- `local-only`
  - local lint and build checks only
  - suitable for bootstrap and early repo bring-up
- `preview-required`
  - preview deployment exists
  - a human validates the change in the hosted preview before merge
- `production-gated`
  - preview validation plus an explicit approval gate before merge or deploy

For user-visible work, `local-only` is a starting point, not the long-term target.

If the repository has no preview deployment yet, `doctor` should warn that human validation is still missing for hosted user-visible review.

That warning is intentional: preview infrastructure and CI are part of the repository's responsibility, not something the overlay can invent automatically.

Playwright should also be treated as part of the baseline web validation contract.

Recommended minimum:

- install `@playwright/test`
- add a browser validation command such as `npm run test:e2e`
- use that command in acceptance criteria for user-visible tasks

If Playwright is not configured, `doctor` should warn even if lint and build pass.

## Pilot Issues And Lifecycle

`init` now generates two pilot drafts so both default topologies can be proven quickly:

- `.agentic/issues/drafts/pilot-web-app-combined.md`
- `.agentic/issues/drafts/pilot-web-app-split.md`

Recommended proving order:

1. publish the combined pilot
2. run the combined runtime preflight
3. run the bounded implementation step
4. run runtime verification publication
5. let the runtime move the issue to `in-review`
6. merge only after the repository's configured validation mode is satisfied
7. run runtime finalization to move the issue to `done` and close it

For the default combined path, the preferred command is now:

```sh
agentic-sdlc runtime combined --issue 12
```

This currently does all of the following:

- validates that the issue is executable
- advances `ready-for-build` to `in-progress` when allowed
- posts a visible preflight plan to the issue
- creates or reuses the local issue branch
- optionally pushes the branch
- creates or updates the draft PR
- with `--implement`, invokes the configured local execution backend for the bounded implementation step
- with `--verify`, runs lint, build, and browser validation, publishes the PR `Verification` section, and advances the issue to `in-review`
- with `--finalize`, detects merged linked PR state, advances the issue to `done`, and closes it

This does not yet:

- mark the PR ready for review
- merge the PR
- ship a hosted dispatcher backend yet

Lifecycle movement should not require manual label editing anymore:

```sh
agentic-sdlc runtime combined --issue 12
agentic-sdlc runtime combined --issue 12 --implement
agentic-sdlc runtime combined --issue 12 --verify
agentic-sdlc runtime combined --issue 12 --finalize
```

This uses the runtime entrypoint for the `in-progress`, `in-review`, and `done` lifecycle handoffs while preserving non-lifecycle labels such as `topology:combined`, `frontend`, or `full-stack`.

Useful runtime flags:

```sh
agentic-sdlc runtime combined --issue 12 --no-sync-pr
agentic-sdlc runtime combined --issue 12 --no-push
agentic-sdlc runtime combined --issue 12 --base release-candidate
agentic-sdlc runtime combined --issue 12 --implement
agentic-sdlc runtime combined --issue 12 --implement --implementation-command "pnpm agentic:implement"
agentic-sdlc runtime combined --issue 12 --verify
agentic-sdlc runtime combined --issue 12 --finalize
```

`--implement` uses the first public execution backend:

- backend: `local-cli`
- default command source: repository script `agentic:implement`
- per-run override: `--implementation-command "<command>"`
- visible outcome: issue comment with implementation result

If neither a repository `agentic:implement` script nor an explicit `--implementation-command` is provided, the runtime blocks rather than guessing how to implement the task.

`--verify` has a stronger contract for `web-app` than plain lint/build:

- it requires browser validation to be configured
- it runs lint, build, and browser validation
- it stops on the first failed command
- it updates the PR `Verification` section with pass/fail lines
- it publishes a blocker comment on the issue when verification fails

If Playwright or an equivalent browser validation command is not configured, `--verify` fails immediately for `web-app`.

PR base branch resolution order is:

1. `--base <branch>` if explicitly passed
2. the current branch's immediate upstream branch, when available
3. the existing PR base branch, if the issue branch already has an open PR
4. the repository default branch from the provider

If validation mode is still `local-only`, treat merge as a local bootstrap proof only. User-visible repositories should add CI, preview deploys, and human QA before relying on auto-merge behavior.

Common next steps:

- Vercel
  - connect the GitHub repo to Vercel
  - require preview review for user-visible PRs
- AWS
  - configure an environment-specific preview or review app path
  - document the human validation step in the adapter

## Expected Output

The CLI should create:

- `AGENTS.md`
- `.agentic/project-adapter.md`
- `.github/ISSUE_TEMPLATE/agentic-task.md`
- `.github/pull_request_template.md`
- `.agentic/issues/drafts/pilot-web-app-combined.md`
- `.agentic/issues/drafts/pilot-web-app-split.md`
- `docs/TASK-CLASSES.md`
- `docs/PLATFORM-ACTORS.md`
- `docs/LABEL-CATALOG.md`
- `docs/GH-CLI-SOP.md`
- `docs/ISSUE-FIRST-WORKFLOW.md`
- `docs/ENVIRONMENT-MANIFEST.md`
- `scripts/validate-issue.js`
- `scripts/validate-pr.js`
- `scripts/validate-commit-message.js`

When GitHub is connected, the CLI should also create or update the standard labels:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`
- `topology:combined`
- `topology:split`
- `agent-builder`
- `frontend`
- `backend`
- `full-stack`
- `config-only`
- `docs-only`
- `hold`
- `needs-human`

Recommended workflow examples may also be installed into `.github/workflows/`.

If `AGENTS.md` already exists but is weak, `init` should append a managed `agentic-sdlc` block instead of replacing the whole file.

If `.agentic/project-adapter.md` already exists, `init` should not blindly clobber it:

- legacy generated adapters should be upgraded in place
- adapters that already satisfy the current contract may be preserved
- older custom adapters missing current sections should receive a managed update block instead of being overwritten

## Typical Results

- `init` should report `ready` when a GitHub remote exists
- `init` should report `ready-local-only` when GitHub wiring is not ready yet
- `init` should print a doctor result automatically after generation
- `doctor` should report `pass`, `warning`, or `local-only` for a healthy install
- `doctor` should report `blocked` or `remediation-required` when setup is incomplete

## Remove The Local Link

If you want to remove the globally linked local CLI later:

```sh
cd ~[YOURWORKSPACE]/agentic-sdlc-ops
pnpm unlink --global agentic-sdlc-ops
```
