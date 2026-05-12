const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { LIFECYCLE_STATES } = require("../lifecycle");

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

function getRepoSlug(rootDir) {
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

function ghText(args, rootDir) {
  return execFileSync("gh", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function ghGraphql(query, fields, rootDir) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(fields || {})) {
    args.push("-F", `${key}=${value}`);
  }
  return ghJson(args, rootDir);
}

function listRepoLabels(rootDir, repoSlug) {
  const allLabels = [];
  let page = 1;

  while (true) {
    const labels = ghJson(
      ["api", `repos/${repoSlug}/labels?per_page=100&page=${page}`],
      rootDir
    );
    if (!Array.isArray(labels) || labels.length === 0) {
      break;
    }

    allLabels.push(...labels);
    if (labels.length < 100) {
      break;
    }

    page += 1;
  }

  return new Map(allLabels.map((label) => [label.name, label]));
}

function syncLabels(rootDir, labels) {
  const repoSlug = getRepoSlug(rootDir);
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

    for (const label of labels) {
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

      const colorMatches =
        String(current.color || "").toLowerCase() === label.color.toLowerCase();
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
    const message =
      error && error.stderr
        ? String(error.stderr).trim()
        : "Unable to inspect or update GitHub labels via `gh`.";
    return {
      status: "unavailable",
      repoSlug,
      reason: message,
      remediation: [
        "Confirm `gh auth status` succeeds for the target GitHub account.",
        "Confirm the repository origin points at GitHub and is reachable.",
        "Rerun `agentic-sdlc init` after `gh` authentication is fixed.",
      ],
      created: [],
      updated: [],
      skipped: [],
    };
  }
}

function checkLabels(rootDir, labels) {
  const repoSlug = getRepoSlug(rootDir);
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
    const missing = labels.map((label) => label.name).filter((name) => !existing.has(name));
    return {
      status: "ok",
      repoSlug,
      missing,
    };
  } catch (error) {
    const message =
      error && error.stderr
        ? String(error.stderr).trim()
        : "Unable to inspect GitHub labels via `gh`.";
    return {
      status: "unavailable",
      repoSlug,
      missing: [],
      reason: message,
      remediation: [
        "Confirm `gh auth status` succeeds for the target GitHub account.",
        "Confirm the repository origin points at GitHub and is reachable.",
      ],
    };
  }
}

function updateLifecycle(rootDir, options) {
  const { issue, nextState, addLabels = [], removeLabels = [] } = options;
  const repoSlug = getRepoSlug(rootDir);
  if (!repoSlug) {
    throw new Error(
      "No GitHub origin remote detected. Connect the repository before updating issue labels."
    );
  }

  const issueData = ghJson(
    [
      "issue",
      "view",
      String(issue),
      "--repo",
      repoSlug,
      "--json",
      "number,url,title,labels,state",
    ],
    rootDir
  );
  const currentLabels = issueData.labels.map((label) => label.name);
  const nextLabels = new Set(
    currentLabels.filter((label) => !LIFECYCLE_STATES.includes(label))
  );
  nextLabels.add(nextState);

  for (const label of addLabels) {
    nextLabels.add(label);
  }
  for (const label of removeLabels) {
    nextLabels.delete(label);
  }

  execFileSync(
    "gh",
    [
      "issue",
      "edit",
      String(issue),
      "--repo",
      repoSlug,
      "--remove-label",
      LIFECYCLE_STATES.join(","),
      "--add-label",
      [...nextLabels].join(","),
    ],
    { cwd: rootDir, stdio: ["ignore", "ignore", "pipe"] }
  );

  const updatedIssue = ghJson(
    [
      "issue",
      "view",
      String(issue),
      "--repo",
      repoSlug,
      "--json",
      "number,url,title,labels,state",
    ],
    rootDir
  );

  return {
    repoSlug,
    issue: updatedIssue,
  };
}

function getIssue(rootDir, issue) {
  const repoSlug = getRepoSlug(rootDir);
  if (!repoSlug) {
    throw new Error(
      "No GitHub origin remote detected. Connect the repository before reading issue state."
    );
  }

  const issueData = ghJson(
    [
      "issue",
      "view",
      String(issue),
      "--repo",
      repoSlug,
      "--json",
      "number,url,title,body,labels,state",
    ],
    rootDir
  );

  return {
    repoSlug,
    issue: issueData,
  };
}

function getLinkedPullRequests(rootDir, issueNumber) {
  const repoSlug = getRepoSlug(rootDir);
  if (!repoSlug) {
    throw new Error(
      "No GitHub origin remote detected. Connect the repository before reading pull request state."
    );
  }

  const [owner, name] = repoSlug.split("/");
  const response = ghGraphql(
    `
      query($owner: String!, $name: String!, $issueNumber: Int!) {
        repository(owner: $owner, name: $name) {
          issue(number: $issueNumber) {
            timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
              nodes {
                ... on CrossReferencedEvent {
                  source {
                    __typename
                    ... on PullRequest {
                      number
                      title
                      url
                      state
                      isDraft
                      mergedAt
                      body
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    { owner, name, issueNumber: Number(issueNumber) },
    rootDir
  );

  const nodes =
    response &&
    response.data &&
    response.data.repository &&
    response.data.repository.issue &&
    response.data.repository.issue.timelineItems &&
    response.data.repository.issue.timelineItems.nodes
      ? response.data.repository.issue.timelineItems.nodes
      : [];

  const prs = [];
  const seen = new Set();
  for (const node of nodes) {
    const source = node && node.source;
    if (!source || source.__typename !== "PullRequest" || seen.has(source.number)) {
      continue;
    }
    seen.add(source.number);
    prs.push(source);
  }

  return {
    repoSlug,
    pullRequests: prs,
  };
}

function createIssue(rootDir, options) {
  const { title, body, labels = [] } = options;
  const repoSlug = getRepoSlug(rootDir);
  if (!repoSlug) {
    throw new Error(
      "No GitHub origin remote detected. Connect the repository before publishing an issue."
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-sdlc-issue-"));
  const bodyPath = path.join(tempDir, "issue-body.md");
  fs.writeFileSync(bodyPath, body, "utf8");

  try {
    const args = [
      "issue",
      "create",
      "--repo",
      repoSlug,
      "--title",
      title,
      "--body-file",
      bodyPath,
    ];
    for (const label of labels) {
      args.push("--label", label);
    }

    const issueUrl = ghText(args, rootDir);
    const issue = ghJson(
      [
        "issue",
        "view",
        issueUrl,
        "--repo",
        repoSlug,
        "--json",
        "number,url,title,labels,state",
      ],
      rootDir
    );

    return {
      repoSlug,
      issue,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = {
  name: "github",
  capabilities: {
    syncLabels,
    checkLabels,
    getIssue,
    getLinkedPullRequests,
    updateLifecycle,
    createIssue,
  },
};
