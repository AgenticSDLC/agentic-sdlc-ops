# Task Classes

Document the repository's supported task classes so issue scope and verification expectations stay explicit.

## How To Use This File

- define a small bounded set of task classes
- describe when each class should be used
- define the minimum verification expected for each class
- note any class-specific stop conditions or escalation rules

## Example Format

### `docs-only`

Use for:

- documentation-only changes

Default verification:

- markdown or docs lint if present
- link checks if present

### `infra-only`

Use for:

- infrastructure or configuration changes with no user-facing code path

Default verification:

- plan, synth, or config validation
- task-relevant tests

### `frontend`

Use for:

- user-visible UI changes

Default verification:

- lint and build
- task-relevant UI tests
- browser smoke or end-to-end coverage where required
