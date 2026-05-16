const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const {
  buildConfig,
  inferProfile,
  inspectTarget,
} = require("../lib/web-app-context");
const { printSection, printKeyValue } = require("../ui");

async function handleIssueList(options) {
  const rootDir = path.resolve(options.target || process.cwd());
  const inspection = inspectTarget(rootDir);
  const profile = options.profile || inferProfile(inspection);
  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application.",
    );
  }

  const config = buildConfig(rootDir, { ...options, profile }, inspection);
  const controlPlane = getControlPlane(config);
  printSection("Recent Issues");

  try {
    const issues = controlPlane.capabilities.listIssues(rootDir, {
      repo: config.repoSlug,
      limit: Number(options.limit) || 10,
    });

    if (!issues || issues.length === 0) {
      console.log("No issues found for this repository.");
      return;
    }

    for (const issue of issues) {
      printKeyValue(
        `#${issue.number}`,
        `${issue.title} (${issue.state})${issue.url ? `\n  ${issue.url}` : ""}`,
      );
    }
  } catch (err) {
    console.error("Failed to list issues:", err.message || err);
  }
}

module.exports = { handleIssueList };
