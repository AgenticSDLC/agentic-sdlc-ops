const path = require("path");
const { checkStandardLabels } = require("../lib/github");
const {
  buildConfig,
  collectOverlayStatus,
  evaluatePrerequisites,
  inferProfile,
  inspectTarget,
} = require("../lib/web-app-context");
const { printFooter, printKeyValue, printList, printSection, printState } = require("../ui");

function printDoctorResult(state, details, findings, options = {}) {
  const { includeFooter = true } = options;
  printSection("Doctor Result");
  printState("State", state);

  for (const [label, value] of Object.entries(details)) {
    printKeyValue(label, value);
  }

  if (findings.length) {
    printList("Findings", findings);
  }

  if (includeFooter) {
    if (state === "pass") {
      printFooter("Overlay is healthy. Proceed with the next issue-first task.");
    } else if (state === "local-only") {
      printFooter("Overlay is usable locally. Add GitHub wiring later for full issue-first operation.");
    } else {
      printFooter("Resolve the findings above, then rerun `agentic-sdlc doctor`.");
    }
  }
}

function assessDoctor(rootDir, args) {
  const inspection = inspectTarget(rootDir);
  const prereq = evaluatePrerequisites(inspection, args);
  const profile = "web-app";

  if (prereq.state.startsWith("blocked-")) {
    return {
      state: "blocked",
      details: {
        profile,
        target: rootDir,
      },
      findings: [prereq.remediation],
    };
  }

  const config = buildConfig(rootDir, args, inspection);
  const overlay = collectOverlayStatus(rootDir);
  const findings = [];
  let state = inspection.githubReady && !args.localOnly ? "pass" : "local-only";

  if (!overlay.adapterLooksLikeWebApp && inspection.existingOverlay) {
    state = "profile-mismatch";
    findings.push("The local project adapter does not look like a `web-app` overlay.");
  }

  if (overlay.missingRequired.length) {
    state = inspection.existingOverlay ? "remediation-required" : "fail";
    findings.push(`Missing required overlay artifacts: ${overlay.missingRequired.join(", ")}`);
  }

  if (!overlay.agentsContractStrong) {
    findings.push(
      "AGENTS.md does not include the minimum agentic-sdlc execution contract; append or replace it with the managed overlay block."
    );
    if (state === "pass") {
      state = "warning";
    }
  }

  if (!overlay.hasSeedIssue) {
    findings.push("Pilot issue draft is missing at `.agentic/issues/drafts/pilot-web-app-flow.md`.");
    if (state === "pass") {
      state = "warning";
    }
  }

  if (prereq.state === "ready-with-custom-verification") {
    findings.push(prereq.remediation);
    if (state === "pass") {
      state = "warning";
    }
  }

  if (config.validationMode === "local-only") {
    findings.push(
      "Validation mode is `local-only`: no hosted preview deployment or human QA gate is configured for user-visible changes."
    );
    if (state === "pass") {
      state = "warning";
    }
  }

  if (!config.browserValidation.supported) {
    findings.push(
      "Playwright is not configured. User-visible web work should include a browser validation command such as `npm run test:e2e`."
    );
    if (state === "pass") {
      state = "warning";
    }
  }

  if (inspection.githubReady && !args.localOnly) {
    const labels = checkStandardLabels(rootDir);
    if (labels.status === "unavailable") {
      findings.push(`Unable to verify standard GitHub labels: ${labels.reason}`);
      if (state === "pass") {
        state = "warning";
      }
    } else if (labels.status === "ok" && labels.missing.length) {
      findings.push(`Missing standard GitHub labels: ${labels.missing.join(", ")}`);
      state = "remediation-required";
    }
  }

  return {
    state,
    details: {
      profile,
      target: rootDir,
      installMode: config.installMode,
      stackPreset: config.stackPreset,
      validationMode: config.validationMode,
    },
    findings,
  };
}

async function handleDoctor(args) {
  const rootDir = path.resolve(args.target || process.cwd());
  const inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);

  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application."
    );
  }

  const resolvedArgs = { ...args, profile };
  const result = assessDoctor(rootDir, resolvedArgs);
  printDoctorResult(result.state, result.details, result.findings);
}

module.exports = {
  assessDoctor,
  handleDoctor,
  printDoctorResult,
};
