const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { getExecutionBackend } = require("../lib/execution-backends");
const { buildConfig, inferProfile, inspectTarget } = require("../lib/web-app-context");
const {
  buildBlockerComment,
  buildImplementationComment,
  buildDoneComment,
  buildPullRequestBody,
  buildPullRequestTitle,
  buildVerificationCommands,
  buildVerificationSectionContent,
  commitAllChanges,
  createOrSwitchBranch,
  ensureNoPreexistingDirtyStateOnBranch,
  evaluateImplementationScope,
  getCurrentBranchName,
  getChangedFilesSince,
  getHeadSha,
  getWorktreeStatus,
  pushBranch,
  replaceMarkdownSection,
  runVerification,
  validateVerificationPrerequisites,
  prepareCombinedRuntime,
} = require("../lib/runtime-combined");
const { resolveIssueBranch, resolveRuntimeWorkingDirectory } = require("../lib/worktree");
const { validateLifecycleTransition } = require("../lib/policy");
const { printFooter, printKeyValue, printSection, printPhase, printDetail } = require("../ui");

const WATCHDOG_MS = Number(process.env.AGENTIC_RUNTIME_TIMEOUT_MS || "600000");

// Markers embedded in issue comments to track completed phases
const MARKERS = {
  preflight: "<!-- agentic-sdlc:preflight-complete -->",
  implementation: "<!-- agentic-sdlc:implementation-complete -->",
  verification: "<!-- agentic-sdlc:verification-complete -->",
};

function detectCompletedPhases(comments) {
  const bodies = (comments || [])
    .map((c) => c?.body)
    .filter((b) => typeof b === "string");

  return {
    preflight: bodies.some((b) => b.includes(MARKERS.preflight)),
    implementation: bodies.some((b) => b.includes(MARKERS.implementation)),
    verification: bodies.some((b) => b.includes(MARKERS.verification)),
  };
}

