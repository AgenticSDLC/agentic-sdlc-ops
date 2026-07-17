const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { LIFECYCLE_STATE_SET, LIFECYCLE_STATES } = require("../lib/lifecycle");
const { resolveDraftPath, parseDraftFile } = require("../lib/drafts");
const {
  buildConfig,
  inferProfile,
  inspectTarget,
} = require("../lib/web-app-context");
const {
  printFooter,
  printKeyValue,
  printPathList,
  printSection,
} = require("../ui");

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

function uniqueLabels(labels) {
  return [...new Set(labels)];
}

function getDefaultIssueLabels(config, options) {
  const lifecycle = options.state || "ready-for-build";
  const isSplit = options.topology === "split" || config.topology === "split";
  const topology = isSplit ? "topology:split" : "topology:combined";
  // Split routes to the planner first; combined goes straight to the builder.
  const roleLabel = isSplit ? "agent-planner" : "agent-builder";
  // `--state none` publishes without a lifecycle label — for issues with
  // upstream dependencies that must not enter ready-for-build yet.
  return lifecycle === "none"
    ? [topology, roleLabel]
    : [lifecycle, topology, roleLabel];
}

function printPublishResult(details, options = {}) {
  const { includeFooter = true } = options;
  printSection("Issue Published");
  printKeyValue("Spec", details.draft);
  printKeyValue("Title", details.title);
  printKeyValue("Repository", details.repoSlug);
  if (details.issueNumber) {
    printKeyValue("Issue", `#${details.issueNumber}`);
  }
  if (details.issueUrl) {
    printKeyValue("URL", details.issueUrl);
  }
  printPathList("Labels", details.labels);

  if (includeFooter) {
    const isSplit = (details.labels || []).includes("topology:split");
    const runtimeName = isSplit ? "split" : "combined";
    const outcome = isSplit
      ? "This runs the planner first; the builder starts only after the visible handoff exists."
      : "This will implement, verify, and advance the issue to in-review.";
    const nextStep = details.issueNumber
      ? `Next run: agentic-sdlc runtime ${runtimeName} --issue ${details.issueNumber}. ${outcome}`
      : `Next run: agentic-sdlc runtime ${runtimeName} --issue <issue-number>. ${outcome}`;
    printFooter(nextStep);
  }
}

async function handleIssuePublish(args) {
  const rootDir = path.resolve(args.target || process.cwd());
  const inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);

  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application.",
    );
  }

  const config = buildConfig(rootDir, { ...args, profile }, inspection);
  const controlPlane = getControlPlane(config);
  const draftPath = resolveDraftPath(rootDir, args.spec);
  const draft = parseDraftFile(draftPath);

  const extraLabels = normalizeLabels(args.label);
  const labels =
    args.defaultLabels === false
      ? uniqueLabels(extraLabels)
      : uniqueLabels([...getDefaultIssueLabels(config, args), ...extraLabels]);

  if (args.state && args.state !== "none" && !LIFECYCLE_STATE_SET.has(args.state)) {
    throw new Error(
      `Unsupported lifecycle state \`${args.state}\`. Use one of: ${LIFECYCLE_STATES.join(", ")}, or \`none\` to publish without a lifecycle label.`,
    );
  }

  if (args.dryRun) {
    printPublishResult(
      {
        draft: path.relative(rootDir, draftPath),
        title: draft.title,
        repoSlug: "dry-run",
        issueNumber: null,
        issueUrl: null,
        labels,
      },
      { includeFooter: false },
    );
    printFooter(
      "Dry run only. Re-run without `--dry-run` to create the GitHub issue.",
    );
    return;
  }

  const labelSync = controlPlane.capabilities.syncLabels(
    rootDir,
    config.standardLabels,
  );
  if (labelSync.status === "unavailable") {
    throw new Error(
      `Unable to sync standard GitHub labels: ${labelSync.reason}`,
    );
  }
  if (labelSync.status === "skipped") {
    throw new Error(
      "No GitHub origin remote detected. Connect the repository before publishing an issue.",
    );
  }

  const created = controlPlane.capabilities.createIssue(rootDir, {
    title: draft.title,
    body: draft.body,
    labels,
  });

  printSection("GitHub Label Status");
  printKeyValue("Repository", labelSync.repoSlug || created.repoSlug);
  printKeyValue("Status", labelSync.status);
  printPathList("Created", labelSync.created || []);
  printPathList("Updated", labelSync.updated || []);
  printPathList("Skipped", labelSync.skipped || []);

  printPublishResult({
    draft: path.relative(rootDir, draftPath),
    title: created.issue.title,
    repoSlug: created.repoSlug,
    issueNumber: created.issue.number,
    issueUrl: created.issue.url,
    labels: created.issue.labels.map((label) => label.name),
  });
}

module.exports = {
  handleIssuePublish,
};
