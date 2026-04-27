const fs = require("fs");
const path = require("path");
const { ensureDirectory, updateManagedFile, writeManagedFile } = require("./files");
const { loadTemplate, renderTemplate } = require("./templates");
const { hasMinimumAgentsContract } = require("./web-app-context");

const AGENTS_BLOCK_START = "<!-- BEGIN AGENTIC-SDLC MANAGED BLOCK -->";
const AGENTS_BLOCK_END = "<!-- END AGENTIC-SDLC MANAGED BLOCK -->";

function listToBullets(items, code = false) {
  if (!items.length) {
    return "- none";
  }

  return items
    .map((item) => (code ? `- \`${item}\`` : `- ${item}`))
    .join("\n");
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
      const nextContents = existingAgents.replace(
        new RegExp(`${AGENTS_BLOCK_START}[\\s\\S]*?${AGENTS_BLOCK_END}`),
        `${AGENTS_BLOCK_START}\n${agentsTemplate}\n${AGENTS_BLOCK_END}`
      );
      updateManagedFile(agentsPath, nextContents, summary);
    } else {
      const merged = `${existingAgents.trimEnd()}\n\n${AGENTS_BLOCK_START}\n${agentsTemplate}\n${AGENTS_BLOCK_END}\n`;
      updateManagedFile(agentsPath, merged, summary);
    }
  }
  writeManagedFile(path.join(rootDir, ".agentic", "project-adapter.md"), projectAdapter, summary);
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
  AGENTS_BLOCK_END,
  AGENTS_BLOCK_START,
};
