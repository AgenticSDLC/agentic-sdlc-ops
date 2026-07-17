const path = require("path");
const { getControlPlane } = require("../lib/control-plane");
const { getExecutionBackend } = require("../lib/execution-backends");
const { getAgentBackend, resolveModel } = require("../lib/agent-backends");
const { buildConfig, inferProfile, inspectTarget } = require("../lib/web-app-context");
const {
  buildBlockerComment,
  buildImplementationComment,
  buildPullRequestBody,
  buildPullRequestTitle,
  commitAllChanges,
  createOrSwitchBranch,
  ensureNoPreexistingDirtyStateOnBranch,
  evaluateImplementationScope,
  getCurrentBranchName,
  getChangedFilesSince,
  getHeadSha,
  getWorktreeStatus,
  pushBranch,
  prepareCombinedRuntime,
} = require("../lib/runtime-combined");
const { resolveIssueBranch, resolveRuntimeWorkingDirectory } = require("../lib/worktree");
const {
  IMPLEMENTATION_MARKER,
  SPLIT_ROLES,
  buildDefaultPlannerHandoff,
  buildPlannerHandoffComment,
  buildPlannerPrompt,
  buildVerifierBlockerComment,
  buildVerifierPassComment,
  detectNextRole,
  detectSplitPhases,
  getLatestPlannerHandoff,
} = require("../lib/runtime-split");
const { evaluateSplitBuildReadiness, validateLifecycleTransition } = require("../lib/policy");
const { runFinalize } = require("./runtime-combined");
const { printFooter, printKeyValue, printSection, printPhase, printDetail } = require("../ui");

const WATCHDOG_MS = Number(process.env.AGENTIC_RUNTIME_TIMEOUT_MS || "600000");

