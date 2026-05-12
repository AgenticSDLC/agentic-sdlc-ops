const githubProvider = require("./github-provider");

function getControlPlane(profileConfig = {}) {
  const providerName = profileConfig.controlPlaneProvider || "github";

  if (providerName !== "github") {
    throw new Error(`Unsupported control-plane provider \`${providerName}\`.`);
  }

  return githubProvider;
}

module.exports = {
  getControlPlane,
};
