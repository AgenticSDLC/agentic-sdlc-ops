const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { generateOverlay } = require("../lib/overlay");
const { assessDoctor, printDoctorResult } = require("./doctor");
const {
  buildConfig,
  ensureGitState,
  evaluatePrerequisites,
  inferProfile,
  inspectTarget,
} = require("../lib/web-app-context");
const { printFooter, printKeyValue, printList, printPathList, printSection, printState } = require("../ui");

function printOutcome(outcome, details) {
  printSection("Prerequisite Outcome");
  printState("State", outcome);
  for (const [label, value] of Object.entries(details)) {
    printKeyValue(label, value);
  }
}

function buildOnboardingGuidance(config, prereq, doctorResult, labelSync) {
  const guidance = [];

  if (prereq.state === "ready-local-only") {
    guidance.push("GitHub control plane is not fully wired yet. Add or verify the GitHub origin remote to unlock issue publish and lifecycle automation.");
  }

  if (labelSync && labelSync.status === "unavailable") {
    guidance.push("GitHub label sync failed. Run `gh auth status`, confirm the remote is reachable, then rerun `agentic-sdlc init`.");
    if (labelSync.remediation) {
      guidance.push(...labelSync.remediation);
    }
  }

  if (config.validationMode === "local-only") {
    guidance.push("Validation is currently local-only. Add CI, preview deployment, and a human QA gate before relying on auto-merge for user-visible work.");
  }

  if (!config.browserValidation.supported) {
    guidance.push("Playwright is not configured. Add `@playwright/test` and a browser validation script such as `test:e2e`.");
  }

  if (doctorResult.findings.some((finding) => finding.includes("Pilot issue drafts are incomplete"))) {
    guidance.push("Two pilot drafts are expected: one for combined topology and one for split topology.");
  }

  guidance.push("Lifecycle movement is now scriptable: use `agentic-sdlc issue transition --issue <n> --state <label>` instead of editing lifecycle labels by hand.");

  return [...new Set(guidance)];
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
  const controlPlane = getControlPlane(config);
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

  let labelSync = null;
  if (prereq.state !== "ready-local-only") {
    labelSync = controlPlane.capabilities.syncLabels(
      rootDir,
      config.standardLabels,
    );
    printSection("GitHub Labels");
    printKeyValue("Repository", labelSync.repoSlug || "unknown");
    printKeyValue("Status", labelSync.status);
    if (labelSync.reason) {
      printKeyValue("Reason", labelSync.reason);
    }
    if (labelSync.remediation && labelSync.remediation.length) {
      printList("GitHub Label Remediation", labelSync.remediation);
    }
    printPathList("Created", labelSync.created || []);
    printPathList("Updated", labelSync.updated || []);
    printPathList("Skipped", labelSync.skipped || []);
  }

  const doctorResult = assessDoctor(rootDir, resolvedArgs);
  const onboardingGuidance = buildOnboardingGuidance(config, prereq, doctorResult, labelSync);
  printDoctorResult(doctorResult.state, doctorResult.details, doctorResult.findings, {
    includeFooter: false,
  });
  if (onboardingGuidance.length) {
    printList("Onboarding Guidance", onboardingGuidance);
  }
  if (doctorResult.state === "pass") {
    printFooter("Publish one of the pilot issues, transition it to `in-progress`, then implement the first PR-sized task.");
  } else if (doctorResult.state === "local-only") {
    printFooter("Connect a GitHub remote when ready, or continue with local draft issues for now.");
  } else {
    printFooter("Address the findings above, then rerun `agentic-sdlc doctor`.");
  }
}

module.exports = {
  handleInit,
};
