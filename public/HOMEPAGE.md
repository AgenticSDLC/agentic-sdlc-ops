# Governance for Agentic Delivery

## The Problem

Coding agents are shipping faster than ever. Teams that adopt them see 2–3x productivity increases in some tasks. But speed without governance becomes chaos: PRs merge without verification, conflicting changes land in parallel, and nobody knows if the build is actually ready.

The issue is not a lack of code generation. **The issue is that repositories still need a clear operating contract for how work is scoped, started, steered, verified, and completed.**

Without that contract:

- Agent speed increases output volume but not delivery confidence
- Teams end up retrofitting approval gates, verification hooks, and rollback procedures after failures
- Maintainers lose visibility into what agents are doing and why
- CTOs cannot enforce standards across repositories

## The Solution

**Agentic SDLC Ops** is a reusable, portable execution layer for agent-driven software delivery. It's not a platform. It's not another tool to migrate to. It's a **governance contract** that works inside the tools and repositories you already own.

You adopt it by:

1. Running `agentic-sdlc init` in a repository
2. Answering a few questions about your stack and deployment model
3. Getting a set of templates, labels, and guardrails that enforce your execution rules
4. Running `agentic-sdlc doctor` to verify your repository stays in compliance

The kit gives you:

- **Stable issue-first execution contract**: When can an issue move to in-progress? What must a PR include before merge? When is preview deployment required?
- **Explicit start conditions**: Agents don't execute until an issue passes a preflight checklist. Humans can interrupt or redirect work at defined checkpoints.
- **Visible preflight planning**: Plans appear as GitHub issue comments before implementation begins. Humans can ask questions or block work without stopping the scheduler.
- **Issue-to-branch-to-review runtime handoff**: The current `web-app` + GitHub slice can advance executable work into a branch and draft PR, publish verification, and finalize merged work without collapsing governance into hidden automation.
- **Repository-local verification**: Each repo defines its own lint, build, browser validation, and QA gates. No central mandate. No one-size-fits-all.
- **Compliance audits without overhead**: Run `doctor` to see exactly what's missing, incomplete, or drifting from your standard.

## Why This Works

Existing platforms try to own the entire delivery stack: CI, deployment, approval gates, runners, observability. That forces you into a tool migration, adds operational overhead, and locks you into their choices.

Agentic SDLC Ops takes the opposite approach: **it standardizes control flow, not toolchains.**

- Your GitHub, Jira, or Linear stays your source of truth
- Your CI, deployment, and architecture rules stay yours
- Your team's local practices and constraints stay embedded in your repository adapter
- The standard is just the contract: what must be visible, when execution can begin, how humans can intervene

Today, that means the product can already handle the visible handoff from issue to branch, draft PR, verification publication, and lifecycle closure for the first `web-app` + GitHub slice, while still leaving execution substrate choices open.

This means:

- **Adoption in minutes**: New or existing repository. No migration.
- **Portable**: Works with Vercel, AWS, self-hosted, or hybrid deployments.
- **Understandable to humans and agents**: The contract lives in Markdown. Agents read it naturally.
- **Safe to share**: Open-source standard means every team can inspect and trust it.

## Who This Is For

### Solo Founders

You want autonomous agent execution, but you can't afford to lose control. Agentic SDLC Ops lets you define clear start conditions, verification rules, and stop signals so agents work within your guardrails.

### Repo Maintainers

You're managing an existing repository and don't want to throw away your current docs, CI, or architecture guidance. The kit retrofits cleanly into your existing setup without forcing a rewrite.

### Engineering Leads

You need one execution model across multiple repositories without forcing every team into the same stack. Agentic SDLC Ops stays portable because it standardizes governance, not infrastructure.

### CTOs and Engineering Directors

You need accountability, observability, and enforceable guardrails for agent-driven delivery at scale. The kit's compliance layer (`doctor`) makes it easy to audit drift and enforce standards across your organization.

## What's Included

- **Portable standard** ([standards/](../../standards/)) – Stack-agnostic execution rules
- **Profile system** ([profiles/](../../profiles/)) – Sensible defaults for web apps, APIs, data platforms, and infrastructure
- **Templates** ([templates/](../../templates/)) – Issue, PR, and agent instruction templates you can reuse
- **Bootstrap CLI** – `agentic-sdlc init` and `agentic-sdlc doctor` commands for quick adoption
- **Reference adapters** ([examples/](../../examples/)) – Real repository examples showing how to apply the standard
- **Adoption guidance** ([adoption/](../../adoption/)) – Step-by-step onboarding for new and existing repositories

## Next Steps

**Try it now:**

```sh
npm install -g agentic-sdlc-ops
agentic-sdlc init --profile web-app
agentic-sdlc doctor
```

**Read the vision:** [docs/vision.md](../docs/vision.md)

**Join the conversation:** GitHub Discussions (link here)

---

The vision is simple: **Make agentic delivery governable without forcing teams into platform lock-in.**

When the contract is clear, execution becomes visible. When execution is visible, humans can steer. When humans can steer, agents become trustworthy.
