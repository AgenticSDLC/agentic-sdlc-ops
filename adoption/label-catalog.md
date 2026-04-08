# Label Catalog

This catalog distinguishes lifecycle labels from optional supporting labels.

## Required Lifecycle Labels

These labels express execution state and should be present in any repository adopting this model:

- `ready-for-build`
  - issue scope is ready for executable validation
- `in-progress`
  - implementation is authorized to begin according to the repository rules
- `in-review`
  - implementation is complete enough for formal review
- `done`
  - merged and complete

## Common Supporting Labels

These labels are optional and repository-specific:

- `needs-details`
  - readiness validation failed or more scope detail is needed
- `agent-builder`
  - routes implementation work to a builder agent or automation
- `agent-planner`
  - routes planning or decomposition work
- `agent-verifier`
  - routes verification work
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
- `bug`
- `infra`
- `data-platform`
- `frontend`
- `backend`

## Guidance

- keep lifecycle labels stable and few in number
- use supporting labels only when they serve automation or routing
- treat `hold` and `needs-human` as interrupt controls, not lifecycle states
- do not use taxonomy labels as a substitute for execution state
- document any repository-specific additions in the local project adapter
