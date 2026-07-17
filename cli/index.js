#!/usr/bin/env node

const { Command } = require("commander");
const { handleInit } = require("./src/commands/init");
const { handleDoctor } = require("./src/commands/doctor");
const { handleIssuePublish } = require("./src/commands/issue-publish");
const { handleIssueTransition } = require("./src/commands/issue-transition");
const { handleRuntimeCombined } = require("./src/commands/runtime-combined");
const { handleRuntimeSplit } = require("./src/commands/runtime-split");
const { handleIssueList } = require("./src/commands/issue-list");
const { handleIssueWorktree } = require("./src/commands/issue-worktree");

async function loadChalk() {
  try {
    return (await import("chalk")).default;
  } catch {
    return null;
  }
}

function buildBanner(chalk) {
  if (!chalk) {
    return "\nAgentic SDLC\n============\n";
  }

  const title = chalk.bold.hex("#17423b")("Agentic SDLC");
  const line = chalk.hex("#c4862f")("============");
  const subtitle = chalk.hex("#4e6e66")(
    "Portable repository overlay for issue-first execution",
  );
  return `\n${title}\n${line}\n${subtitle}\n`;
}

async function main() {
  const chalk = await loadChalk();
  const banner = buildBanner(chalk);
  const program = new Command();

  program
    .name("agentic-sdlc")
    .description("Install and audit the agentic SDLC overlay")
    .showHelpAfterError()
    .addHelpText("beforeAll", banner)
    .addHelpText(
      "afterAll",
      `
Examples:
  agentic-sdlc init
  agentic-sdlc init --profile web-app --local-only
  agentic-sdlc doctor
  agentic-sdlc issue publish --spec pilot-web-app-combined
  agentic-sdlc issue transition --issue 12 --state in-progress
`,
    );

  const applyCommonOptions = (command) =>
    command
      .option("--profile <name>", "Optional override. Current support: web-app")
      .option(
        "--target <path>",
        "Target directory. Defaults to the current directory",
      )
      .option("--stack <preset>", "Override stack detection")
      .option("--app-shape <shape>", "Override app shape")
      .option("--mode <mode>", "Override install mode")
      .option("--local-only", "Force local-only install behavior")
      .option("--yes", "Accept defaults for prompts");

  const collectOption = (value, previous) => {
    previous.push(value);
    return previous;
  };

  applyCommonOptions(
    program
      .command("init")
      .description("Install the operating overlay for a supported profile")
      .option("--init-git", "Initialize git automatically when missing")
      .option("--seed-issue", "Generate the pilot issue draft")
      .option("--no-seed-issue", "Skip pilot issue generation")
      .option(
        "--diff",
        "Report-only converge check: list created/updated/drifted files and print drift diffs without writing",
      )
      .option(
        "--force",
        "Overwrite drifted overlay-managed files so they converge to canon",
      )
      .action(async (options) => {
        console.log(banner);
        await handleInit(options);
      }),
  );

  applyCommonOptions(
    program
      .command("doctor")
      .description("Audit the local overlay and prerequisite state")
      .action(async (options) => {
        console.log(banner);
        await handleDoctor(options);
      }),
  );

  const issue = program
    .command("issue")
    .description("Publish and manage issue-first work items");
  const runtime = program
    .command("runtime")
    .description("Run bounded execution entrypoints");
  applyCommonOptions(
    issue
      .command("publish")
      .description(
        "Create a GitHub issue from a local spec and apply initial labels",
      )
      .requiredOption("--spec <name-or-path>", "Spec file name or path")
      .option(
        "--state <label>",
        "Initial lifecycle label, or `none` for issues with upstream dependencies (add ready-for-build later)",
        "ready-for-build",
      )
      .option("--topology <mode>", "Topology label override: combined or split")
      .option(
        "--label <name>",
        "Additional label. Repeat or comma-separate values",
        collectOption,
        [],
      )
      .option("--no-default-labels", "Skip the standard initial labels")
      .option(
        "--dry-run",
        "Show the resolved spec and labels without creating the issue",
      )
      .action(async (options) => {
        console.log(banner);
        await handleIssuePublish(options);
      }),
  );
  applyCommonOptions(
    issue
      .command("transition")
      .description("Move an issue through the standard lifecycle labels")
      .requiredOption("--issue <number>", "Issue number")
      .requiredOption(
        "--state <label>",
        "Lifecycle label: ready-for-build, in-progress, in-review, done",
      )
      .option(
        "--label <name>",
        "Additional label. Repeat or comma-separate values",
        collectOption,
        [],
      )
      .option(
        "--remove-label <name>",
        "Additional label to remove. Repeat or comma-separate values",
        collectOption,
        [],
      )
      .action(async (options) => {
        console.log(banner);
        await handleIssueTransition(options);
      }),
  );
  applyCommonOptions(
    issue
      .command("list")
      .description("List recent issues for the current repository")
      .option("--limit <n>", "Number of issues to show", 10)
      .action(async (options) => {
        console.log(banner);
        await handleIssueList(options);
      }),
  );
  applyCommonOptions(
    issue
      .command("worktree")
      .description(
        "Create or remove an isolated git worktree for an issue, so it can be worked in parallel with other issues",
      )
      .option("--issue <number>", "Issue number")
      .option(
        "--path <dir>",
        "Explicit worktree directory (default: sibling directory named <repo>-<branch>)",
      )
      .option("--remove", "Remove the worktree for this issue")
      .option("--force", "Force-remove even with uncommitted changes")
      .option("--list", "List active issue worktrees")
      .action(async (options) => {
        console.log(banner);
        await handleIssueWorktree(options);
      }),
  );
  applyCommonOptions(
    runtime
      .command("combined")
      .description(
        "Run the combined-path runtime for a bounded issue (implements, verifies, and advances lifecycle)",
      )
      .requiredOption("--issue <number>", "Issue number")
      .option("--base <branch>", "Explicit pull request base branch")
      .option(
        "--verify",
        "Resume from verification (skip implementation)",
      )
      .option(
        "--finalize",
        "Finalize a merged linked PR by transitioning the issue to done and closing it",
      )
      .action(async (options) => {
        console.log(banner);
        await handleRuntimeCombined(options);
      }),
  );
  applyCommonOptions(
    runtime
      .command("split")
      .description(
        "Run the split-path runtime for a `topology:split` issue (planner → builder → verifier, with visible handoff markers; CI owns verification)",
      )
      .requiredOption("--issue <number>", "Issue number")
      .option(
        "--role <role>",
        "Force a specific role: planner, builder, or verifier (default: auto-detect from issue markers)",
      )
      .option("--base <branch>", "Explicit pull request base branch")
      .option(
        "--backend <name>",
        "Agent backend override: openai-api or anthropic-api",
      )
      .option(
        "--finalize",
        "Finalize a merged linked PR by transitioning the issue to done and closing it",
      )
      .action(async (options) => {
        console.log(banner);
        await handleRuntimeSplit(options);
      }),
  );

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
