# GitHub CLI SOP

Use this file for repository-local GitHub CLI operating guidance.

## Purpose

Document the commands and auth checks operators use to inspect or recover issue-first workflow behavior.

## Auth Preflight

```bash
gh auth status
env -u GH_TOKEN -u GITHUB_TOKEN gh auth status
git remote -v
```

## Common Commands

Create labels:

```bash
gh label list
gh label create "ready-for-build" --description "Issue is ready for execution validation" --color "1d76db"
```

Inspect an issue:

```bash
gh issue view <issue-number> --comments
gh issue view <issue-number> --json labels,state,title,url
```

Inspect a PR:

```bash
gh pr view <pr-number>
gh pr list --limit 20
```

Inspect the branch and upstream hint used for PR targeting:

```bash
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
```

Inspect workflow runs:

```bash
gh run list --limit 10
gh run view <run-id>
```

Combined runtime path:

```bash
agentic-sdlc runtime combined --issue <issue-number>
agentic-sdlc runtime combined --issue <issue-number> --base <branch>
agentic-sdlc runtime combined --issue <issue-number> --no-sync-pr
```

## Repository Notes

Fill in:

- any required auth workarounds
- repository-specific label commands
- workflow names
- recovery procedures for common failure cases
