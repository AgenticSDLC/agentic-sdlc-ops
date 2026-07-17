const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const {
  parseWorktreeListPorcelain,
  listIssueWorktrees,
  listRemoteIssueBranches,
  resolveIssueBranch,
  resolveIssueWorktree,
  resolveRuntimeWorkingDirectory,
  createIssueWorktree,
  removeIssueWorktree,
} = require("../worktree");

// ---- parseWorktreeListPorcelain: pure, fixture-based ----

test("parseWorktreeListPorcelain reads worktree/HEAD/branch blocks", () => {
  const fixture = [
    "worktree /repo/main",
    "HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "branch refs/heads/main",
    "",
    "worktree /repo/../repo-issue-11-fix",
    "HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "branch refs/heads/issue-11-fix",
    "",
  ].join("\n");

  const entries = parseWorktreeListPorcelain(fixture);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].path, "/repo/main");
  assert.equal(entries[0].branch, "main");
  assert.equal(entries[1].branch, "issue-11-fix");
});

test("parseWorktreeListPorcelain handles detached HEAD entries", () => {
  const fixture = [
    "worktree /repo/detached",
    "HEAD cccccccccccccccccccccccccccccccccccccccc",
    "detached",
  ].join("\n");

  const entries = parseWorktreeListPorcelain(fixture);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].branch, null);
  assert.equal(entries[0].detached, true);
});

test("parseWorktreeListPorcelain returns empty array for empty output", () => {
  assert.deepEqual(parseWorktreeListPorcelain(""), []);
  assert.deepEqual(parseWorktreeListPorcelain(undefined), []);
});

// ---- git-backed integration tests: real repo, real worktrees ----
// Thin git wrappers are exactly the kind of code where mocking git behavior
// risks false confidence — these run against a real temp repo instead.

function git(dir, args) {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function withTempRepo(fn) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-worktree-test-"));
  const dir = path.join(sandbox, "repo");
  const remote = path.join(sandbox, "origin.git");
  try {
    fs.mkdirSync(dir);
    git(sandbox, ["init", "--bare", "-q", remote]);
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "test@example.com"]);
    git(dir, ["config", "user.name", "Test"]);
    git(dir, ["remote", "add", "origin", remote]);
    fs.writeFileSync(path.join(dir, "README.md"), "seed\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "seed"]);
    git(dir, ["push", "-q", "-u", "origin", "main"]);
    fn(dir);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

function publishIssueBranch(dir, branchName, options = {}) {
  git(dir, ["branch", branchName]);
  git(dir, ["push", "-q", "origin", `${branchName}:refs/heads/${branchName}`]);
  if (options.deleteLocal) {
    git(dir, ["branch", "-D", branchName]);
  }
}

test("createIssueWorktree refuses to synthesize a branch when the remote issue branch is missing", () => {
  withTempRepo((dir) => {
    assert.throws(
      () => createIssueWorktree(dir, "issue-11-fix-thing"),
      /Remote issue branch `origin\/issue-11-fix-thing` could not be established/
    );
    assert.equal(resolveIssueWorktree(dir, "issue-11-fix-thing"), null);
  });
});

test("createIssueWorktree tracks an automation-created remote branch", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-11-remote", { deleteLocal: true });
    const result = createIssueWorktree(dir, "issue-11-remote");
    assert.equal(result.action, "tracked-remote-branch");
    assert.ok(fs.existsSync(result.path));
    assert.ok(fs.existsSync(path.join(result.path, "README.md")));
  });
});

test("resolveIssueBranch selects the unique automation-created branch despite slug differences", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-21-task-title-kept-by-workflow", { deleteLocal: true });
    assert.deepEqual(listRemoteIssueBranches(dir, 21), [
      "issue-21-task-title-kept-by-workflow",
    ]);
    assert.equal(
      resolveIssueBranch(dir, 21),
      "issue-21-task-title-kept-by-workflow"
    );
  });
});

test("resolveIssueBranch fails closed when no remote issue branch exists", () => {
  withTempRepo((dir) => {
    assert.throws(
      () => resolveIssueBranch(dir, 22),
      /Remote issue branch matching `origin\/issue-22-\*` could not be established/
    );
  });
});

test("resolveIssueBranch fails closed when multiple remote branches match", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-23-first", { deleteLocal: true });
    publishIssueBranch(dir, "issue-23-second", { deleteLocal: true });
    assert.throws(
      () => resolveIssueBranch(dir, 23),
      /Multiple remote branches match issue #23: issue-23-first, issue-23-second/
    );
    assert.equal(
      listIssueWorktrees(dir).some((entry) => entry.branch?.startsWith("issue-23-")),
      false
    );
  });
});

