# Vision

`agentic-sdlc-ops` exists to make software delivery governable in the age of coding agents.

The problem is not a lack of code generation. The problem is that repositories still need a clear operating contract for how work is scoped, started, steered, verified, and completed. Without that contract, agent speed increases output volume but not delivery confidence.

This repository aims to provide that contract in a form teams can adopt quickly across new and existing repositories. The goal is not to replace repository-specific architecture, CI, hosting, or deployment choices. The goal is to give maintainers and leaders a reusable execution model that makes agent work visible, accountable, interruptible, and auditable.

## What This Becomes

The long-term vision is a lightweight operating layer for agentic software delivery.

In practice, that means a repository can adopt `agentic-sdlc-ops` and gain:

- a stable issue-first execution contract
- explicit start conditions for implementation
- visible preflight planning
- human stop and steering signals
- repository-local verification requirements
- conformance checks through `doctor`

Over time, the product should make it possible to take a new or existing repository from unstructured delivery to governed execution in minutes, not weeks.

## Product Thesis

Teams do not primarily need another coding agent. They need a way to operationalize agent work safely inside real repositories.

`agentic-sdlc-ops` is that operational layer. It should help teams answer:

- when execution may begin
- where plans must be visible
- how humans can interrupt or redirect work
- what evidence is required before work is considered complete
- where repository-specific rules belong

The product succeeds when it creates clarity without centralizing every local tool decision.

## Product Shape

The core product remains narrow.

- `init` should make adoption fast and guided
- `doctor` should make readiness and drift visible
- the local project adapter should remain the repository-specific execution authority

This keeps the standard portable across stacks while letting each repository preserve its own commands, architecture constraints, deployment model, and operational details.

## Boundaries

`agentic-sdlc-ops` is not a monolithic delivery platform.

It should not try to become:

- a universal CI system
- a universal deployment platform
- a replacement for repository-specific architecture documentation
- a replacement for provider-native infrastructure tooling
- a hidden control plane that obscures how work is actually happening

The core promise is workflow governance, not infrastructure ownership.

## Optional Extension: Environment Wiring as Code

For `web-app` repositories, there is a compelling adjacent problem: configuration drift across providers.

Modern web applications often depend on multiple external systems that must be wired together correctly across environments. Hosting, data, payments, preview infrastructure, and agent execution systems may all need to know about each other. When those relationships are misconfigured, the repository is not meaningfully ready no matter how good the issue workflow is.

That creates room for an optional extension: Environment Wiring as Code.

Environment Wiring as Code is a contract-driven way to declare and coordinate the external environment relationships required by a modern application. It is not deployment orchestration, not infrastructure ownership, and not a replacement for provider-native tooling. It is an explicit wiring contract that helps a repository converge on a correctly connected preview-ready system.

If pursued, this should remain:

- optional
- `web-app` only at first
- separate from the project adapter
- compatible with provider-authoritative systems such as Stripe Projects

The core product remains workflow governance as code. Environment Wiring as Code is a possible extension layer for repositories that need cross-provider environment coordination.

## Who This Helps

- solo founders who want autonomous execution without losing control
- maintainers who need to retrofit an existing repository safely
- engineering leads who need visible standards across repositories
- CTOs who need accountability, observability, and enforceable guardrails for agent-driven delivery

## Success Condition

The vision is achieved when `agentic-sdlc-ops` can be adopted quickly, understood easily by both humans and agents, and trusted to bring order to real repository execution without forcing every team into the same stack or platform choices.
