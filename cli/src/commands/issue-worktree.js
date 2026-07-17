const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { buildBranchName } = require("../lib/runtime-combined");
const { buildConfig, inferProfile, inspectTarget } = require("../lib/web-app-context");
const {
  createIssueWorktree,
  listIssueWorktrees,
  removeIssueWorktree,
} = require("../lib/worktree");
const { printFooter, printKeyValue, printPathList, printSection } = require("../ui");

async function handleIssueWorktree(args) {
  const rootDir = path.resolve(args.target || process.cwd());

  if (args.list) {
    const worktrees = listIssueWorktrees(rootDir);
    printSection("Issue Worktrees");
    if (!worktrees.length) {
      printKeyValue("Status", "none active");
    } else {
      for (const worktree of worktrees) {
        printKeyValue(worktree.branch, worktree.path);
      }
    }
    return;
  }

  if (!args.issue) {
    throw new Error("`--issue <number>` is required (or use `--list`).");
  }

  const inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);
  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application."
    );
  }

  const config = buildConfig(rootDir, { ...args, profile }, inspection);
  const controlPlane = getControlPlane(config);
  const current = controlPlane.capabilities.getIssue(rootDir, args.issue);
  const branch = buildBranchName(current.issue);

  if (args.remove) {
    const result = removeIssueWorktree(rootDir, branch, { force: Boolean(args.force) });
    printSection("Issue Worktree Removed");
    printKeyValue("Issue", `#${current.issue.number} — ${current.issue.title}`);
    printKeyValue("Branch", branch);
    if (!result.removed) {
      printKeyValue("Status", "no worktree found for this issue — nothing to remove");
    } else {
      printKeyValue("Path", result.path);
    }
    return;
  }

  const result = createIssueWorktree(rootDir, branch, {
    targetPath: args.path,
  });

  printSection("Issue Worktree");
  printKeyValue("Issue", `#${current.issue.number} — ${current.issue.title}`);
  printKeyValue("Branch", branch);
  printKeyValue("Path", result.path);
  printKeyValue("Action", result.action);
  printPathList("Other Active Worktrees", listIssueWorktrees(rootDir)
    .filter((w) => w.branch !== branch)
    .map((w) => `${w.branch} — ${w.path}`));

  printFooter(
    `Work on issue #${current.issue.number} from this directory — start an agent session there ` +
      "(Claude Code, Codex, or another executor), " +
      `or run \`agentic-sdlc runtime split\` / \`runtime combined --issue ${current.issue.number}\` from ` +
      "anywhere; the runtime auto-detects this worktree by branch as long as you don't also pass an " +
      "explicit --target pointing elsewhere. Auto-detection does not expand an executor's filesystem " +
      "permissions: a sandboxed session must already include the worktree as a writable root. " +
      `When the issue is done: \`agentic-sdlc issue worktree --issue ${current.issue.number} --remove\`.`
  );
}

module.exports = {
  handleIssueWorktree,
};
