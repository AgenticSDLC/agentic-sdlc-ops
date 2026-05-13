# Platform Actors

Use this file when the repository has named subsystem boundaries that matter for execution scope.

## Purpose

Platform actors help agents understand which subsystem owns a change and where scope expansion becomes risky.

## Recommended Structure

For each actor or subsystem, document:

- purpose
- owned files or directories
- main dependencies
- common risks
- stop-and-ask conditions

## Example Format

### `ingestion`

- purpose: receives and validates source data
- owns: `src/ingestion/`, relevant workflow definitions
- risks: upstream contract changes, replay behavior, credential boundaries

### `ui`

- purpose: user-visible flows and presentation behavior
- owns: `app/`, `components/`, `styles/`
- risks: accessibility regressions, screenshots, browser validation, preview review
