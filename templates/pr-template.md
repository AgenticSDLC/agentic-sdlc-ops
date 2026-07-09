# Summary

Implements: Closes #{{issue_number}}

One-sentence summary of the change.

Issue-first workflow: implementation starts from the live GitHub Issue. The PR body should reflect the issue contract, not a separate ad hoc description.

---

## Goal

What problem does this PR solve?

-

---

## Scope

What is included in this PR?

-

What is intentionally out of scope?

-

---

## Agent Workflow

Agent role(s) involved:

- [ ] Planner
- [ ] Builder
- [ ] Verifier
- [ ] Human-only

---

## Target Files

List the files or directories this PR is expected to touch.

```text
<path or subsystem>
```

---

## Acceptance Criteria

Copy from the GitHub Issue. Do not rewrite from memory.

{{acceptance_criteria}}

---

## Verification

How was this change verified?

{{verification_lines}}

Notes:

-

If any acceptance criterion is not fully satisfied, explain why before requesting review.

---

## E2E Test Dependency Contract

Complete this section whenever the PR adds or changes an E2E spec file.
It records the test setup contract for reviewers; it is not a substitute for running the test.

<!-- e2e-test-dependency-contract:start -->
- Helper or route used: [required]
- Request method and input: [required]
- Required preconditions and fixture state: [required]
- Side effects and response/error behavior: [required]
- Source evidence (file and line): [required]
- Targeted command and result: [required]
<!-- e2e-test-dependency-contract:end -->

---

## Metrics / Analytics Impact

Does this PR add or modify events or analytics?

- [ ] No metrics impact
- [ ] Adds or changes analytics behavior

If yes, describe:

-

---

## Risks / Follow-Up

Known risks, tradeoffs, or follow-up tasks:

-

---

## Screenshots / Output

Optional. Add screenshots, logs, or short output snippets.

---

## PR Title Convention

Use a concise title in conventional-commit format.

```text
feat(scope): short description
fix(scope): short description
refactor(scope): short description
docs(scope): short description
```
