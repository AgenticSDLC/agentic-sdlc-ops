import assert from "node:assert/strict"
import { test } from "node:test"
import {
  decideMerge,
  evaluateVerifierAttestation,
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
    issueLabels: [],
    headSha: HEAD,
    checkRuns: passingRuns(),
    requiredChecks: CHECKS,
    verifierAllowlist: [],
    ...overrides,
  }
}

test("merges when every required check passed and the attestation is bound to the head", () => {
  assert.deepEqual(decideMerge(baseInput()), {
    merge: true,
    reason: "all-required-checks-passed",
  })
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
  const decision = decideMerge(baseInput({ verifierPasses: [] }))
  assert.deepEqual(decision, { merge: false, reason: "no-verifier-pass" })
})

test("an unbound pass marker (no sha line) never satisfies the gate", () => {
  const decision = decideMerge(baseInput({ verifierPasses: [boundPass({ sha: null })] }))
  assert.deepEqual(decision, { merge: false, reason: "verifier-pass-not-sha-bound" })
})

test("a stale attestation does not authorize merging a newer commit", () => {
  const stale = boundPass({ sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" })
  const decision = decideMerge(baseInput({ verifierPasses: [stale] }))
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
    baseInput({ verifierAllowlist: ["trusted-verifier"] })
  )
  assert.deepEqual(unauthorized, { merge: false, reason: "verifier-not-authorized" })

  const authorized = decideMerge(
    baseInput({
      verifierAllowlist: ["trusted-verifier"],
      verifierPasses: [boundPass({ author: "trusted-verifier" })],
    })
  )
  assert.equal(authorized.merge, true)

  // A stale attestation from an authorized author still fails.
  const staleAuthorized = decideMerge(
    baseInput({
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