test("createIssueWorktree is idempotent — a second call reuses the existing worktree", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-12-x", { deleteLocal: true });
    const first = createIssueWorktree(dir, "issue-12-x");
    const second = createIssueWorktree(dir, "issue-12-x");
    assert.equal(second.action, "reused");
    assert.equal(path.resolve(second.path), path.resolve(first.path));
  });
});

test("createIssueWorktree attaches to a branch that already exists locally", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-13-preexisting");
    const result = createIssueWorktree(dir, "issue-13-preexisting");
    assert.equal(result.action, "attached-existing-local-branch");
    assert.ok(fs.existsSync(result.path));
  });
});

test("createIssueWorktree refuses a target path that exists and is not a worktree", () => {
  withTempRepo((dir) => {
    const strayPath = path.join(dir, "..", "stray-dir");
    fs.mkdirSync(strayPath, { recursive: true });
    try {
      assert.throws(
        () => createIssueWorktree(dir, "issue-14-x", { targetPath: strayPath }),
        /already exists and is not a registered git worktree/
      );
    } finally {
      fs.rmSync(strayPath, { recursive: true, force: true });
    }
  });
});

test("listIssueWorktrees only returns issue-<number>-<slug> branches", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-15-x", { deleteLocal: true });
    const wt = createIssueWorktree(dir, "issue-15-x");
    git(dir, ["worktree", "add", "-b", "not-an-issue-branch", path.join(dir, "..", "other")]);

    const found = listIssueWorktrees(dir);
    assert.ok(found.some((w) => w.branch === "issue-15-x"));
    assert.ok(!found.some((w) => w.branch === "not-an-issue-branch"));

    fs.rmSync(wt.path, { recursive: true, force: true });
    fs.rmSync(path.join(dir, "..", "other"), { recursive: true, force: true });
  });
});

test("removeIssueWorktree removes the worktree and reports no-op when already gone", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-16-x", { deleteLocal: true });
    const wt = createIssueWorktree(dir, "issue-16-x");
    const removed = removeIssueWorktree(dir, "issue-16-x");
    assert.equal(removed.removed, true);
    assert.equal(fs.existsSync(wt.path), false);

    const second = removeIssueWorktree(dir, "issue-16-x");
    assert.deepEqual(second, { removed: false, reason: "no-worktree-found" });
  });
});

test("removeIssueWorktree can be invoked from inside the issue worktree", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-16-current", { deleteLocal: true });
    const wt = createIssueWorktree(dir, "issue-16-current");
    const removed = removeIssueWorktree(wt.path, "issue-16-current");
    assert.equal(removed.removed, true);
    assert.equal(fs.existsSync(wt.path), false);
  });
});

test("resolveRuntimeWorkingDirectory: no worktree for the branch means no redirect", () => {
  withTempRepo((dir) => {
    const result = resolveRuntimeWorkingDirectory(dir, "issue-17-nonexistent", false);
    assert.deepEqual(result, { rootDir: dir, redirected: false });
  });
});

test("resolveRuntimeWorkingDirectory auto-redirects when no explicit --target was given", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-18-x", { deleteLocal: true });
    const wt = createIssueWorktree(dir, "issue-18-x");
    const result = resolveRuntimeWorkingDirectory(dir, "issue-18-x", false);
    assert.equal(result.redirected, true);
    // realpath both sides — the resolved rootDir is canonicalized (e.g. macOS
    // /var -> /private/var), wt.path from createIssueWorktree is not.
    assert.equal(fs.realpathSync(result.rootDir), fs.realpathSync(wt.path));
  });
});

test("resolveRuntimeWorkingDirectory refuses a mismatched explicit --target instead of guessing", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-19-x", { deleteLocal: true });
    createIssueWorktree(dir, "issue-19-x");
    assert.throws(
      () => resolveRuntimeWorkingDirectory(dir, "issue-19-x", true),
      /checked out in a different worktree/
    );
  });
});

test("resolveRuntimeWorkingDirectory does not redirect when already standing in the matching worktree", () => {
  withTempRepo((dir) => {
    publishIssueBranch(dir, "issue-20-x", { deleteLocal: true });
    const wt = createIssueWorktree(dir, "issue-20-x");
    const result = resolveRuntimeWorkingDirectory(wt.path, "issue-20-x", true);
    assert.deepEqual(result, { rootDir: wt.path, redirected: false });
  });
});
