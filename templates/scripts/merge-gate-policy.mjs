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
export const MERGE_MODES = ["auto", "human-required", "disabled"]

/**
 * Optional verifier identity enforcement. Empty = any author may attest
 * (single-operator mode). To require an independent verifier, list the
 * identities allowed to post new SHA-bound verifier verdicts (e.g. a
 * machine account or bot the builder cannot act as) — see
 * docs/operations/SETUP-PREREQS.md.
 */
export const VERIFIER_ALLOWLIST = []

const PASS_MARKER = "<!-- split-verifier-pass -->"
const BLOCKER_MARKER = "<!-- split-verifier-blocker -->"
const SHA_MARKER = /<!--\s*split-verifier-sha:\s*([0-9a-fA-F]{7,40})\s*-->/g
const VALID_SHA = /^[0-9a-f]{7,40}$/

/**
 * Convert ordered provider comments into provider-neutral verifier verdicts.
 * Provider adapters own deterministic comment ordering and supply a unique
 * sequence. This parser owns marker semantics for every policy consumer.
 *
 * @param {Array<{body: string, author: string, sequence: number}>} comments
 * @returns {Array<{
 *   kind: "pass"|"blocker"|"malformed",
 *   author: string,
 *   sha: string|null,
 *   sequence: number,
 *   malformedReason: string|null,
 * }>}
 */
export function parseVerifierComments(comments = []) {
  return comments.flatMap((comment) => {
    const body = typeof comment.body === "string" ? comment.body : ""
    const hasPass = body.includes(PASS_MARKER)
    const hasBlocker = body.includes(BLOCKER_MARKER)
    if (!hasPass && !hasBlocker) return []

    const shaValues = new Set(
      [...body.matchAll(SHA_MARKER)].map((match) => match[1].toLowerCase()),
    )
    const sha = shaValues.size === 1 ? [...shaValues][0] : null
    let kind = hasPass ? "pass" : "blocker"
    let malformedReason = null

    if (hasPass && hasBlocker) {
      kind = "malformed"
      malformedReason = "conflicting-verdict-markers"
    } else if (shaValues.size > 1) {
      kind = "malformed"
      malformedReason = "conflicting-sha-markers"
    }

    return [{
      kind,
      author: typeof comment.author === "string" ? comment.author : "",
      sha,
      sequence: comment.sequence,
      malformedReason,
    }]
  })
}

function isAuthorized(verdict, allowlist) {
  return allowlist.length === 0 || allowlist.includes(verdict.author)
}

function matchesHead(sha, headSha) {
  return (
    typeof sha === "string" &&
    VALID_SHA.test(sha) &&
    typeof headSha === "string" &&
    headSha.toLowerCase().startsWith(sha)
  )
}

/**
 * Evaluate one append-only verifier verdict timeline for the current PR head.
 * Bound verdicts for older heads remain history. Among relevant current-head,
 * legacy-unbound, and malformed evidence, the latest sequence wins.
 *
 * @param {object} input
 * @param {Array<{
 *   kind: "pass"|"blocker"|"malformed",
 *   author: string,
 *   sha: string|null,
 *   sequence: number,
 *   malformedReason: string|null,
 * }>} input.verifierVerdicts
 * @param {string} input.headSha        the PR's current head SHA
 * @param {string[]} [input.allowlist]  override for tests; defaults to VERIFIER_ALLOWLIST
 * @returns {{ ok: boolean, reason: string }}
 */
