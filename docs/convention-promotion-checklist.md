# Convention Promotion Checklist

Use this checklist whenever a team introduces a new execution convention in a product repository.

## Goal

Prevent convention drift by promoting reusable guidance to public docs and capturing decision rationale in internal docs.

## Promotion Rule

A convention should be propagated across three layers:

1. Product repo: implementation details and local operating steps.
2. Public repo (`agentic-sdlc-ops`): reusable standard and operator guidance.
3. Internal repo (`agentic-sdlc-ops-internal`): rationale, tradeoffs, and rollout context.

## Public Standard Checklist (`agentic-sdlc-ops`)

- Add or update a public doc describing the convention as normative guidance.
- Include clear scope boundaries and anti-patterns.
- Include a minimal example teams can copy.
- Link from onboarding docs when broadly applicable.
- Avoid repository-specific paths unless clearly marked as examples.

## Product Adoption Checklist (product repo)

- Add local implementation guidance where operators execute the workflow.
- Include exact paths, labels, and lifecycle expectations.
- Add archive/traceability policy where applicable.
- Keep the local doc aligned with the public standard.

## Internal Rationale Checklist (`agentic-sdlc-ops-internal`)

- Record why the convention was introduced.
- Capture the failure mode it prevents.
- Document tradeoffs and alternatives considered.
- Record rollout sequencing and ownership.

## Verification Before Declaring Complete

- Public doc exists and is linked from onboarding or reference docs.
- Product repo docs reflect local execution behavior.
- Internal rationale note exists with decision context.
- All three artifacts reference the same convention name.

## Suggested Commit Structure

1. Public standard update in `agentic-sdlc-ops`.
2. Internal rationale update in `agentic-sdlc-ops-internal`.
3. Product-repo adoption update in the target repository.

## Optional Lightweight Template

Use this format for each new convention:

- Convention Name
- Problem It Solves
- Scope (where it applies)
- Required Behavior
- Guardrails
- Verification Signals
- Promotion Links (public/internal/product)
