# Agentic SDLC Ops

`agentic-sdlc-ops` is a standalone workflow kit for issue-first software delivery.

It exists to make a reusable issue-first operating model available across current and future repositories without forcing those repositories to inherit project-specific tooling, CI commands, hosting assumptions, or deployment architecture.

## Who This Is For

This repository is for teams and agents that want:

- GitHub Issues to be the execution control plane
- a stable issue and PR contract for implementation work
- explicit rules for when execution may begin
- outcome-based verification before work is considered complete
- a lightweight way to adapt the model to different stacks

## Repository Model

This kit is intentionally split into three layers:

- `standards/`
  - stack-agnostic rules that should remain stable across repositories
- `profiles/`
  - bounded installer defaults and selection lists for supported repository types
- `templates/`
  - reusable starting points for issues, PRs, agent rules, and per-repo adapters
- `examples/`
  - concrete adapters showing how the standard maps onto real repositories

Supporting guidance lives in:

- `adoption/`
  - how to bring the kit into a target repository
- `docs/`
  - design principles and explicit non-goals
- `.github/workflows/examples/`
  - non-production example workflow scaffolds for repositories that want automation

## Design Intent

This repository is documentation-first.

It does not try to centralize execution infrastructure in phase 1. Instead, it defines a portable operating model that each repository can adopt by copying the shared baseline and filling in a small local adapter.

The standard assumes modern execution should be:

- plan-first
- visible
- autonomous by default
- interruptible by human feedback when needed

In practical terms, that means:

- an agent posts a visible preflight plan
- implementation proceeds automatically unless a hold signal exists
- humans can steer or stop work from the issue or PR thread
- review happens in public repository context instead of private side channels

## Shared Responsibility

`agentic-sdlc-ops` provides the operating overlay, not the full delivery platform.

The kit is responsible for:

- issue-first execution rules
- profile defaults
- local adapter generation
- issue and PR contract scaffolding
- lifecycle label installation and verification
- doctor-style repository checks

The adopting repository remains responsible for:

- remote hosting and deployment environment setup
- CI configuration and required checks
- preview deployment infrastructure
- human QA and approval gates
- secrets, cloud accounts, and provider-specific delivery wiring

If those repository-owned parts are missing, `agentic-sdlc` should warn clearly, but it should not pretend they are already solved.

## Usage Pattern

1. Copy the relevant templates into a target repository.
2. Create a local project adapter from `templates/project-adapter.md`.
3. Add the labels and automation hooks that repository needs.
4. Keep repo-specific commands and constraints in the local adapter, not in the core standard.
5. Validate the lifecycle with one pilot issue before expanding use.

## CLI

A first CLI foundation now exists for the `web-app` profile:

```sh
node cli/index.js init
node cli/index.js doctor
```

Current behavior:

- evaluates `web-app` prerequisites before normal install questions
- detects stack shape from a scaffolded web app
- installs the core overlay files idempotently from repo-backed templates
- appends a managed overlay block to a weak existing `AGENTS.md` instead of silently skipping guardrails
- generates a pilot issue draft for first-run validation
- runs a post-install doctor pass automatically and also supports standalone `doctor`

Current scope:

- `init --profile web-app`
- `doctor --profile web-app`
- local prerequisite evaluation
- local-only fallback when GitHub wiring is not ready

For the scaffold-first installation flow, see [docs/getting-started-web-app.md](/Users/kingofcode/myDev/websites/agentic-sdlc-ops/docs/getting-started-web-app.md:1).

## Reference Examples

`examples/` contains concrete adapters that show how the workflow can be applied to different repository types without changing the core standard.
