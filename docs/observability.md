# Observability Metrics

This document defines what to measure for an agentic SDLC operating model.

It intentionally focuses on metric definitions only.
No implementation details, storage choices, dashboards, or alerting mechanics are specified here.

## Purpose

Observability for agentic SDLC should answer five questions:

1. Are we delivering changes quickly?
2. Is delivery stable and recoverable when failures happen?
3. Is the agent workflow efficient, or mostly waiting and retrying?
4. Are external dependencies (runners, model providers, quotas) healthy?
5. Is automation cost aligned with delivery value?

This metric set should be segmented at minimum by:

- profile (`web-app`, `aws-serverless`, `aws-data-platform`)
- topology mode (`combined`, `split`, `specialized`)
- runner mode (GitHub-hosted, self-hosted, local-only)

## DORA Metrics

These are the baseline engineering metrics.

### 1) Deployment Frequency

How often production changes are successfully deployed.

Interpretation:
- Higher is usually better for flow and small-batch delivery.
- Track as count per day/week and trend.

### 2) Lead Time for Changes

Time from code commit (or PR open, by local policy) to successful production deployment.

Interpretation:
- Lower is usually better.
- Use median and percentile views, not only averages.

### 3) Change Failure Rate

Percent of production deployments that cause an incident, rollback, hotfix, or failed verification requiring corrective deployment.

Interpretation:
- Lower is better.
- Requires a clear local definition of what counts as a failure event.

### 4) Time to Restore Service (MTTR)

Time from incident start to service restoration.

Interpretation:
- Lower is better.
- Track median and high-percentile recovery time.

## Agentic SDLC Flow Metrics

These metrics reflect issue-first, split-role execution behavior.

### 5) Task Throughput

Count of tasks completed (for example, moved to done) per day/week.

### 6) Planner-to-Builder Handoff Latency

Time from planner completion signal to builder start signal.

### 7) Builder Cycle Time

Time from builder accepted/running to builder complete/failed.

### 8) Verifier Cycle Time

Time from verifier accepted/running to verifier pass/fail.

### 9) End-to-End Task Lead Time

Time from task entering in-progress to task completion/merge.

### 10) Queue Wait Time

Time spent waiting before execution starts (queued state).

Interpretation for 6-10:
- Higher values indicate orchestration or capacity bottlenecks.
- Compare by task class/size to avoid misleading conclusions.

## Adoption And Productization Metrics

These metrics align with the product north star and CLI product shape.

### 11) Time To First Golden-Path PR

Time from `agentic-sdlc init` start to first valid golden-path pull request for the selected profile.

Interpretation:
- Lower is better.
- Primary north-star metric; should be tracked separately per profile.

### 12) First-Run Success Rate

Percent of repositories that reach a valid first golden-path PR without manual repair of installed artifacts.

### 13) Doctor Pass Rate

Percent of repositories that pass `agentic-sdlc doctor` without remediation after installation.

### 14) Mean Remediation Count To Doctor Pass

Average number of remediation actions required before `doctor` reaches pass state.

Interpretation:
- Lower indicates a more coherent installer overlay and stronger defaults.

## Quality And Rework Metrics

These show first-pass quality and avoidable loops.

### 15) First-Pass Verifier Rate

Percent of tasks that pass verifier on first attempt.

### 16) Builder Rework Rate

Percent of tasks that require at least one explicit builder rework cycle.

### 17) Verification Retry Rate

Percent of tasks that require verifier reruns after initial failure.

### 18) Human Intervention Rate

Percent of tasks requiring manual steering to unblock or redirect execution.

Interpretation:
- Lower rework/retry/intervention generally means better prompt quality, task scoping, and automation reliability.

## Reliability And Runtime Health Metrics

These detect silent failure modes and operational fragility.

### 19) Job Success Rate

Percent of dispatched jobs that reach a successful terminal state.

### 20) Job Timeout Rate

Percent of jobs ending due to runtime or API timeout.

### 21) Abnormal Termination Rate

Percent of jobs terminated by restart, signal, crash, or forced watchdog exit.

### 22) Zombie Lock Incidence

Count/rate of stale active locks that block redispatch until manual cleanup or timeout expiry.

### 23) Heartbeat Gap Incidents

### 24) Loop Incidents

Count/rate of repeated execution loops for the same task or role without forward progress.

### 25) Cancellation Responsiveness

Time from cancellation/hold signal to confirmed terminal job state.

Count/rate of jobs where heartbeat exceeded allowed interval before terminal status.

Interpretation:
- Rising 20-25 indicates control-plane resilience issues, not necessarily code-quality issues.

## External Dependency Metrics

These expose third-party bottlenecks and hidden limits.

### 26) Runner Availability

Percent of time at least one eligible runner is available.

### 27) Runner Queue Saturation

Percent of time queued jobs exist while runner capacity is exhausted.

### 28) Runner Minute Consumption (Hosted)

Usage vs quota for hosted CI minutes over billing period.

### 29) Model API Success Rate

Percent of model requests returning successful responses.

### 30) Model API Latency

Request latency distribution for model calls (median and percentiles).

### 31) Model API Quota/Credit Exhaustion Events

Count of explicit provider-side quota or credit exhaustion events.

Interpretation:
- 26-28 isolate CI capacity problems.
- 29-31 isolate model provider availability, performance, and billing constraints.

## Cost And Efficiency Metrics

These ensure automation remains economically sensible.

### 32) Cost per Completed Task

Total automation cost divided by completed tasks in a period.

### 33) Model Cost per Task

Model API spend per completed task.

### 34) Retries per Completed Task

Average number of retries (dispatch/API/verification) required per completed task.

### 35) Waste Ratio

Fraction of runs that consumed resources but did not produce a mergeable outcome.

Interpretation:
- Lower is generally better.
- Evaluate together with quality metrics to avoid optimizing for cheap but poor outcomes.

## Governance And Compliance Metrics

These support organization-level adoption and control.

### 36) Contract Compliance Rate

Percent of repositories/tasks conforming to required issue, adapter, and lifecycle contracts.

### 37) Verification Gate Compliance

Percent of completed tasks that passed required verification gates before completion state.

### 38) Policy Exception Rate

### 39) Topology Contract Compliance

Percent of tasks whose executed topology behavior matches declared topology mode contract.

### 40) Runner Contract Compliance

Percent of repositories in autonomous mode that satisfy required runner contract fields and behaviors.

Percent of tasks completed using documented exception paths.

Interpretation:
- These metrics are about process health and governance readiness, not developer productivity alone.

## Metric Semantics Guidance

To keep metrics comparable across repositories:

- Define each metric with a clear start event and end event.
- Distinguish median from mean; prefer percentile distributions for latency.
- Keep denominator definitions explicit (for example, all dispatched jobs vs completed jobs).
- Use stable terminal states so retries do not inflate success metrics.
- Report trends over time; single snapshots can mislead.

## Non-Goals For This Document

- No instrumentation plan
- No schema design
- No dashboard design
- No SLO/alert threshold definitions
- No tool-specific implementation guidance
