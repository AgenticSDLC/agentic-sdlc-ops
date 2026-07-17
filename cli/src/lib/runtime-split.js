const { SPLIT_MARKERS, extractMarkdownSections } = require("./policy");

// The builder reuses the combined implementation marker — CI and the policy
// gates key off the split markers plus the draft PR, not a builder marker.
const IMPLEMENTATION_MARKER = "<!-- agentic-sdlc:implementation-complete -->";

const SPLIT_ROLES = ["planner", "builder", "verifier"];

function commentBodies(comments) {
  return (comments || [])
    .map((comment) => comment?.body)
    .filter((body) => typeof body === "string");
}

function detectSplitPhases(comments) {
  const bodies = commentBodies(comments);

  return {
    planner: bodies.some((b) => b.includes(SPLIT_MARKERS.plannerComplete)),
    implementation: bodies.some((b) => b.includes(IMPLEMENTATION_MARKER)),
    verifierPass: bodies.some((b) => b.includes(SPLIT_MARKERS.verifierPass)),
    verifierBlocker: bodies.some((b) => b.includes(SPLIT_MARKERS.verifierBlocker)),
  };
}

// The next role to run, derived from the visible marker trail.
function detectNextRole(phases) {
  if (!phases.planner) {
    return "planner";
  }
  if (!phases.implementation) {
    return "builder";
  }
  return "verifier";
}

// Latest comment carrying the planner handoff, with the marker stripped —
// this text is fed into the builder's implementation context.
function getLatestPlannerHandoff(comments) {
  const bodies = commentBodies(comments).filter((body) =>
    body.includes(SPLIT_MARKERS.plannerComplete)
  );

  if (!bodies.length) {
    return null;
  }

  return bodies[bodies.length - 1]
    .replace(SPLIT_MARKERS.plannerComplete, "")
    .trim();
}

function buildPlannerPrompt(issue, config, repoSlug) {
  const sections = extractMarkdownSections(issue.body);
  const context = sections.get("context") || "(none)";
  const requirements = sections.get("requirements") || "(none)";
  const acceptance = sections.get("acceptance criteria") || "(none)";
  const targetFiles =
    sections.get("target files") || sections.get("target subsystem") || "(none)";

  return [
    "You are the planner role in a split-topology agentic workflow.",
    "Produce ONLY the visible issue-side handoff for the builder, in Markdown.",
    "Do not implement code. Do not widen scope beyond the issue contract.",
    "",
    `Repository: ${repoSlug}`,
    `Issue: #${issue.number} ${issue.title}`,
    "",
    "## Issue Context",
    context,
    "",
    "## Requirements",
    requirements,
    "",
    "## Acceptance Criteria",
    acceptance,
    "",
    "## Target Files",
    targetFiles,
    "",
    "## Handoff Requirements",
    "Your handoff must contain exactly these level-3 sections:",
    "- `### Chosen Approach` — the narrowest viable implementation approach",
    "- `### Files Expected To Change` — exact files or surfaces, drawn only from Target Files",
    "- `### Prior Art & Reuse` — existing utilities, components, or patterns relevant to this task: for each, direct the builder to reuse it or justify concretely why it does not fit. If you cannot inspect the codebase, state what the builder must search for before creating anything new. Never leave this section empty.",
    "- `### Acceptance Criteria Mapping` — each criterion mapped to how the approach satisfies it",
    "- `### Scope Confirmation` — confirmation that the work stays within the issue contract",
    "",
    "Start the handoff with the heading `## Planner Handoff`.",
    "Respond with the handoff Markdown only — no preamble, no code fences around the whole document.",
  ].join("\n");
}

