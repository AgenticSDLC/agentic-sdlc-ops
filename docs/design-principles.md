# Design Principles

## Separate Policy From Tooling

The portable standard should define execution policy, not repository tooling. Commands, CI details, and hosting assumptions belong in local adapters.

## Keep The Control Plane In GitHub

Issues, labels, and PR state should remain the visible operational control plane for implementation work.

## Prefer Visibility Over Approval Gating

Require visible plans and status, but do not require human approval for every execution step by default. Autonomy should be the default; interruption should be available when needed.

## Make Execution Interruptible

A modern agentic workflow should support human hand-brakes without turning the human into the scheduler. Comments, labels, and PR feedback should be able to stop or redirect work at defined checkpoints.

## Prefer PR-Centric Steering Once Execution Is Visible

Once a branch and PR exist, steering should happen in the same public execution surface where implementation, verification, and review already live. That keeps intervention visible without reintroducing approval bottlenecks.

## Prefer Narrow Contracts

A small stable contract is easier to reuse than a comprehensive but opinionated system. Keep the core standard narrow and push local detail into adapters.

## Optimize For Human And Agent Readability

The workflow should be easy to follow for both engineers and coding agents. Put critical execution rules in a few predictable documents.

## Make Deviations Explicit

If a repository needs exceptions, document them in its adapter instead of letting them emerge as undocumented local habits.

## Start Documentation-First

Before centralizing automation or runner infrastructure, make the behavioral model reusable and understandable across multiple repository types.
