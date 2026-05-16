const fs = require("fs");
const path = require("path");

function slugToTitle(slug) {
  return slug
    .replace(/\.md$/i, "")
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveDraftPath(rootDir, draftArg) {
  if (!draftArg) {
    throw new Error("Pass `--spec <name>` or a spec file path.");
  }

  const candidates = [];
  if (path.isAbsolute(draftArg)) {
    candidates.push(draftArg);
  } else {
    candidates.push(path.resolve(rootDir, draftArg));
    const draftName = draftArg.endsWith(".md") ? draftArg : `${draftArg}.md`;
    candidates.push(path.join(rootDir, ".agentic", "issues", "drafts", draftName));
  }

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) {
    throw new Error(
      `Unable to find spec \`${draftArg}\`. Expected a file path or \`.agentic/issues/drafts/${draftArg.replace(/\.md$/i, "")}.md\`.`
    );
  }

  return resolved;
}

function parseDraftFile(draftPath) {
  const contents = fs.readFileSync(draftPath, "utf8").trim();
  if (!contents) {
    throw new Error(`Draft file is empty: ${draftPath}`);
  }

  const lines = contents.split("\n");
  const firstNonEmptyLine = lines.find((line) => line.trim().length > 0) || "";
  let title = "";
  let body = contents;

  if (firstNonEmptyLine.startsWith("# ")) {
    title = firstNonEmptyLine.replace(/^#\s+/, "").trim();
    const titleIndex = lines.findIndex((line) => line === firstNonEmptyLine);
    body = lines.slice(titleIndex + 1).join("\n").trim();
  } else {
    title = slugToTitle(path.basename(draftPath, ".md"));
  }

  if (!body) {
    throw new Error(`Draft body is empty after extracting the title from ${draftPath}`);
  }

  return {
    title,
    body,
  };
}

module.exports = {
  parseDraftFile,
  resolveDraftPath,
};
