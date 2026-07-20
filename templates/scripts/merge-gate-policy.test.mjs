import assert from "node:assert/strict"
import { test } from "node:test"
import {
  decideMerge,
  evaluateVerifierAttestation,
  parseVerifierComments,
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

function comment(body, sequence, author = "verifier-bot") {
  return { body, author, sequence }
}

function report(kind, sha = HEAD, sequence = 0, author = "verifier-bot") {
  const marker = kind === "pass"
    ? "<!-- split-verifier-pass -->"
    : "<!-- split-verifier-blocker -->"
  const shaLine = sha === null ? "" : `\n<!-- split-verifier-sha: ${sha} -->`
  return comment(`${marker}${shaLine}`, sequence, author)
}

function verdicts(...comments) {
  return parseVerifierComments(comments)
}

function baseInput(overrides = {}) {
  return {
    isOpen: true,
    isDraft: false,
    verifierVerdicts: verdicts(report("pass")),
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
  assert.deepEqual(decideMerge(baseInput({ verifierVerdicts: [] })), {
    merge: true,
    reason: "all-required-checks-passed",
  })
})

test("no topology label defaults to combined", () => {
  assert.deepEqual(
    decideMerge(baseInput({ issueLabels: [], verifierVerdicts: [] })),
    { merge: true, reason: "all-required-checks-passed" },
  )
})

test("combined and unlabeled topology ignore split verifier evidence", () => {
  const malformed = parseVerifierComments([
    comment(
      `<!-- split-verifier-pass -->\n<!-- split-verifier-blocker -->`,
      0,
    ),
  ])
  for (const issueLabels of [[], ["topology:combined"]]) {
    assert.deepEqual(
      decideMerge(baseInput({ issueLabels, verifierVerdicts: malformed })),
      { merge: true, reason: "all-required-checks-passed" },
    )
  }
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
        verifierVerdicts: [],
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
      verifierVerdicts: [],
    }),
  )
  assert.deepEqual(decision, { merge: false, reason: "no-verifier-pass" })
})

test("an unbound pass marker (no sha line) never satisfies the gate", () => {
  const decision = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierVerdicts: verdicts(report("pass", null)),
    }),
  )
  assert.deepEqual(decision, { merge: false, reason: "verifier-pass-not-sha-bound" })
})

test("a stale attestation does not authorize merging a newer commit", () => {
  const decision = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierVerdicts: verdicts(
        report("pass", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
      ),
    }),
  )
  assert.deepEqual(decision, { merge: false, reason: "verifier-pass-stale-sha" })
})

test("short SHA prefixes of at least 7 chars bind correctly", () => {
  const short = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(report("pass", HEAD.slice(0, 7))),
    headSha: HEAD,
    allowlist: [],
  })
  assert.equal(short.ok, true)

  const tooShort = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(report("pass", HEAD.slice(0, 5))),
    headSha: HEAD,
    allowlist: [],
  })
  assert.equal(tooShort.ok, false)

  const invalid = parseVerifierComments([
    comment(
      "<!-- split-verifier-pass -->\n<!-- split-verifier-sha: not-a-sha -->",
      0,
    ),
  ])
  assert.equal(invalid[0].sha, null)
  assert.equal(
    evaluateVerifierAttestation({
      verifierVerdicts: invalid,
      headSha: HEAD,
      allowlist: [],
    }).reason,
    "verifier-pass-not-sha-bound",
  )
})

test("parser ignores marker-free comments and normalizes bound verdicts", () => {
  const parsed = parseVerifierComments([
    comment(`ordinary comment\n<!-- split-verifier-sha: ${HEAD} -->`, 0),
    report("pass", HEAD.toUpperCase(), 1),
    report("blocker", HEAD.slice(0, 7).toUpperCase(), 2),
  ])

  assert.deepEqual(parsed, [
    {
      kind: "pass",
      author: "verifier-bot",
      sha: HEAD,
      sequence: 1,
      malformedReason: null,
    },
    {
      kind: "blocker",
      author: "verifier-bot",
      sha: HEAD.slice(0, 7),
      sequence: 2,
      malformedReason: null,
    },
  ])
})

