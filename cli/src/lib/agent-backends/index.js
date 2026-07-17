const {
  runOpenAIBackend,
  runOpenAIGeneration,
  DEFAULT_MODEL: OPENAI_DEFAULT_MODEL,
} = require("./openai-api");
const {
  runAnthropicBackend,
  runAnthropicGeneration,
  DEFAULT_MODEL: ANTHROPIC_DEFAULT_MODEL,
} = require("./anthropic-api");

const BACKENDS = [
  {
    name: "openai-api",
    label: `OpenAI API (${OPENAI_DEFAULT_MODEL})`,
    envKey: "OPENAI_API_KEY",
    defaultModel: OPENAI_DEFAULT_MODEL,
    run: runOpenAIBackend,
    generate: runOpenAIGeneration,
  },
  {
    name: "anthropic-api",
    label: `Anthropic API (${ANTHROPIC_DEFAULT_MODEL})`,
    envKey: "ANTHROPIC_API_KEY",
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    run: runAnthropicBackend,
    generate: runAnthropicGeneration,
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

// Model resolution order: AGENTIC_MODEL (global override) wins, then the
// per-role override (AGENTIC_MODEL_PLANNER / _BUILDER / _VERIFIER), then the
// backend's default. Role is optional — combined topology passes none.
function resolveModel(role, backendName) {
  if (process.env.AGENTIC_MODEL) {
    return process.env.AGENTIC_MODEL;
  }
  if (role) {
    const roleOverride = process.env[`AGENTIC_MODEL_${role.toUpperCase()}`];
    if (roleOverride) {
      return roleOverride;
    }
  }
  const backend = backendName ? getAgentBackend(backendName) : BACKENDS[0];
  return backend.defaultModel;
}

module.exports = {
  detectAvailableBackends,
  getAllBackends,
  getAgentBackend,
  resolveModel,
};
