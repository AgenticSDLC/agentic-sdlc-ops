const path = require("path");
const { syncStandardLabels } = require("../lib/github");
const { generateOverlay } = require("../lib/overlay");
const { assessDoctor, printDoctorResult } = require("./doctor");
const {
  buildConfig,
  ensureGitState,
  evaluatePrerequisites,
  inferProfile,
  inspectTarget,
} = require("../lib/web-app-context");
const { printFooter, printKeyValue, printPathList, printSection, printState } = require("../ui");

function printOutcome(outcome, details) {
  printSection("Prerequisite Outcome");
  printState("State", outcome);
  for (const [label, value] of Object.entries(details)) {
    printKeyValue(label, value);
  }
}

async function handleInit(args) {
  const rootDir = path.resolve(args.target || process.cwd());
  let inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);

  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application."
    );
  }

  if (inspection.exists && inspection.isDirectory && !inspection.hasGit) {
    const hasGit = await ensureGitState(rootDir, args, inspection);
    if (!hasGit) {
      printOutcome("blocked-missing-repo", {
        target: rootDir,
        remediation: "Initialize git and rerun init.",
      });
      return;
    }
    inspection = inspectTarget(rootDir);
  }

  const resolvedArgs = { ...args, profile };
  const prereq = evaluatePrerequisites(inspection, resolvedArgs);
  if (prereq.state.startsWith("blocked-")) {
    printOutcome(prereq.state, {
      target: rootDir,
      remediation: prereq.remediation,
    });
    return;
  }

  const config = buildConfig(rootDir, resolvedArgs, inspection);
  printOutcome(prereq.state, {
    target: rootDir,
    installMode: config.installMode,
    stackPreset: config.stackPreset,
    appShape: config.appShape,
  });
  printSection("Inferred Values");
  printKeyValue("Profile", profile);
  printKeyValue("GitHub Mode", prereq.state === "ready-local-only" ? "local-only" : "github-backed");
  printKeyValue("Seed Issue", config.seedIssue ? "enabled" : "disabled");
  printKeyValue("Detected From", `${config.stackPreset}, ${config.installMode}, ${config.appShape}`);

  const summary = generateOverlay(config, rootDir);
  printSection("Generated Overlay");
  printPathList("Created", summary.created);
  printPathList("Updated", summary.updated);
  printPathList("Skipped", summary.skipped);

  if (prereq.state !== "ready-local-only") {
    const labelSync = syncStandardLabels(rootDir);
    printSection("GitHub Labels");
    printKeyValue("Repository", labelSync.repoSlug || "unknown");
    printKeyValue("Status", labelSync.status);
    if (labelSync.reason) {
      printKeyValue("Reason", labelSync.reason);
    }
    printPathList("Created", labelSync.created || []);
    printPathList("Updated", labelSync.updated || []);
    printPathList("Skipped", labelSync.skipped || []);
  }

  const doctorResult = assessDoctor(rootDir, resolvedArgs);
  printDoctorResult(doctorResult.state, doctorResult.details, doctorResult.findings, {
    includeFooter: false,
  });
  if (doctorResult.state === "pass") {
    printFooter("Create or publish the pilot issue, then implement the first PR-sized task.");
  } else if (doctorResult.state === "local-only") {
    printFooter("Connect a GitHub remote when ready, or continue with local draft issues for now.");
  } else {
    printFooter("Address the findings above, then rerun `agentic-sdlc doctor`.");
  }
}

module.exports = {
  handleInit,
};
