const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  IMPLEMENTATION_MARKER,
  SPLIT_MARKERS,
  buildDefaultPlannerHandoff,
  buildPlannerHandoffComment,
  buildVerifierBlockerComment,
  buildVerifierPassComment,
  detectNextRole,
  detectSplitPhases,
  getLatestPlannerHandoff,
} = require("../runtime-split");

const plannerComment = { body: `## Planner Handoff\n\nplan A\n\n${SPLIT_MARKERS.plannerComplete}` };
const implementationComment = { body: `${IMPLEMENTATION_MARKER}\n## Implementation Result` };

test("detectSplitPhases reads the visible marker trail", () => {
  assert.deepEqual(detectSplitPhases([]), {
    planner: false,
    implementation: false,
    verifierPass: false,
    verifierBlocker: false,
  });

  const phases = detectSplitPhases([plannerComment, implementationComment]);
  assert.equal(phases.planner, true);
  assert.equal(phases.implementation, true);
  assert.equal(phases.verifierPass, false);
});

test("detectNextRole follows planner → builder → verifier", () => {
  assert.equal(detectNextRole(detectSplitPhases([])), "planner");
  assert.equal(detectNextRole(detectSplitPhases([plannerComment])), "builder");
  assert.equal(
    detectNextRole(detectSplitPhases([plannerComment, implementationComment])),
    "verifier"
  );
});

test("getLatestPlannerHandoff returns the newest handoff without the marker", () => {
  assert.equal(getLatestPlannerHandoff([]), null);

  const newer = { body: `## Planner Handoff\n\nplan B\n\n${SPLIT_MARKERS.plannerComplete}` };
  const handoff = getLatestPlannerHandoff([plannerComment, newer]);
  assert.ok(handoff.includes("plan B"));
  assert.ok(!handoff.includes(SPLIT_MARKERS.plannerComplete));
});

test("planner handoff comment ends with the completion marker", () => {
  const comment = buildPlannerHandoffComment("## Planner Handoff\n\ncontent");
  assert.ok(comment.trimEnd().endsWith(SPLIT_MARKERS.plannerComplete));
});

test("default planner handoff carries the required sections", () => {
  const issue = {
    number: 9,
    title: "[TASK] t",
    body: "## Acceptance Criteria\n- works\n## Target Files\n- src/x.js",
  };
  const handoff = buildDefaultPlannerHandoff(issue);
  for (const heading of [
    "## Planner Handoff",
    "### Chosen Approach",
    "### Files Expected To Change",
    "### Prior Art & Reuse",
    "### Acceptance Criteria Mapping",
    "### Scope Confirmation",
  ]) {
    assert.ok(handoff.includes(heading), heading);
  }
  assert.ok(handoff.includes("src/x.js"));
});

test("a generated handoff missing Prior Art & Reuse gets the fallback section appended", () => {
  const comment = buildPlannerHandoffComment("## Planner Handoff\n\n### Chosen Approach\nplan");
  assert.ok(comment.includes("### Prior Art & Reuse"));
  assert.ok(comment.trimEnd().endsWith(SPLIT_MARKERS.plannerComplete));

  const withSection = "## Planner Handoff\n\n### Prior Art & Reuse\nreuse lib/x.ts";
  const untouched = buildPlannerHandoffComment(withSection);
  assert.equal(untouched.match(/### Prior Art & Reuse/g).length, 1);
});

test("verifier pass comments bind the attestation to the audited head SHA", () => {
  const headSha = "abc1234def5678900000000000000000000000ff";
  const pass = buildVerifierPassComment([{ name: "verify", bucket: "pass" }], headSha);
  assert.ok(pass.includes(SPLIT_MARKERS.verifierPass));
  assert.ok(pass.includes(`<!-- split-verifier-sha: ${headSha} -->`));
  assert.ok(!pass.includes(SPLIT_MARKERS.verifierBlocker));

  const blocker = buildVerifierBlockerComment(
    [{ name: "verify", bucket: "fail", link: "http://x" }],
    ["scope creep"]
  );
  assert.ok(blocker.includes(SPLIT_MARKERS.verifierBlocker));
  assert.ok(!blocker.includes("split-verifier-sha"));
  assert.ok(blocker.includes("verify: fail"));
  assert.ok(blocker.includes("scope creep"));
});
