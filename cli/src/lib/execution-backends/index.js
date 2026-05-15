const { runLocalCliBackend } = require("./local-cli");

function getExecutionBackend(config = {}) {
  const backendName =
    (config.execution && config.execution.backend) || "local-cli";

  if (backendName !== "local-cli") {
    throw new Error(`Unsupported execution backend \`${backendName}\`.`);
  }

  return {
    name: backendName,
    runImplementation(rootDir, context, options) {
      return runLocalCliBackend(rootDir, context, options);
    },
  };
}

module.exports = {
  getExecutionBackend,
};
