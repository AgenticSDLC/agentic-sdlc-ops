# Control-Plane Contract

## Purpose

This contract defines the provider-facing surface for lifecycle execution.

It allows `agentic-sdlc-ops` to preserve portable lifecycle semantics while using different repository providers over time.

## Public Responsibilities

A control-plane provider must expose operations for:

- identifying the repository work item source of truth
- publishing and reading lifecycle state
- publishing visible discussion or handoff artifacts
- creating or updating review artifacts such as pull requests or merge requests
- publishing verification status
- preserving non-lifecycle metadata during state changes

## Required Provider Capabilities

### Repository Identity

Resolve the current repository in provider-native form.

### Label Or State Synchronization

Ensure the provider has the configured lifecycle and supporting state surfaces needed for the active profile.

### Work Item Publication

Create the bounded work item from a local draft or equivalent input artifact.

### Lifecycle Transition

Advance lifecycle state while preserving non-lifecycle metadata.

### Health Inspection

Report whether the provider wiring is usable for the current repository.

## V1 Provider

The only supported provider in v1 is GitHub.

GitHub satisfies this contract through:

- GitHub Issues
- labels
- comments
- pull requests
- workflows and status surfaces

## Non-Goal

This contract does not require every future provider to match GitHub primitives exactly.

It requires each provider to satisfy the same public execution responsibilities through provider-native mechanisms.
