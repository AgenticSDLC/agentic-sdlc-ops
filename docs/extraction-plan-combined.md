# Combined Extraction Plan: Productize the Operating Layer

## Purpose

`agentic-sdlc-ops` should become an installer for a proven operating layer, not a warehouse of copied process documents.

Three proving-ground repositories have shown that the core value is an operating contract for agentic software delivery: how work is scoped, started, steered, verified, interrupted, and completed inside a real repository. The extraction work should productize that system so a new or existing project can adopt near-instant agentic SDLC without manually reconstructing the process from examples.

This now needs to be operational, not merely well-documented: the next supported target is a paying-customer marketplace website, and the product must be able to apply, configure, and reach a valid first pull request quickly enough to be used on live client work.

## Product Thesis

Teams do not need another isolated coding agent workflow. They need a reusable repository overlay that gives agents and humans the same execution contract.

That overlay should provide:

1. A stable operating contract.
2. Profile-specific defaults for common repository types.
3. An installer that applies the contract quickly.
4. A doctor command that proves whether the installation is coherent.
5. Runner contract support for observable autonomous agent execution.
6. Reference accelerators that reduce manual setup without becoming mandatory product surface.

The goal is to turn lessons from `beOwtBruhs`, `donationDataEnrichment`, and `eventDataProcessing` into a repeatable system.

## North Star

A maintainer applies the `agentic-sdlc-ops` layer to a supported repository type, configures only the minimum local values, and reaches a valid golden-path PR in 10 minutes or less without hidden process knowledge.

This north star must hold per supported profile, not only for installation in the abstract:

- `web-app` reaches a golden-path PR in 10 minutes or less
- `aws-serverless` reaches a golden-path PR in 10 minutes or less
- `aws-data-platform` reaches a golden-path PR in 10 minutes or less

For immediate operational use, the `web-app` profile must be strong enough to support a customer marketplace website without bespoke process reconstruction.

## Core Operating Contract

The operating contract is the product. Templates, scripts, and workflows exist to implement it.

Every adopted repository should be able to answer the following questions without human interpretation:

1. What is the authoritative task source?
2. When is an agent allowed to begin work?
3. What local project rules constrain implementation?
4. What task class is being executed?
5. Which topology is being used: combined, split, or specialized?
6. What files and subsystems are in scope?
7. What stop, hold, or redirect signals must be honored?
8. What verification gates prove completion?
9. What PR lifecycle behavior is expected?
10. What local deviations from the standard are intentional?

The minimum contract should include:

- GitHub Issue as source of truth
- `AGENTS.md` as repository-level agent instruction entry point
- Project adapter as local execution authority
- Issue lifecycle labels and start conditions
- Mandatory preflight plan
- Task class
- Topology mode
- Stop and ambiguity rules
- Verification gates
- Runner contract when autonomous execution is enabled
- PR contract
- Completion criteria based on outcomes, not agent self-assessment

## Product Shape

The product should be layered deliberately.

### 1. Standards Layer

Defines what must be true across repositories.

Contents:

- issue-first standard
- agent execution standard
- project adapter contract
- lifecycle label contract
- PR contract
- topology contract
- verification contract

This layer should be small, strict, and durable.

### 2. Profile Layer

Provides defaults for different project shapes without changing the core contract.

Initial profiles:

- `web-app`
- `aws-serverless`
- `aws-data-platform`

Each profile defines:

- default task classes
- required vs optional artifacts
- lifecycle labels
- verification gate shape
- stop-and-ask defaults
- subsystem boundary expectations
- starter workflow mappings

Profiles set defaults. The project adapter remains the local authority.

Additional profiles such as `api-service` may be added when a proving ground validates them.

### 3. Installer Layer

Turns the operating contract into a working repository overlay.

Primary command:

```sh
agentic-sdlc init
```

Expected behavior:

- detect whether the target is a new or existing repository
- ask a small set of structured questions
- select or confirm a profile
- generate `AGENTS.md`
- generate the project adapter
- install issue and PR templates
- install lifecycle label setup script
- install optional workflow scaffolding
- install optional accelerator docs
- generate a seed issue for first-run validation

