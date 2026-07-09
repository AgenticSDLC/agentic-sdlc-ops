# SOP: Issue Execution Evidence And Closeout

## Purpose

Standardize evidence collection and issue comments for task execution under the issue-first workflow.

## Preconditions

- Work is on the expected `issue-<number>-<slug>` branch
- Task changes are scoped to the issue target files
- Issue has the `in-progress` label

## Step 1: Commit Scoped Changes

```bash
git add -- <scoped file list>
git commit -m "feat(issue-<number>): <short description>"
```

## Step 2: Push Issue Branch

```bash
git push -u origin issue-<number>-<slug>
```

The draft PR bootstrapper will create a draft PR automatically if this is the first push with commits ahead of the base branch.

## Step 3: Run Required Verification

Run the project's required commands (see your project adapter). Examples:

```bash
<lint command>
<build command>
```

Run task-relevant tests:

```bash
<test command or test file>
```

## Step 4: Capture Runtime Proof (If Backend Or Integration Task)

Collect:

- Workflow or command used
- Success output
- Persistence or API verification output

## Step 5: Post Evidence Comment On Issue

Include:

- Implemented commit SHA
- Verification command outputs summary
- Runtime validation summary
- Known unrelated pre-existing failures (if any)

```bash
gh issue comment <issue-number> --body-file <evidence-file.md>
```

## Evidence Checklist

- [ ] Commit SHA on issue branch
- [ ] Lint status
- [ ] Build status
- [ ] Task-relevant test status
- [ ] Integration/runtime proof when applicable
- [ ] Blockers or known non-task failures clearly identified

## Notes

- Do not claim completion based only on agent output. Include command evidence.
- CI owns the authoritative verification pass. Local evidence is supporting context, not a substitute for CI checks passing on the PR.
