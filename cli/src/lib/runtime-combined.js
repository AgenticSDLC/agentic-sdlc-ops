const { execFileSync } = require("child_process");
const { loadTemplate, renderTemplate } = require("./templates");
const { getCurrentLifecycleState, extractMarkdownSections, validateLifecycleTransition } = require("./policy");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^\[task\]\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "task";
}

function buildBranchName(issue) {
  return `issue-${issue.number}-${slugify(issue.title)}`;
}

function ensureCleanWorktree(rootDir, branchName) {
  const currentBranch = execFileSync("git", ["branch", "--show-current"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

  if (status && currentBranch !== branchName) {
    throw new Error(
      "Working tree is not clean. Commit or stash local changes before switching to the issue branch."
    );
  }
}

function createOrSwitchBranch(rootDir, branchName) {
  ensureCleanWorktree(rootDir, branchName);

  try {
    execFileSync("git", ["rev-parse", "--verify", branchName], {
      cwd: rootDir,
      stdio: ["ignore", "ignore", "ignore"],
    });
    execFileSync("git", ["switch", branchName], {
      cwd: rootDir,
      stdio: ["ignore", "ignore", "pipe"],
    });
    return { branchName, action: "reused" };
  } catch {
    execFileSync("git", ["switch", "-c", branchName], {
      cwd: rootDir,
      stdio: ["ignore", "ignore", "pipe"],
    });
    return { branchName, action: "created" };
  }
}

function getCurrentBranchName(rootDir) {
  return execFileSync("git", ["branch", "--show-current"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function getCurrentUpstreamBaseBranch(rootDir) {
  try {
    const upstream = execFileSync(
      "git",
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    ).trim();

    const match = upstream.match(/^[^/]+\/(.+)$/);
    return match ? match[1] : upstream;
  } catch {
    return null;
  }
}

function pushBranch(rootDir, branchName) {
  execFileSync("git", ["push", "-u", "origin", branchName], {
    cwd: rootDir,
    stdio: ["ignore", "ignore", "pipe"],
  });
  return { branchName, pushed: true };
}

function buildPreflightPlan(issue, config) {
  const sections = extractMarkdownSections(issue.body);
  const requirements = sections.get("requirements") || "Requirements not found.";
  const acceptanceCriteria =
    sections.get("acceptance criteria") || "Acceptance Criteria not found.";
  const targetFiles = sections.get("target files") || sections.get("target subsystem") || "Target scope not found.";

  return [
    "## Preflight Plan",
    "",
    `Issue: #${issue.number} ${issue.title}`,
    "",
    "### Approach",
    "Implement the narrowest change that satisfies the issue contract without broadening scope.",
    "",
    "### Target Scope",
    targetFiles,
    "",
    "### Requirements To Satisfy",
    requirements,
    "",
    "### Acceptance Criteria",
    acceptanceCriteria,
    "",
    "### Verification Plan",
    `- ${config.verification.lint}`,
    `- ${config.verification.build}`,
    `- ${config.browserValidation.supported ? config.browserValidation.command : "task-relevant verification beyond lint/build as required by the adapter"}`,
    "",
    "### Guardrails",
    "- Do not broaden scope beyond the issue contract.",
    "- Stop if hold/needs-human or architecture-boundary concerns appear.",
  ].join("\n");
}

function buildBlockerComment(reason) {
  return [
    "## Execution Blocked",
    "",
    reason,
    "",
    "The runtime did not begin implementation. Update the issue, labels, or repository state and retry.",
  ].join("\n");
}

function buildPullRequestBody(issue, config) {
  const template = loadTemplate("templates", "pr-template.md");
  const sections = extractMarkdownSections(issue.body);
  const acceptanceCriteria =
    sections.get("acceptance criteria") || "- restate acceptance criteria here";
  const verificationLines = [
    `- ${config.verification.lint}`,
    `- ${config.verification.build}`,
  ];
  if (config.browserValidation && config.browserValidation.supported) {
    verificationLines.push(`- ${config.browserValidation.command}`);
  }

  return renderTemplate(template, {
    issue_number: issue.number,
    acceptance_criteria: acceptanceCriteria,
    verification_lines: verificationLines.join("\n"),
  });
}

function buildPullRequestTitle(issue) {
  return `feat: ${String(issue.title || "").replace(/^\[TASK\]\s*/i, "").trim()}`;
}

function prepareCombinedRuntime(rootDir, issue, config) {
  const currentState = getCurrentLifecycleState(issue);
  const transitionDecision =
    currentState === "ready-for-build"
      ? validateLifecycleTransition(issue, "in-progress", config)
      : { ok: currentState === "in-progress", findings: currentState === "in-progress" ? [] : [`Issue must be in \`ready-for-build\` or \`in-progress\`, found \`${currentState || "none"}\`.`] };

  const branch = buildBranchName(issue);
  const preflightPlan = buildPreflightPlan(issue, config);

  return {
    currentState,
    transitionDecision,
    branch,
    preflightPlan,
  };
}

module.exports = {
  buildBlockerComment,
  buildBranchName,
  buildPreflightPlan,
  buildPullRequestBody,
  buildPullRequestTitle,
  createOrSwitchBranch,
  getCurrentBranchName,
  getCurrentUpstreamBaseBranch,
  pushBranch,
  prepareCombinedRuntime,
};