test("a blocker is current-head only and a new head still requires its own pass", () => {
  const oldHead = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  const blocker = verdicts(report("blocker", oldHead))

  assert.deepEqual(
    evaluateVerifierAttestation({
      verifierVerdicts: blocker,
      headSha: oldHead,
      allowlist: [],
    }),
    { ok: false, reason: "verifier-blocker-current-head" },
  )
  assert.deepEqual(
    evaluateVerifierAttestation({
      verifierVerdicts: blocker,
      headSha: HEAD,
      allowlist: [],
    }),
    { ok: false, reason: "no-verifier-pass" },
  )

  const fixed = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(
      report("blocker", oldHead, 0),
      report("pass", HEAD, 1),
    ),
    headSha: HEAD,
    allowlist: [],
  })
  assert.deepEqual(fixed, { ok: true, reason: "verifier-attestation-valid" })
})

test("latest valid verdict on the current head wins", () => {
  const blockerThenPass = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(
      report("blocker", HEAD, 0),
      report("pass", HEAD, 1),
    ),
    headSha: HEAD,
    allowlist: [],
  })
  assert.deepEqual(blockerThenPass, {
    ok: true,
    reason: "verifier-attestation-valid",
  })

  const passThenBlocker = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(
      report("pass", HEAD, 0),
      report("blocker", HEAD, 1),
    ),
    headSha: HEAD,
    allowlist: [],
  })
  assert.deepEqual(passThenBlocker, {
    ok: false,
    reason: "verifier-blocker-current-head",
  })
})

test("legacy unbound blockers fail closed but are supersedable append-only", () => {
  const legacyOnly = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(report("blocker", null, 0, "legacy-author")),
    headSha: HEAD,
    allowlist: ["trusted-verifier"],
  })
  assert.deepEqual(legacyOnly, {
    ok: false,
    reason: "verifier-blocker-legacy-unbound",
  })

  const recovered = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(
      report("blocker", null, 0, "legacy-author"),
      report("pass", HEAD, 1, "trusted-verifier"),
    ),
    headSha: HEAD,
    allowlist: ["trusted-verifier"],
  })
  assert.equal(recovered.ok, true)

  const blockedAgain = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(
      report("pass", HEAD, 0, "trusted-verifier"),
      report("blocker", null, 1, "legacy-author"),
    ),
    headSha: HEAD,
    allowlist: ["trusted-verifier"],
  })
  assert.deepEqual(blockedAgain, {
    ok: false,
    reason: "verifier-blocker-legacy-unbound",
  })
})

test("conflicting reports fail closed and repeated identical SHA lines are accepted", () => {
  const bothMarkers = comment(
    `<!-- split-verifier-pass -->\n<!-- split-verifier-blocker -->\n<!-- split-verifier-sha: ${HEAD} -->`,
    0,
  )
  assert.deepEqual(parseVerifierComments([bothMarkers])[0], {
    kind: "malformed",
    author: "verifier-bot",
    sha: HEAD,
    sequence: 0,
    malformedReason: "conflicting-verdict-markers",
  })

  const conflictingSha = comment(
    `<!-- split-verifier-pass -->\n<!-- split-verifier-sha: ${HEAD} -->\n<!-- split-verifier-sha: bbbbbbb -->`,
    0,
  )
  assert.deepEqual(parseVerifierComments([conflictingSha])[0], {
    kind: "malformed",
    author: "verifier-bot",
    sha: null,
    sequence: 0,
    malformedReason: "conflicting-sha-markers",
  })

  const repeatedSha = comment(
    `<!-- split-verifier-pass -->\n<!-- split-verifier-sha: ${HEAD} -->\n<!-- split-verifier-sha: ${HEAD.toUpperCase()} -->`,
    0,
  )
  assert.equal(
    evaluateVerifierAttestation({
      verifierVerdicts: parseVerifierComments([repeatedSha]),
      headSha: HEAD,
      allowlist: [],
    }).ok,
    true,
  )
})

