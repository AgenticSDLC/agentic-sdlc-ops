// Merge-gate decision policy for repository-owned auto-merge.
//
// When branch protection or rulesets are unavailable (or as a defense in
// depth alongside them), this module is the single authority for when
// automation may squash-merge a PR. It is pure and deterministic: the
// policy-auto-merge workflow gathers GitHub state and passes it in; tests
// exercise the decision table directly (see merge-gate-policy.test.mjs).

/**
 * Named verification jobs that must succeed for the current PR head SHA
 * before automation may merge.
 *
 * ADAPTER REQUIRED: replace the placeholder with your repository's verify
 * job names (the `name:` of each job as it appears in PR check runs).
 * The gate fails closed — while the placeholder is present, automation
 * never merges and logs `check-missing:REPLACE-WITH-YOUR-VERIFY-JOB-NAME`.
 */
export const REQUIRED_CHECKS = [
  "REPLACE-WITH-YOUR-VERIFY-JOB-NAME",
]

export const BLOCKING_LABELS = ["merge:human-required", "hold", "needs-human"]

/**
 * Optional verifier identity enforcement. Empty = any author may attest
 * (single-operator mode). To require an independent verifier, list the
 * GitHub logins allowed to post pass attestations (e.g. a machine account
 * or bot the builder cannot act as) — see docs/operations/SETUP-PREREQS.md.
 */
export const VERIFIER_ALLOWLIST = []

/**
 * A verifier pass attestation is only trusted when it is bound to the exact
 * commit it audited. Pass comments must contain BOTH markers:
 *
 *   <!-- split-verifier-pass -->
 *   <!-- split-verifier-sha: <sha> -->
 *
 * An unbound pass marker (no sha line) never satisfies the gate: it would
 * keep authorizing merges of commits nobody audited.
 *
 * @param {object} input
 * @param {Array<{author: string, sha: string | null}>} input.verifierPasses
 *   one entry per pass-marker comment: comment author login + bound sha (null when unbound)
 * @param {string} input.headSha        the PR's current head SHA
 * @param {string[]} [input.allowlist]  override for tests; defaults to VERIFIER_ALLOWLIST
 * @returns {{ ok: boolean, reason: string }}
 */
export function evaluateVerifierAttestation(input) {
  const allowlist = input.allowlist ?? VERIFIER_ALLOWLIST
  const passes = input.verifierPasses ?? []

  if (!passes.length) return { ok: false, reason: "no-verifier-pass" }

  const boundToHead = passes.filter(
    (pass) =>
      typeof pass.sha === "string" &&
      pass.sha.length >= 7 &&
      input.headSha.startsWith(pass.sha),
  )
  if (!boundToHead.length) {
    const anyBound = passes.some((pass) => typeof pass.sha === "string" && pass.sha.length >= 7)
    return {
      ok: false,
      reason: anyBound ? "verifier-pass-stale-sha" : "verifier-pass-not-sha-bound",
    }
  }

  if (allowlist.length) {
    const authorized = boundToHead.some((pass) => allowlist.includes(pass.author))
    if (!authorized) return { ok: false, reason: "verifier-not-authorized" }
  }

  return { ok: true, reason: "verifier-attestation-valid" }
}

/**
 * @param {object} input
 * @param {boolean} input.isOpen              PR state is open
 * @param {boolean} input.isDraft             PR is a draft
 * @param {Array<{author: string, sha: string | null}>} input.verifierPasses
 *   parsed pass-marker comments (see evaluateVerifierAttestation)
 * @param {boolean} input.hasBlockerMarker    a <!-- split-verifier-blocker --> comment exists
 * @param {boolean} input.hasStopComment      a stop signal comment exists
 * @param {string[]} input.issueLabels        labels on the linked issue
 * @param {string} input.headSha              the PR's current head SHA
 * @param {Array<{name: string, headSha: string, status: string, conclusion: string | null}>} input.checkRuns
 *   check runs observed for the PR head (any SHA — the policy filters)
 * @param {string[]} [input.requiredChecks]   override for tests; defaults to REQUIRED_CHECKS
 * @param {string[]} [input.verifierAllowlist] override for tests; defaults to VERIFIER_ALLOWLIST
 * @returns {{ merge: boolean, reason: string }}
 */
export function decideMerge(input) {
  const requiredChecks = input.requiredChecks ?? REQUIRED_CHECKS

  if (!input.isOpen) return { merge: false, reason: "pr-not-open" }
  if (input.isDraft) return { merge: false, reason: "pr-is-draft" }

  const blocker = BLOCKING_LABELS.find((label) => input.issueLabels.includes(label))
  if (blocker) return { merge: false, reason: `blocking-label:${blocker}` }

  if (input.hasStopComment) return { merge: false, reason: "stop-comment" }
  if (input.hasBlockerMarker) return { merge: false, reason: "verifier-blocker" }

  const attestation = evaluateVerifierAttestation({
    verifierPasses: input.verifierPasses,
    headSha: input.headSha,
    allowlist: input.verifierAllowlist,
  })
  if (!attestation.ok) return { merge: false, reason: attestation.reason }

  // Only runs for the exact current head SHA count. A newer commit
  // invalidates every check observed on an older SHA.
  const currentRuns = input.checkRuns.filter((run) => run.headSha === input.headSha)

  for (const name of requiredChecks) {
    const run = currentRuns.find((candidate) => candidate.name === name)
    if (!run) return { merge: false, reason: `check-missing:${name}` }
    if (run.status !== "completed") return { merge: false, reason: `check-pending:${name}` }
    if (run.conclusion !== "success") {
      return { merge: false, reason: `check-${run.conclusion ?? "unresolved"}:${name}` }
    }
  }

  return { merge: true, reason: "all-required-checks-passed" }
}
