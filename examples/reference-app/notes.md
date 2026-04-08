# Reference App Mapping Notes

This example documents how a concrete application repository can consume the reusable standard.

## What Maps To The Core Standard

- GitHub Issue is the execution source of truth
- executable work is gated by lifecycle state
- issues must be narrowly scoped and PR-sized
- PRs should mirror acceptance criteria and verification
- completion depends on verification outcomes, not agent self-assessment

## What Stays Local To The Repository

- `pnpm` command requirements
- Playwright smoke requirements
- evidence artifact expectations for UI work
- branch naming implementation details
- GitHub CLI auth wrapper guidance
- references to repository-specific docs and workflows

## Why This Matters

This example is intentionally concrete, but it should not define the portable baseline for repositories that use different stacks, CI systems, or verification models.
