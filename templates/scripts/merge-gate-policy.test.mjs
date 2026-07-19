import assert from "node:assert/strict"
import { test } from "node:test"
import {
  decideMerge,
  evaluateVerifierAttestation,
  resolveTopology,
  REQUIRED_CHECKS,
} from "./merge-gate-policy.mjs"

const HEAD = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

// Tests run against an explicit check list so they stay valid regardless of
// how the repository configures REQUIRED_CHECKS.
const CHECKS = ["verify-lint", "verify-build", "verify-e2e"]

function passingRuns(sha = HEAD) {
  return CHECKS.map((name) => ({
    name,
    headSha: sha,
    status: "completed",
    conclusion: "success",
  }))
}

function boundPass(overrides = {}) {
  return { author: "verifier-bot", sha: HEAD, ...overrides }
}

function baseInput(overrides = {}) {
  return {
    isOpen: true,
    isDraft: false,
    verifierPasses: [boundPass()],
    hasBlockerMarker: false,
    hasStopComment: false,
    issueLabels: ["topology:combined"],
    headSha: HEAD,
    checkRuns: passingRuns(),
    requiredChecks: CHECKS,
    verifierAllowlist: [],
    ...overrides,
  }
}

test("combined topology merges with green checks and no verifier pass", () => {
  assert.deepEqual(decideMerge(baseInput({ verifierPasses: [] })), {
    merge: true,
    reason: "all-required-checks-passed",
  })
})

test("no topology label defaults to combined", () => {
  assert.deepEqual(
    decideMerge(baseInput({ issueLabels: [], verifierPasses: [] })),
    { merge: true, reason: "all-required-checks-passed" },
  )
})

test("split topology merges only with a current-head verifier pass", () => {
  assert.deepEqual(
    decideMerge(baseInput({ issueLabels: ["topology:split"] })),
    { merge: true, reason: "all-required-checks-passed" },
  )

  assert.deepEqual(
    decideMerge(
      baseInput({
        issueLabels: ["topology:split"],
        verifierPasses: [],
      }),
    ),
    { merge: false, reason: "no-verifier-pass" },
  )
})

test("refuses while any required check is pending", () => {
  const runs = passingRuns()
  runs[0] = { ...runs[0], status: "in_progress", conclusion: null }
  const decision = decideMerge(baseInput({ checkRuns: runs }))
  assert.equal(decision.merge, false)
  assert.match(decision.reason, /^check-pending:/)
})

test("refuses when a required check failed", () => {
  const runs = passingRuns()
  runs[1] = { ...runs[1], conclusion: "failure" }
  const decision = decideMerge(baseInput({ checkRuns: runs }))
  assert.equal(decision.merge, false)
  assert.match(decision.reason, /^check-failure:/)
})

test("refuses when cancelled, timed out, or unexpectedly skipped", () => {
  for (const conclusion of ["cancelled", "timed_out", "skipped"]) {
    const runs = passingRuns()
    runs[2] = { ...runs[2], conclusion }
    const decision = decideMerge(baseInput({ checkRuns: runs }))
    assert.equal(decision.merge, false, conclusion)
    assert.equal(decision.reason, `check-${conclusion}:${runs[2].name}`)
  }
})

test("refuses when a required check is missing entirely", () => {
  const decision = decideMerge(baseInput({ checkRuns: passingRuns().slice(1) }))
  assert.equal(decision.merge, false)
  assert.equal(decision.reason, `check-missing:${CHECKS[0]}`)
})

test("a new commit invalidates checks from an older head SHA", () => {
  const decision = decideMerge(baseInput({ checkRuns: passingRuns("sha-stale") }))
  assert.equal(decision.merge, false)
  assert.match(decision.reason, /^check-missing:/)
})

test("refuses without any verifier pass even when checks are green", () => {
  const decision = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierPasses: [],
    }),
  )
  assert.deepEqual(decision, { merge: false, reason: "no-verifier-pass" })
})

test("an unbound pass marker (no sha line) never satisfies the gate", () => {
  const decision = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierPasses: [boundPass({ sha: null })],
    }),
  )
  assert.deepEqual(decision, { merge: false, reason: "verifier-pass-not-sha-bound" })
})

test("a stale attestation does not authorize merging a newer commit", () => {
  const stale = boundPass({ sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" })
  const decision = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierPasses: [stale],
    }),
  )
  assert.deepEqual(decision, { merge: false, reason: "verifier-pass-stale-sha" })
})

test("short SHA prefixes of at least 7 chars bind correctly", () => {
  const short = evaluateVerifierAttestation({
    verifierPasses: [boundPass({ sha: HEAD.slice(0, 7) })],
    headSha: HEAD,
    allowlist: [],
  })
  assert.equal(short.ok, true)

  const tooShort = evaluateVerifierAttestation({
    verifierPasses: [boundPass({ sha: HEAD.slice(0, 5) })],
    headSha: HEAD,
    allowlist: [],
  })
  assert.equal(tooShort.ok, false)
})

test("allowlist enforcement requires a bound pass from an authorized author", () => {
  const unauthorized = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierAllowlist: ["trusted-verifier"],
    })
  )
  assert.deepEqual(unauthorized, { merge: false, reason: "verifier-not-authorized" })

  const authorized = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierAllowlist: ["trusted-verifier"],
      verifierPasses: [boundPass({ author: "trusted-verifier" })],
    })
  )
  assert.equal(authorized.merge, true)

  // A stale attestation from an authorized author still fails.
  const staleAuthorized = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierAllowlist: ["trusted-verifier"],
      verifierPasses: [
        boundPass({ author: "trusted-verifier", sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }),
      ],
    })
  )
  assert.equal(staleAuthorized.merge, false)
})

test("human-control and verifier-blocker signals suppress the merge", () => {
  for (const overrides of [
    { issueLabels: ["merge:human-required"] },
    { issueLabels: ["hold"] },
    { issueLabels: ["needs-human"] },
    { hasStopComment: true },
    { hasBlockerMarker: true },
    { isDraft: true },
    { isOpen: false },
  ]) {
    const decision = decideMerge(baseInput(overrides))
    assert.equal(decision.merge, false, JSON.stringify(overrides))
  }
})

test("the unconfigured REQUIRED_CHECKS placeholder fails closed", () => {
  const decision = decideMerge(baseInput({ requiredChecks: undefined }))
  assert.equal(decision.merge, false)
  assert.equal(decision.reason, `check-missing:${REQUIRED_CHECKS[0]}`)
})

test("repository merge modes fail closed", () => {
  assert.deepEqual(
    decideMerge(baseInput({ mergeMode: "human-required" })),
    { merge: false, reason: "merge-mode-human-required" },
  )
  assert.deepEqual(
    decideMerge(baseInput({ mergeMode: "disabled" })),
    { merge: false, reason: "merge-mode-disabled" },
  )
  assert.deepEqual(
    decideMerge(baseInput({ mergeMode: "unexpected" })),
    { merge: false, reason: "merge-mode-invalid:unexpected" },
  )
})

test("conflicting topology labels fail closed", () => {
  assert.deepEqual(
    resolveTopology(["topology:combined", "topology:split"]),
    { ok: false, topology: null, reason: "topology-conflict" },
  )
  assert.deepEqual(
    decideMerge(
      baseInput({
        issueLabels: ["topology:combined", "topology:split"],
      }),
    ),
    { merge: false, reason: "topology-conflict" },
  )
})
