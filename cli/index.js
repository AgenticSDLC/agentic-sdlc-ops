#!/usr/bin/env node

const { Command } = require("commander");
const { handleInit } = require("./src/commands/init");
const { handleDoctor } = require("./src/commands/doctor");

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

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
