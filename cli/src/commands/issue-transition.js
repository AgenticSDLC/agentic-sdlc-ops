const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { isLifecycleState } = require("../lib/lifecycle");
const { validateLifecycleTransition } = require("../lib/policy");
const { buildConfig, inferProfile, inspectTarget } = require("../lib/web-app-context");
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
  if (!isLifecycleState(args.state)) {
    throw new Error(`Unsupported lifecycle state \`${args.state}\`.`);
  }

  const inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);
  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application."
    );
  }

  const config = buildConfig(rootDir, { ...args, profile }, inspection);
  const controlPlane = getControlPlane(config);
  const current = controlPlane.capabilities.getIssue(rootDir, args.issue);
  const linkedPullRequests =
    args.state === "in-review" || args.state === "done"
      ? controlPlane.capabilities.getLinkedPullRequests(rootDir, args.issue).pullRequests
      : [];
  const policyDecision = validateLifecycleTransition(
    current.issue,
    args.state,
    config,
    { linkedPullRequests }
  );
  if (!policyDecision.ok) {
    throw new Error(
      `Lifecycle policy blocked transition to \`${args.state}\`: ${policyDecision.findings.join(" ")}`
    );
  }

  const result = controlPlane.capabilities.updateLifecycle(rootDir, {
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