// Deterministic fallback used when no agent API key is available. Restates
// the issue contract as a structurally valid handoff.
function buildDefaultPlannerHandoff(issue) {
  const sections = extractMarkdownSections(issue.body);
  const acceptance = sections.get("acceptance criteria") || "(none declared)";
  const targetFiles =
    sections.get("target files") || sections.get("target subsystem") || "(none declared)";

  return [
    "## Planner Handoff",
    "",
    `Issue: #${issue.number} ${issue.title}`,
    "",
    "### Chosen Approach",
    "Implement the narrowest change that satisfies the issue contract without broadening scope.",
    "",
    "### Files Expected To Change",
    targetFiles,
    "",
    "### Prior Art & Reuse",
    "No automated prior-art search was performed (deterministic fallback handoff). Before creating any new helper, utility, or component, the builder must check the project adapter's Canonical Utilities (Reuse Map) and search the codebase for existing equivalents — reuse them, or record why they do not fit in the PR's Prior Art & Reuse section.",
    "",
    "### Acceptance Criteria Mapping",
    acceptance,
    "",
    "### Scope Confirmation",
    "The work stays within the issue contract. Only the files listed above are expected to change.",
  ].join("\n");
}

const HANDOFF_REUSE_FALLBACK = [
  "### Prior Art & Reuse",
  "No prior-art findings were recorded by the planner. Before creating any new helper, utility, or component, the builder must check the project adapter's Canonical Utilities (Reuse Map) and search the codebase for existing equivalents — reuse them, or record why they do not fit in the PR's Prior Art & Reuse section.",
].join("\n");

// The builder gate refuses handoffs without a Prior Art & Reuse section —
// never post one, even when the generating model omits it.
function ensureHandoffReuseSection(handoffText) {
  if (handoffText.includes("### Prior Art & Reuse")) {
    return handoffText;
  }
  return `${handoffText.trim()}\n\n${HANDOFF_REUSE_FALLBACK}`;
}

function buildPlannerHandoffComment(handoffText) {
  return `${ensureHandoffReuseSection(handoffText.trim())}\n\n${SPLIT_MARKERS.plannerComplete}`;
}

// The pass attestation is bound to the audited head SHA — the policy gates
// reject unbound or stale attestations, so a new commit always requires a
// fresh verifier pass.
function buildVerifierShaLine(headSha) {
  return `<!-- split-verifier-sha: ${headSha} -->`;
}

function buildVerifierPassComment(checks, headSha) {
  const lines = [
    "## Verifier Report — Pass",
    "",
    `All required CI checks completed successfully at head \`${String(headSha).slice(0, 7)}\`.`,
    "",
  ];

  if (checks && checks.length) {
    lines.push("### Checks", ...checks.map((c) => `- ${c.name}: ${c.bucket}`), "");
  }

  lines.push(SPLIT_MARKERS.verifierPass, buildVerifierShaLine(headSha));
  return lines.join("\n");
}

function buildVerifierBlockerComment(failingChecks, extraFindings = []) {
  const lines = [
    "## Verifier Report — Blocker",
    "",
    "Merge is blocked. The following problems must be resolved:",
    "",
  ];

  if (failingChecks && failingChecks.length) {
    lines.push(
      "### Failing Checks",
      ...failingChecks.map((c) => `- ${c.name}: ${c.bucket}${c.link ? ` (${c.link})` : ""}`),
      ""
    );
  }

  if (extraFindings.length) {
    lines.push("### Findings", ...extraFindings.map((f) => `- ${f}`), "");
  }

  lines.push(
    "Resolve the blockers, push to the issue branch, and rerun the verifier.",
    "",
    SPLIT_MARKERS.verifierBlocker
  );
  return lines.join("\n");
}

module.exports = {
  IMPLEMENTATION_MARKER,
  SPLIT_MARKERS,
  SPLIT_ROLES,
  buildDefaultPlannerHandoff,
  buildPlannerHandoffComment,
  buildPlannerPrompt,
  buildVerifierBlockerComment,
  buildVerifierPassComment,
  buildVerifierShaLine,
  ensureHandoffReuseSection,
  detectNextRole,
  detectSplitPhases,
  getLatestPlannerHandoff,
};
