# Topology Checklists

Use these short checklists alongside:

- [COMBINED-TOPOLOGY-RUNBOOK.md](./COMBINED-TOPOLOGY-RUNBOOK.md)
- [SPLIT-TOPOLOGY-RUNBOOK.md](./SPLIT-TOPOLOGY-RUNBOOK.md)

## Issue Creation Checklist

- [ ] If starting from a local draft, draft has been reconciled against the project adapter before publishing
- [ ] Live GitHub Issue exists and is the execution source of truth
- [ ] Issue contains Context, Requirements, Acceptance Criteria, and Target Files
- [ ] Issue scope is small enough for one PR
- [ ] Requirements are concrete and executable
- [ ] Acceptance criteria are testable
- [ ] Target files or affected areas are named clearly
- [ ] Creation-time routing labels reflect intended execution ownership
- [ ] Issue does not imply architectural change beyond the current contract

## Readiness Checklist

- [ ] Issue is ready to receive `ready-for-build`
- [ ] Topology label for the intended execution path has been added (`topology:combined` or `topology:split`)
- [ ] Readiness validation posts a passing comment
- [ ] `ready-for-build` remains on the issue
- [ ] `needs-details` is not present

## Builder Start Checklist

- [ ] Issue has the `in-progress` label
- [ ] For `topology:split`: visible planner handoff already exists on the issue
- [ ] Remote issue branch exists and follows `issue-<number>-<slug>` naming
- [ ] Local checkout has switched to the issue branch
- [ ] Local checkout is not the base branch
- [ ] If branch checkout fails: stop and ask for guidance instead of implementing on the base branch

## Split Handoff Checklist

- [ ] Issue uses `topology:split`
- [ ] Planner handoff is visible on the issue before code exists
- [ ] Planner handoff includes `<!-- split-planner-complete -->` in the raw comment body
- [ ] Planner handoff includes chosen approach
- [ ] Planner handoff lists exact files or surfaces expected to change
- [ ] Planner handoff maps the planned work to the issue acceptance criteria
- [ ] Planner handoff confirms the work stays within issue scope
- [ ] Builder has confirmed the visible handoff exists before implementing

## Verification Checklist

- [ ] Lint passes
- [ ] Build succeeds
- [ ] Task-relevant automated tests pass
- [ ] User-visible work includes E2E smoke coverage
- [ ] User-visible work produces E2E evidence artifacts
- [ ] PR or issue notes record the verification performed

## Acceptance Criteria Gate

- [ ] Every acceptance criterion from the issue has been read
- [ ] Each criterion is demonstrably satisfied in the running application — not assumed from a passing build
- [ ] No criterion has been silently skipped
- [ ] If a criterion cannot be satisfied within scope: stop and report the blocker

## Merge Policy Checklist

- [ ] Default expectation is automation-first merge after verification passes
- [ ] If human review is required: issue has `merge:human-required`
- [ ] If execution must pause: use `hold` or `needs-human`
- [ ] If `stop` appears in issue or PR comments: automation remains paused until resolved
- [ ] Do not use `needs-human` as a long-term replacement for `merge:human-required`

## Verifier Checklist

- [ ] Decided whether `agent-verifier` is warranted for this task
- [ ] Required verification commands actually ran
- [ ] Required evidence artifacts exist
- [ ] Pass or blocker status reported in the issue or PR with `<!-- split-verifier-pass -->` or `<!-- split-verifier-blocker -->`
- [ ] Verification reporting kept separate from implementation scope

## Pause And Escalation Checklist

- [ ] Pause if label `hold` appears
- [ ] Pause if label `needs-human` appears
- [ ] Pause if an issue or PR comment contains `stop`
- [ ] Report paused state in the same visible thread
- [ ] Stop and ask for guidance if the issue branch is missing
- [ ] Stop and ask for guidance if the local checkout cannot switch cleanly
- [ ] Stop and ask for guidance if verification cannot be completed safely