The installer should not merely copy files. It should install a coherent operating layer with explicit local values.

### 4. Doctor Layer

Proves whether the overlay is usable.

Primary command:

```sh
agentic-sdlc doctor
```

Expected behavior:

- detect missing required files
- detect incomplete adapter fields
- detect missing lifecycle labels
- detect missing issue or PR contract sections
- detect absent verification gates
- detect profile mismatch
- detect local-only GitHub adoption state
- report concrete remediation steps

The doctor command is what turns the overlay from documentation into an auditable product.

### 5. Accelerator Layer

Reference accelerators make adoption faster but are not all mandatory.

Accelerators include:

- task class template
- platform actors template
- label catalog template
- GH CLI SOP
- issue-first workflow doc
- environment manifest
- validation scripts
- GitHub workflow examples
- topology runbooks
- runner runbooks
- example adapters

Accelerators should be copied or generated only when the selected profile needs them.

### 6. Runner Layer

The runner layer defines how autonomous agent execution is observed, controlled, and debugged when work is executed outside GitHub-hosted runner infrastructure.

The runner contract should cover:

- runner mode: GitHub-hosted, self-hosted, or local-only
- queue visibility
- active process visibility
- loop detection expectations
- cancellation and restart behavior
- log access
- environment and secret requirements
- GitHub identity used for issue, branch, and PR mutation
- handoff behavior between planner, builder, verifier, and runner

Self-hosted runner support is not just deployment scaffolding. It is an operational interface. beOwtBruhs showed that queued processes, repeated starts, and loops are much easier to detect and diagnose when the runner is observable. The kit should extract that contract without making Render or any specific host a universal requirement.

## Artifact Taxonomy

All kit artifacts fall into one of two categories.

Normative artifacts are compliance-critical. They define what must be true.

- `standards/issue-first-standard.md`
- `standards/agent-execution-standard.md`
- `standards/project-adapter-contract.md`
- `templates/AGENTS.md`
- `templates/project-adapter.md`
- `templates/issue-template.md`
- `templates/pr-template.md`

Reference artifacts are adoption accelerators. They define practical starting points.

- `templates/task-classes.md`
- `templates/platform-actors.md`
- `templates/label-catalog.md`
- `templates/gh-cli-sop.md`
- `templates/issue-first-workflow.md`
- `templates/env-manifest.md`
- `templates/runner-contract.md`
- `templates/runner-sop.md`
- `templates/scripts/*`
- `.github/workflows/examples/*`
- `examples/*/adapter.md`

Normative artifacts ship with every profile. Reference artifacts ship when the profile requires or recommends them.

## Proving Ground Evidence

### From beOwtBruhs

Proves the `web-app` profile and the agent topology model.

Extract:

- combined topology as the baseline execution mode
- split topology as a supported execution mode (first repo to implement both)
- runner contract/interface for observable autonomous execution
- self-hosted runner infrastructure with Render as one proven deployment target
- live GitHub Issue as execution source of truth
- visible preflight plan rules
- branch and PR lifecycle behavior
- outcome-based verification language
- task size discipline
- ambiguity rule: choose the narrowest implementation that satisfies explicit criteria
- completion rule: do not claim success unless verification gates pass

Avoid extracting:

- product-specific commerce behavior
- Stripe, Prisma, Auth.js, or Vercel details as core requirements
- Render-specific deployment config as a universal requirement
- proving-ground-specific rigidity that belongs only in the web-app profile

### From donationDataEnrichment

Proves AWS serverless concerns.

Extract:

- platform actor boundaries (trigger, orchestration, ai-enrichment, persistence)
- subsystem ownership language
- AWS runtime task classes (`docs-only`, `infra-only`, `aws-runtime`, `data-contract`)
- environment and secrets expectations
- local-only adoption caveats (git initialized, not yet on GitHub)
- infrastructure verification expectations (`build` + `synth`)
- stop-and-ask rules for architectural or cloud behavior changes
- GH CLI SOP with `env -u GH_TOKEN` auth workaround
- validation scripts for issue, PR, and commit contracts

Avoid extracting:

- account-specific AWS assumptions
- project-specific resource names
- domain-specific enrichment behavior

### From eventDataProcessing

