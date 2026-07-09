const fs = require("fs");
const path = require("path");
const { ensureDirectory, updateManagedFile, writeManagedFile } = require("./files");
const { loadTemplate, renderTemplate } = require("./templates");
const { hasMinimumAgentsContract, hasMinimumAdapterContract } = require("./web-app-context");

const AGENTS_BLOCK_START = "<!-- BEGIN AGENTIC-SDLC MANAGED BLOCK -->";
const AGENTS_BLOCK_END = "<!-- END AGENTIC-SDLC MANAGED BLOCK -->";
const ADAPTER_BLOCK_START = "<!-- BEGIN AGENTIC-SDLC PROJECT ADAPTER -->";
const ADAPTER_BLOCK_END = "<!-- END AGENTIC-SDLC PROJECT ADAPTER -->";
const LEGACY_ADAPTER_HEADINGS = new Set([
  "# Project Adapter",
  "## Project Type",
  "## Issue Required Sections",
  "## Issue Draft Location",
  "## Execution Start Condition",
  "## Plan Visibility Mode",
  "## Human Control Signals",
  "## State Labels",
  "## Branch Naming",
  "## Required Pre-Read Docs",
  "## Verification Commands",
  "## Browser Validation",
  "## Validation Mode",
  "## Preview Deployment",
  "## Human QA Gate",
  "## User-Visible Change Policy",
  "## Evidence Requirements",
  "## Automation Hooks",
  "## Stop-And-Ask Conditions",
  "## Repo-Specific Constraints",
]);

function listToBullets(items, code = false) {
  if (!items.length) {
    return "- none";
  }

  return items
    .map((item) => (code ? `- \`${item}\`` : `- ${item}`))
    .join("\n");
}

function wrapManagedBlock(start, end, contents) {
  return `${start}\n${contents}\n${end}\n`;
}

function replaceManagedBlock(contents, start, end, nextManagedContents) {
  return contents.replace(
    new RegExp(`${start}[\\s\\S]*?${end}`),
    wrapManagedBlock(start, end, nextManagedContents).trimEnd()
  );
}

function extractMarkdownHeadings(contents) {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("#"));
}

function looksLikeLegacyGeneratedAdapter(contents) {
  const headings = extractMarkdownHeadings(contents);
  return (
    headings.length >= 8 &&
    headings.includes("# Project Adapter") &&
    headings.includes("## Project Type") &&
    headings.includes("## Verification Commands") &&
    headings.includes("## Stop-And-Ask Conditions") &&
    headings.every((heading) => LEGACY_ADAPTER_HEADINGS.has(heading))
  );
}

function writeRecommendedArtifact(summary, rootDir, targetRelativePath, sourceSegments) {
  writeManagedFile(
    path.join(rootDir, targetRelativePath),
    loadTemplate(...sourceSegments),
    summary
  );
}

