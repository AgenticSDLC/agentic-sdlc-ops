const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { buildConfig, inferProfile, inspectTarget } = require("../lib/web-app-context");
const {
  buildBlockerComment,
  buildPullRequestBody,
  buildPullRequestTitle,
  createOrSwitchBranch,
  getCurrentBranchName,
  getCurrentUpstreamBaseBranch,
  pushBranch,
  prepareCombinedRuntime,
} = require("../lib/runtime-combined");
const { printFooter, printKeyValue, printSection, printState } = require("../ui");

async function handleRuntimeCombined(args) {
  const rootDir = path.resolve(args.target || process.cwd());
  const inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);

  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application."
    );
  }

  const config = buildConfig(rootDir, { ...args, profile }, inspection);
  const controlPlane = getControlPlane(config);
  const current = controlPlane.capabilities.getIssue(rootDir, args.issue);
  const prepared = prepareCombinedRuntime(rootDir, current.issue, config);
  const startingBranch = getCurrentBranchName(rootDir);
  const upstreamBaseHint =
    startingBranch && startingBranch !== prepared.branch
      ? getCurrentUpstreamBaseBranch(rootDir)
      : null;

  if (!prepared.transitionDecision.ok) {
    const blockerReason = `Lifecycle policy blocked runtime start: ${prepared.transitionDecision.findings.join(" ")}`;
    if (args.publishBlocker !== false) {
      controlPlane.capabilities.addIssueComment(
        rootDir,
        args.issue,
        buildBlockerComment(blockerReason)
      );
    }
    throw new Error(blockerReason);
  }

  let transitioned = null;
  if (prepared.currentState === "ready-for-build") {
    transitioned = controlPlane.capabilities.updateLifecycle(rootDir, {
      issue: args.issue,
      nextState: "in-progress",
    });
  }

  controlPlane.capabilities.addIssueComment(rootDir, args.issue, prepared.preflightPlan);

  let branchResult;
  try {
    branchResult = createOrSwitchBranch(rootDir, prepared.branch);
  } catch (error) {
    if (args.publishBlocker !== false) {
      controlPlane.capabilities.addIssueComment(
        rootDir,
        args.issue,
        buildBlockerComment(String(error.message || error))
      );
    }
    throw error;
  }

  let pushResult = null;
  let prResult = null;
  let prBaseBranch = args.base || null;
  if (args.syncPr !== false) {
    try {
      if (args.push !== false) {
        pushResult = pushBranch(rootDir, prepared.branch);
      }

      const existingPr = controlPlane.capabilities.getPullRequestForBranch(
        rootDir,
        prepared.branch
      );
      const defaultBranch = controlPlane.capabilities.getDefaultBranch(rootDir);
      prBaseBranch =
        prBaseBranch ||
        (existingPr.pullRequest ? existingPr.pullRequest.baseRefName : null) ||
        upstreamBaseHint ||
        defaultBranch.defaultBranch;
      const prTitle = buildPullRequestTitle(current.issue);
      const prBody = buildPullRequestBody(current.issue, config);

      prResult = existingPr.pullRequest
        ? {
            mode: "updated",
            result: controlPlane.capabilities.updatePullRequest(
              rootDir,
              existingPr.pullRequest.number,
              { title: prTitle, body: prBody }
            ),
          }
        : {
            mode: "created",
            result: controlPlane.capabilities.createPullRequest(rootDir, {
              title: prTitle,
              body: prBody,
              base: prBaseBranch,
              head: prepared.branch,
            }),
          };
    } catch (error) {
      if (args.publishBlocker !== false) {
        controlPlane.capabilities.addIssueComment(
          rootDir,
          args.issue,
          buildBlockerComment(`PR synchronization failed: ${String(error.message || error)}`)
        );
      }
      throw error;
    }
  }

  printSection("Combined Runtime");
  printKeyValue("Repository", current.repoSlug);
  printKeyValue("Issue", `#${current.issue.number}`);
  printKeyValue("Title", current.issue.title);
  printState(
    "Lifecycle",
    transitioned ? "in-progress" : prepared.currentState || "unknown"
  );
  printKeyValue("Preflight Comment", "published");
  printKeyValue("Branch", branchResult.branchName);
  printKeyValue("Branch Action", branchResult.action);
  printKeyValue("Branch Push", pushResult ? "published" : "skipped");
  printKeyValue("PR Base", prBaseBranch || "not-resolved");
  printKeyValue("PR Sync", prResult ? prResult.mode : "skipped");
  if (prResult) {
    printKeyValue("PR", `#${prResult.result.pullRequest.number}`);
    printKeyValue("PR URL", prResult.result.pullRequest.url);
  }

  printFooter(
    "Runtime handoff complete. Implement the bounded change on the issue branch, update verification results in the PR, then advance to `in-review` when the PR contract is satisfied."
  );
}

module.exports = {
  handleRuntimeCombined,
};
