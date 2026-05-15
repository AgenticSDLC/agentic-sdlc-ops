const { execFileSync } = require("child_process");

function resolveImplementationCommand(config, options = {}) {
  const explicit = options.implementationCommand;
  if (explicit) {
    return explicit;
  }

  return config.execution && config.execution.implementationCommand
    ? config.execution.implementationCommand
    : null;
}

function runLocalCliBackend(rootDir, context, options = {}) {
  const command = resolveImplementationCommand(context.config, options);
  if (!command) {
    return {
      ok: false,
      state: "blocked",
      summary:
        "No bounded implementation command is configured. Pass `--implementation-command` or add an `agentic:implement` script.",
      command: null,
      detail: null,
    };
  }

  try {
    const stdout = execFileSync("/bin/zsh", ["-lc", command], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        AGENTIC_SDLC_ISSUE_NUMBER: String(context.issue.number),
        AGENTIC_SDLC_ISSUE_TITLE: String(context.issue.title || ""),
        AGENTIC_SDLC_ISSUE_BRANCH: String(context.branch || ""),
        AGENTIC_SDLC_REPOSITORY: String(context.repoSlug || ""),
        AGENTIC_SDLC_PR_NUMBER: context.pullRequest
          ? String(context.pullRequest.number)
          : "",
        AGENTIC_SDLC_PR_URL: context.pullRequest ? String(context.pullRequest.url) : "",
        AGENTIC_SDLC_TOPOLOGY: String(context.config.topology || "combined"),
      },
    }).trim();

    return {
      ok: true,
      state: "success",
      summary: stdout || "Implementation command completed.",
      command,
      detail: null,
    };
  } catch (error) {
    const stderr = error && error.stderr ? String(error.stderr).trim() : "";
    const stdout = error && error.stdout ? String(error.stdout).trim() : "";
    return {
      ok: false,
      state: "failed",
      summary: "Implementation command failed.",
      command,
      detail: stderr || stdout || String(error.message || error),
    };
  }
}

module.exports = {
  resolveImplementationCommand,
  runLocalCliBackend,
};
