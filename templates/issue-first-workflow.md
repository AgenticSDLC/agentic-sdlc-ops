# Issue-First Workflow

This file explains how the repository applies the portable issue-first operating model locally.

## Current State

Document whether the repository is:

- fully GitHub-active
- local-only for now
- partially scaffolded and awaiting provider wiring

## Source Of Truth

Document when the live provider work item becomes authoritative and what local documents matter before that point.

## Executable Issue Contract

List the required issue sections, optional task-class rules, and scope expectations.

## Lifecycle

Document:

- lifecycle labels
- execution start condition
- supporting labels
- topology usage if any

For combined topology, document whether the repository uses a runtime command or automation path to:

- publish the preflight plan
- create or reuse the issue branch
- create or update the draft PR

## PR Expectations

Document:

- required PR sections
- verification expectations
- branch naming
- merge-to-done expectations

## Verification

Document:

- default verification commands
- conditional verification by task class
- required evidence

## Operating Commands

Document the common provider and workflow inspection commands used in the repository.

If the repository uses the current combined runtime slice, include commands such as:

```bash
agentic-sdlc runtime combined --issue <issue-number>
agentic-sdlc runtime combined --issue <issue-number> --implement
agentic-sdlc runtime combined --issue <issue-number> --verify
agentic-sdlc runtime combined --issue <issue-number> --finalize
agentic-sdlc runtime combined --issue <issue-number> --no-sync-pr
agentic-sdlc runtime combined --issue <issue-number> --base <branch>
```
