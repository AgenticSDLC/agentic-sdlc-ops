const assert = require("node:assert/strict");
const { test } = require("node:test");
const anthropic = require("../anthropic-api");
const openai = require("../openai-api");
const { getAllBackends, getAgentBackend, resolveModel } = require("../index");

const context = {
  repoSlug: "acme/app",
  branch: "issue-1-x",
  issue: {
    number: 1,
    title: "[TASK] x",
    body: "## Requirements\nr\n## Acceptance Criteria\n- a\n## Target Files\n- src/x.js",
  },
  config: { stackPreset: "nextjs-pnpm" },
};

const files = [{ path: "src/x.js", content: "export const x = 1;\n" }];

test("both backends preload current file contents into the prompt", () => {
  for (const buildPrompt of [anthropic.buildPrompt, openai.buildPrompt]) {
    const prompt = buildPrompt(context, files);
    assert.ok(prompt.includes("## Current File Contents"));
    assert.ok(prompt.includes("export const x = 1;"));
    assert.ok(prompt.includes("NEVER remove existing functionality"));
  }
});

test("prompts omit the file block when no files are provided", () => {
  for (const buildPrompt of [anthropic.buildPrompt, openai.buildPrompt]) {
    assert.ok(!buildPrompt(context, []).includes("## Current File Contents"));
  }
});

test("backend labels derive from the live default models", () => {
  for (const backend of getAllBackends()) {
    assert.ok(
      backend.label.includes(backend.defaultModel),
      `${backend.label} should include ${backend.defaultModel}`
    );
    assert.equal(typeof backend.generate, "function");
  }
  assert.equal(getAgentBackend("anthropic-api").defaultModel, anthropic.DEFAULT_MODEL);
  assert.equal(getAgentBackend("openai-api").defaultModel, openai.DEFAULT_MODEL);
});

test("resolveModel resolution order: global env, role env, backend default", () => {
  const saved = {
    global: process.env.AGENTIC_MODEL,
    planner: process.env.AGENTIC_MODEL_PLANNER,
  };
  try {
    delete process.env.AGENTIC_MODEL;
    delete process.env.AGENTIC_MODEL_PLANNER;

    assert.equal(resolveModel("planner", "anthropic-api"), anthropic.DEFAULT_MODEL);
    assert.equal(resolveModel(undefined, "openai-api"), openai.DEFAULT_MODEL);

    process.env.AGENTIC_MODEL_PLANNER = "role-model";
    assert.equal(resolveModel("planner", "anthropic-api"), "role-model");
    assert.equal(resolveModel("builder", "anthropic-api"), anthropic.DEFAULT_MODEL);

    process.env.AGENTIC_MODEL = "global-model";
    assert.equal(resolveModel("planner", "anthropic-api"), "global-model");
  } finally {
    if (saved.global === undefined) delete process.env.AGENTIC_MODEL;
    else process.env.AGENTIC_MODEL = saved.global;
    if (saved.planner === undefined) delete process.env.AGENTIC_MODEL_PLANNER;
    else process.env.AGENTIC_MODEL_PLANNER = saved.planner;
  }
});
