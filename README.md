# Agentic SDLC Ops

`agentic-sdlc-ops` is a lifecycle and workflow kit, governing issue-first agent-driven software delivery.

The lifecycle and guardrails work at the coding agent level. Bring your own CI stacks, hosting setups, and deployment architectures.

## Why This Exists

Coding agents can ship changes quickly. Without lifecycle rules, visibility, governability, plans, repository control, and verification, that speed creates drift and risks.

This project gives teams a coding agent lifecycle model where:

- work starts from visible intent
- humans have observability and can steer or stop execution at any point
- repositories keep control of their own validation rules
- code is not considered complete until repository-defined checks pass

## Values And Principles

`agentic-sdlc-ops` is guided by six values from the Agentic SDLC Guidebook:

- visibility over hidden autonomy
- maintainable governance over maximum automation
- plans over ad-hoc execution
- verification over code generation
- repository ownership over centralized control
- lifecycle adherence over delivery speed

In practice, that means:

- execution state, plans, and outcomes are observable
- humans can interrupt or override execution through issue and PR context
- repository-local adapters define commands, checks, and constraints
- lifecycle governance comes before deeper automation

## Who This Is For

This repository is for teams that want:

- a repository control plane with GitHub as the first supported provider
- a stable issue and PR contract for implementation
- explicit lifecycle gates for readiness, build, review, and done
- an adapter-based model that works across different stack types

## What This Repository Contains

Core layers:

- `standards/`: stack-agnostic lifecycle rules and contracts
- `profiles/`: profile-specific installer defaults and bounded choices
- `templates/`: reusable issue, PR, adapter, workflow, validator, and operating scaffolds
- `examples/`: concrete adapter references for real repository shapes

Supporting material:

- `adoption/`: rollout and migration guidance
- `docs/`: vision, principles, and boundary docs
- `.github/workflows/examples/`: non-production workflow examples
- `public/`: launch-facing narrative material

## Shared Responsibility Model

`agentic-sdlc-ops` provides the coding agent lifecycle scaffolding, guardrails, and bootstrap flow. It works in concert with your CI, deployment system, and repository-specific rules. It defines a clear contract and standard for how those pieces fit together.

This kit is responsible for:

- issue-first lifecycle standards
- adapter and contract scaffolding
- profile-aware initialization
- lifecycle label installation and checks
- doctor-style repository diagnostics

Bring your own:

- CI and required checks
- runtime infrastructure and deployment wiring
- secrets and cloud/provider setup
- human QA and approval policy

If those repository-owned parts are missing, the CLI should report gaps clearly instead of masking them.

## Usage Pattern

1. Initialize the lifecycle scaffolding in a target repository.
2. Generate or update the local project adapter.
3. Confirm labels and lifecycle checks.
4. Publish a pilot issue and run one end-to-end lifecycle.
5. Expand adoption once verification and handoff are reliable.

## CLI Status (Current)

> **Note:** The CLI must be installed (or run via `npx` or `pnpm`) before using the commands below. See [docs/getting-started-web-app.md](docs/getting-started-web-app.md) for setup instructions.

Current profile support is focused on `web-app`.

You can run the CLI commands using any of these methods:

- `npx agentic-sdlc ...`
- `pnpm agentic-sdlc ...` (if installed as a dependency)
- `node cli/index.js ...` (from a local clone)

Examples:

```sh
npx agentic-sdlc init
npx agentic-sdlc doctor
npx agentic-sdlc issue publish --draft pilot-web-app-combined
npx agentic-sdlc runtime combined --issue 12
```

Or, if running from a local clone:

```sh
node cli/index.js init
node cli/index.js doctor
node cli/index.js issue publish --draft pilot-web-app-combined
node cli/index.js runtime combined --issue 12
```

Current capabilities include:

- profile-aware prerequisite evaluation and stack detection
- idempotent overlay installation from repository templates
- managed overlay updates for existing `AGENTS.md` and project adapter files
- pilot issue draft generation (combined and split topologies)
- draft publishing to GitHub with standard lifecycle labels
- lifecycle transitions through `ready-for-build`, `in-progress`, `in-review`, and `done`
- combined-path runtime preflight for `web-app` + GitHub, including visible plan publication, issue-branch create/reuse, and draft PR create/update
- post-install doctor checks plus standalone `doctor`
- portable reference templates for task classes, platform actors, label catalogs, CLI SOPs, issue-first workflow docs, and environment manifests
- reference validator scripts and GitHub workflow examples derived from proving-ground patterns

Current scope includes:

- `init --profile web-app`
- `doctor --profile web-app`
- `runtime combined --profile web-app`
- local prerequisite checks
- local-only fallback when GitHub wiring is not ready

## Start Here

- Understand the lifecycle:[public/LIFECYCLE.md](public/LIFECYCLE.md)
- Setup flow: [docs/getting-started-web-app.md](docs/getting-started-web-app.md)
- Product direction: [docs/vision.md](docs/vision.md)
- Design intent: [docs/design-principles.md](docs/design-principles.md)
