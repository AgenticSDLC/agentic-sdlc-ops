const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  SPLIT_MARKERS,
  evaluateSplitBuildReadiness,
  validateLifecycleTransition,
} = require("../policy");

function splitIssue(labels = ["in-progress", "topology:split"]) {
  return {
    number: 42,
    title: "[TASK] split pilot",
    labels: labels.map((name) => ({ name })),
    body: [
      "## Context",
      "Real context.",
      "## Requirements",
      "Do the thing.",
      "## Acceptance Criteria",
      "- it works",
      "## Target Files",
      "- src/app.js",
    ].join("\n"),
  };
}

const handoffComment = {
  body: [
    "## Planner Handoff",
    "",
    "### Chosen Approach",
    "plan",
    "",
    "### Prior Art & Reuse",
    "Searched lib/ for existing helpers; nothing equivalent exists.",
    "",
    SPLIT_MARKERS.plannerComplete,
  ].join("\n"),
};

test("split build readiness is not applicable to combined issues", () => {
  const decision = evaluateSplitBuildReadiness(
    splitIssue(["in-progress", "topology:combined"]),
    []
  );
  assert.equal(decision.ok, true);
  assert.equal(decision.applicable, false);
});

test("split build readiness fails without the planner marker", () => {
  const decision = evaluateSplitBuildReadiness(splitIssue(), [
    { body: "just a comment" },
  ]);
  assert.equal(decision.ok, false);
  assert.equal(decision.applicable, true);
  assert.match(decision.findings[0], /split-planner-complete/);
});

test("split build readiness passes with the planner marker", () => {
  const decision = evaluateSplitBuildReadiness(splitIssue(), [handoffComment]);
  assert.equal(decision.ok, true);
});

test("a handoff without a Prior Art & Reuse section does not authorize the builder", () => {
  const bareHandoff = {
    body: `## Planner Handoff\n\nplan\n\n${SPLIT_MARKERS.plannerComplete}`,
  };
  const decision = evaluateSplitBuildReadiness(splitIssue(), [bareHandoff]);
  assert.equal(decision.ok, false);
  assert.match(decision.findings[0], /Prior Art & Reuse/);
});

test("split build readiness treats missing comments as missing handoff", () => {
  const decision = evaluateSplitBuildReadiness(splitIssue(), undefined);
  assert.equal(decision.ok, false);
});

function reviewProviderState(issueComments) {
  return {
    linkedPullRequests: [
      {
        number: 7,
        isDraft: false,
        body: [
          "## Linked Issue",
          "Closes #42",
          "## Verification",
          "- lint - passed",
          "- build - passed",
        ].join("\n\n"),
      },
    ],
    issueComments,
  };
}

const config = { verification: { lint: "lint", build: "build" } };

test("in-review transition on a split issue requires the planner marker", () => {
  const blocked = validateLifecycleTransition(
    splitIssue(),
    "in-review",
    config,
    reviewProviderState([])
  );
  assert.equal(blocked.ok, false);
  assert.ok(blocked.findings.some((f) => f.includes("split-planner-complete")));

  const allowed = validateLifecycleTransition(
    splitIssue(),
    "in-review",
    config,
    reviewProviderState([handoffComment])
  );
  assert.equal(allowed.ok, true, allowed.findings.join(" "));
});

test("in-review transition on a combined issue ignores the split gate", () => {
  const decision = validateLifecycleTransition(
    splitIssue(["in-progress", "topology:combined"]),
    "in-review",
    config,
    reviewProviderState([])
  );
  assert.equal(decision.ok, true, decision.findings.join(" "));
});
