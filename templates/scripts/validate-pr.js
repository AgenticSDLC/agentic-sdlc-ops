#!/usr/bin/env node
import { readFileSync } from "node:fs";

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error("GITHUB_EVENT_PATH is required");
  process.exit(1);
}

const event = JSON.parse(readFileSync(eventPath, "utf8"));
const pullRequest = event.pull_request;

if (!pullRequest || !pullRequest.body) {
  console.error("Pull request body not found in event payload");
  process.exit(1);
}

const title = pullRequest.title || "";
const body = pullRequest.body;
const errors = [];
const conventionalCommitPattern =
  /^(feat|fix|docs|chore|refactor|test|build|ci|perf|style)(\(.+\))?: .+/;

if (!conventionalCommitPattern.test(title)) {
  errors.push(
    "PR title must use Conventional Commit format, for example: feat: add workflow."
  );
}

for (const section of [
  "## Acceptance Criteria",
  "## Verification",
  "## Risks / Follow-Up",
]) {
  if (!body.includes(section)) {
    errors.push(`Missing required section: ${section}`);
  }
}

if (!/(?:Closes|Implements:.*?)#\d+/i.test(body)) {
  errors.push("PR body must link an issue using `Closes #<number>` or `Implements: #<number>`.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Pull request contract validation passed.");
