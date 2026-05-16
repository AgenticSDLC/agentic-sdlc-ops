const { getAgentBackend } = require("../agent-backends");

function getExecutionBackend(config = {}) {
  const backendName =
    (config.execution && config.execution.agentBackend) || "openai-api";

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
};
