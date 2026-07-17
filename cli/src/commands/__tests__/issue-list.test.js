const assert = require("node:assert/strict");
const { test } = require("node:test");
const { handleIssueList } = require("../issue-list");

test("issue-list exports a callable handler", () => {
  // Behavior requires a live gh-backed repository; unit scope is the export
  // contract only.
  assert.equal(typeof handleIssueList, "function");
});
