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

function getHeadSha(rootDir) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function getWorktreeStatus(rootDir) {
  return execFileSync("git", ["status", "--porcelain"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function getChangedFilesSince(rootDir, baseSha) {
  const output = execFileSync("git", ["diff", "--name-only", `${baseSha}..HEAD`], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

  return output ? output.split("\n").map((line) => line.trim()).filter(Boolean) : [];
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

function commitAllChanges(rootDir, message) {
  execFileSync("git", ["add", "-A"], {
    cwd: rootDir,
    stdio: ["ignore", "ignore", "pipe"],
  });
  execFileSync("git", ["commit", "-m", message], {
    cwd: rootDir,
    stdio: ["ignore", "ignore", "pipe"],
  });
  return { committed: true, message };
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

function buildImplementationComment(result) {
  const lines = [
    "## Implementation Result",
    "",
    `State: ${result.state}`,
    result.branch ? `Branch: \`${result.branch}\`` : null,
    result.command ? `Command: \`${result.command}\`` : "Command: not configured",
    "",
  ].filter(Boolean);

  if (result.summary) {
    lines.push(result.summary, "");
  }

  if (result.commitSha) {
    lines.push(`Commit: \`${result.commitSha}\``, "");
  }

  if (result.changedFiles && result.changedFiles.length) {
    lines.push("### Changed Files", ...result.changedFiles.map((file) => `- \`${file}\``), "");
  }

  if (result.detail) {
    lines.push("### Detail", result.detail, "");
  }

  return lines.join("\n").trim();
}

function buildDoneComment(pullRequest) {
  const prReference = pullRequest
    ? `PR #${pullRequest.number} has been merged${pullRequest.url ? `: ${pullRequest.url}` : "."}`
    : "A linked PR has been merged.";

  return [
    "## Execution Complete",
    "",
    prReference,
    "",
    "The work item has been advanced to `done` and closed.",
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

function replaceMarkdownSection(body, sectionName, nextContent) {
  const normalizedBody = String(body || "").trim();
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(## ${escaped}\\n\\n)([\\s\\S]*?)(\\n(?=## )|$)`);

  if (pattern.test(normalizedBody)) {
    return normalizedBody.replace(
      pattern,
      (_, heading, _existing, suffix) => `${heading}${nextContent}\n${suffix}`
    );
  }

  return `${normalizedBody}\n\n## ${sectionName}\n\n${nextContent}`;
}

function buildVerificationCommands(config) {
  const commands = [config.verification.lint, config.verification.build];
  if (config.browserValidation && config.browserValidation.supported) {
    commands.push(config.browserValidation.command);
  }
  return [...new Set(commands.filter(Boolean))];
}

function validateVerificationPrerequisites(config) {
  const findings = [];

  if (!config.browserValidation || !config.browserValidation.supported) {
    findings.push(
      "Playwright or another browser validation command is not configured. `web-app` verification requires browser validation for user-visible work."
    );
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}

function runVerification(rootDir, commands) {
  const results = [];

  for (const command of commands) {
    try {
      execFileSync("/bin/zsh", ["-lc", command], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      results.push({ command, status: "passed" });
    } catch (error) {
      const stderr = error && error.stderr ? String(error.stderr).trim() : "";
      const stdout = error && error.stdout ? String(error.stdout).trim() : "";
      results.push({
        command,
        status: "failed",
        detail: stderr || stdout || "Command failed.",
      });
      break;
    }
  }

  return {
    ok: results.every((result) => result.status === "passed"),
    results,
  };
}

function buildVerificationSectionContent(verificationRun) {
  return verificationRun.results
    .map((result) =>
      result.status === "passed"
        ? `- ${result.command} - passed`
        : `- ${result.command} - failed (${result.detail})`
    )
    .join("\n");
}

function buildPullRequestTitle(issue) {
  return `feat: ${String(issue.title || "").replace(/^\[TASK\]\s*/i, "").trim()}`;
}

function parseTargetScope(issue, config = {}) {
  const sections = extractMarkdownSections(issue.body);
  const rawScope =
    sections.get("target files") || sections.get("target subsystem") || "";
  const subsystemAliases =
    (config.scopeRules && config.scopeRules.subsystemAliases) || {};

  const entries = String(rawScope)
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !/^path\/or\/subsystem-\d+\b/i.test(line))
    .map((line) => line.replace(/^`|`$/g, ""))
    .map((line) => line.replace(/\/+$/, ""))
    .filter(Boolean);

  const expandedEntries = entries.flatMap((entry) => {
    const alias = subsystemAliases[entry];
    return Array.isArray(alias) && alias.length ? alias : [entry];
  });

  return [...new Set(expandedEntries)];
}

function isPathWithinScope(filePath, scopeEntry) {
  const normalizedFile = String(filePath || "").replace(/^\.\/+/, "");
  const normalizedScope = String(scopeEntry || "").replace(/^\.\/+/, "");

  if (!normalizedScope) {
    return false;
  }

  if (normalizedFile === normalizedScope) {
    return true;
  }

  return normalizedFile.startsWith(`${normalizedScope}/`);
}

function evaluateImplementationScope(issue, changedFiles, config = {}) {
  const scopeEntries = parseTargetScope(issue, config);
  const labelConstraints =
    (config.scopeRules && config.scopeRules.labelConstraints) || {};
  const labels = (issue.labels || []).map((label) =>
    typeof label === "string" ? label : label.name
  );
  const constrainedEntries = labels.flatMap((label) =>
    Array.isArray(labelConstraints[label]) ? labelConstraints[label] : []
  );
  const effectiveScope = [...new Set([...scopeEntries, ...constrainedEntries])];

  if (!effectiveScope.length) {
    return {
      ok: false,
      findings: [
        "The issue must declare concrete `Target Files` entries before bounded implementation can be considered complete.",
      ],
      scopeEntries: effectiveScope,
      outOfScopeFiles: changedFiles || [],
    };
  }

  const outOfScopeFiles = (changedFiles || []).filter(
    (filePath) => !effectiveScope.some((entry) => isPathWithinScope(filePath, entry))
  );

  return {
    ok: outOfScopeFiles.length === 0,
    findings:
      outOfScopeFiles.length === 0
        ? []
        : [
            `Implementation changed files outside declared scope: ${outOfScopeFiles.join(", ")}.`,
          ],
    scopeEntries: effectiveScope,
    outOfScopeFiles,
  };
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
  buildImplementationComment,
  buildDoneComment,
  buildBranchName,
  buildPreflightPlan,
  buildPullRequestBody,
  buildPullRequestTitle,
  buildVerificationCommands,
  buildVerificationSectionContent,
  createOrSwitchBranch,
  commitAllChanges,
  evaluateImplementationScope,
  getCurrentBranchName,
  getChangedFilesSince,
  getHeadSha,
  getCurrentUpstreamBaseBranch,
  getWorktreeStatus,
  pushBranch,
  replaceMarkdownSection,
  runVerification,
  validateVerificationPrerequisites,
  prepareCombinedRuntime,
};
