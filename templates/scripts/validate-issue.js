#!/usr/bin/env node
const fs = require("fs");

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error("GITHUB_EVENT_PATH is required");
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const issue = event.issue;

if (!issue || !issue.body) {
  console.error("Issue body not found in event payload");
  process.exit(1);
}

const title = issue.title || "";
const body = issue.body;
const errors = [];
const requiredSections = [
  "## Context",
  "## Requirements",
  "## Acceptance Criteria",
];

if (!title.startsWith("[TASK]")) {
  errors.push('Issue title must start with "[TASK]".');
}

for (const section of requiredSections) {
  if (!body.includes(section)) {
    errors.push(`Missing required section: ${section}`);
  }
}

if (!body.includes("## Target Files") && !body.includes("## Target Subsystem")) {
  errors.push("Issue must include either ## Target Files or ## Target Subsystem.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Issue readiness validation passed.");
