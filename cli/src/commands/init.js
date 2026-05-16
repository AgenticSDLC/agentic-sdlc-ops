const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { getControlPlane } = require("../lib/control-plane");
const { generateOverlay } = require("../lib/overlay");
const { assessDoctor } = require("./doctor");
const {
  buildConfig,
  detectPackageManager,
  ensureGitState,
  evaluatePrerequisites,
  inferProfile,
  inspectTarget,
} = require("../lib/web-app-context");
const {
  printFooter,
  printKeyValue,
  printList,
  printPathList,
  printSection,
  printState,
} = require("../ui");
const { confirm } = require("../prompt");
const { detectAvailableBackends, getAllBackends } = require("../lib/agent-backends");

const PLAYWRIGHT_CONFIG_TEMPLATE = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://localhost:3100',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`;

const PLAYWRIGHT_TEST_TEMPLATE = `import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
`;

async function installPlaywright(rootDir) {
  const pm = detectPackageManager(rootDir) || "npm";
  const addCmd =
    pm === "pnpm"
      ? "pnpm add -D @playwright/test"
      : pm === "yarn"
        ? "yarn add -D @playwright/test"
        : "npm install -D @playwright/test";
  const installCmd =
    pm === "pnpm"
      ? "pnpm exec playwright install --with-deps chromium"
      : pm === "yarn"
        ? "yarn playwright install --with-deps chromium"
        : "npx playwright install --with-deps chromium";
  printSection("Installing Playwright");
  try {
    printKeyValue("Running", addCmd);
    execSync(addCmd, { cwd: rootDir, stdio: "inherit" });
    printKeyValue("Running", installCmd);
    execSync(installCmd, { cwd: rootDir, stdio: "inherit" });
    const configPath = path.join(rootDir, "playwright.config.ts");
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, PLAYWRIGHT_CONFIG_TEMPLATE, "utf8");
      printKeyValue("Created", "playwright.config.ts");
    }
    const testsDir = path.join(rootDir, "tests");
    const testPath = path.join(testsDir, "homepage.spec.ts");
    if (!fs.existsSync(testPath)) {
      if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });
      fs.writeFileSync(testPath, PLAYWRIGHT_TEST_TEMPLATE, "utf8");
      printKeyValue("Created", "tests/homepage.spec.ts");
    }
    const pkgPath = path.join(rootDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (!pkg.scripts?.["test:e2e"]) {
      pkg.scripts = pkg.scripts || {};
      pkg.scripts["test:e2e"] = "playwright test";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
      printKeyValue("Added script", "test:e2e \u2192 playwright test");
    }
    printKeyValue("Status", "Playwright configured");
  } catch (err) {
    printKeyValue("Status", `Install failed: ${err.message}`);
  }
}

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
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application.",
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

  let config = buildConfig(rootDir, resolvedArgs, inspection);
  const controlPlane = getControlPlane(config);
  printOutcome(prereq.state, {
    target: rootDir,
    installMode: config.installMode,
    stackPreset: config.stackPreset,
    appShape: config.appShape,
  });
  printSection("Inferred Values");
  printKeyValue("Profile", profile);
  printKeyValue(
    "GitHub Mode",
    prereq.state === "ready-local-only" ? "local-only" : "github-backed",
  );
  printKeyValue("Seed Issue", config.seedIssue ? "enabled" : "disabled");
  printKeyValue(
    "Detected From",
    `${config.stackPreset}, ${config.installMode}, ${config.appShape}`,
  );

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
    printSection("GitHub Label Status");
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

  // Agent backend selection
  if (process.stdin.isTTY && !args.yes) {
    const available = detectAvailableBackends();
    const all = getAllBackends();

    if (available.length === 1) {
      config.execution = config.execution || {};
      config.execution.agentBackend = available[0].name;
      printSection("Agent Backend");
      printKeyValue("Detected", `${available[0].label} (${available[0].envKey} is set)`);
    } else if (available.length > 1) {
      printSection("Agent Backend");
      console.log("\nMultiple agent API keys detected:\n");
      available.forEach((b, i) => console.log(`  ${i + 1}. ${b.label}`));
      const readline = require("readline/promises");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = (await rl.question(`\nSelect [1-${available.length}]: `)).trim();
      rl.close();
      const idx = parseInt(answer, 10) - 1;
      const chosen = available[idx] || available[0];
      config.execution = config.execution || {};
      config.execution.agentBackend = chosen.name;
      printKeyValue("Selected", chosen.label);
    } else {
      printSection("Agent Backend");
      printKeyValue("Status", "No agent API key detected");
      printList("Required (set one before running the runtime)", all.map((b) => `export ${b.envKey}=<your-key> → ${b.label}`));
    }
  }


  // Auto-select first available backend when --yes
  if (args.yes) {
    const available2 = detectAvailableBackends();
    if (available2.length) {
      config.execution = config.execution || {};
      config.execution.agentBackend = available2[0].name;
    }
  }
  if (!config.browserValidation.supported && process.stdin.isTTY && !args.yes) {
    const shouldInstall = await confirm(
      "Playwright is not configured. Install @playwright/test now?",
      false,
    );
    if (shouldInstall) {
      await installPlaywright(rootDir);
    }
  } else if (!config.browserValidation.supported && args.yes) {
    await installPlaywright(rootDir);
  }

  // Recompute config after optional bootstrap changes so guidance reflects current state.
  config = buildConfig(rootDir, resolvedArgs, inspectTarget(rootDir));

  const doctorResult = assessDoctor(rootDir, resolvedArgs);

  if (doctorResult.state === "pass") {
    printFooter(
      "Run `agentic-sdlc doctor` to check overlay health, then publish a pilot issue.",
    );
  } else if (doctorResult.state === "warning") {
    printFooter(
      "Overlay is healthy. Run `agentic-sdlc doctor` to see optional warnings — they are not blockers. Continue with a pilot issue.",
    );
  } else if (doctorResult.state === "local-only") {
    printFooter(
      "Connect a GitHub remote when ready, or continue with local draft issues for now. Run `agentic-sdlc doctor` for details.",
    );
  } else {
    printFooter(
      "Run `agentic-sdlc doctor` to diagnose and address any issues.",
    );
  }
}

module.exports = {
  handleInit,
};
