export const READINESS_BLOCKING_LABELS = [
  "merge:human-required",
  "hold",
  "needs-human",
]

export function decidePullRequestReadiness(input = {}) {
  const issueLabels = input.issueLabels ?? []

  if (!input.isDraft) {
    return { ready: false, reason: "pr-already-ready" }
  }

  if (issueLabels.includes("topology:split")) {
    return { ready: false, reason: "split-topology-awaits-verifier" }
  }

  const blocker = READINESS_BLOCKING_LABELS.find((label) =>
    issueLabels.includes(label),
  )
  if (blocker) {
    return { ready: false, reason: `blocking-label:${blocker}` }
  }

  if (input.hasStopComment) {
    return { ready: false, reason: "stop-comment" }
  }

  return { ready: true, reason: "combined-builder-push" }
}
