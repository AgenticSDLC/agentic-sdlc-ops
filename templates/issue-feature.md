---
name: "Feature"
description: "A user-facing capability composed of one or more tasks"
title: "[FEATURE] <short description>"
labels: ["feature"]
---

## Context

Describe the problem or opportunity this feature addresses.

Explain the user or operational impact.

---

## Requirements

Describe what the feature must do.

- Requirement 1
- Requirement 2

---

## Acceptance Criteria

Concrete pass/fail conditions for completion.

- [ ] Condition 1
- [ ] Condition 2
- [ ] Verification commands defined in the project adapter pass

---

## Target Files

List the files or directories expected to change.

- `path/to/file.ts`
- `path/to/subsystem/`

---

## Agent Instructions

Guidance for AI contributors:

- Prefer small, incremental changes over large refactors
- Keep changes aligned with the current product direction
- If the repository defines a terminology guide, use only approved terminology
- Do not expand scope beyond the explicit requirements above

New issues should start with taxonomy labels only. Apply execution state labels after readiness validation passes.

---

## Notes

Optional implementation hints, references, or design artifacts.
