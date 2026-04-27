const { execFileSync } = require("child_process");
const { STANDARD_LABELS } = require("../profile-web-app");

function parseGitHubRepo(remoteUrl) {
  if (!remoteUrl) {
    return null;
  }

  const normalized = remoteUrl.trim().replace(/\.git$/, "");
  const sshMatch = normalized.match(/^git@github\.com:([^/]+\/[^/]+)$/);
  if (sshMatch) {
    return sshMatch[1];
  }

  const httpsMatch = normalized.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  return null;
}

function getGitHubRepoSlug(rootDir) {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return parseGitHubRepo(remote);
  } catch {
    return null;
  }
}

function ghJson(args, rootDir) {
  const output = execFileSync("gh", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output);
}

function listRepoLabels(rootDir, repoSlug) {
  const labels = ghJson(["api", `repos/${repoSlug}/labels?per_page=100`], rootDir);
  return new Map(labels.map((label) => [label.name, label]));
}

function syncStandardLabels(rootDir) {
  const repoSlug = getGitHubRepoSlug(rootDir);
  if (!repoSlug) {
    return {
      status: "skipped",
      reason: "No GitHub origin remote detected.",
      created: [],
      updated: [],
      skipped: [],
      repoSlug: null,
    };
  }

  try {
    const existing = listRepoLabels(rootDir, repoSlug);
    const created = [];
    const updated = [];
    const skipped = [];

    for (const label of STANDARD_LABELS) {
      const current = existing.get(label.name);
      if (!current) {
        execFileSync(
          "gh",
          [
            "label",
            "create",
            label.name,
            "--repo",
            repoSlug,
            "--color",
            label.color,
            "--description",
            label.description,
          ],
          { cwd: rootDir, stdio: ["ignore", "ignore", "pipe"] }
        );
        created.push(label.name);
        continue;
      }

      const colorMatches = String(current.color || "").toLowerCase() === label.color.toLowerCase();
      const descriptionMatches = (current.description || "") === label.description;
      if (colorMatches && descriptionMatches) {
        skipped.push(label.name);
        continue;
      }

      execFileSync(
        "gh",
        [
          "label",
          "edit",
          label.name,
          "--repo",
          repoSlug,
          "--color",
          label.color,
          "--description",
          label.description,
        ],
        { cwd: rootDir, stdio: ["ignore", "ignore", "pipe"] }
      );
      updated.push(label.name);
    }

    return {
      status: "ok",
      repoSlug,
      created,
      updated,
      skipped,
    };
  } catch (error) {
    const message = error && error.stderr ? String(error.stderr).trim() : "Unable to inspect or update GitHub labels via `gh`.";
    return {
      status: "unavailable",
      repoSlug,
      reason: message,
      created: [],
      updated: [],
      skipped: [],
    };
  }
}

function checkStandardLabels(rootDir) {
  const repoSlug = getGitHubRepoSlug(rootDir);
  if (!repoSlug) {
    return {
      status: "skipped",
      repoSlug: null,
      missing: [],
      reason: "No GitHub origin remote detected.",
    };
  }

  try {
    const existing = listRepoLabels(rootDir, repoSlug);
    const missing = STANDARD_LABELS.map((label) => label.name).filter((name) => !existing.has(name));
    return {
      status: "ok",
      repoSlug,
      missing,
    };
  } catch (error) {
    const message = error && error.stderr ? String(error.stderr).trim() : "Unable to inspect GitHub labels via `gh`.";
    return {
      status: "unavailable",
      repoSlug,
      missing: [],
      reason: message,
    };
  }
}

module.exports = {
  checkStandardLabels,
  getGitHubRepoSlug,
  syncStandardLabels,
};
