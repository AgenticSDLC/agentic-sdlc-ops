const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("published package includes every non-template overlay source", () => {
  const rootDir = path.resolve(__dirname, "../../../..");
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8")
  );

  assert.ok(
    packageJson.files.includes(".github/workflows/examples/"),
    "package.json must publish the workflow examples loaded by the overlay generator"
  );

  const requiredWorkflowSources = [
    "issue-readiness-validator.example.yml",
    "draft-pr-bootstrapper.example.yml",
    "issue-pr-state-sync.example.yml",
    "pr-contract-validator.example.yml",
    "commit-message-validator.example.yml",
    "policy-auto-merge.example.yml",
    "policy-verifier-gate.example.yml",
  ];

  for (const fileName of requiredWorkflowSources) {
    assert.ok(
      fs.existsSync(path.join(rootDir, ".github", "workflows", "examples", fileName)),
      `missing published workflow source: ${fileName}`
    );
  }
});
