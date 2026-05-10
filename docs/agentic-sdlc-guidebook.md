# Agentic SDLC Guidebook

Software delivery is entering a new era. Coding agents can now generate code, modify systems, and execute workflows at unprecedented speed. But speed without structure creates operational chaos.

A governed lifecycle is required for safe, understandable, and scalable agent-driven software delivery.

---

## Values

We value:

- **Visibility** over hidden autonomy
- **Governability** over maximum automation
- **Plans** over ad-hoc execution
- **Verification** over code generation
- **Repository ownership** over centralized control
- **Lifecycle clarity** over delivery speed

---

## Principles

1. All execution state, plans, and outcomes must be observable.
2. Humans must be able to steer, interrupt, or override agent execution at any point.
3. The repository is the source of truth for how work is executed and verified.
4. Execution begins from visible, documented intent — not implicit assumptions.
5. Work is complete when repository-defined verification succeeds, not when code is generated.
6. Lifecycle governance precedes automation.

---

## Rationale

### 1. Work Must Be Visible

Hidden autonomous execution increases risk. Visible execution builds confidence. Plans, execution state, validation results, and lifecycle progress should remain observable in public repository context.

### 2. Humans Must Remain In Control

Coding agents accelerate delivery — they do not replace human accountability. Humans must be able to steer execution, interrupt execution, review decisions, redefine constraints, and approve outcomes.

### 3. Repositories Own Their Rules

Every repository has different architecture, commands, validation requirements, workflows, and release expectations. The operating model adapts to the repository, not the other way around.

### 4. Plans Precede Execution

Agent-driven work should start with documented goals, defined scope, lifecycle expectations, validation requirements, and explicit tasks. Planning reduces ambiguity and improves trust.

### 5. Verification Is Part Of Delivery

Validation should be explicit, repeatable, and observable. Generated code that has not passed repository-defined checks is not complete work.

### 6. Lifecycle Before Automation

Faster execution without lifecycle governance creates disorder. The goal is reliable, understandable, and governable delivery — not maximum throughput.

---

## Scope

This guidebook addresses the governance of agent-driven software delivery. It does not prescribe tooling, hosting, deployment infrastructure, or delivery platforms.

---

## The Goal

Humans and coding agents working together safely, predictably, and at scale.

---

Any tool, framework, or operational system may implement these principles in its own way.
