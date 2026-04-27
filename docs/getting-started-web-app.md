# Getting Started: Web App Overlay

This guide covers the expected path for applying `agentic-sdlc-ops` to a scaffolded web application.

This is an overlay workflow. It does not create the app itself.

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

## Verify The Overlay

Run:

```sh
cd ~[YOURWORKSPACE]/frontier-sdlc/temp-app
agentic-sdlc doctor
```

`doctor` should verify both the local overlay files and the standard GitHub labels when GitHub is connected.

This does not imply GitHub Actions or a GitHub runner is executing the task. By default, GitHub is the control plane and execution remains local.

## Expected Output

The CLI should create:

- `AGENTS.md`
- `.agentic/project-adapter.md`
- `.github/ISSUE_TEMPLATE/agentic-task.md`
- `.github/pull_request_template.md`
- `.agentic/issues/drafts/pilot-web-app-flow.md`

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

If `AGENTS.md` already exists but is weak, `init` should append a managed `agentic-sdlc` block instead of replacing the whole file.

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
