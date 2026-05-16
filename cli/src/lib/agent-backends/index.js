const { runOpenAIBackend } = require("./openai-api");
const { runAnthropicBackend } = require("./anthropic-api");

const BACKENDS = [
  {
    name: "openai-api",
    label: "OpenAI API (gpt-4.1)",
    envKey: "OPENAI_API_KEY",
    run: runOpenAIBackend,
  },
  {
    name: "anthropic-api",
    label: "Anthropic API (Claude Sonnet)",
    envKey: "ANTHROPIC_API_KEY",
    run: runAnthropicBackend,
  },
];

function detectAvailableBackends() {
  return BACKENDS.filter((backend) => Boolean(process.env[backend.envKey]));
}

function getAllBackends() {
  return BACKENDS;
}

function getAgentBackend(name) {
  const backend = BACKENDS.find((b) => b.name === name);
  if (!backend) {
    throw new Error(
      `Unsupported agent backend \`${name}\`. Supported: ${BACKENDS.map((b) => b.name).join(", ")}`
    );
  }
  return backend;
}

module.exports = {
  detectAvailableBackends,
  getAllBackends,
  getAgentBackend,
};
