#!/usr/bin/env node

const { Command } = require("commander");
const { handleInit } = require("./src/commands/init");
const { handleDoctor } = require("./src/commands/doctor");
const { handleIssuePublish } = require("./src/commands/issue-publish");
const { handleIssueTransition } = require("./src/commands/issue-transition");
const { handleRuntimeCombined } = require("./src/commands/runtime-combined");

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
  const subtitle = chalk.hex("#4e6e66")("Portable repository overlay for issue-first execution");
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
  agentic-sdlc issue publish --draft pilot-web-app-combined
  agentic-sdlc issue transition --issue 12 --state in-progress
`
    );

  const applyCommonOptions = (command) =>
    command
      .option("--profile <name>", "Optional override. Current support: web-app")
      .option("--target <path>", "Target directory. Defaults to the current directory")
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
      .action(async (options) => {
        console.log(banner);
        await handleInit(options);
      })
  );

  applyCommonOptions(
    program
      .command("doctor")
      .description("Audit the local overlay and prerequisite state")
      .action(async (options) => {
        console.log(banner);
        await handleDoctor(options);
      })
  );

  const issue = program.command("issue").description("Publish and manage issue-first work items");
  const runtime = program.command("runtime").description("Run bounded execution entrypoints");
  applyCommonOptions(
    issue
      .command("publish")
      .description("Create a GitHub issue from a local draft and apply initial labels")
      .requiredOption("--draft <name-or-path>", "Draft file name or path")
      .option("--state <label>", "Initial lifecycle label", "ready-for-build")
      .option("--topology <mode>", "Topology label override: combined or split")
      .option("--label <name>", "Additional label. Repeat or comma-separate values", collectOption, [])
      .option("--no-default-labels", "Skip the standard initial labels")
      .option("--dry-run", "Show the resolved draft and labels without creating the issue")
      .action(async (options) => {
        console.log(banner);
        await handleIssuePublish(options);
      })
  );
  applyCommonOptions(
    issue
      .command("transition")
      .description("Move an issue through the standard lifecycle labels")
      .requiredOption("--issue <number>", "Issue number")
      .requiredOption("--state <label>", "Lifecycle label: ready-for-build, in-progress, in-review, done")
      .option("--label <name>", "Additional label. Repeat or comma-separate values", collectOption, [])
      .option("--remove-label <name>", "Additional label to remove. Repeat or comma-separate values", collectOption, [])
      .action(async (options) => {
        console.log(banner);
        await handleIssueTransition(options);
      })
  );
  applyCommonOptions(
    runtime
      .command("combined")
      .description("Run the combined-path runtime preflight for a bounded issue")
      .requiredOption("--issue <number>", "Issue number")
      .option("--base <branch>", "Explicit pull request base branch")
      .option("--implement", "Run the configured bounded implementation step through the execution backend")
      .option("--implementation-command <command>", "Explicit bounded implementation command for this run")
      .option("--verify", "Run verification, publish results to the PR, and transition to in-review on success")
      .option("--finalize", "Finalize a merged linked PR by transitioning the issue to done and closing it")
      .option("--no-sync-pr", "Skip PR creation or update")
      .option("--no-push", "Skip pushing the issue branch before PR sync")
      .option("--no-publish-blocker", "Do not publish a blocker comment when runtime start fails")
      .action(async (options) => {
        console.log(banner);
        await handleRuntimeCombined(options);
      })
  );

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