Proves data-platform concerns.

Extract:

- data-contract task class
- ingestion, transformation, orchestration, and analytics subsystem boundaries
- multi-stage verification language
- runtime and data correctness stop conditions
- workflow scaffolding patterns for complex lifecycle enforcement

Avoid extracting:

- data model specifics
- bucket, job, table, or warehouse names
- ALSAC-specific operational constraints as universal rules

## Topology Maturity

Topology modes have different levels of proving-ground evidence.

- `combined` — baseline. Proven by all three repos. Default for every profile.
- `split` — supported. Proven by beOwtBruhs. Planner, builder, and verifier roles execute as separate agents with visible handoff artifacts.
- `specialized` — experimental. Defined in the kit but not yet implemented by any repo. Should stay documented but flagged as untested.

## Runner Infrastructure Maturity

beOwtBruhs has proven self-hosted runner infrastructure as a working execution environment for autonomous agent work, using Render as the deployment target in lieu of GitHub-hosted runners.

This means the kit can document self-hosted runner setup as a supported path, not a deferred aspiration. Runner scaffolding guidance should be included as a reference accelerator, with the understanding that runner host and deployment target are profile-specific choices.

Runner deliverables to extract:

- `templates/runner-contract.md` defining required runner interface fields
- `templates/runner-sop.md` covering queue inspection, process inspection, cancellation, restart, and loop diagnosis
- runner mode field in `templates/project-adapter.md`
- runner mode guidance in `standards/project-adapter-contract.md`
- optional runner section in `templates/env-manifest.md`
- doctor checks for runner mode, required env vars, log access notes, and cancellation guidance
- profile guidance for when runner support is required, recommended, or unnecessary

Split-mode learnings to extract from beOwtBruhs:

- how handoffs between planner, builder, and verifier actually work
- what the visible handoff artifact looks like in practice
- what friction points emerged
- how lifecycle labels interact with multi-agent execution

## Gap Inventory

Specific artifacts the proving grounds evolved that the kit does not yet have.

### 1. Task Classes

All three repos define task classes that scope verification expectations per issue type. Examples: `docs-only`, `infra-only`, `aws-runtime`, `data-contract`, `frontend`, `backend`, `full-stack`.

The kit has no task class template or standard section.

Action: Add `templates/task-classes.md`. Add `task_class` to the project adapter contract. Update the issue template to include `## Task Class`.

### 2. Platform Actors

The ALSAC repos define domain-level subsystem boundaries as a separate doc that AGENTS.md and the adapter reference.

The kit has no platform actors template.

Action: Add `templates/platform-actors.md`. Reference from the adapter contract as optional but recommended for repos with distinct subsystem boundaries.

### 3. Label Catalog Template

The ALSAC repos maintain a per-repo label catalog with descriptions and usage guidance. The kit has `adoption/label-catalog.md` as kit-level guidance but no per-repo template.

Action: Add `templates/label-catalog.md`. Keep `adoption/label-catalog.md` as kit-level guidance.

### 4. GH CLI SOP

The ALSAC repos include a battle-tested GitHub CLI SOP covering auth preflight, the `env -u GH_TOKEN` workaround, label creation commands, and common lifecycle commands.

The kit has no GH CLI template.

Action: Add `templates/gh-cli-sop.md` with portable patterns and fill-in-the-blank sections for repo-specific labels.

### 5. Validation Scripts

The ALSAC repos ship `scripts/validate-issue.js`, `scripts/validate-pr.js`, and `scripts/validate-commit-message.js`.

The kit references validation as an automation hook but ships no reference scripts.

Action: Add reference scripts under `templates/scripts/`. These should be portable starting points.

### 6. GitHub Workflow Scaffolding

The ALSAC repos have working `.github/workflows/` for readiness validation, branch bootstrap, PR state sync, PR contract validation, and commit message validation.

The kit has `.github/workflows/examples/` but it is empty or minimal.

Action: Populate `.github/workflows/examples/` with reference workflows derived from the proving grounds.

### 7. Issue-First Workflow Template

The ALSAC repos each have a comprehensive `ISSUE-FIRST-WORKFLOW.md` that combines the standard with operational commands and local state awareness.

