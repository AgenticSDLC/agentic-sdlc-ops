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

function recordDrift(summary, relativePath, expectedContents) {
  summary.drifted = summary.drifted || [];
  summary.drifted.push(relativePath);
  summary.driftDetails = summary.driftDetails || {};
  summary.driftDetails[relativePath] = expectedContents;
}

// Converge semantics for overlay-managed files:
// - missing            → create (report-only in diff mode)
// - exists, identical  → skipped
// - exists, differs    → drifted; overwritten only with force
function writeManagedFile(filePath, contents, summary) {
  const options = summary.options || {};
  const relativePath = path.relative(summary.rootDir, filePath);

  if (fs.existsSync(filePath)) {
    const existing = readText(filePath);
    if (existing === contents) {
      summary.skipped.push(relativePath);
      return;
    }

    if (options.force && !options.diffOnly) {
      fs.writeFileSync(filePath, contents, "utf8");
      summary.updated.push(relativePath);
      return;
    }

    recordDrift(summary, relativePath, contents);
    return;
  }

  if (options.diffOnly) {
    summary.created.push(relativePath);
    return;
  }

  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, "utf8");
  summary.created.push(relativePath);
}

// Same converge semantics as writeManagedFile, but a missing file is always
// created (merged managed blocks, seed content). An existing file that
// differs is drift — overwritten only with force, so local customizations
// inside managed content are never silently clobbered.
function updateManagedFile(filePath, contents, summary) {
  const options = summary.options || {};
  const relativePath = path.relative(summary.rootDir, filePath);

  if (fs.existsSync(filePath)) {
    if (readText(filePath) === contents) {
      summary.skipped.push(relativePath);
      return;
    }

    if (options.force && !options.diffOnly) {
      fs.writeFileSync(filePath, contents, "utf8");
      summary.updated.push(relativePath);
      return;
    }

    recordDrift(summary, relativePath, contents);
    return;
  }

  if (options.diffOnly) {
    summary.created.push(relativePath);
    return;
  }

  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, "utf8");
  summary.created.push(relativePath);
}

module.exports = {
  readText,
  readJsonIfExists,
  ensureDirectory,
  writeManagedFile,
  updateManagedFile,
};