export function evaluateVerifierAttestation(input) {
  const allowlist = input.allowlist ?? VERIFIER_ALLOWLIST
  const verdicts = input.verifierVerdicts ?? []
  const sequences = new Set()

  for (const verdict of verdicts) {
    if (
      !Number.isFinite(verdict.sequence) ||
      !Number.isInteger(verdict.sequence) ||
      verdict.sequence < 0 ||
      sequences.has(verdict.sequence)
    ) {
      return { ok: false, reason: "verifier-verdict-malformed" }
    }
    sequences.add(verdict.sequence)
  }

  const ordered = [...verdicts].sort((left, right) => left.sequence - right.sequence)
  const relevant = ordered.filter((verdict) => {
    if (verdict.kind === "blocker" && verdict.sha === null) {
      return true
    }
    if (verdict.kind === "malformed") {
      return (
        isAuthorized(verdict, allowlist) &&
        (verdict.sha === null || matchesHead(verdict.sha, input.headSha))
      )
    }
    return (
      isAuthorized(verdict, allowlist) &&
      matchesHead(verdict.sha, input.headSha)
    )
  })

  const latest = relevant.at(-1)
  if (latest?.kind === "pass") {
    return { ok: true, reason: "verifier-attestation-valid" }
  }
  if (latest?.kind === "blocker") {
    return {
      ok: false,
      reason: latest.sha === null
        ? "verifier-blocker-legacy-unbound"
        : "verifier-blocker-current-head",
    }
  }
  if (latest?.kind === "malformed") {
    return { ok: false, reason: "verifier-verdict-malformed" }
  }

  for (const verdict of [...ordered].reverse()) {
    if (verdict.kind !== "pass") continue
    if (!isAuthorized(verdict, allowlist)) {
      if (matchesHead(verdict.sha, input.headSha)) {
        return { ok: false, reason: "verifier-not-authorized" }
      }
      continue
    }
    return {
      ok: false,
      reason: verdict.sha === null
        ? "verifier-pass-not-sha-bound"
        : "verifier-pass-stale-sha",
    }
  }

  return { ok: false, reason: "no-verifier-pass" }
}

export function resolveTopology(issueLabels = []) {
  const hasCombined = issueLabels.includes("topology:combined")
  const hasSplit = issueLabels.includes("topology:split")

  if (hasCombined && hasSplit) {
    return { ok: false, topology: null, reason: "topology-conflict" }
  }
  if (hasSplit) {
    return { ok: true, topology: "split", reason: "topology-split" }
  }
  return { ok: true, topology: "combined", reason: "topology-combined" }
}

/**
 * @param {object} input
 * @param {boolean} input.isOpen              PR state is open
 * @param {boolean} input.isDraft             PR is a draft
 * @param {Array<object>} input.verifierVerdicts
 *   parsed ordered verdict records (see parseVerifierComments)
 * @param {boolean} input.hasStopComment      a stop signal comment exists
 * @param {string[]} input.issueLabels        labels on the linked issue
 * @param {string} input.headSha              the PR's current head SHA
 * @param {Array<{name: string, headSha: string, status: string, conclusion: string | null}>} input.checkRuns
 *   check runs observed for the PR head (any SHA — the policy filters)
 * @param {"auto"|"human-required"|"disabled"} [input.mergeMode]
 *   repository-level merge mode; defaults to auto
 * @param {string[]} [input.requiredChecks]   override for tests; defaults to REQUIRED_CHECKS
 * @param {string[]} [input.verifierAllowlist] override for tests; defaults to VERIFIER_ALLOWLIST
 * @returns {{ merge: boolean, reason: string }}
 */
export function decideMerge(input) {
  const requiredChecks = input.requiredChecks ?? REQUIRED_CHECKS
  const mergeMode = input.mergeMode ?? "auto"

  if (!input.isOpen) return { merge: false, reason: "pr-not-open" }
  if (input.isDraft) return { merge: false, reason: "pr-is-draft" }

  if (!MERGE_MODES.includes(mergeMode)) {
    return { merge: false, reason: `merge-mode-invalid:${mergeMode}` }
  }
  if (mergeMode === "disabled") {
    return { merge: false, reason: "merge-mode-disabled" }
  }
  if (mergeMode === "human-required") {
    return { merge: false, reason: "merge-mode-human-required" }
  }

  const blocker = BLOCKING_LABELS.find((label) => input.issueLabels.includes(label))
  if (blocker) return { merge: false, reason: `blocking-label:${blocker}` }

  if (input.hasStopComment) return { merge: false, reason: "stop-comment" }

  const topology = resolveTopology(input.issueLabels)
  if (!topology.ok) return { merge: false, reason: topology.reason }

  if (topology.topology === "split") {
    const attestation = evaluateVerifierAttestation({
      verifierVerdicts: input.verifierVerdicts,
      headSha: input.headSha,
      allowlist: input.verifierAllowlist,
    })
    if (!attestation.ok) return { merge: false, reason: attestation.reason }
  }

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