async function handleRuntimeCombined(args) {
  let rootDir = path.resolve(args.target || process.cwd());
  let inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);

  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application."
    );
  }

  let config = buildConfig(rootDir, { ...args, profile }, inspection);
  let controlPlane = getControlPlane(config);
  const current = controlPlane.capabilities.getIssue(rootDir, args.issue);

  const issueLabelNames = (current.issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
  if (issueLabelNames.includes("topology:split")) {
    throw new Error(
      `Issue #${current.issue.number} uses \`topology:split\`. Run \`agentic-sdlc runtime split --issue ${args.issue}\` instead.`
    );
  }

  // Finalization is provider-only cleanup after merge. The issue branch may
  // already have been deleted, so it must not depend on branch discovery.
  if (args.finalize) {
    await runFinalize(rootDir, args, config, controlPlane, current);
    return;
  }

  // If this issue's branch already lives in its own worktree (created via
  // `agentic-sdlc issue worktree`), operate there instead of rootDir — the
  // whole point of a worktree is to let issues run in parallel without
  // fighting over one checkout. Refuses instead of guessing when --target
  // was explicit and doesn't match.
  const branch = resolveIssueBranch(rootDir, current.issue.number);
  const worktreeResolution = resolveRuntimeWorkingDirectory(rootDir, branch, Boolean(args.target));
  if (worktreeResolution.redirected) {
    rootDir = worktreeResolution.rootDir;
    inspection = inspectTarget(rootDir);
    config = buildConfig(rootDir, { ...args, profile }, inspection);
    controlPlane = getControlPlane(config);
    printDetail("Worktree", `auto-detected for \`${branch}\` — operating in ${rootDir}`);
  }

  const executionBackend = getExecutionBackend(config);

  // Explicit verify-only resume
  if (args.verify) {
    await runVerifyAndFinalize(rootDir, args, config, controlPlane, current, branch);
    return;
  }

  // Detect what's already been done
  const { comments } = controlPlane.capabilities.listIssueComments(rootDir, args.issue);
  const completed = detectCompletedPhases(comments);

  // Watchdog timer
  const watchdog = setTimeout(() => {
    console.error(`\n[runtime] Watchdog fired after ${WATCHDOG_MS}ms — exiting.`);
    process.exit(1);
  }, WATCHDOG_MS);
  watchdog.unref();

  try {
    const prepared = prepareCombinedRuntime(rootDir, current.issue, config, branch);
    const startingBranch = getCurrentBranchName(rootDir);

    // === PREFLIGHT ===
    if (!completed.preflight) {
      if (!prepared.transitionDecision.ok) {
        const reason = `Lifecycle policy blocked runtime start: ${prepared.transitionDecision.findings.join(" ")}`;
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
        throw new Error(reason);
      }

      try {
        ensureNoPreexistingDirtyStateOnBranch(rootDir, prepared.branch);
      } catch (error) {
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(String(error.message || error)));
        throw error;
      }

      if (prepared.currentState === "ready-for-build") {
        controlPlane.capabilities.updateLifecycle(rootDir, { issue: args.issue, nextState: "in-progress" });
      }

      controlPlane.capabilities.addIssueComment(
        rootDir,
        args.issue,
        `${MARKERS.preflight}\n${prepared.preflightPlan}`
      );
    } else {
      printDetail("Preflight", "already complete — skipping");
    }

    // === BRANCH ===
    let branchResult;
    try {
      branchResult = createOrSwitchBranch(rootDir, prepared.branch);
    } catch (error) {
      controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(String(error.message || error)));
      throw error;
    }

    printSection("Combined Runtime");
    printKeyValue("Issue", `#${current.issue.number} — ${current.issue.title}`);

    printPhase("⛩️", "ready-for-build");
    printDetail("Readiness", completed.preflight ? "passed (prior run)" : "passed");
    printDetail("Transition", "→ in-progress");

    printPhase("🤖", "in-progress");
    printDetail("Branch", branchResult.branchName);
    printDetail("Agent", executionBackend.name);

    // === IMPLEMENT ===
    if (!completed.implementation) {
      printDetail("Status", "implementing...");

      const headBeforeImplementation = getHeadSha(rootDir);
      const implementationResult = await executionBackend.runImplementation(rootDir, {
        issue: current.issue,
        branch: prepared.branch,
        repoSlug: current.repoSlug,
        pullRequest: null,
        config,
      });

      if (!implementationResult.ok) {
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildImplementationComment(implementationResult));
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(implementationResult.detail || implementationResult.summary));
        throw new Error(implementationResult.detail || implementationResult.summary);
      }

      // Post-implementation truth checks
      const branchAfterImpl = getCurrentBranchName(rootDir);
      if (branchAfterImpl !== prepared.branch) {
        const reason = `Implementation exited on wrong branch. Expected \`${prepared.branch}\`, found \`${branchAfterImpl}\`.`;
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
        throw new Error(reason);
      }

      const worktreeStatus = getWorktreeStatus(rootDir);
      if (worktreeStatus) {
        commitAllChanges(rootDir, `feat(issue-${current.issue.number}): implementation updates`);
      }

      const headAfterImpl = getHeadSha(rootDir);
      if (headAfterImpl === headBeforeImplementation) {
        const reason = "Implementation completed but did not advance the branch. No code changes were produced.";
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
        throw new Error(reason);
      }

      const changedFiles = getChangedFilesSince(rootDir, headBeforeImplementation);
      const scopeEval = evaluateImplementationScope(current.issue, changedFiles, config);
      if (!scopeEval.ok) {
        const reason = `Implementation changed files outside declared scope: ${scopeEval.findings.join(" ")}`;
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
        throw new Error(reason);
      }

      const finalWorktree = getWorktreeStatus(rootDir);
      if (finalWorktree) {
        const reason = "Implementation left uncommitted changes.";
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
        throw new Error(reason);
      }

      pushBranch(rootDir, prepared.branch);

      controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildImplementationComment({
        ...implementationResult,
        branch: prepared.branch,
        commitSha: headAfterImpl,
        changedFiles,
        marker: MARKERS.implementation,
      }));

      printDetail("Implementation", "complete");
      printDetail("Changed Files", changedFiles.join(", "));
    } else {
      printDetail("Implementation", "already complete — skipping");
      // Ensure we're on the branch with it pushed
      pushBranch(rootDir, prepared.branch);
    }

    // === PR (after implementation so there are commits to diff) ===
    const existingPr = controlPlane.capabilities.getPullRequestForBranch(rootDir, prepared.branch);
    const defaultBranch = controlPlane.capabilities.getDefaultBranch(rootDir);
    const prBaseBranch =
      args.base ||
      (existingPr.pullRequest ? existingPr.pullRequest.baseRefName : null) ||
      (startingBranch && startingBranch !== prepared.branch ? startingBranch : null) ||
      defaultBranch.defaultBranch;
    const prTitle = buildPullRequestTitle(current.issue);
    const prBody = buildPullRequestBody(current.issue, config);

    let prResult = existingPr.pullRequest
      ? { mode: "updated", result: controlPlane.capabilities.updatePullRequest(rootDir, existingPr.pullRequest.number, { title: prTitle, body: prBody }) }
      : { mode: "created", result: controlPlane.capabilities.createPullRequest(rootDir, { title: prTitle, body: prBody, base: prBaseBranch, head: prepared.branch }) };

    printDetail("PR", `#${prResult.result.pullRequest.number}`);

    // === VERIFY ===
    if (!completed.verification) {
      printDetail("Status", "verifying...");

      const verificationPrereqs = validateVerificationPrerequisites(config);
      if (!verificationPrereqs.ok) {
        printDetail("Browser Validation", "not configured — skipping");
      }

      const verificationCommands = buildVerificationCommands(config);
      let verificationRun = runVerification(rootDir, verificationCommands);

      // Auto-retry: if verification fails, feed error back to agent and try once more
      if (!verificationRun.ok) {
        printDetail("Verification", "failed — retrying with error feedback...");

        const failedCommand = verificationRun.results.find((r) => r.status === "failed");
        const errorDetail = failedCommand ? `${failedCommand.command} failed: ${failedCommand.detail}` : "Verification failed.";

        const retryResult = await executionBackend.runImplementation(rootDir, {
          issue: { ...current.issue, body: (current.issue.body || "") + `\n\n## Verification Error (fix this)\n\n${errorDetail}` },
          branch: prepared.branch,
          repoSlug: current.repoSlug,
          pullRequest: prResult.result.pullRequest,
          config,
        });

        if (retryResult.ok) {
          const retryWorktree = getWorktreeStatus(rootDir);
          if (retryWorktree) {
            commitAllChanges(rootDir, `fix(issue-${current.issue.number}): address verification failure`);
          }
          pushBranch(rootDir, prepared.branch);
          verificationRun = runVerification(rootDir, verificationCommands);
        }
      }

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
          { title: prResult.result.pullRequest.title, body: updatedPrBody }
        ),
      };

      if (!verificationRun.ok) {
        controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment("Verification failed after retry. See the PR Verification section for details."));
        printDetail("Verification", "failed after retry");
        printFooter("Verification failed after auto-retry. Fix the issues on the branch and rerun.");
        return;
      }

      controlPlane.capabilities.addIssueComment(
        rootDir,
        args.issue,
        `${MARKERS.verification}\n## Verification Passed\n\nAll configured checks passed.`
      );

      // Mark PR as ready for review now that verification passed
      controlPlane.capabilities.markPullRequestReady(rootDir, prResult.result.pullRequest.number);

      printDetail("Verification", "passed");
    } else {
      printDetail("Verification", "already complete — skipping");
    }

    // === TRANSITION TO IN-REVIEW ===
    const refreshedIssue = controlPlane.capabilities.getIssue(rootDir, args.issue);
    const currentLifecycle = (refreshedIssue.issue.labels || []).map((l) => typeof l === "string" ? l : l.name);
    const alreadyInReview = currentLifecycle.includes("in-review");

    if (!alreadyInReview) {
      const linkedPullRequests = controlPlane.capabilities.getLinkedPullRequests(rootDir, args.issue).pullRequests;
      const reviewDecision = validateLifecycleTransition(refreshedIssue.issue, "in-review", config, { linkedPullRequests });

      if (!reviewDecision.ok) {
        printDetail("Review Transition", `blocked: ${reviewDecision.findings.join(" ")}`);
        printFooter("Verification passed but lifecycle policy blocked transition to `in-review`. Check the issue state and retry.");
        return;
      }

      controlPlane.capabilities.updateLifecycle(rootDir, { issue: args.issue, nextState: "in-review" });
    }

    printPhase("🧪", "in-review");

    // === AUTO-MERGE (unless human-required) ===
    const issueLabels = (current.issue.labels || []).map((l) => typeof l === "string" ? l : l.name);
    const humanRequired = issueLabels.includes("merge:human-required");

    if (humanRequired) {
      printDetail("Merge", "human-required label present — waiting for manual merge");
      printDetail("PR URL", prResult.result.pullRequest.url);
      printFooter(
        "Runtime complete. The issue is `in-review`. Merge the PR manually, then run `agentic-sdlc runtime combined --issue " +
        args.issue + " --finalize` to close the lifecycle."
      );
      return;
    }

    printDetail("Status", "merging...");
    controlPlane.capabilities.mergePullRequest(rootDir, prResult.result.pullRequest.number);
    printDetail("Merge", "complete (squash)");

    // === FINALIZE ===
    // We just merged the PR ourselves, so skip lifecycle validation — go straight to done.
    controlPlane.capabilities.updateLifecycle(rootDir, { issue: args.issue, nextState: "done" });
    controlPlane.capabilities.closeIssue(rootDir, args.issue);
    controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildDoneComment(prResult.result.pullRequest));

    printPhase("🏁", "done");
    printDetail("Issue", "closed");
    printFooter("Lifecycle complete. PR merged, issue closed. 🏁");
  } finally {
    clearTimeout(watchdog);
  }
}

