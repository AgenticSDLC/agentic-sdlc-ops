const { handleIssueList } = require("../issue-list");

test("handleIssueList runs without crashing", async () => {
  // This is a smoke test; in real usage, mock getControlPlane and its listIssues
  await handleIssueList({});
});
