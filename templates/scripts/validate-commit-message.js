#!/usr/bin/env node
const fs = require("fs");

const commitMessage = fs.readFileSync(0, "utf8").trim();
const conventionalCommitPattern =
  /^(feat|fix|docs|chore|refactor|test|build|ci|perf|style)(\(.+\))?: .+/;

if (!conventionalCommitPattern.test(commitMessage)) {
  console.error(
    "Commit message must use Conventional Commit format, for example: feat: add workflow."
  );
  process.exit(1);
}

console.log("Commit message validation passed.");