The kit's standard is the source but the repos evolved a richer operational doc.

Action: Add `templates/issue-first-workflow.md` that references the standard but includes operational sections (commands, installed scaffolding, current state).

### 8. Local-Only Adoption State

Both ALSAC repos explicitly handle the "git initialized but not yet on GitHub" state with caveats throughout their docs. The kit assumes GitHub is already connected.

Action: Add local-only guidance to the adoption checklist and project adapter template. The CLI should support `--local-only` as an init mode.

### 9. Environment Manifest

None of the three repos formalize env var documentation as part of the kit, but all three require it operationally.

Action: Add `templates/env-manifest.md`. Add `env_vars` as an optional section in the project adapter contract.

### 10. Runner Contract

beOwtBruhs has a working runner contract/interface that made autonomous agent execution observable in a way GitHub-hosted runners did not.

The kit has no runner contract template.

Action: Add `templates/runner-contract.md` and `templates/runner-sop.md`. Add runner mode to the adapter contract. Add doctor checks for runner visibility and cancellation readiness.

## Lifecycle Control Plane

The lifecycle control plane is table stakes for the overlay. It defines how humans, agents, workflows, branches, and PRs coordinate through GitHub.

The baseline lifecycle should be:

1. Issue is created with acceptance criteria and task class.
2. Issue is labeled `ready-for-build` after scope validation.
3. Execution starts only when the repository adapter's start condition is met.
4. Issue is labeled `in-progress` when execution begins.
5. Automation creates or confirms the issue branch.
6. First real push with commits ahead of the default branch creates or updates the pull request.
7. PR description satisfies the PR contract.
8. Required verification gates run.
9. Agent or verifier records verification outcome.
10. Work is considered complete only when acceptance criteria and required checks pass.

Required lifecycle labels:

- `ready-for-build`
- `in-progress`

Recommended control labels:

- `blocked`
- `needs-human`
- `needs-clarification`
- `ready-for-review`

Profile-specific labels may extend the control plane, but they must not replace the baseline lifecycle labels.

The standard should define label meaning. Profiles should define default label sets. The project adapter should define any local deviations.

## Local Draft Standard

Local task drafts are allowed, but they are not authoritative during execution.

Standard location:

```text
.agentic/issues/drafts/
```

Rules:

- Drafts may be used before a GitHub Issue exists.
- Once a GitHub Issue exists, the live GitHub Issue body is the source of truth.
- Local task files must not override issue acceptance criteria, task class, labels, or start conditions.
- If a local draft and live GitHub Issue differ, the live GitHub Issue wins.
- `agentic-sdlc doctor` should warn when local drafts exist for issues that are already in an execution state.
- The installer should create the standard draft directory only when local drafting is enabled.

## Doctor Result Model

`agentic-sdlc doctor` should produce a human-readable result model before machine-readable compliance output exists.

Result states:

- `pass`: required overlay contract is present and coherent.
- `warning`: overlay is usable, but optional or recommended items are missing.
- `fail`: required artifacts or adapter fields are missing.
- `blocked`: execution should not start because a required lifecycle, verification, or runner condition is absent.
- `local-only`: repository is not fully connected to GitHub; local adoption can continue, but GitHub lifecycle automation is unavailable.
- `profile-mismatch`: installed artifacts do not match the selected profile.
- `remediation-required`: doctor found specific changes that must be made before autonomous execution.

Every non-pass result must include concrete remediation steps and the artifact responsible for the finding.

## Installer Questionnaire

The installer must be idempotent. Running `agentic-sdlc init` repeatedly should update only missing or explicitly stale overlay fields and should preserve local project-authored content.

Minimum questionnaire fields:

- repository name
- install mode: `new-repo`, `existing-repo`, or `local-only`
- profile
- default topology
- runner mode: GitHub-hosted, self-hosted, or none/local
- plan visibility mode
- authoritative issue source
- lifecycle labels to install or verify
- verification commands
- task classes to enable
- environment manifest required or not
- platform actors required or not
- workflow scaffolding desired or not
- seed issue desired or not

Idempotency rules:

- Do not overwrite a complete adapter field unless the user explicitly confirms replacement.
- Add missing required sections with clear placeholders.
- Preserve locally customized stop conditions, verification commands, and subsystem boundaries.
- Mark generated blocks where safe, so future runs can update those blocks without touching hand-written content.
- Report a summary of created, updated, skipped, and conflicting artifacts.

## Verification Schema

Profiles should define verification shape, while the project adapter defines the local command truth.

Each profile should provide:

- `required_commands`
- `recommended_commands`
- `task_class_overrides`
- `cannot_claim_complete_unless`
- `manual_verification_notes`
- `runtime_verification_notes`

The adapter may override command names, but it must preserve the semantic gate. For example, a web app may use `pnpm build` or `npm run build`; the required gate is still a successful production build.

Task classes should narrow verification, not weaken completion. A `docs-only` task may skip build only if the adapter explicitly allows that behavior.

## Profile Definitions

### web-app

Purpose: full-stack application repositories.

Required artifacts:

- issue-first contract
- project adapter
- AGENTS.md
- issue and PR templates
- task classes (frontend, backend, full-stack, docs-only, config-only)
- lint and build verification gates
- topology defaults (combined baseline, split supported)
- verification schema with required lint and build gates

Optional artifacts:

- platform actors
- environment manifest
- advanced workflow scaffolding

Proven by: beOwtBruhs.

### aws-serverless

Purpose: AWS CDK, Lambda, event-driven, and AI-enrichment workloads.

Required artifacts:

- all core contract artifacts
- platform actors
- environment manifest
- task classes (docs-only, infra-only, aws-runtime, data-contract)
- synth or equivalent infrastructure verification gate
- stop conditions for resource, IAM, eventing, and architecture changes
- verification schema with build and synth gates

Optional artifacts:

- deployment runbooks
- cloud inspection SOPs
- extended validation scripts

Proven by: donationDataEnrichment.

### aws-data-platform

Purpose: ingestion, transformation, analytics, storage, and warehouse workflows.

Required artifacts:

- all aws-serverless requirements
- data-contract task class
- subsystem boundary doc
- multi-stage verification gate language
- stop conditions for schema, lineage, destructive data changes, and runtime cost
- verification schema with data-contract and runtime checks

Optional artifacts:

- data sample validation helpers
- analytics readiness runbooks
- warehouse inspection SOPs

Proven by: eventDataProcessing.

## Delivery Sequence

### Phase 1: Contract Hardening

Goal: make the minimum operating contract explicit and reusable.

Deliverables:

1. Update `standards/project-adapter-contract.md` with task class, topology, local-only state, and env manifest sections.
2. Update `templates/issue-template.md` to include task class.
3. Update `templates/AGENTS.md` to make live GitHub Issue source of truth explicit.
4. Update `templates/project-adapter.md` to include task class and env var sections.
5. Add topology contract language for combined, split, and specialized modes to the execution standard.
6. Update `standards/agent-execution-standard.md` with ambiguity, task-size, stop/hold/redirect, and outcome-based completion rules.
7. Update `standards/issue-first-standard.md` with lifecycle start conditions and live issue source-of-truth rules.
8. Update `templates/pr-template.md` with required PR contract sections.
9. Add verification gate language to the adapter contract and project adapter template.
10. Standardize local draft location as `.agentic/issues/drafts/`.
11. Add runner mode to the adapter contract and project adapter template.

Exit criteria:

- A repository can express its execution rules without borrowing undocumented assumptions from a proving-ground repo.

### Phase 2: Golden Path Validation

Goal: prove the overlay works end-to-end before expanding template breadth.

Deliverables:

1. Run a first issue lifecycle for `web-app` using only kit artifacts.
2. Run a first issue lifecycle for `aws-serverless` using only kit artifacts.
3. Run a first issue lifecycle for `aws-data-platform` using only kit artifacts.
4. Record the minimum required manual edits for each profile.
5. Convert repeated manual steps into installer requirements.
6. Record runner observability findings for any autonomous execution path.

Exit criteria:

- All three initial profiles can complete issue → preflight → implementation → PR → verification without ad hoc process invention, or any exception is captured as a required extraction issue.

### Phase 3: Template and Accelerator Gaps