function getIssueLabelNames(issue) {
  return (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
}

function applyBackendOverride(config, backendName) {
  if (backendName) {
    config.execution = config.execution || {};
    config.execution.agentBackend = backendName;
  }
  return config;
}

async function handleRuntimeSplit(args) {
  let rootDir = path.resolve(args.target || process.cwd());
  let inspection = inspectTarget(rootDir);
  const profile = args.profile || inferProfile(inspection);

  if (profile !== "web-app") {
    throw new Error(
      "Unable to infer a supported profile. Pass `--profile web-app` explicitly if this is a web application."
    );
  }

  let config = applyBackendOverride(buildConfig(rootDir, { ...args, profile }, inspection), args.backend);
  let controlPlane = getControlPlane(config);
  const current = controlPlane.capabilities.getIssue(rootDir, args.issue);

  const labels = getIssueLabelNames(current.issue);
  if (!labels.includes("topology:split")) {
    throw new Error(
      `Issue #${current.issue.number} does not carry \`topology:split\`. Use \`agentic-sdlc runtime combined --issue ${args.issue}\` or add the topology label first.`
    );
  }

  // Finalization is provider-only cleanup after merge. The issue branch may
  // already have been deleted, so it must not depend on branch discovery.
  if (args.finalize) {
    await runFinalize(rootDir, args, config, controlPlane, current);
    return;
  }

  // If this issue's branch already lives in its own worktree (created via
  // `agentic-sdlc issue worktree`), operate there instead of rootDir — split
  // roles run in short bursts across time, so this matters even more than
  // for combined: a stale local checkout between planner and builder runs is
  // exactly what worktrees prevent. Refuses instead of guessing when
  // --target was explicit and doesn't match.
  const branch = resolveIssueBranch(rootDir, current.issue.number);
  const worktreeResolution = resolveRuntimeWorkingDirectory(rootDir, branch, Boolean(args.target));
  if (worktreeResolution.redirected) {
    rootDir = worktreeResolution.rootDir;
    inspection = inspectTarget(rootDir);
    config = applyBackendOverride(buildConfig(rootDir, { ...args, profile }, inspection), args.backend);
    controlPlane = getControlPlane(config);
    printDetail("Worktree", `auto-detected for \`${branch}\` — operating in ${rootDir}`);
  }

  const executionBackend = getExecutionBackend(config);

  const { comments } = controlPlane.capabilities.listIssueComments(rootDir, args.issue);
  const phases = detectSplitPhases(comments);

  const role = args.role || detectNextRole(phases);
  if (!SPLIT_ROLES.includes(role)) {
    throw new Error(
      `Unsupported role \`${role}\`. Supported roles: ${SPLIT_ROLES.join(", ")}.`
    );
  }

  printSection("Split Runtime");
  printKeyValue("Issue", `#${current.issue.number} — ${current.issue.title}`);
  printKeyValue("Role", args.role ? `${role} (explicit)` : `${role} (auto-detected)`);
  printKeyValue("Agent", executionBackend.name);

  const watchdog = setTimeout(() => {
    console.error(`\n[runtime] Watchdog fired after ${WATCHDOG_MS}ms — exiting.`);
    process.exit(1);
  }, WATCHDOG_MS);
  watchdog.unref();

  try {
    if (role === "planner") {
      await runPlannerPhase(rootDir, args, config, controlPlane, executionBackend, current, phases, branch);
    } else if (role === "builder") {
      await runBuilderPhase(rootDir, args, config, controlPlane, executionBackend, current, comments, phases, branch);
    } else {
      await runVerifierPhase(rootDir, args, config, controlPlane, current, comments, branch);
    }
  } finally {
    clearTimeout(watchdog);
  }
}

async function runPlannerPhase(rootDir, args, config, controlPlane, executionBackend, current, phases, branch) {
  printPhase("🧭", "planner");

  if (phases.planner) {
    printDetail("Handoff", "already posted — skipping");
    printFooter("Planner handoff already exists. Run the builder next: `agentic-sdlc runtime split --issue " + args.issue + " --role builder`.");
    return;
  }

  const prepared = prepareCombinedRuntime(rootDir, current.issue, config, branch);
  if (!prepared.transitionDecision.ok) {
    const reason = `Lifecycle policy blocked planner start: ${prepared.transitionDecision.findings.join(" ")}`;
    controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
    throw new Error(reason);
  }

  if (prepared.currentState === "ready-for-build") {
    controlPlane.capabilities.updateLifecycle(rootDir, { issue: args.issue, nextState: "in-progress" });
  }

  // Model-generated handoff when an API key is available; deterministic
  // fallback otherwise so the topology never stalls on missing credentials.
  const backend = getAgentBackend(executionBackend.name);
  const plannerModel = resolveModel("planner", executionBackend.name);
  const prompt = buildPlannerPrompt(current.issue, config, current.repoSlug);

  let handoffText = null;
  const generation = await backend.generate(prompt, { model: plannerModel });
  if (generation.ok && generation.text && generation.text.trim()) {
    handoffText = generation.text.trim();
    printDetail("Handoff Source", generation.command);
  } else {
    handoffText = buildDefaultPlannerHandoff(current.issue);
    printDetail("Handoff Source", `deterministic fallback (${generation.summary || "no generation output"})`);
  }

  controlPlane.capabilities.addIssueComment(
    rootDir,
    args.issue,
    buildPlannerHandoffComment(handoffText)
  );

  // Route the next phase: the planner's own role label hands off to the builder.
  controlPlane.capabilities.updateLifecycle(rootDir, {
    issue: args.issue,
    nextState: "in-progress",
    addLabels: ["agent-builder"],
    removeLabels: ["agent-planner"],
  });

  printDetail("Handoff", "posted with split-planner-complete marker");
  printFooter(
    "Planner handoff posted. Run the builder next: `agentic-sdlc runtime split --issue " + args.issue + " --role builder`."
  );
}

async function runBuilderPhase(rootDir, args, config, controlPlane, executionBackend, current, comments, phases, branch) {
  printPhase("🔨", "builder");

  // Hard gate: no builder work without a visible planner handoff.
  const gate = evaluateSplitBuildReadiness(current.issue, comments);
  if (!gate.ok) {
    const reason = gate.findings.join(" ");
    controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
    throw new Error(reason);
  }

  const prepared = prepareCombinedRuntime(rootDir, current.issue, config, branch);
  const startingBranch = getCurrentBranchName(rootDir);

  if (!phases.implementation) {
    try {
      ensureNoPreexistingDirtyStateOnBranch(rootDir, prepared.branch);
    } catch (error) {
      controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(String(error.message || error)));
      throw error;
    }

    const branchResult = createOrSwitchBranch(rootDir, prepared.branch);
    printDetail("Branch", `${branchResult.branchName} (${branchResult.action})`);

    const handoffText = getLatestPlannerHandoff(comments);
    const augmentedIssue = {
      ...current.issue,
      body: `${current.issue.body || ""}\n\n## Planner Handoff\n\n${handoffText}`,
    };

    const headBeforeImplementation = getHeadSha(rootDir);
    printDetail("Status", "implementing from planner handoff...");

    const implementationResult = await executionBackend.runImplementation(rootDir, {
      issue: augmentedIssue,
      branch: prepared.branch,
      repoSlug: current.repoSlug,
      pullRequest: null,
      config,
      model: resolveModel("builder", executionBackend.name),
    });

    if (!implementationResult.ok) {
      controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildImplementationComment(implementationResult));
      controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(implementationResult.detail || implementationResult.summary));
      throw new Error(implementationResult.detail || implementationResult.summary);
    }

    // Truth checks — identical guarantees to the combined runtime.
    const branchAfterImpl = getCurrentBranchName(rootDir);
    if (branchAfterImpl !== prepared.branch) {
      const reason = `Implementation exited on wrong branch. Expected \`${prepared.branch}\`, found \`${branchAfterImpl}\`.`;
      controlPlane.capabilities.addIssueComment(rootDir, args.issue, buildBlockerComment(reason));
      throw new Error(reason);
    }

    if (getWorktreeStatus(rootDir)) {
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

    if (getWorktreeStatus(rootDir)) {
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
      marker: IMPLEMENTATION_MARKER,
    }));

    printDetail("Implementation", "complete");
    printDetail("Changed Files", changedFiles.join(", "));
  } else {
    printDetail("Implementation", "already complete — skipping");
    createOrSwitchBranch(rootDir, prepared.branch);
    pushBranch(rootDir, prepared.branch);
  }

  // Ensure a PR exists so CI and the policy gates have a surface to act on.
  const existingPr = controlPlane.capabilities.getPullRequestForBranch(rootDir, prepared.branch);
  const defaultBranch = controlPlane.capabilities.getDefaultBranch(rootDir);
  const prBaseBranch =
    args.base ||
    (existingPr.pullRequest ? existingPr.pullRequest.baseRefName : null) ||
    (startingBranch && startingBranch !== prepared.branch ? startingBranch : null) ||
    defaultBranch.defaultBranch;
  const prTitle = buildPullRequestTitle(current.issue);
  const prBody = buildPullRequestBody(current.issue, config);

  const prResult = existingPr.pullRequest
    ? { mode: "updated", result: controlPlane.capabilities.updatePullRequest(rootDir, existingPr.pullRequest.number, { title: prTitle, body: prBody }) }
    : { mode: "created", result: controlPlane.capabilities.createPullRequest(rootDir, { title: prTitle, body: prBody, base: prBaseBranch, head: prepared.branch }) };

  printDetail("PR", `#${prResult.result.pullRequest.number} (${prResult.mode})`);

  // The builder's job ends at push. CI owns verification; the verifier role
  // audits CI results — the builder never certifies its own work.
  printFooter(
    "Builder complete — changes pushed, PR ready for CI. After checks finish, run: `agentic-sdlc runtime split --issue " +
    args.issue + " --role verifier`."
  );
}

