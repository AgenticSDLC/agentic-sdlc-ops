const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// Parses `git worktree list --porcelain` output into structured entries.
// Pure — no git calls — so it's testable with fixture strings.
function parseWorktreeListPorcelain(output) {
  const blocks = String(output || "")
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const entry = {
        path: null,
        head: null,
        branch: null,
        detached: false,
        bare: false,
        locked: false,
        prunable: false,
      };

      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) {
          entry.path = line.slice("worktree ".length).trim();
        } else if (line.startsWith("HEAD ")) {
          entry.head = line.slice("HEAD ".length).trim();
        } else if (line.startsWith("branch ")) {
          entry.branch = line.slice("branch ".length).trim().replace(/^refs\/heads\//, "");
        } else if (line === "detached") {
          entry.detached = true;
        } else if (line === "bare") {
          entry.bare = true;
        } else if (line.startsWith("locked")) {
          entry.locked = true;
        } else if (line.startsWith("prunable")) {
          entry.prunable = true;
        }
      }

      return entry;
    })
    .filter((entry) => entry.path);
}

function listWorktrees(rootDir) {
  try {
    const output = execFileSync("git", ["worktree", "list", "--porcelain"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return parseWorktreeListPorcelain(output);
  } catch {
    return [];
  }
}

// sdlc-ops-managed worktrees only — anything on an issue-<number>-<slug> branch.
function listIssueWorktrees(rootDir) {
  return listWorktrees(rootDir).filter(
    (entry) => entry.branch && /^issue-\d+-/.test(entry.branch)
  );
}

// A prunable entry means git's registry still lists it but the working
// directory is gone (deleted without `git worktree remove`) — treat that as
// "no worktree" rather than a live match pointing at nothing.
function resolveIssueWorktree(rootDir, branchName) {
  return (
    listWorktrees(rootDir).find(
      (entry) => entry.branch === branchName && !entry.prunable
    ) || null
  );
}

// realpath so comparisons are correct even when the caller's cwd or a
// worktree path traverses a symlink (e.g. macOS /var -> /private/var) —
// path.resolve() alone does not follow symlinks and would falsely report a
// mismatch between two names for the same directory.
function canonicalPath(candidatePath) {
  try {
    return fs.realpathSync(candidatePath);
  } catch {
    return path.resolve(candidatePath);
  }
}

// Decides which directory a runtime command should actually operate in.
// - No worktree exists for this branch anywhere: operate in rootDir as given.
// - A worktree exists and already IS rootDir: no change.
// - A worktree exists elsewhere and the caller did not pass an explicit
//   --target: auto-redirect to it (the common case — you ran the runtime
//   command from the main checkout but the issue's work lives in its own
//   worktree).
// - A worktree exists elsewhere and the caller DID pass an explicit
//   --target that doesn't match: refuse rather than silently operating on
//   the wrong checkout or the wrong branch.
function resolveRuntimeWorkingDirectory(rootDir, branchName, explicitTargetGiven) {
  const worktree = resolveIssueWorktree(rootDir, branchName);
  if (!worktree) {
    return { rootDir, redirected: false };
  }

  const worktreePath = canonicalPath(worktree.path);
  if (worktreePath === canonicalPath(rootDir)) {
    return { rootDir, redirected: false };
  }

  if (explicitTargetGiven) {
    throw new Error(
      `Issue branch \`${branchName}\` is checked out in a different worktree: ${worktree.path}. ` +
        `Re-run with \`--target ${worktree.path}\`, or remove the mismatched worktree first with ` +
        "`agentic-sdlc issue worktree --remove`."
    );
  }

  return { rootDir: worktreePath, redirected: true };
}

function branchExistsLocally(rootDir, branchName) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branchName}`], {
      cwd: rootDir,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function fetchRemoteBranch(rootDir, branchName) {
  try {
    execFileSync(
      "git",
      [
        "fetch",
        "--no-tags",
        "origin",
        `+refs/heads/${branchName}:refs/remotes/origin/${branchName}`,
      ],
      {
        cwd: rootDir,
        stdio: ["ignore", "ignore", "pipe"],
      }
    );
  } catch (error) {
    const detail = String(error?.stderr || error?.message || "").trim();
    throw new Error(
      `Remote issue branch \`origin/${branchName}\` could not be established. ` +
        "The worktree command will not create a replacement branch; wait for branch automation " +
        "or restore remote access, then retry." +
        (detail ? ` Git reported: ${detail}` : "")
    );
  }
}

function issueWorktreePath(rootDir, branchName) {
  const repoName = path.basename(path.resolve(rootDir));
  return path.resolve(rootDir, "..", `${repoName}-${branchName}`);
}

// Creates (or reuses) an isolated worktree for an existing remote issue
// branch, so it can be worked in parallel without fighting over one checkout.
// Branch creation belongs to lifecycle automation; this helper only attaches.
function createIssueWorktree(rootDir, branchName, options = {}) {
  const existing = resolveIssueWorktree(rootDir, branchName);
  if (existing) {
    return { path: existing.path, action: "reused" };
  }

  const worktreePath = options.targetPath
    ? path.resolve(options.targetPath)
    : issueWorktreePath(rootDir, branchName);

  if (fs.existsSync(worktreePath)) {
    throw new Error(
      `Target path already exists and is not a registered git worktree: ${worktreePath}`
    );
  }

  // The issue lifecycle owns branch creation. A worktree is only an isolated
  // checkout of that branch; it must never synthesize a replacement from a
  // potentially stale local default branch.
  fetchRemoteBranch(rootDir, branchName);

  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });

  // Canonicalize on the way out so `.path` means the same thing regardless
  // of which branch ran — the "reused" case above returns git's own
  // (already-canonical) listing, and callers compare paths across both.
  if (branchExistsLocally(rootDir, branchName)) {
    execFileSync("git", ["worktree", "add", worktreePath, branchName], {
      cwd: rootDir,
      stdio: ["ignore", "ignore", "pipe"],
    });
    return { path: canonicalPath(worktreePath), action: "attached-existing-local-branch" };
  }

  execFileSync(
    "git",
    ["worktree", "add", "--track", "-b", branchName, worktreePath, `origin/${branchName}`],
    { cwd: rootDir, stdio: ["ignore", "ignore", "pipe"] }
  );
  return { path: canonicalPath(worktreePath), action: "tracked-remote-branch" };
}

function removeIssueWorktree(rootDir, branchName, options = {}) {
  const existing = resolveIssueWorktree(rootDir, branchName);
  if (!existing) {
    return { removed: false, reason: "no-worktree-found" };
  }

  const args = ["worktree", "remove", existing.path];
  if (options.force) {
    args.push("--force");
  }

  execFileSync("git", args, { cwd: rootDir, stdio: ["ignore", "ignore", "pipe"] });
  return { removed: true, path: existing.path };
}

module.exports = {
  parseWorktreeListPorcelain,
  listWorktrees,
  listIssueWorktrees,
  resolveIssueWorktree,
  resolveRuntimeWorkingDirectory,
  createIssueWorktree,
  removeIssueWorktree,
  issueWorktreePath,
};
