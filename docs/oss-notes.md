# OSS Notes

`agentic-sdlc-ops` is a reusable operating model for plan-first, issue-first, interruptible software delivery with coding agents. It is not a hosted platform, not a deployment framework, and not a stack-specific workflow. Its job is to define the coordination layer that lets different repositories adopt the same execution contract while keeping stack-specific commands, checks, and architecture constraints local.

## Tagline

`A platform-agnostic operating model for plan-first, issue-first software delivery with coding agents.`

## Design Principles

### 1. Control Flow Over Toolchain

Standardize how work is scoped, started, steered, and completed. Keep Vercel, AWS, test commands, deployment commands, and environment-specific rules in local adapters.

### 2. Issue-First Execution

Treat the live GitHub Issue as the task contract and execution control plane. Make lifecycle state explicit through labels and repository automation.

### 3. Plan-First Visibility

Require a visible preflight plan before meaningful implementation begins. Make visibility mandatory without turning approval into a bottleneck.

### 4. Autonomous But Interruptible

Let execution proceed by default once the plan is visible. Allow humans to steer or stop from the issue or PR thread at defined checkpoints.

### 5. Outcome-Based Completion

Do not treat "agent says done" as completion. Require acceptance criteria, verification, and repository-specific evidence to pass.

## Why This Works Across Vercel And AWS

This model applies equally to a Vercel-hosted web app and an AWS infrastructure or data repository because it standardizes the execution contract, not the deployment platform. A UI repo may require browser smoke tests, screenshots, and preview links, while an AWS repo may require synth output, integration logs, and cloud-specific stop conditions. Those checks differ, but the operating model stays the same: the issue defines the task, the agent posts a plan, execution begins through an explicit lifecycle, humans steer from the repository thread, and completion depends on verification rather than agent self-assessment.

## Who This Helps

### Solo Technical Founders

They want autonomous implementation help without losing visibility. This repo gives them a lightweight control plane that keeps plans, execution, and interruption in GitHub instead of scattered across chats and local shell sessions.

### Platform Or Engineering Leads

They need one operating model across multiple repos and stacks. This repo helps them define shared issue and PR lifecycle rules while letting each team keep stack-specific verification and architecture constraints in a local adapter.

### Staff And Principal Engineers

They care about keeping agent execution narrow, auditable, and outcome-based. This repo gives them explicit lifecycle rules, stop-and-ask conditions, and verification gates so agent work does not become unbounded or opaque.

### Infrastructure, DevOps, And Data-Platform Teams

They often get left out of agent workflow examples that assume web apps. This repo matters to them because it supports infra and data repositories through adapter-based verification and cloud-specific guardrails without forcing browser-centric assumptions.

### Product Engineering Teams

They want faster implementation without approval bottlenecks. This repo gives them plan-first visibility and PR-thread steering so humans can intervene when needed without becoming the scheduler for every task.

### Agencies, Consultancies, And Small Studios

They need a repeatable operating model they can reuse across client repos with different stacks. This repo helps them bootstrap a consistent agent workflow without coupling every project to the same hosting platform or CI commands.

### Open Source Maintainers

They care about keeping contributions reviewable and repository-native. This repo can help them define how agent-generated work enters the repo, how plans are surfaced, and what must pass before work is treated as complete.

## Adoption Notes

For a new repository, the expected path is to copy the templates, fill in the local adapter, add lifecycle labels, and validate the flow with one pilot issue.

For an existing repository, the expected path is to keep the current architecture and operational docs, then add this operating model around them through `AGENTS.md`, a local project adapter, and repository automation that maps the lifecycle into the current stack.