Goal: codify the recurring operational patterns that reduced friction in the proving grounds.

Deliverables:

1. Add `templates/task-classes.md`
2. Add `templates/platform-actors.md`
3. Add `templates/label-catalog.md`
4. Add `templates/gh-cli-sop.md`
5. Add `templates/issue-first-workflow.md`
6. Add `templates/env-manifest.md`
7. Add `templates/runner-contract.md`
8. Add `templates/runner-sop.md`
9. Add reference validation scripts under `templates/scripts/`
10. Populate `.github/workflows/examples/` with reference workflows
11. Add `examples/aws-data-platform/adapter.md`
12. Extract split-topology operational learnings from beOwtBruhs into a topology runbook
13. Update `docs/product-plan.md` to reflect current scope and success criteria.

Exit criteria:

- New repositories can adopt profile artifacts without copying from proving-ground repos.

### Phase 4: CLI Foundation

Goal: make adoption faster than manual copy-paste.

Deliverables:

1. Scaffold `cli/` package.
2. Implement `agentic-sdlc init` with profile selection.
3. Support `--new-repo`, `--existing-repo`, and `--local-only` modes.
4. Generate adapter, AGENTS, templates, and profile-appropriate accelerators from an idempotent questionnaire.
5. Generate a seed issue for first-run lifecycle validation.
6. Generate label setup script from profile defaults.
7. Generate or update only missing or explicitly stale sections.
8. Report created, updated, skipped, and conflicted artifacts.

Exit criteria:

- A supported repository can reach a valid golden-path PR in 10 minutes or less for its selected profile.
- The golden path requires no undocumented manual steps.

### Phase 5: Doctor Foundation

Goal: make the overlay auditable.

Deliverables:

1. Implement `agentic-sdlc doctor`.
2. Check required files exist.
3. Check adapter field completeness.
4. Check profile consistency.
5. Check issue and PR contract presence.
6. Check lifecycle labels and workflow mapping where GitHub is available.
7. Detect local-only adoption state and report appropriate next steps.
8. Check local draft state against the standard draft location.
9. Check runner mode requirements when autonomous execution is enabled.
10. Emit human-readable result states: pass, warning, fail, blocked, local-only, profile-mismatch, remediation-required.
11. Report concrete remediation for every finding.

Exit criteria:

- A maintainer can understand exactly what is missing before allowing agent execution.

## Deferred Work

The following items are real but out of scope for this extraction:

- `topology:specialized` as a production-ready mode (no proving ground yet)
- `api-service` profile (no proving ground yet)
- org-wide dashboards
- central policy service
- full GitHub App governance implementation
- IDE integrations
- machine-readable compliance output for `doctor`
- stack-specific deployment automation beyond reference guidance

These items should be revisited when new proving grounds provide evidence.

## Success Metrics

The extraction is successful when:

- `web-app` can reach a valid golden-path PR in 10 minutes or less.
- `aws-serverless` can reach a valid golden-path PR in 10 minutes or less.
- `aws-data-platform` can reach a valid golden-path PR in 10 minutes or less.
- An existing repository can adopt the overlay without replacing its architecture docs.
- The same core contract works for web-app, AWS serverless, and AWS data-platform repositories.
- Manual edits after `init` are fewer than 5 for the selected profile.
- `doctor` reports actionable remediation instead of vague compliance failure.
- Runner-enabled repositories expose queue, process, log, cancellation, and loop-diagnosis guidance.
- Reference accelerators are useful without bloating the mandatory contract.
- No manual copy-paste of ops docs is required after CLI setup.
- The `web-app` profile is operational enough to be used on a real customer marketplace project.

## Key Decisions

1. The operating contract is the product.
2. The overlay should install a coherent system, not a pile of files.
3. Profiles provide defaults, not alternate standards.
4. The project adapter remains the local source of execution rules.
5. Golden-path execution should come before template completeness.
6. `doctor` is required for product-quality adoption but ships after the CLI.
7. Combined topology is baseline. Split is supported. Specialized is experimental.
8. Automation should enforce the contract only after the contract is easy to adopt.
9. Only ship profiles that have proving-ground evidence behind them.
10. Normative artifacts are mandatory. Reference artifacts are profile-driven.
11. Runner support is part of the execution contract when autonomous agent execution is enabled.
12. Local drafts have one standard location and never override live GitHub Issues.

