const DEFAULT_REQUIRED_SECTIONS = [
  "Context",
  "Requirements",
  "Acceptance Criteria",
  "Target Files",
];

const DEFAULT_HOLD_LABELS = ["hold", "needs-human"];
const DEFAULT_TOPOLOGY_LABELS = ["topology:combined", "topology:split"];

// Visible split-topology handoff markers. These are the provider-neutral
// contract between planner, builder, verifier, and the CI policy gates
// (policy-verifier-gate / policy-auto-merge) — any executor that posts them
// participates in the topology.
const SPLIT_MARKERS = {
  plannerComplete: "<!-- split-planner-complete -->",
  verifierPass: "<!-- split-verifier-pass -->",
  verifierBlocker: "<!-- split-verifier-blocker -->",
};

function normalizeHeadingName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractMarkdownSections(markdown) {
  const lines = String(markdown || "").split("\n");
  const sections = new Map();
  let currentName = null;
  let buffer = [];

  function flush() {
    if (!currentName) {
      return;
    }
    sections.set(normalizeHeadingName(currentName), buffer.join("\n").trim());
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      flush();
      currentName = match[1];
      buffer = [];
      continue;
    }

    if (currentName) {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

function hasMeaningfulSectionContent(value) {
  const text = String(value || "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/`/g, "")
    .trim();

  if (!text) {
    return false;
  }

  const placeholderPatterns = [
    /^describe\b/i,
    /^list\b/i,
    /^optional\b/i,
    /^requirement\s+\d+\b/i,
    /^acceptance criterion\s+\d+\b/i,
    /^path\/or\/subsystem-\d+\b/i,
  ];

  return !placeholderPatterns.some((pattern) => pattern.test(text));
}

function getCurrentLifecycleState(issue) {
  const labels = (issue.labels || []).map((label) =>
    typeof label === "string" ? label : label.name
  );
  const lifecycleOrder = ["ready-for-build", "in-progress", "in-review", "done"];
  return lifecycleOrder.find((label) => labels.includes(label)) || null;
}

function isAllowedForwardTransition(currentState, nextState) {
  const transitions = {
    "ready-for-build": ["in-progress"],
    "in-progress": ["in-review"],
    "in-review": ["done"],
  };

  return Boolean(transitions[currentState] && transitions[currentState].includes(nextState));
}

function extractRequiredVerificationCommands(config = {}) {
  const verification = config.verification || {};
  return [verification.lint, verification.build].filter(Boolean);
}

function evaluateReviewReadiness(issue, linkedPullRequests, config = {}) {
  const pullRequests = linkedPullRequests || [];
  const nonDraftPr = pullRequests.find((pr) => !pr.isDraft) || null;
  const prBody = nonDraftPr ? String(nonDraftPr.body || "") : "";
  const prSections = extractMarkdownSections(prBody);
  const verificationCommands = extractRequiredVerificationCommands(config);
  const verificationSection =
    prSections.get(normalizeHeadingName("Verification")) || "";
  const linkedIssueSection =
    prSections.get(normalizeHeadingName("Linked Issue")) || "";

  const missing = [];
  if (!nonDraftPr) {
    missing.push("A non-draft linked PR is required.");
  }

  if (!hasMeaningfulSectionContent(verificationSection)) {
    missing.push("The linked PR must contain a non-empty Verification section.");
  } else {
    const absentCommands = verificationCommands.filter(
      (command) => !verificationSection.includes(command)
    );
    if (absentCommands.length) {
      missing.push(
        `The linked PR Verification section must mention required commands: ${absentCommands.join(", ")}.`
      );
    }
  }

  if (!hasMeaningfulSectionContent(linkedIssueSection)) {
    missing.push("The linked PR must contain a Linked Issue section.");
  } else if (!/#\d+/.test(linkedIssueSection)) {
    missing.push("The linked PR Linked Issue section must reference the issue number.");
  }

  return {
    ok: missing.length === 0,
    findings: missing,
    reviewPr: nonDraftPr,
  };
}

function evaluateDoneReadiness(linkedPullRequests) {
  const pullRequests = linkedPullRequests || [];
  const mergedPr = pullRequests.find((pr) => Boolean(pr.mergedAt)) || null;

  return {
    ok: Boolean(mergedPr),
    findings: mergedPr ? [] : ["A merged linked PR is required before moving to `done`."],
    mergedPr,
  };
}

function evaluateReadiness(issue, config = {}) {
  const labels = (issue.labels || []).map((label) =>
    typeof label === "string" ? label : label.name
  );
  const sections = extractMarkdownSections(issue.body);
  const requiredSections = config.issueRequiredSections || DEFAULT_REQUIRED_SECTIONS;
  const holdLabels = config.holdLabels || DEFAULT_HOLD_LABELS;
  const topologyLabels = config.topologyLabels || DEFAULT_TOPOLOGY_LABELS;

  const missingSections = requiredSections.filter((sectionName) => {
    const body = sections.get(normalizeHeadingName(sectionName));
    return !hasMeaningfulSectionContent(body);
  });

  const blockingLabels = holdLabels.filter((label) => labels.includes(label));
  const topologyPresent = topologyLabels.some((label) => labels.includes(label));

  return {
    ok:
      missingSections.length === 0 &&
      blockingLabels.length === 0 &&
      topologyPresent,
    missingSections,
    blockingLabels,
    topologyPresent,
  };
}

// The reuse contract: a planner handoff that never looked for prior art does
// not authorize the builder. Structural presence is machine-checked here;
// content quality is the verifier's reuse audit.
const HANDOFF_REUSE_SECTION = "### Prior Art & Reuse";

// Split topology gate: the builder may not start (and the issue may not
// advance past build) until a visible planner handoff exists on the issue.
// Not applicable to combined topology. The planner itself runs after the
// issue enters `in-progress`, so this is NOT part of the in-progress gate.
function evaluateSplitBuildReadiness(issue, issueComments) {
  const labels = (issue.labels || []).map((label) =>
    typeof label === "string" ? label : label.name
  );

  if (!labels.includes("topology:split")) {
    return { ok: true, applicable: false, findings: [] };
  }

  const bodies = (issueComments || [])
    .map((comment) => comment?.body)
    .filter((body) => typeof body === "string");
  const handoffs = bodies.filter((body) =>
    body.includes(SPLIT_MARKERS.plannerComplete)
  );

  const findings = [];
  if (!handoffs.length) {
    findings.push(
      `\`topology:split\` requires a visible planner handoff comment containing \`${SPLIT_MARKERS.plannerComplete}\` on the issue before the builder may start.`
    );
  } else if (!handoffs[handoffs.length - 1].includes(HANDOFF_REUSE_SECTION)) {
    findings.push(
      `The planner handoff is missing its \`${HANDOFF_REUSE_SECTION}\` section. A handoff that never searched for existing implementations does not authorize the builder — re-run the planner.`
    );
  }

  return {
    ok: findings.length === 0,
    applicable: true,
    findings,
  };
}

function validateLifecycleTransition(issue, nextState, config = {}, providerState = {}) {
  const currentState = getCurrentLifecycleState(issue);
  const findings = [];

  if (!currentState) {
    findings.push("The work item must already have a lifecycle label before transition.");
  } else if (!isAllowedForwardTransition(currentState, nextState)) {
    findings.push(
      `Unsupported lifecycle transition from \`${currentState}\` to \`${nextState}\`.`
    );
  }

  if (findings.length) {
    return { ok: false, findings, currentState };
  }

  if (nextState === "in-progress") {
    const readiness = evaluateReadiness(issue, config);

    if (readiness.missingSections.length) {
      findings.push(
        `Missing or empty required issue sections: ${readiness.missingSections.join(", ")}.`
      );
    }

    if (readiness.blockingLabels.length) {
      findings.push(
        `Blocking hold labels present: ${readiness.blockingLabels.join(", ")}.`
      );
    }

    if (!readiness.topologyPresent) {
      findings.push("A topology label is required before moving to `in-progress`.");
    }

    return {
      ok: findings.length === 0,
      findings,
      currentState,
      readiness,
    };
  }

  if (nextState === "in-review") {
    const review = evaluateReviewReadiness(
      issue,
      providerState.linkedPullRequests,
      config
    );
    const reviewFindings = [...review.findings];

    const splitReadiness = evaluateSplitBuildReadiness(
      issue,
      providerState.issueComments
    );
    if (splitReadiness.applicable && !splitReadiness.ok) {
      reviewFindings.push(...splitReadiness.findings);
    }

    return {
      ok: reviewFindings.length === 0,
      findings: reviewFindings,
      currentState,
      review,
    };
  }

  if (nextState === "done") {
    const done = evaluateDoneReadiness(providerState.linkedPullRequests);
    return {
      ok: done.ok,
      findings: done.findings,
      currentState,
      done,
    };
  }

  return {
    ok: true,
    findings: [],
    currentState,
  };
}

module.exports = {
  DEFAULT_REQUIRED_SECTIONS,
  DEFAULT_HOLD_LABELS,
  DEFAULT_TOPOLOGY_LABELS,
  HANDOFF_REUSE_SECTION,
  SPLIT_MARKERS,
  evaluateReadiness,
  evaluateSplitBuildReadiness,
  extractMarkdownSections,
  getCurrentLifecycleState,
  validateLifecycleTransition,
};