function generateOverlay(config, rootDir) {
  const summary = {
    rootDir,
    created: [],
    skipped: [],
    updated: [],
  };

  const projectAdapter = renderTemplate(
    loadTemplate("templates", "generated", "web-app", "project-adapter.md"),
    {
      required_pre_read_docs: listToBullets(config.requiredPreReadDocs, true),
      verification_commands: listToBullets(
        [
          config.verification.lint,
          config.verification.build,
          config.verification.test,
          config.verification.smoke,
        ],
        true
      ),
      validation_mode: config.validationMode,
      preview_provider: config.previewProvider,
      preview_status: config.previewStatus,
      human_qa_gate: config.humanQaGate,
      browser_validation_command: config.browserValidation.command,
      browser_validation_provider: config.browserValidation.provider,
      browser_validation_status: config.browserValidation.status,
    }
  );

  const combinedSeedIssue = renderTemplate(
    loadTemplate("templates", "generated", "web-app", "seed-issue-combined.md"),
    {
      repository_name: config.repositoryName,
      build_command: config.verification.build,
    }
  );
  const splitSeedIssue = renderTemplate(
    loadTemplate("templates", "generated", "web-app", "seed-issue-split.md"),
    {
      repository_name: config.repositoryName,
      build_command: config.verification.build,
    }
  );

  const agentsPath = path.join(rootDir, "AGENTS.md");
  const agentsTemplate = loadTemplate("templates", "AGENTS.md");
  if (!fs.existsSync(agentsPath)) {
    writeManagedFile(agentsPath, agentsTemplate, summary);
  } else {
    const existingAgents = fs.readFileSync(agentsPath, "utf8");
    if (hasMinimumAgentsContract(existingAgents)) {
      summary.skipped.push(path.relative(summary.rootDir, agentsPath));
    } else if (existingAgents.includes(AGENTS_BLOCK_START) && existingAgents.includes(AGENTS_BLOCK_END)) {
      const nextContents = replaceManagedBlock(
        existingAgents,
        AGENTS_BLOCK_START,
        AGENTS_BLOCK_END,
        agentsTemplate
      );
      updateManagedFile(agentsPath, nextContents, summary);
    } else {
      const merged = `${existingAgents.trimEnd()}\n\n${AGENTS_BLOCK_START}\n${agentsTemplate}\n${AGENTS_BLOCK_END}\n`;
      updateManagedFile(agentsPath, merged, summary);
    }
  }

  const adapterPath = path.join(rootDir, ".agentic", "project-adapter.md");
  if (!fs.existsSync(adapterPath)) {
    writeManagedFile(
      adapterPath,
      wrapManagedBlock(ADAPTER_BLOCK_START, ADAPTER_BLOCK_END, projectAdapter),
      summary
    );
  } else {
    const existingAdapter = fs.readFileSync(adapterPath, "utf8");
    if (existingAdapter.includes(ADAPTER_BLOCK_START) && existingAdapter.includes(ADAPTER_BLOCK_END)) {
      const nextContents = replaceManagedBlock(
        existingAdapter,
        ADAPTER_BLOCK_START,
        ADAPTER_BLOCK_END,
        projectAdapter
      );
      updateManagedFile(adapterPath, nextContents, summary);
    } else if (looksLikeLegacyGeneratedAdapter(existingAdapter)) {
      updateManagedFile(
        adapterPath,
        wrapManagedBlock(ADAPTER_BLOCK_START, ADAPTER_BLOCK_END, projectAdapter),
        summary
      );
    } else if (hasMinimumAdapterContract(existingAdapter)) {
      summary.skipped.push(path.relative(summary.rootDir, adapterPath));
    } else {
      const merged = `${existingAdapter.trimEnd()}\n\n${wrapManagedBlock(
        ADAPTER_BLOCK_START,
        ADAPTER_BLOCK_END,
        projectAdapter
      )}`;
      updateManagedFile(adapterPath, merged, summary);
    }
  }

  writeManagedFile(
    path.join(rootDir, ".github", "ISSUE_TEMPLATE", "agentic-task.md"),
    loadTemplate("templates", "issue-template.md"),
    summary
  );
  writeManagedFile(
    path.join(rootDir, ".github", "ISSUE_TEMPLATE", "agentic-epic.md"),
    loadTemplate("templates", "issue-epic.md"),
    summary
  );
  writeManagedFile(
    path.join(rootDir, ".github", "ISSUE_TEMPLATE", "agentic-feature.md"),
    loadTemplate("templates", "issue-feature.md"),
    summary
  );
  writeManagedFile(
    path.join(rootDir, ".github", "ISSUE_TEMPLATE", "config.yml"),
    loadTemplate("templates", "issue-template-config.yml"),
    summary
  );
  writeManagedFile(
    path.join(rootDir, ".github", "pull_request_template.md"),
    renderTemplate(loadTemplate("templates", "pr-template.md"), {
      issue_number: "<issue-number>",
      acceptance_criteria: "- criterion 1\n- criterion 2",
      verification_lines: "- command or check 1\n- command or check 2",
    }),
    summary
  );

  const recommendedArtifacts = [
    {
      enabled: config.accelerators.includes("task-classes"),
      target: path.join("docs", "TASK-CLASSES.md"),
      source: ["templates", "task-classes.md"],
    },
    {
      enabled: true,
      target: path.join("docs", "PLATFORM-ACTORS.md"),
      source: ["templates", "platform-actors.md"],
    },
    {
      enabled: true,
      target: path.join("docs", "LABEL-CATALOG.md"),
      source: ["templates", "label-catalog.md"],
    },
    {
      enabled: config.accelerators.includes("gh-cli-sop"),
      target: path.join("docs", "GH-CLI-SOP.md"),
      source: ["templates", "gh-cli-sop.md"],
    },
    {
      enabled: config.accelerators.includes("issue-first-workflow"),
      target: path.join("docs", "ISSUE-FIRST-WORKFLOW.md"),
      source: ["templates", "issue-first-workflow.md"],
    },
    {
      enabled: config.accelerators.includes("env-manifest"),
      target: path.join("docs", "ENVIRONMENT-MANIFEST.md"),
      source: ["templates", "env-manifest.md"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join("docs", "operations", "COMBINED-TOPOLOGY-RUNBOOK.md"),
      source: ["templates", "COMBINED-TOPOLOGY-RUNBOOK.md"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join("docs", "operations", "SPLIT-TOPOLOGY-RUNBOOK.md"),
      source: ["templates", "SPLIT-TOPOLOGY-RUNBOOK.md"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join("docs", "operations", "TOPOLOGY-CHECKLISTS.md"),
      source: ["templates", "TOPOLOGY-CHECKLISTS.md"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join("docs", "operations", "SOP-ISSUE-EXECUTION-EVIDENCE.md"),
      source: ["templates", "SOP-ISSUE-EXECUTION-EVIDENCE.md"],
    },
    {
      enabled: true,
      target: path.join("scripts", "validate-issue.js"),
      source: ["templates", "scripts", "validate-issue.js"],
    },
    {
      enabled: true,
      target: path.join("scripts", "validate-pr.js"),
      source: ["templates", "scripts", "validate-pr.js"],
    },
    {
      enabled: true,
      target: path.join("scripts", "validate-commit-message.js"),
      source: ["templates", "scripts", "validate-commit-message.js"],
    },
    {
      enabled: true,
      target: path.join("scripts", "validate-tests.sh"),
      source: ["templates", "scripts", "validate-tests.sh"],
    },
    {
      enabled: true,
      target: path.join("scripts", "git-clean-merged-pr-branches.sh"),
      source: ["templates", "scripts", "git-clean-merged-pr-branches.sh"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "issue-readiness-validator.yml"),
      source: [".github", "workflows", "examples", "issue-readiness-validator.example.yml"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "draft-pr-bootstrapper.yml"),
      source: [".github", "workflows", "examples", "draft-pr-bootstrapper.example.yml"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "issue-pr-state-sync.yml"),
      source: [".github", "workflows", "examples", "issue-pr-state-sync.example.yml"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "pr-contract-validator.yml"),
      source: [".github", "workflows", "examples", "pr-contract-validator.example.yml"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "commit-message-validator.yml"),
      source: [".github", "workflows", "examples", "commit-message-validator.example.yml"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "policy-auto-merge.yml"),
      source: [".github", "workflows", "examples", "policy-auto-merge.example.yml"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "policy-verifier-gate.yml"),
      source: [".github", "workflows", "examples", "policy-verifier-gate.example.yml"],
    },
    {
      enabled: config.workflowScaffolding === "recommended",
      target: path.join(".github", "workflows", "tsconfig-change-guard.yml"),
      source: [".github", "workflows", "examples", "tsconfig-change-guard.example.yml"],
    },
  ];

  for (const artifact of recommendedArtifacts) {
    if (!artifact.enabled) {
      continue;
    }
    writeRecommendedArtifact(summary, rootDir, artifact.target, artifact.source);
  }

  ensureDirectory(path.join(rootDir, ".agentic", "issues", "drafts"));
  ensureDirectory(path.join(rootDir, ".agentic", "issues", "archive"));

  writeManagedFile(
    path.join(rootDir, ".agentic", "issues", "drafts", "README.md"),
    loadTemplate("templates", "issue-drafts-readme.md"),
    summary
  );

  if (config.seedIssue) {
    updateManagedFile(
      path.join(rootDir, ".agentic", "issues", "drafts", "pilot-web-app-combined.md"),
      combinedSeedIssue,
      summary
    );
    updateManagedFile(
      path.join(rootDir, ".agentic", "issues", "drafts", "pilot-web-app-split.md"),
      splitSeedIssue,
      summary
    );
  }

  return summary;
}

module.exports = {
  generateOverlay,
  ADAPTER_BLOCK_END,
  ADAPTER_BLOCK_START,
  AGENTS_BLOCK_END,
  AGENTS_BLOCK_START,
};