## Initial Issue Cut

Extraction work should be executed as PR-sized issues in `agentic-sdlc-ops`.

### Issue 1: Harden Core Execution Contract

Scope:

- update project adapter contract
- update agent execution standard
- update issue-first standard
- add ambiguity, task-size, stop/hold/redirect, and completion rules
- define live GitHub Issue source-of-truth behavior

Acceptance criteria:

- standards describe the minimum operating contract without relying on proving-ground docs
- start conditions and completion conditions are explicit

### Issue 2: Standardize Local Draft Location

Scope:

- define `.agentic/issues/drafts/` as the standard local draft location
- update adoption guidance
- update adapter template with local draft rules
- define conflict behavior when live GitHub Issue exists

Acceptance criteria:

- local drafts are clearly non-authoritative during execution
- installer and doctor requirements reference the same location

### Issue 3: Add Lifecycle Control Plane

Scope:

- define baseline lifecycle labels
- define recommended control labels
- document issue → label → branch → PR → verification flow
- update issue and PR templates where needed

Acceptance criteria:

- lifecycle state machine is unambiguous
- profile-specific labels extend rather than replace the baseline

### Issue 4: Add Task Class And Verification Schema

Scope:

- add task class guidance to standards
- add `templates/task-classes.md`
- update issue template
- define verification schema fields for profiles
- document task-class-specific verification behavior

Acceptance criteria:

- profiles can express required commands, recommended commands, overrides, and completion gates

### Issue 5: Add Profile Definitions

Scope:

- add `web-app`, `aws-serverless`, and `aws-data-platform` profile definitions
- define required vs optional artifacts per profile
- add example adapters or update existing examples

Acceptance criteria:

- each profile can generate a coherent adapter and issue template
- `api-service` remains deferred until proven

### Issue 6: Add Runner Contract

Scope:

- add `templates/runner-contract.md`
- add `templates/runner-sop.md`
- add runner mode to adapter contract and project adapter template
- document queue, process, log, cancellation, restart, and loop-diagnosis expectations
- keep Render-specific details as an example, not a universal requirement

Acceptance criteria:

- runner-enabled repositories have an observable execution contract
- self-hosted runner support is profile-aware and host-neutral

### Issue 7: Run Three Golden Paths

Scope:

- validate `web-app` lifecycle using only kit artifacts
- validate `aws-serverless` lifecycle using only kit artifacts
- validate `aws-data-platform` lifecycle using only kit artifacts
- record manual edits and gaps

Acceptance criteria:

- each profile reaches issue → preflight → implementation → PR → verification
- any failure creates a follow-up extraction issue

### Issue 8: Build Idempotent Init Scaffold

Scope:

- scaffold `agentic-sdlc init`
- implement profile selection
- implement `new-repo`, `existing-repo`, and `local-only` modes
- implement idempotent section updates
- report created, updated, skipped, and conflicted artifacts

Acceptance criteria:

- rerunning init does not overwrite local project-authored content
- missing sections are added safely

### Issue 9: Build Doctor Scaffold

Scope:

- implement human-readable doctor result model
- check required files and adapter completeness
- check profile consistency
- check lifecycle labels and workflow mapping where available
- check local draft state
- check runner mode requirements

Acceptance criteria:

- doctor reports pass, warning, fail, blocked, local-only, profile-mismatch, or remediation-required
- every finding includes concrete remediation

### Issue 10: Add Automation Accelerator Pack

Scope:

- add issue validation script
- add PR validation script
- add commit message validation script
- add workflow examples for readiness validation, branch bootstrap, PR state sync, PR contract validation, and commit validation

Acceptance criteria:

- repositories can opt into automation without making accelerators mandatory for all profiles

### Issue 11: Add Operational SOP Templates

Scope:

- add GH CLI SOP
- add issue-first workflow template
- add environment manifest template
- add platform actors template
- add label catalog template

Acceptance criteria:

- operational templates are profile-aware
- templates distinguish required fields from optional local details
