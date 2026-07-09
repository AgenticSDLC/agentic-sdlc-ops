# Label Catalog

This catalog distinguishes lifecycle labels from optional supporting labels, including execution topology labels such as `topology:combined` or `topology:split` and role-routing labels such as `agent-planner` or `agent-builder`.

## Required Lifecycle Labels

These labels express execution state and are required in any repository adopting this model:

- `ready-for-build`
  - issue scope is ready for executable validation
- `in-progress`
  - implementation is authorized to begin according to the repository rules
- `in-review`
  - implementation is complete enough for formal review
- `done`
  - merged and complete

## Common Supporting Labels

These labels are optional and repository-specific. They are routing and execution hints, not required phases of the lifecycle:

- `needs-details`
  - readiness validation failed or more scope detail is needed
- `topology:combined`
  - default combined planner-plus-executor flow within a single execution path
- `topology:split`
  - separate planner and executor roles are expected
- `topology:specialized`
  - multiple specialized agent roles are expected with explicit handoffs; reserved, not used by default automation
- `agent-builder`
  - routes implementation work to a builder agent or automation
- `agent-planner`
  - routes planning or decomposition work
- `agent-verifier`
  - routes verification work; recommended for `topology:split` work with meaningful verification
- `agent-integrator`
  - routes integration or merge-readiness work
- `hold`
  - execution is paused pending human follow-up
- `needs-human`
  - work requires human guidance before continuing

## Taxonomy Labels

Taxonomy labels classify work and are separate from lifecycle state.

Examples:

- `task`
- `feature`
- `epic`
- `bug`
- `infra`
- `docs`

## Merge Policy Labels

These labels declare merge behavior for the PR associated with an issue. They do not pause execution — work proceeds through implementation and verification. They gate only the final merge step.

- `merge:human-required`
  - automation may not merge; a human must review and approve the PR before merge
  - set at issue creation time or before verifier completes
  - suppresses any auto-merge automation that would otherwise fire after verification passes

## Guidance

- keep lifecycle labels stable and few in number
- treat topology labels as optional routing signals, not lifecycle states
- an issue may have zero or one topology label at a time
- if no topology label is present, assume the `combined` topology mode unless the repository defines another default
- treat role-routing labels as optional ownership or routing hints, not a mandated sequence
- use role-routing labels only when they serve visible automation or delegation
- treat `hold` and `needs-human` as interrupt controls, not lifecycle states
- do not use taxonomy labels as a substitute for execution state or topology
- document any repository-specific additions in the local project adapter
