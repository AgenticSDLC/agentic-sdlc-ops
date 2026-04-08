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

## Usage Pattern

1. Copy the relevant templates into a target repository.
2. Create a local project adapter from `templates/project-adapter.md`.
3. Add the labels and automation hooks that repository needs.
4. Keep repo-specific commands and constraints in the local adapter, not in the core standard.
5. Validate the lifecycle with one pilot issue before expanding use.

## Reference Examples

`examples/` contains concrete adapters that show how the workflow can be applied to different repository types without changing the core standard.
