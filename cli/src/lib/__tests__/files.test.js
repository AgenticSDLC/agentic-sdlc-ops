const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writeManagedFile, updateManagedFile } = require("../files");

function scratchSummary(rootDir, options = {}) {
  return {
    rootDir,
    options,
    created: [],
    skipped: [],
    updated: [],
    drifted: [],
  };
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-files-test-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("writeManagedFile creates missing files", () => {
  withTempDir((dir) => {
    const summary = scratchSummary(dir);
    const target = path.join(dir, "docs", "a.md");
    writeManagedFile(target, "canon\n", summary);
    assert.deepEqual(summary.created, [path.join("docs", "a.md")]);
    assert.equal(fs.readFileSync(target, "utf8"), "canon\n");
  });
});

test("writeManagedFile skips identical files", () => {
  withTempDir((dir) => {
    const target = path.join(dir, "a.md");
    fs.writeFileSync(target, "canon\n");
    const summary = scratchSummary(dir);
    writeManagedFile(target, "canon\n", summary);
    assert.deepEqual(summary.skipped, ["a.md"]);
    assert.deepEqual(summary.drifted, []);
  });
});

test("writeManagedFile reports drift without force and preserves the file", () => {
  withTempDir((dir) => {
    const target = path.join(dir, "a.md");
    fs.writeFileSync(target, "local edits\n");
    const summary = scratchSummary(dir);
    writeManagedFile(target, "canon\n", summary);
    assert.deepEqual(summary.drifted, ["a.md"]);
    assert.equal(summary.driftDetails["a.md"], "canon\n");
    assert.equal(fs.readFileSync(target, "utf8"), "local edits\n");
  });
});

test("writeManagedFile converges drifted files with force", () => {
  withTempDir((dir) => {
    const target = path.join(dir, "a.md");
    fs.writeFileSync(target, "local edits\n");
    const summary = scratchSummary(dir, { force: true });
    writeManagedFile(target, "canon\n", summary);
    assert.deepEqual(summary.updated, ["a.md"]);
    assert.equal(fs.readFileSync(target, "utf8"), "canon\n");
  });
});

test("diff mode never writes", () => {
  withTempDir((dir) => {
    const drifted = path.join(dir, "a.md");
    const missing = path.join(dir, "b.md");
    fs.writeFileSync(drifted, "local edits\n");

    const summary = scratchSummary(dir, { diffOnly: true, force: true });
    writeManagedFile(drifted, "canon\n", summary);
    writeManagedFile(missing, "canon\n", summary);
    updateManagedFile(path.join(dir, "c.md"), "seed\n", summary);

    assert.deepEqual(summary.drifted, ["a.md"]);
    assert.deepEqual(summary.created.sort(), ["b.md", "c.md"]);
    assert.equal(fs.readFileSync(drifted, "utf8"), "local edits\n");
    assert.ok(!fs.existsSync(missing));
    assert.ok(!fs.existsSync(path.join(dir, "c.md")));
  });
});

test("updateManagedFile creates missing files and skips identical content", () => {
  withTempDir((dir) => {
    const target = path.join(dir, "seed.md");

    const createSummary = scratchSummary(dir);
    updateManagedFile(target, "seed\n", createSummary);
    assert.deepEqual(createSummary.created, ["seed.md"]);

    const skipSummary = scratchSummary(dir);
    updateManagedFile(target, "seed\n", skipSummary);
    assert.deepEqual(skipSummary.skipped, ["seed.md"]);
  });
});

test("updateManagedFile treats differing content as drift unless forced", () => {
  withTempDir((dir) => {
    const target = path.join(dir, "seed.md");
    fs.writeFileSync(target, "seed with local edits\n");

    const driftSummary = scratchSummary(dir);
    updateManagedFile(target, "seed v2\n", driftSummary);
    assert.deepEqual(driftSummary.drifted, ["seed.md"]);
    assert.equal(fs.readFileSync(target, "utf8"), "seed with local edits\n");

    const forceSummary = scratchSummary(dir, { force: true });
    updateManagedFile(target, "seed v2\n", forceSummary);
    assert.deepEqual(forceSummary.updated, ["seed.md"]);
    assert.equal(fs.readFileSync(target, "utf8"), "seed v2\n");
  });
});
