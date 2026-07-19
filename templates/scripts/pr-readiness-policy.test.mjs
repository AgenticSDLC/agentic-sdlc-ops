import assert from "node:assert/strict"
import test from "node:test"

import { decidePullRequestReadiness } from "./pr-readiness-policy.mjs"

test("combined topology becomes ready after builder push", () => {
  assert.deepEqual(
    decidePullRequestReadiness({
      isDraft: true,
      issueLabels: ["topology:combined", "in-progress"],
    }),
    { ready: true, reason: "combined-builder-push" },
  )
})

test("combined is the default when no topology label is present", () => {
  assert.deepEqual(
    decidePullRequestReadiness({
      isDraft: true,
      issueLabels: ["in-progress"],
    }),
    { ready: true, reason: "combined-builder-push" },
  )
})

test("split topology remains draft until verifier handoff", () => {
  assert.deepEqual(
    decidePullRequestReadiness({
      isDraft: true,
      issueLabels: ["topology:split", "in-progress"],
    }),
    { ready: false, reason: "split-topology-awaits-verifier" },
  )
})

for (const label of ["merge:human-required", "hold", "needs-human"]) {
  test(`${label} suppresses automatic readiness`, () => {
    assert.deepEqual(
      decidePullRequestReadiness({
        isDraft: true,
        issueLabels: ["topology:combined", label],
      }),
      { ready: false, reason: `blocking-label:${label}` },
    )
  })
}

test("a stop comment suppresses automatic readiness", () => {
  assert.deepEqual(
    decidePullRequestReadiness({
      isDraft: true,
      issueLabels: ["topology:combined"],
      hasStopComment: true,
    }),
    { ready: false, reason: "stop-comment" },
  )
})

test("repeated completion events are idempotent for an already-ready PR", () => {
  assert.deepEqual(
    decidePullRequestReadiness({
      isDraft: false,
      issueLabels: ["topology:combined"],
    }),
    { ready: false, reason: "pr-already-ready" },
  )
})
