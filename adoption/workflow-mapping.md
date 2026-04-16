# Workflow Mapping Guidance

This document explains how to map the reusable standard onto repository automation.

## Readiness Validation

Purpose:

- confirm the issue is executable before implementation begins

Typical checks:

- required issue sections are present
- required labels or assignee rules are satisfied
- task scope appears PR-sized

Possible outcomes:

- readiness passes and the issue remains eligible for execution
- readiness fails and a blocking label such as `needs-details` is applied

## Execution Topology Mapping

Purpose:

- determine whether execution should run in combined, split, or specialized topology
- keep topology selection separate from lifecycle state

Typical behavior:

- treat `combined` as the default topology unless the repository defines another default
- if no topology label or rule is present, execution MUST default to `combined`
- use supporting labels or repository rules to select `split` or `specialized` when needed
- keep topology routing visible and simple enough for humans to reason about
- treat topology choice as an execution strategy layered on top of the same lifecycle, not as a separate workflow state machine
- treat `combined`, `split`, and `specialized` as topology mode names; when a repository chooses to encode them as labels, use optional supporting labels such as `topology:combined`, `topology:split`, and `topology:specialized`

Typical topology meanings:

- `combined`
  - one agent performs planning and implementation within the same execution flow
- `split`
  - a planner agent produces an execution contract and a separate executor agent implements against it
- `specialized`
  - multiple specialized agents participate with explicit handoffs between roles such as planner, executor, verifier, or integrator

Topology labels and role labels should not imply that every repository must implement every role or every handoff. Repositories may run the full flow, a partial specialization, or stay in the combined path.

## Branch Bootstrap

Purpose:

- create or prepare the implementation branch when the issue enters the execution state

Typical behavior:

- derive branch name from issue number and title
- create the branch if it does not exist
- avoid creating duplicate execution branches

## Plan And Handoff Contract Mapping

Purpose:

- make the implementation plan visible before meaningful code changes begin
- strengthen the plan into an execution contract when work is handed from one agent to another

Typical behavior:

- require a preflight plan comment on the issue
- or require the PR description to expose the plan before review
- optionally verify plan presence before later lifecycle transitions
- when topology is `split` or `specialized`, require a visible handoff artifact before the next role begins work
- when topology is `split` or `specialized`, downstream roles MUST NOT proceed without a valid execution contract
- use the same visible plan artifact as the source of truth unless a repository has a documented reason to split plan and handoff artifacts

Typical contract contents:

- scoped task summary
- acceptance criteria mapping
- expected files, subsystems, or surfaces of change
- sequencing or dependency constraints
- stop-and-ask conditions
- identified risks, assumptions, or open questions

## Draft PR Bootstrap

Purpose:

- create a draft PR after the issue branch has real commits ahead of the base branch
- preserve issue-first coordination before code exists while moving active implementation steering into the PR once code is visible

Typical behavior:

- keep readiness validation, topology selection, and pre-code planning or handoff artifacts on the issue before the first implementation commit
- link the source issue in the PR body
- initialize a standard PR template
- keep the PR in draft until verification and review are appropriate
- once the PR exists, prefer the PR as the main steering surface for implementation, verification, and review activity
- do not rely on the PR as the first visible record of split or specialized execution; pre-code role coordination must remain visible on the issue

## PR And Issue State Sync

Purpose:

- keep lifecycle labels aligned with PR review and merge state

Typical behavior:

- move linked issues to `in-review` when the PR is ready for review
- move linked issues to `done` when the PR merges
- optionally close linked issues on merge

## Human Control Signal Mapping

Purpose:

- allow visible interruption or steering without making humans a required approval gate

Typical behavior:

- detect labels such as `hold` or `needs-human`
- detect issue or PR comments such as `stop`, `hold`, or `change approach`
- pause further automation or require re-planning when a valid control signal appears
- post visible status when execution is paused

## Role Handoff Mapping

Purpose:

- define how work passes between agents when execution is not combined
- prevent hidden state and ambiguous delegation

Typical behavior:

- require each role to leave a visible artifact for the next role
- keep handoff state in the issue or PR thread rather than in hidden agent memory
- prevent later roles from proceeding when the required handoff artifact is missing or invalid
- subsequent roles MUST NOT proceed if required handoff artifacts are missing or invalid
- require re-planning when a human changes scope or approach mid-execution

Typical handoff expectations:

- planner to executor
- executor to verifier
- verifier to integrator

Typical handoff contents:

- current execution contract or updates to it
- completion status against acceptance criteria
- unresolved risks, failures, or follow-up requirements

## Final Accountability Mapping

Purpose:

- ensure one visible execution owner is accountable for final verification status and lifecycle advancement
- avoid ambiguous ownership when multiple agents participate

Typical behavior:

- assign one visible execution owner for each issue or PR stage that can advance lifecycle state
- allow that visible execution owner to be implemented by an agent, workflow, or automation identity, but keep the ownership legible in the issue or PR control surface
- require that visible execution owner to decide whether required verification has passed and to post the final completion or blocker status in the visible issue or PR surface
- prevent issue or PR lifecycle advancement when the visible execution owner for that stage is unclear
- if no visible execution owner is defined, execution MUST pause and request clarification before proceeding
- allow supporting roles to contribute evidence without changing the final accountability rule

## Verification Mapping

Purpose:

- make the repository's completion gates explicit and automatable

Map locally:

- mandatory verification commands
- conditional checks by change type
- evidence artifact publication
- environment requirements for CI or local runs

## Important Boundary

The reusable kit defines the operating pattern, including lifecycle, topology, handoff expectations, and final accountability. Each repository still owns:

- exact workflow implementations
- stack-specific commands
- deployment integrations
- evidence publication details
