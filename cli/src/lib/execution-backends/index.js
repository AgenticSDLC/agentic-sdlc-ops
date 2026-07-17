const { getAgentBackend, detectAvailableBackends } = require("../agent-backends");

const FALLBACK_BACKEND = "openai-api";

// Resolution order: explicit config → AGENTIC_AGENT_BACKEND env → the sole
// backend whose API key is present → static fallback. Single-provider setups
// work with zero configuration; multi-provider setups choose explicitly.
function resolveBackendName(config = {}) {
  const configured = config.execution && config.execution.agentBackend;
  if (configured) {
    return configured;
  }
  if (process.env.AGENTIC_AGENT_BACKEND) {
    return process.env.AGENTIC_AGENT_BACKEND;
  }
  const detected = detectAvailableBackends();
  if (detected.length === 1) {
    return detected[0].name;
  }
  return FALLBACK_BACKEND;
}

function getExecutionBackend(config = {}) {
  const backendName = resolveBackendName(config);

  return {
    name: backendName,
    async runImplementation(rootDir, context) {
      const backend = getAgentBackend(backendName);
      return backend.run(rootDir, context);
    },
  };
}

module.exports = {
  getExecutionBackend,
  resolveBackendName,
};
