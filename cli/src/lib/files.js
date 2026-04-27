const fs = require("fs");
const path = require("path");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readText(filePath));
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeManagedFile(filePath, contents, summary) {
  if (fs.existsSync(filePath)) {
    summary.skipped.push(path.relative(summary.rootDir, filePath));
    return;
  }

  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, "utf8");
  summary.created.push(path.relative(summary.rootDir, filePath));
}

function updateManagedFile(filePath, contents, summary) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, "utf8");
  summary.updated.push(path.relative(summary.rootDir, filePath));
}

module.exports = {
  readText,
  readJsonIfExists,
  ensureDirectory,
  writeManagedFile,
  updateManagedFile,
};
