const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { buildConfig, inferProfile, inspectTarget } = require("../lib/web-app-context");
const {
  buildBlockerComment,
  buildDoneComment,
  buildPullRequestBody,
  buildPullRequestTitle,
  buildVerificationCommands,
  buildVerificationSectionContent,
  createOrSwitchBranch,
  getCurrentBranchName,
  getCurrentUpstreamBaseBranch,
  pushBranch,
  replaceMarkdownSection,
  runVerification,
  validateVerificationPrerequisites,
  prepareCombinedRuntime,
} = require("../lib/runtime-combined");
const { validateLifecycleTransition } = require("../lib/policy");
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

  if (args.finalize) {
    const linkedPullRequests = controlPlane.capabilities.getLinkedPullRequests(
      rootDir,
      args.issue
    ).pullRequests;
    const doneDecision = validateLifecycleTransition(
      current.issue,
      "done",
      config,
      { linkedPullRequests }
    );

    if (!doneDecision.ok) {
      throw new Error(
        `Lifecycle policy blocked transition to \`done\`: ${doneDecision.findings.join(" ")}`
      );
    }

    const completedTransition = controlPlane.capabilities.updateLifecycle(rootDir, {
      issue: args.issue,
      nextState: "done",
    });
    const closedIssue = controlPlane.capabilities.closeIssue(rootDir, args.issue);
    const mergedPr = doneDecision.done ? doneDecision.done.mergedPr : null;
    controlPlane.capabilities.addIssueComment(
      rootDir,
      args.issue,
      buildDoneComment(mergedPr)
    );

    printSection("Combined Runtime");
    printKeyValue("Repository", current.repoSlug);
    printKeyValue("Issue", `#${current.issue.number}`);
    printKeyValue("Title", current.issue.title);
    printState("Lifecycle", "done");
    printKeyValue("PR Merge", mergedPr ? `#${mergedPr.number}` : "detected");
    printKeyValue("Issue State", closedIssue.issue.state);
    printKeyValue("Completion Comment", "published");
    printFooter(
      "Combined runtime finalization complete. The linked PR was merged, the issue is now `done`, and the work item has been closed."
    );
    return;
  }

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

  let verificationRun = null;
  let reviewTransition = null;
  if (args.verify) {
    if (!prResult) {
      throw new Error(
        "Verification publication requires PR synchronization. Re-run without `--no-sync-pr` or omit `--verify`."
      );
    }

    const verificationPrereqs = validateVerificationPrerequisites(config);
    if (!verificationPrereqs.ok) {
      const reason = verificationPrereqs.findings.join(" ");
      if (args.publishBlocker !== false) {
        controlPlane.capabilities.addIssueComment(
          rootDir,
          args.issue,
          buildBlockerComment(reason)
        );
      }
      throw new Error(reason);
    }

    verificationRun = runVerification(
      rootDir,
      buildVerificationCommands(config)
    );

    const verificationSection = buildVerificationSectionContent(verificationRun);
    const updatedPrBody = replaceMarkdownSection(
      prResult.result.pullRequest.body,
      "Verification",
      verificationSection
    );
    prResult = {
      mode: "updated",
      result: controlPlane.capabilities.updatePullRequest(
        rootDir,
        prResult.result.pullRequest.number,
        {
          title: prResult.result.pullRequest.title,
          body: updatedPrBody,
        }
      ),
    };

    if (!verificationRun.ok) {
      if (args.publishBlocker !== false) {
        controlPlane.capabilities.addIssueComment(
          rootDir,
          args.issue,
          buildBlockerComment("Verification failed. Inspect the PR Verification section for the failing command.")
        );
      }
      throw new Error("Verification failed. PR Verification section has been updated.");
    }

    const refreshedIssue = controlPlane.capabilities.getIssue(rootDir, args.issue);
    const linkedPullRequests = controlPlane.capabilities.getLinkedPullRequests(
      rootDir,
      args.issue
    ).pullRequests;
    const reviewDecision = validateLifecycleTransition(
      refreshedIssue.issue,
      "in-review",
      config,
      { linkedPullRequests }
    );
    if (!reviewDecision.ok) {
      throw new Error(
        `Verification passed but lifecycle policy blocked transition to \`in-review\`: ${reviewDecision.findings.join(" ")}`
      );
    }

    reviewTransition = controlPlane.capabilities.updateLifecycle(rootDir, {
      issue: args.issue,
      nextState: "in-review",
    });
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
  printKeyValue("Verification", verificationRun ? (verificationRun.ok ? "passed" : "failed") : "skipped");
  printKeyValue("Review Transition", reviewTransition ? "in-review" : "skipped");

  printFooter(
    reviewTransition
      ? "Combined runtime verification complete. The issue is now in `in-review`; merge only after the repository's review and validation expectations are satisfied."
      : "Runtime handoff complete. Implement the bounded change on the issue branch, update verification results in the PR, then rerun with `--verify` when you want to publish results and advance to `in-review`."
  );
}

module.exports = {
  handleRuntimeCombined,
};
