const path = require("path");
const { readText } = require("./files");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

function templatePath(...segments) {
  return path.join(REPO_ROOT, ...segments);
}

function loadTemplate(...segments) {
  return readText(templatePath(...segments));
}

function renderTemplate(template, values) {
  return template.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key) => {
    if (!(key in values)) {
      throw new Error(`Missing template value: ${key}`);
    }

    return values[key];
  });
}

module.exports = {
  loadTemplate,
  renderTemplate,
  templatePath,
};
