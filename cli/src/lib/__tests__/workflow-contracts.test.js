const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../../../..");
const workflowDir = path.join(rootDir, ".github", "workflows", "examples");

function readWorkflow(fileName) {
  return fs.readFileSync(path.join(workflowDir, fileName), "utf8");
}

test("every generated pull-request validator handles ready_for_review", () => {
  const requiredWorkflowSources = [
    "commit-message-validator.example.yml",
    "content-spec-coupling.example.yml",
    "e2e-test-contract.example.yml",
    "playwright-smoke-screenshots.example.yml",
    "policy-verifier-gate.example.yml",
    "pr-contract-validator.example.yml",
    "reuse-guard.example.yml",
    "tsconfig-change-guard.example.yml",
  ];

  for (const fileName of requiredWorkflowSources) {
    const source = readWorkflow(fileName);
    assert.match(
      source,
      /ready_for_review/,
      `${fileName} must subscribe to ready_for_review`
    );
  }
});

test("draft bootstrapper uses the workflow token for downstream PR events", () => {
  const source = readWorkflow("draft-pr-bootstrapper.example.yml");

  assert.match(source, /secrets\.WORKFLOW_TOKEN/);
  assert.match(source, /pr-readiness-policy\.mjs/);
  assert.match(source, /markPullRequestReadyForReview/);
});