async function runVerifyAndFinalize(rootDir, args, config, controlPlane, current, branch) {
  const prepared = prepareCombinedRuntime(rootDir, current.issue, config, branch);
  const prLookup = controlPlane.capabilities.getPullRequestForBranch(rootDir, prepared.branch);

  if (!prLookup.pullRequest) {
    throw new Error("No open PR found for the issue branch. Run the full runtime first.");
  }

  const verificationCommands = buildVerificationCommands(config);
  const verificationRun = runVerification(rootDir, verificationCommands);
  const verificationSection = buildVerificationSectionContent(verificationRun);

  const updatedPrBody = replaceMarkdownSection(
    prLookup.pullRequest.body,
    "Verification",
    verificationSection
  );
  controlPlane.capabilities.updatePullRequest(rootDir, prLookup.pullRequest.number, {
    title: prLookup.pullRequest.title,
    body: updatedPrBody,
  });

  if (!verificationRun.ok) {
    controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment("Verification failed. See the PR Verification section for details."));
    throw new Error("Verification failed. PR Verification section has been updated.");
  }

  controlPlane.capabilities.addIssueComment(
    rootDir,
    args.issue,
    `${MARKERS.verification}\n## Verification Passed\n\nAll configured checks passed.`
  );

  // Mark PR as ready for review
  controlPlane.capabilities.markPullRequestReady(rootDir, prLookup.pullRequest.number);

  const linkedPullRequests = controlPlane.capabilities.getLinkedPullRequests(rootDir, args.issue).pullRequests;
  const reviewDecision = validateLifecycleTransition(current.issue, "in-review", config, { linkedPullRequests });
  if (!reviewDecision.ok) {
    throw new Error(`Lifecycle policy blocked transition to \`in-review\`: ${reviewDecision.findings.join(" ")}`);
  }

  controlPlane.capabilities.updateLifecycle(rootDir, { issue: args.issue, nextState: "in-review" });

  printSection("Combined Runtime");
  printKeyValue("Issue", `#${current.issue.number} — ${current.issue.title}`);
  printPhase("🧪", "in-review");
  printDetail("Verification", "passed");
  printFooter("Verification passed. The issue is now `in-review`. Merge the PR, then finalize.");
}

async function runFinalize(rootDir, args, config, controlPlane, current) {
  const linkedPullRequests = controlPlane.capabilities.getLinkedPullRequests(rootDir, args.issue).pullRequests;
  const doneDecision = validateLifecycleTransition(current.issue, "done", config, { linkedPullRequests });

  if (!doneDecision.ok) {
    throw new Error(`Lifecycle policy blocked transition to \`done\`: ${doneDecision.findings.join(" ")}`);
  }

  controlPlane.capabilities.updateLifecycle(rootDir, { issue: args.issue, nextState: "done" });
  controlPlane.capabilities.closeIssue(rootDir, args.issue);
  const mergedPr = doneDecision.done ? doneDecision.done.mergedPr : null;
  controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildDoneComment(mergedPr));

  printSection("Combined Runtime");
  printKeyValue("Issue", `#${current.issue.number} — ${current.issue.title}`);
  printPhase("🏁", "done");
  printDetail("PR Merge", mergedPr ? `#${mergedPr.number}` : "detected");
  printDetail("Issue", "closed");
  printFooter("Lifecycle complete. Issue closed.");
}

module.exports = {
  handleRuntimeCombined,
  runFinalize,
};
