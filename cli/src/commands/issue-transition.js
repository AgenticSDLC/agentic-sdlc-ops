const path = require("path");
const { updateIssueLifecycle } = require("../lib/github");
const { printFooter, printKeyValue, printPathList, printSection } = require("../ui");

function normalizeLabels(values) {
  if (!values) {
    return [];
  }

  const items = Array.isArray(values) ? values : [values];
  return items
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

async function handleIssueTransition(args) {
  const rootDir = path.resolve(args.target || process.cwd());
  const result = updateIssueLifecycle(rootDir, {
    issue: args.issue,
    nextState: args.state,
    addLabels: normalizeLabels(args.label),
    removeLabels: normalizeLabels(args.removeLabel),
  });

  printSection("Issue Transition");
  printKeyValue("Repository", result.repoSlug);
  printKeyValue("Issue", `#${result.issue.number}`);
  printKeyValue("Title", result.issue.title);
  printKeyValue("URL", result.issue.url);
  printPathList(
    "Labels",
    result.issue.labels.map((label) => label.name)
  );

  if (args.state === "ready-for-build") {
    printFooter("Publish or confirm the issue scope, then move it to `in-progress` when execution is authorized.");
  } else if (args.state === "in-progress") {
    printFooter("Post the preflight plan in the issue, then begin implementation.");
  } else if (args.state === "in-review") {
    printFooter("Open the PR or attach review evidence, then gather validation results.");
  } else {
    printFooter("Confirm merge and closure evidence are recorded, then start the next issue-first task.");
  }
}

module.exports = {
  handleIssueTransition,
};
