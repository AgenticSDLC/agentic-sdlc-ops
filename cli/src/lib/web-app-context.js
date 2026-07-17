const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  STACK_PRESETS,
  APP_SHAPES,
  CONTROL_PLANE_PROVIDER,
  HOLD_LABELS,
  ISSUE_REQUIRED_SECTIONS,
  STANDARD_LABELS,
  TOPOLOGY_LABELS,
  DEFAULT_SCOPE_RULES,
  getDefaultConfig,
} = require("../profile-web-app");
const { confirm } = require("../prompt");
const { readJsonIfExists } = require("./files");

function firstExisting(rootDir, candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(rootDir, candidate))) {
      return candidate;
    }
  }

  return null;
}

function detectPackageManager(rootDir) {
  if (fs.existsSync(path.join(rootDir, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fs.existsSync(path.join(rootDir, "yarn.lock"))) {
    return "yarn";
  }
  if (fs.existsSync(path.join(rootDir, "package-lock.json"))) {
    return "npm";
  }
  return null;
}

function packageManagerCommand(packageManager, scriptName) {
  if (packageManager === "pnpm" || packageManager === "yarn") {
    return `${packageManager} ${scriptName}`;
  }

  return `npm run ${scriptName}`;
}

function packageJsonHasDependency(packageJson, name) {
  const sections = [
    packageJson && packageJson.dependencies,
    packageJson && packageJson.devDependencies,
    packageJson && packageJson.peerDependencies,
  ].filter(Boolean);

  return sections.some((deps) =>
    Object.prototype.hasOwnProperty.call(deps, name),
  );
}

function detectFramework(rootDir, packageJson) {
  const hasNextConfig =
    fs.existsSync(path.join(rootDir, "next.config.js")) ||
    fs.existsSync(path.join(rootDir, "next.config.mjs"));
  const hasViteConfig =
    fs.existsSync(path.join(rootDir, "vite.config.js")) ||
    fs.existsSync(path.join(rootDir, "vite.config.ts"));
  const hasRemixConfig = fs.existsSync(path.join(rootDir, "remix.config.js"));
  const hasNextDep = packageJsonHasDependency(packageJson, "next");
  const hasReactDep = packageJsonHasDependency(packageJson, "react");
  const hasViteDep = packageJsonHasDependency(packageJson, "vite");
  const hasRemixDep =
    packageJsonHasDependency(packageJson, "@remix-run/react") ||
    packageJsonHasDependency(packageJson, "@remix-run/dev");

  if (hasNextConfig || hasNextDep) return "nextjs";
  if (hasViteConfig || (hasViteDep && hasReactDep)) return "react-vite";
  if (hasRemixConfig || hasRemixDep) return "remix";
  return null;
}

function detectStackPreset(rootDir, packageJson) {
  const packageManager = detectPackageManager(rootDir);
  const framework = detectFramework(rootDir, packageJson);

  if (framework === "nextjs" && packageManager === "pnpm") return "nextjs-pnpm";
  if (framework === "nextjs" && packageManager === "npm") return "nextjs-npm";
  if (framework === "nextjs" && packageManager === "yarn") return "nextjs-yarn";
  if (framework === "react-vite" && packageManager === "pnpm")
    return "react-vite-pnpm";
  if (framework === "react-vite" && packageManager === "npm")
    return "react-vite-npm";
  if (framework === "remix" && packageManager === "pnpm") return "remix-pnpm";
  return null;
}

function detectBrowserSurface(rootDir) {
  return ["app", "pages", "src/app", "src/pages", "src/routes"].some(
    (candidate) => fs.existsSync(path.join(rootDir, candidate)),
  );
}

function detectAppScaffold(rootDir) {
  const packageJson = readJsonIfExists(path.join(rootDir, "package.json"));

  if (packageJson) {
    return true;
  }

  if (
    fs.existsSync(path.join(rootDir, "pnpm-workspace.yaml")) &&
    detectBrowserSurface(rootDir)
  ) {
    return true;
  }

  return detectStackPreset(rootDir, packageJson) !== null;
}

function detectExistingOverlay(rootDir) {
  return [
    "AGENTS.md",
    ".agentic/project-adapter.md",
    ".github/ISSUE_TEMPLATE/agentic-task.md",
    ".github/pull_request_template.md",
  ].some((candidate) => fs.existsSync(path.join(rootDir, candidate)));
}

function hasMinimumAgentsContract(contents) {
  const requiredMarkers = [
    "authoritative task spec",
    "Verification is owned by CI",
    "Issue Lifecycle",
    "Topology",
  ];

  return requiredMarkers.every((marker) => contents.includes(marker));
}

function hasMinimumAdapterContract(contents) {
  const requiredMarkers = [
    "# Project Adapter",
    "## Browser Validation",
    "## Validation Mode",
    "## Preview Deployment",
    "## Human QA Gate",
    "## User-Visible Change Policy",
  ];

  return requiredMarkers.every((marker) => contents.includes(marker));
}

function parseGitHubRepo(remoteUrl) {
  if (!remoteUrl) {
    return null;
  }

  const normalized = remoteUrl.trim().replace(/\.git$/, "");
  const sshMatch = normalized.match(/^git@github\.com:([^/]+\/[^/]+)$/);
  if (sshMatch) {
    return sshMatch[1];
  }

  const httpsMatch = normalized.match(
    /^https:\/\/github\.com\/([^/]+\/[^/]+)$/,
  );
  if (httpsMatch) {
    return httpsMatch[1];
  }

  return null;
}

function detectGitHubReady(rootDir) {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Boolean(parseGitHubRepo(remote));
  } catch {
    return false;
  }
}

function classifyAppShape(packageJson) {
  const name = (
    packageJson && packageJson.name ? packageJson.name : ""
  ).toLowerCase();

  if (name.includes("shop") || name.includes("store")) {
    return "storefront";
  }
  if (name.includes("admin")) {
    return "admin-console";
  }
  if (name.includes("marketing")) {
    return "marketing-site";
  }
  return "storefront";
}

function detectPreviewProvider(rootDir) {
  if (
    fs.existsSync(path.join(rootDir, "vercel.json")) ||
    fs.existsSync(path.join(rootDir, ".vercel", "project.json"))
  ) {
    return "vercel";
  }

  if (fs.existsSync(path.join(rootDir, "amplify.yml"))) {
    return "aws-amplify";
  }

  if (
    fs.existsSync(path.join(rootDir, "serverless.yml")) ||
    fs.existsSync(path.join(rootDir, "template.yaml")) ||
    fs.existsSync(path.join(rootDir, "cdk.json"))
  ) {
    return "aws";
  }

  return "none";
}

function detectPlaywrightSupport(rootDir, packageJson, packageScripts) {
  const hasConfig =
    fs.existsSync(path.join(rootDir, "playwright.config.ts")) ||
    fs.existsSync(path.join(rootDir, "playwright.config.js")) ||
    fs.existsSync(path.join(rootDir, "playwright.config.mjs"));
  const hasPlaywrightDep =
    packageJsonHasDependency(packageJson, "@playwright/test") ||
    packageJsonHasDependency(packageJson, "playwright");
  const hasScript = Boolean(
    packageScripts["test:e2e"] ||
    packageScripts["test:playwright"] ||
    packageScripts.playwright,
  );

  if (hasConfig || hasPlaywrightDep || hasScript) {
    return {
      supported: true,
      provider: "playwright",
      status: "configured",
      command: packageScripts["test:e2e"]
        ? packageManagerCommand(
            detectPackageManager(rootDir) || "npm",
            "test:e2e",
          )
        : packageScripts["test:playwright"]
          ? packageManagerCommand(
              detectPackageManager(rootDir) || "npm",
              "test:playwright",
            )
          : packageScripts.playwright
            ? packageManagerCommand(
                detectPackageManager(rootDir) || "npm",
                "playwright",
              )
            : "playwright test",
    };
  }

  return {
    supported: false,
    provider: "none",
    status: "not-configured",
    command: "not-configured",
  };
}

function inferProfile(inspection) {
  if (!inspection.exists || !inspection.isDirectory) {
    return null;
  }

  if (inspection.detectedStackPreset) {
    return "web-app";
  }

  if (inspection.browserSurface && inspection.packageJson) {
    return "web-app";
  }

  const hasReactDep = packageJsonHasDependency(inspection.packageJson, "react");
  const hasNextDep = packageJsonHasDependency(inspection.packageJson, "next");
  if (hasReactDep || hasNextDep) {
    return "web-app";
  }

  return null;
}

function inspectTarget(rootDir) {
  const exists = fs.existsSync(rootDir);
  const isDirectory = exists && fs.statSync(rootDir).isDirectory();
  const packageJson = isDirectory
    ? readJsonIfExists(path.join(rootDir, "package.json"))
    : null;
  const packageScripts = (packageJson && packageJson.scripts) || {};
  const detectedStackPreset = isDirectory
    ? detectStackPreset(rootDir, packageJson)
    : null;
  const packageManager = isDirectory ? detectPackageManager(rootDir) : null;
  const browserSurface = isDirectory && detectBrowserSurface(rootDir);

  const inspection = {
    rootDir,
    exists,
    isDirectory,
    hasGit: isDirectory && fs.existsSync(path.join(rootDir, ".git")),
    hasAppScaffold: isDirectory && detectAppScaffold(rootDir),
    packageJson,
    packageScripts,
    packageManager,
    detectedStackPreset,
    githubReady: isDirectory && detectGitHubReady(rootDir),
    existingOverlay: isDirectory && detectExistingOverlay(rootDir),
    browserSurface,
    agentsFilePath: isDirectory ? path.join(rootDir, "AGENTS.md") : null,
  };

  inspection.detectedProfile = inferProfile(inspection);
  return inspection;
}

async function ensureGitState(rootDir, args, inspection) {
  if (inspection.hasGit) {
    return true;
  }

  if (args.initGit || args.yes) {
    execFileSync("git", ["init"], { cwd: rootDir, stdio: "ignore" });
    return true;
  }

  const shouldInit = await confirm(
    "No git repository detected. Initialize git now?",
    true,
  );
  if (!shouldInit) {
    return false;
  }

  execFileSync("git", ["init"], { cwd: rootDir, stdio: "ignore" });
  return true;
}

function buildConfig(rootDir, args, inspection) {
  const defaults = getDefaultConfig(rootDir);
  const stackPreset =
    args.stack || inspection.detectedStackPreset || defaults.stackPreset;
  const packageManager = inspection.packageManager || "pnpm";
  const preset =
    STACK_PRESETS[stackPreset] || STACK_PRESETS[defaults.stackPreset];
  const appShape = args.appShape || classifyAppShape(inspection.packageJson);
  const scripts = inspection.packageScripts || {};

  const requiredPreReadDocs = [
    "README.md",
    firstExisting(rootDir, [
      "docs/architecture.md",
      "docs/ARCHITECTURE.md",
      "docs/system-architecture.md",
    ]),
    firstExisting(rootDir, [
      "docs/product.md",
      "docs/PRODUCT.md",
      "docs/commerce-constraints.md",
    ]),
    firstExisting(rootDir, ["docs/design-system.md", "docs/ui-guidelines.md"]),
    firstExisting(rootDir, ["docs/workflow.md", "docs/operations.md"]),
  ].filter(Boolean);

  const previewProvider = detectPreviewProvider(rootDir);
  const browserValidation = detectPlaywrightSupport(
    rootDir,
    inspection.packageJson,
    scripts,
  );
  const validationMode =
    previewProvider === "none" ? "local-only" : "preview-required";
  const previewStatus =
    previewProvider === "none" ? "not-configured" : "configured";
  const humanQaGate =
    validationMode === "local-only"
      ? "not-configured"
      : "required-before-merge";

  return {
    ...defaults,
    installMode:
      args.mode ||
      (inspection.existingOverlay ? "existing-repo" : defaults.installMode),
    appShape: APP_SHAPES.includes(appShape) ? appShape : defaults.appShape,
    stackPreset,
    issueSource:
      args.localOnly || !inspection.githubReady
        ? "local-draft-then-github-issue"
        : defaults.issueSource,
    seedIssue:
      args.seedIssue === undefined ? defaults.seedIssue : args.seedIssue,
    controlPlaneProvider: CONTROL_PLANE_PROVIDER,
    holdLabels: HOLD_LABELS,
    issueRequiredSections: ISSUE_REQUIRED_SECTIONS,
    standardLabels: STANDARD_LABELS,
    topologyLabels: TOPOLOGY_LABELS,
    scopeRules: DEFAULT_SCOPE_RULES,
    requiredPreReadDocs,
    validationMode,
    previewProvider,
    previewStatus,
    humanQaGate,
    browserValidation,
    execution: {
      // null = let execution-backends resolve (env override, then sole
      // detected API key, then the documented openai-api fallback).
      agentBackend: null,
    },
    verification: {
      lint: scripts.lint
        ? packageManagerCommand(packageManager, "lint")
        : preset.scripts.lint,
      build: scripts.build
        ? packageManagerCommand(packageManager, "build")
        : preset.scripts.build,
      test: scripts.test
        ? packageManagerCommand(packageManager, "test")
        : preset.scripts.test,
      smoke: scripts["test:e2e"]
        ? packageManagerCommand(packageManager, "test:e2e")
        : preset.scripts.smoke,
    },
  };
}

function evaluatePrerequisites(inspection, args) {
  if (!inspection.exists || !inspection.isDirectory) {
    return {
      state: "blocked-missing-app",
      remediation: "Create the project directory first.",
    };
  }

  if (!inspection.hasAppScaffold) {
    return {
      state: "blocked-missing-app",
      remediation:
        "Scaffold the web app with the framework vendor tool first, then rerun init.",
    };
  }

  const stackPreset = args.stack || inspection.detectedStackPreset;
  const hasLint = Boolean(inspection.packageScripts.lint || stackPreset);
  const hasBuild = Boolean(inspection.packageScripts.build || stackPreset);

  if (!hasLint || !hasBuild) {
    return {
      state: "blocked-missing-verification",
      remediation:
        "Add lint/build scripts or pass a supported stack preset, then rerun init.",
    };
  }

  if (!inspection.hasGit) {
    return {
      state: "blocked-missing-repo",
      remediation:
        "Initialize git and rerun init, or run init with --init-git.",
    };
  }

  if (!inspection.detectedStackPreset && !args.stack) {
    return {
      state: "ready-with-custom-verification",
      remediation:
        "Confirm custom lint/build/test commands during installation.",
    };
  }

  if (args.localOnly || !inspection.githubReady) {
    return {
      state: "ready-local-only",
      remediation:
        "GitHub-backed lifecycle setup is deferred until the repository is connected.",
    };
  }

  return {
    state: "ready",
    remediation: null,
  };
}

function collectOverlayStatus(rootDir) {
  const files = {
    agents: path.join(rootDir, "AGENTS.md"),
    adapter: path.join(rootDir, ".agentic", "project-adapter.md"),
    issueTemplate: path.join(
      rootDir,
      ".github",
      "ISSUE_TEMPLATE",
      "agentic-task.md",
    ),
    prTemplate: path.join(rootDir, ".github", "pull_request_template.md"),
    combinedSeedIssue: path.join(
      rootDir,
      ".agentic",
      "issues",
      "drafts",
      "pilot-web-app-combined.md",
    ),
    splitSeedIssue: path.join(
      rootDir,
      ".agentic",
      "issues",
      "drafts",
      "pilot-web-app-split.md",
    ),
    taskClasses: path.join(rootDir, "docs", "TASK-CLASSES.md"),
    platformActors: path.join(rootDir, "docs", "PLATFORM-ACTORS.md"),
    labelCatalog: path.join(rootDir, "docs", "LABEL-CATALOG.md"),
    ghCliSop: path.join(rootDir, "docs", "GH-CLI-SOP.md"),
    issueFirstWorkflow: path.join(rootDir, "docs", "ISSUE-FIRST-WORKFLOW.md"),
    environmentManifest: path.join(rootDir, "docs", "ENVIRONMENT-MANIFEST.md"),
    validateIssueScript: path.join(rootDir, "scripts", "validate-issue.js"),
    validatePrScript: path.join(rootDir, "scripts", "validate-pr.js"),
    validateCommitMessageScript: path.join(
      rootDir,
      "scripts",
      "validate-commit-message.js"
    ),
    issueReadinessWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "issue-readiness-validator.yml"
    ),
    draftPrBootstrapperWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "draft-pr-bootstrapper.yml"
    ),
    issuePrStateSyncWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "issue-pr-state-sync.yml"
    ),
    prContractValidatorWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "pr-contract-validator.yml"
    ),
    commitMessageValidatorWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "commit-message-validator.yml"
    ),
    policyAutoMergeWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "policy-auto-merge.yml"
    ),
    policyVerifierGateWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "policy-verifier-gate.yml"
    ),
    mergeGatePolicyScript: path.join(rootDir, "scripts", "merge-gate-policy.mjs"),
    splitRunbook: path.join(
      rootDir,
      "docs",
      "operations",
      "SPLIT-TOPOLOGY-RUNBOOK.md"
    ),
    topologyChecklists: path.join(
      rootDir,
      "docs",
      "operations",
      "TOPOLOGY-CHECKLISTS.md"
    ),
    claudePlannerAgent: path.join(rootDir, ".claude", "agents", "planner.md"),
    claudeBuilderAgent: path.join(rootDir, ".claude", "agents", "builder.md"),
    claudeVerifierAgent: path.join(rootDir, ".claude", "agents", "verifier.md"),
    setupPrereqs: path.join(rootDir, "docs", "operations", "SETUP-PREREQS.md"),
    reuseGuardWorkflow: path.join(
      rootDir,
      ".github",
      "workflows",
      "reuse-guard.yml"
    ),
  };

  // Assets audited as "recommended" — missing ones are doctor warnings, not
  // hard failures. Everything not listed here (minus the seed drafts) is
  // required overlay surface.
  const recommendedKeys = [
    "taskClasses",
    "platformActors",
    "labelCatalog",
    "ghCliSop",
    "issueFirstWorkflow",
    "environmentManifest",
    "validateIssueScript",
    "validatePrScript",
    "validateCommitMessageScript",
    "issueReadinessWorkflow",
    "draftPrBootstrapperWorkflow",
    "issuePrStateSyncWorkflow",
    "prContractValidatorWorkflow",
    "commitMessageValidatorWorkflow",
    "policyAutoMergeWorkflow",
    "policyVerifierGateWorkflow",
    "mergeGatePolicyScript",
    "splitRunbook",
    "topologyChecklists",
    "claudePlannerAgent",
    "claudeBuilderAgent",
    "claudeVerifierAgent",
    "setupPrereqs",
    "reuseGuardWorkflow",
  ];

  const agentsExists = fs.existsSync(files.agents);
  const agentsContents = agentsExists
    ? fs.readFileSync(files.agents, "utf8")
    : "";
  const hasManagedAgentsBlock = agentsContents.includes(
    "BEGIN AGENTIC-SDLC MANAGED BLOCK",
  );
  const adapterExists = fs.existsSync(files.adapter);
  const adapterContents = adapterExists
    ? fs.readFileSync(files.adapter, "utf8")
    : "";

  return {
    files,
    missingRequired: Object.entries(files)
      .filter(
        ([name]) =>
          !["combinedSeedIssue", "splitSeedIssue", ...recommendedKeys].includes(name)
      )
      .filter(([, filePath]) => !fs.existsSync(filePath))
      .map(([, filePath]) => path.relative(rootDir, filePath)),
    missingRecommended: Object.entries(files)
      .filter(([name]) => recommendedKeys.includes(name))
      .filter(([, filePath]) => !fs.existsSync(filePath))
      .map(([, filePath]) => path.relative(rootDir, filePath)),
    hasCombinedSeedIssue: fs.existsSync(files.combinedSeedIssue),
    hasSplitSeedIssue: fs.existsSync(files.splitSeedIssue),
    agentsContractStrong:
      agentsExists && hasMinimumAgentsContract(agentsContents),
    hasManagedAgentsBlock,
    adapterContractStrong:
      adapterExists && hasMinimumAdapterContract(adapterContents),
    hasManagedAdapterBlock: adapterContents.includes(
      "BEGIN AGENTIC-SDLC PROJECT ADAPTER",
    ),
    adapterLooksLikeWebApp:
      adapterExists &&
      (adapterContents.includes("BEGIN AGENTIC-SDLC PROJECT ADAPTER") ||
        hasMinimumAdapterContract(adapterContents)),
  };
}

module.exports = {
  buildConfig,
  collectOverlayStatus,
  hasMinimumAdapterContract,
  detectPackageManager,
  detectPlaywrightSupport,
  detectFramework,
  detectPreviewProvider,
  detectStackPreset,
  ensureGitState,
  evaluatePrerequisites,
  hasMinimumAgentsContract,
  inferProfile,
  inspectTarget,
};
