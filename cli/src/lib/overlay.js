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

  const seedIssue = renderTemplate(
    loadTemplate("templates", "generated", "web-app", "seed-issue.md"),
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
    path.join(rootDir, ".github", "pull_request_template.md"),
    loadTemplate("templates", "pr-template.md"),
    summary
  );
  ensureDirectory(path.join(rootDir, ".agentic", "issues", "drafts"));

  if (config.seedIssue) {
    writeManagedFile(
      path.join(rootDir, ".agentic", "issues", "drafts", "pilot-web-app-flow.md"),
      seedIssue,
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