async function runVerifierPhase(rootDir, args, config, controlPlane, current, comments, branch) {
  printPhase("🔎", "verifier");

  const prepared = prepareCombinedRuntime(rootDir, current.issue, config, branch);
  const prLookup = controlPlane.capabilities.getPullRequestForBranch(rootDir, prepared.branch);

  if (!prLookup.pullRequest) {
    throw new Error(
      `No open PR found for branch \`${prepared.branch}\`. Run the builder phase first.`
    );
  }

  const prNumber = prLookup.pullRequest.number;
  const { checks } = controlPlane.capabilities.getPullRequestChecks(rootDir, prNumber);

  if (!checks.length) {
    printDetail("Checks", "none reported yet");
    printFooter("No CI checks reported for the PR yet. Wait for CI to start, then rerun the verifier.");
    return;
  }

  const pending = checks.filter((c) => c.bucket === "pending");
  const failing = checks.filter((c) => c.bucket === "fail" || c.bucket === "cancel");

  if (pending.length) {
    printDetail("Checks", `${pending.length} still running`);
    printFooter("CI checks are still running. Rerun the verifier once they finish — no marker was posted.");
    return;
  }

  if (failing.length) {
    controlPlane.capabilities.addIssueComment(
      rootDir,
      prNumber,
      buildVerifierBlockerComment(failing)
    );
    printDetail("Verdict", `blocker — ${failing.length} failing check(s)`);
    printFooter("Verifier posted a blocker marker on the PR. Fix the failures and rerun.");
    return;
  }

  // All checks green — post the pass attestation on the PR (the surface the
  // policy gates read), bound to the audited head SHA, and advance the
  // lifecycle. A later commit invalidates this attestation at the gates.
  const auditedHeadSha = prLookup.pullRequest.headRefOid;
  controlPlane.capabilities.markPullRequestReady(rootDir, prNumber);
  controlPlane.capabilities.addIssueComment(
    rootDir,
    prNumber,
    buildVerifierPassComment(checks, auditedHeadSha)
  );
  printDetail("Verdict", `pass — ${checks.length} check(s) green at ${String(auditedHeadSha).slice(0, 7)}`);

  const refreshedIssue = controlPlane.capabilities.getIssue(rootDir, args.issue);
  const labelNames = (refreshedIssue.issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));

  if (!labelNames.includes("in-review") && !labelNames.includes("done")) {
    const linkedPullRequests = controlPlane.capabilities.getLinkedPullRequests(rootDir, args.issue).pullRequests;
    const reviewDecision = validateLifecycleTransition(refreshedIssue.issue, "in-review", config, {
      linkedPullRequests,
      issueComments: comments,
    });

    if (reviewDecision.ok) {
      controlPlane.capabilities.updateLifecycle(rootDir, { issue: args.issue, nextState: "in-review" });
      printPhase("🧪", "in-review");
    } else {
      printDetail("Review Transition", `blocked: ${reviewDecision.findings.join(" ")}`);
    }
  }

  printFooter(
    "Verifier pass posted. If `policy-auto-merge` is configured it will merge; otherwise merge manually, then run `agentic-sdlc runtime split --issue " +
    args.issue + " --finalize`."
  );
}

module.exports = {
  handleRuntimeSplit,
};
