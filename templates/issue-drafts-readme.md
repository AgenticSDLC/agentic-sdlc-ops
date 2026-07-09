# Draft Specs

Use this folder for issue-first draft specs before publishing to GitHub.

## Task Spec Contract

Each task draft must include:

1. Title in `[TASK] ...` format
2. `## Context`
3. `## Requirements`
4. `## Acceptance Criteria`
5. `## Target Files`

## Epic Spec Contract

Each epic draft must include:

1. Title in `[EPIC] ...` format
2. `## Context`
3. `## Scope`
4. `## Tasks`
5. `## Out of Scope`
6. `## Acceptance Criteria`
7. `## Target Files`

## Naming Convention

**Standalone tasks** (not part of an epic):

```
t-<number>-<short-slug>.md
```

Example: `t-42-add-signup-redirect.md`

**Epic drafts:**

```
epic-<acronym>-<description>.md
```

Example: `epic-auth-user-authentication.md`

**Epic-scoped tasks** (use a 3-character epic acronym prefix):

```
t-<acronym>-<number>-<short-slug>.md
```

Example: `t-auth-001-login-flow.md`

The acronym makes the epic visible from the filename alone. Number tasks from `001` within each epic namespace.

## Writing Rules

- Keep scope narrow and PR-sized for task drafts
- Use checkbox lists in acceptance criteria
- Name concrete file paths in target files
- Avoid implementation details not required by the spec
- Do not use unfilled placeholder text — the readiness validator will reject it

## Reconciliation Requirement

Before publishing a draft to GitHub, verify it is current:

1. Read the draft in full
2. Check the project adapter for conflicts (verification commands, target files, constraints)
3. Identify and resolve outdated references
4. Patch the draft before publishing

Publishing without reconciliation is not permitted.

## Publish And Archive Policy

After publishing a draft to a GitHub Issue, add a reference near the top of the file:

```
Published Issue: #<number>
Published URL: <url>
```

- Keep active unpublished drafts in this `drafts/` folder
- When the corresponding GitHub Issue reaches `done`, move the file to `../archive/`
- Preserve the original contract in archive files — do not rewrite scope
- If a draft was superseded by a different issue, mark it superseded and reference the replacement
