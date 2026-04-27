const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  STACK_PRESETS,
  APP_SHAPES,
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

  return sections.some((deps) => Object.prototype.hasOwnProperty.call(deps, name));
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
  if (framework === "react-vite" && packageManager === "pnpm") return "react-vite-pnpm";
  if (framework === "react-vite" && packageManager === "npm") return "react-vite-npm";
  if (framework === "remix" && packageManager === "pnpm") return "remix-pnpm";
  return null;
}

function detectBrowserSurface(rootDir) {
  return ["app", "pages", "src/app", "src/pages", "src/routes"].some((candidate) =>
    fs.existsSync(path.join(rootDir, candidate))
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
    "Execution Source of Truth",
    "Mandatory Preflight Plan",
    "Issue Lifecycle",
    "Verification Rule",
  ];

  return requiredMarkers.every((marker) => contents.includes(marker));
}

function detectGitHubReady(rootDir) {
  const gitConfig = path.join(rootDir, ".git", "config");
  if (!fs.existsSync(gitConfig)) {
    return false;
  }

  return fs.readFileSync(gitConfig, "utf8").includes("github.com");
}

function classifyAppShape(packageJson) {
  const name = (packageJson && packageJson.name ? packageJson.name : "").toLowerCase();

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
  const detectedStackPreset = isDirectory ? detectStackPreset(rootDir, packageJson) : null;
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

  const shouldInit = await confirm("No git repository detected. Initialize git now?", true);
  if (!shouldInit) {
    return false;
  }

  execFileSync("git", ["init"], { cwd: rootDir, stdio: "ignore" });
  return true;
}

function buildConfig(rootDir, args, inspection) {
  const defaults = getDefaultConfig(rootDir);
  const stackPreset = args.stack || inspection.detectedStackPreset || defaults.stackPreset;
  const packageManager = inspection.packageManager || "pnpm";
  const preset = STACK_PRESETS[stackPreset] || STACK_PRESETS[defaults.stackPreset];
  const appShape = args.appShape || classifyAppShape(inspection.packageJson);
  const scripts = inspection.packageScripts || {};

  const requiredPreReadDocs = [
    "README.md",
    firstExisting(rootDir, ["docs/architecture.md", "docs/ARCHITECTURE.md", "docs/system-architecture.md"]),
    firstExisting(rootDir, ["docs/product.md", "docs/PRODUCT.md", "docs/commerce-constraints.md"]),
    firstExisting(rootDir, ["docs/design-system.md", "docs/ui-guidelines.md"]),
    firstExisting(rootDir, ["docs/workflow.md", "docs/operations.md"]),
  ].filter(Boolean);

  return {
    ...defaults,
    installMode: args.mode || (inspection.existingOverlay ? "existing-repo" : defaults.installMode),
    appShape: APP_SHAPES.includes(appShape) ? appShape : defaults.appShape,
    stackPreset,
    issueSource: args.localOnly ? "local-draft-then-github-issue" : defaults.issueSource,
    seedIssue: args.seedIssue === undefined ? defaults.seedIssue : args.seedIssue,
    requiredPreReadDocs,
    verification: {
      lint: scripts.lint ? packageManagerCommand(packageManager, "lint") : preset.scripts.lint,
      build: scripts.build ? packageManagerCommand(packageManager, "build") : preset.scripts.build,
      test: scripts.test ? packageManagerCommand(packageManager, "test") : preset.scripts.test,
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
      remediation: "Scaffold the web app with the framework vendor tool first, then rerun init.",
    };
  }

  const stackPreset = args.stack || inspection.detectedStackPreset;
  const hasLint = Boolean(inspection.packageScripts.lint || stackPreset);
  const hasBuild = Boolean(inspection.packageScripts.build || stackPreset);

  if (!hasLint || !hasBuild) {
    return {
      state: "blocked-missing-verification",
      remediation: "Add lint/build scripts or pass a supported stack preset, then rerun init.",
    };
  }

  if (!inspection.hasGit) {
    return {
      state: "blocked-missing-repo",
      remediation: "Initialize git and rerun init, or run init with --init-git.",
    };
  }

  if (!inspection.detectedStackPreset && !args.stack) {
    return {
      state: "ready-with-custom-verification",
      remediation: "Confirm custom lint/build/test commands during installation.",
    };
  }

  if (args.localOnly || !inspection.githubReady) {
    return {
      state: "ready-local-only",
      remediation: "GitHub-backed lifecycle setup is deferred until the repository is connected.",
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
    issueTemplate: path.join(rootDir, ".github", "ISSUE_TEMPLATE", "agentic-task.md"),
    prTemplate: path.join(rootDir, ".github", "pull_request_template.md"),
    seedIssue: path.join(rootDir, ".agentic", "issues", "drafts", "pilot-web-app-flow.md"),
  };

  const agentsExists = fs.existsSync(files.agents);
  const agentsContents = agentsExists ? fs.readFileSync(files.agents, "utf8") : "";
  const hasManagedAgentsBlock = agentsContents.includes("BEGIN AGENTIC-SDLC MANAGED BLOCK");

  return {
    files,
    missingRequired: Object.entries(files)
      .filter(([name]) => name !== "seedIssue")
      .filter(([, filePath]) => !fs.existsSync(filePath))
      .map(([name]) => name),
    hasSeedIssue: fs.existsSync(files.seedIssue),
    agentsContractStrong: agentsExists && hasMinimumAgentsContract(agentsContents),
    hasManagedAgentsBlock,
    adapterLooksLikeWebApp:
      fs.existsSync(files.adapter) &&
      fs.readFileSync(files.adapter, "utf8").includes("- web application"),
  };
}

module.exports = {
  buildConfig,
  collectOverlayStatus,
  detectPackageManager,
  detectFramework,
  detectStackPreset,
  ensureGitState,
  evaluatePrerequisites,
  hasMinimumAgentsContract,
  inferProfile,
  inspectTarget,
};