test("applicable malformed verdicts follow the same ordered resolution policy", () => {
  const malformed = comment(
    `<!-- split-verifier-pass -->\n<!-- split-verifier-blocker -->\n<!-- split-verifier-sha: ${HEAD} -->`,
    0,
  )
  const resolved = evaluateVerifierAttestation({
    verifierVerdicts: parseVerifierComments([
      malformed,
      report("pass", HEAD, 1),
    ]),
    headSha: HEAD,
    allowlist: [],
  })
  assert.equal(resolved.ok, true)

  const blocked = evaluateVerifierAttestation({
    verifierVerdicts: parseVerifierComments([
      report("pass", HEAD, 0),
      { ...malformed, sequence: 1 },
    ]),
    headSha: HEAD,
    allowlist: [],
  })
  assert.deepEqual(blocked, {
    ok: false,
    reason: "verifier-verdict-malformed",
  })
})

test("invalid verdict ordering fails closed", () => {
  for (const verifierVerdicts of [
    [{ ...verdicts(report("pass"))[0], sequence: -1 }],
    [{ ...verdicts(report("pass"))[0], sequence: 0.5 }],
    [{ ...verdicts(report("pass"))[0], sequence: Number.NaN }],
    verdicts(report("pass", HEAD, 0), report("blocker", HEAD, 0)),
  ]) {
    assert.deepEqual(
      evaluateVerifierAttestation({
        verifierVerdicts,
        headSha: HEAD,
        allowlist: [],
      }),
      { ok: false, reason: "verifier-verdict-malformed" },
    )
  }
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
      verifierVerdicts: verdicts(report("pass", HEAD, 0, "trusted-verifier")),
    })
  )
  assert.equal(authorized.merge, true)

  // A stale attestation from an authorized author still fails.
  const staleAuthorized = decideMerge(
    baseInput({
      issueLabels: ["topology:split"],
      verifierAllowlist: ["trusted-verifier"],
      verifierVerdicts: verdicts(
        report(
          "pass",
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          0,
          "trusted-verifier",
        ),
      ),
    })
  )
  assert.equal(staleAuthorized.merge, false)
})

test("the newest pass-shaped evidence determines a closed-gate diagnostic", () => {
  const allowlist = ["trusted-verifier"]
  const staleSha = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

  assert.deepEqual(
    evaluateVerifierAttestation({
      verifierVerdicts: verdicts(
        report("pass", HEAD, 0, "untrusted-author"),
        report("pass", staleSha, 1, "trusted-verifier"),
      ),
      headSha: HEAD,
      allowlist,
    }),
    { ok: false, reason: "verifier-pass-stale-sha" },
  )

  assert.deepEqual(
    evaluateVerifierAttestation({
      verifierVerdicts: verdicts(
        report("pass", staleSha, 0, "trusted-verifier"),
        report("pass", HEAD, 1, "untrusted-author"),
      ),
      headSha: HEAD,
      allowlist,
    }),
    { ok: false, reason: "verifier-not-authorized" },
  )
})

test("allowlisting applies symmetrically without enabling unauthorized denial", () => {
  const allowlist = ["trusted-verifier"]
  const authorizedPass = report("pass", HEAD, 0, "trusted-verifier")

  const unauthorizedBlocker = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(
      authorizedPass,
      report("blocker", HEAD, 1, "untrusted-author"),
    ),
    headSha: HEAD,
    allowlist,
  })
  assert.equal(unauthorizedBlocker.ok, true)

  const unauthorizedMalformed = comment(
    `<!-- split-verifier-pass -->\n<!-- split-verifier-blocker -->\n<!-- split-verifier-sha: ${HEAD} -->`,
    1,
    "untrusted-author",
  )
  assert.equal(
    evaluateVerifierAttestation({
      verifierVerdicts: parseVerifierComments([
        authorizedPass,
        unauthorizedMalformed,
      ]),
      headSha: HEAD,
      allowlist,
    }).ok,
    true,
  )

  const authorizedBlocker = evaluateVerifierAttestation({
    verifierVerdicts: verdicts(
      authorizedPass,
      report("blocker", HEAD, 1, "trusted-verifier"),
    ),
    headSha: HEAD,
    allowlist,
  })
  assert.deepEqual(authorizedBlocker, {
    ok: false,
    reason: "verifier-blocker-current-head",
  })
})

test("human-control signals suppress the merge", () => {
  for (const overrides of [
    { issueLabels: ["merge:human-required"] },
    { issueLabels: ["hold"] },
    { issueLabels: ["needs-human"] },
    { hasStopComment: true },
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
