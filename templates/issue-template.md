---
name: "Task"
description: "A small, executable unit of work"
title: "[TASK] <short description>"
labels: ["task"]
---

## Context

Describe the problem, motivation, and relevant background.

---

## Requirements

List the concrete implementation requirements.

- Requirement 1
- Requirement 2

---

## Acceptance Criteria

Define clear, testable conditions for completion.

- [ ] Condition 1
- [ ] Condition 2
- [ ] Verification commands defined in the project adapter pass

---

## Target Files

List the files, directories, or subsystems expected to change.

- `path/to/file.ts`
- `path/to/subsystem/`

---

## Agent Instructions

Guidance for AI contributors:

- Prefer small, incremental changes
- Do not broaden the task beyond the explicit issue scope
- If the repository defines a terminology guide, read it before writing any user-facing text

Topology labels for execution routing (apply at most one):
- `topology:combined` — default when none is specified; one executor, one PR
- `topology:split` — separate planner and builder execution

Role labels (`agent-planner`, `agent-builder`, `agent-verifier`, `agent-integrator`) are optional routing hints, not lifecycle states.

New issues should start with taxonomy labels only. Apply execution state labels after readiness validation passes.

---

## Notes

Optional implementation notes, constraints, or linked references.
