# Extraction Plan

This document captures what three proving-ground repositories have taught us and defines the work required to bring those learnings back into `agentic-sdlc-ops` so the kit can be applied to new or existing projects without manual reconstruction.

## Proving Grounds

Three repositories have adopted the operating model at varying depths:

- `beOwtBruhs` — Next.js web app, Vercel, Stripe, Prisma, Auth.js
- `donationDataEnrichment` — AWS CDK serverless, Lambda, Bedrock, S3, EventBridge
- `eventDataProcessing` — AWS CDK data platform, Lambda, Glue, Redshift, S3

All three share the same core contract: issue-first lifecycle, AGENTS.md, project adapter, preflight plans, stop conditions, verification gates. The differences are stack-specific: verification commands, subsystem boundaries, task classes, and stop-and-ask triggers.

## What The Kit Already Has

- Standards: issue-first standard, agent execution standard, project adapter contract
- Templates: AGENTS.md, project adapter, issue template, PR template
- Examples: web-app adapter, aws-serverless adapter, reference-app adapter
- Adoption: checklist, label catalog, workflow mapping

## What The Proving Grounds Have That The Kit Does Not

### 1. Task Classes

All three repos define task classes that scope verification expectations per issue type. Examples: `docs-only`, `infra-only`, `aws-runtime`, `data-contract`, `frontend`, `backend`, `full-stack`.

The kit has no task class template or standard section.

Action: Add a `templates/task-classes.md` template. Add `task_class` as a recommended field in the project adapter contract. Update the issue template to include a `## Task Class` section.

### 2. Platform Actors

The ALSAC repos define domain-level subsystem boundaries (trigger, orchestration, ai-enrichment, persistence / ingestion, orchestration, transformation, analytics) as a separate doc that AGENTS.md and the adapter reference.

The kit has no platform actors template.

Action: Add a `templates/platform-actors.md` template. Reference it from the adapter contract as an optional but recommended artifact for repos with distinct subsystem boundaries.

### 3. Label Catalog

The ALSAC repos maintain a dedicated label catalog with descriptions and usage guidance. The kit has `adoption/label-catalog.md` but it is adoption guidance, not a per-repo template.

Action: Add a `templates/label-catalog.md` template that repos can copy and fill in. Keep `adoption/label-catalog.md` as kit-level guidance.

### 4. GH CLI SOP

The ALSAC repos include a battle-tested GitHub CLI standard operating procedure covering auth preflight, the `env -u GH_TOKEN` workaround, label creation commands, and common issue/PR lifecycle commands.

The kit has no GH CLI template.

Action: Add a `templates/gh-cli-sop.md` template with the portable patterns. Keep repo-specific label colors and names as fill-in-the-blank sections.

### 5. Validation Scripts

The ALSAC repos ship `scripts/validate-issue.js`, `scripts/validate-pr.js`, and `scripts/validate-commit-message.js`. These enforce the issue contract, PR contract, and commit convention at the automation layer.

The kit references validation as an automation hook but ships no reference scripts.

Action: Add reference validation scripts under `templates/scripts/` or `examples/scripts/`. These should be portable starting points, not repo-specific implementations.

### 6. GitHub Workflow Scaffolding

The ALSAC repos have working `.github/workflows/` for readiness validation, branch bootstrap, PR state sync, PR contract validation, and commit message validation.

The kit has `.github/workflows/examples/` but it is empty or minimal.

Action: Populate `.github/workflows/examples/` with reference workflow files derived from the proving grounds. Mark them as starting points, not production-ready.

### 7. Issue-First Workflow Doc

The ALSAC repos each have a comprehensive `ISSUE-FIRST-WORKFLOW.md` that combines the standard with operational commands and local state awareness. The kit's standard is the source but the repos evolved a richer operational doc.

Action: Add a `templates/issue-first-workflow.md` that repos can copy. It should reference the standard but include the operational sections (commands, installed scaffolding, current state) that the proving grounds found necessary.

### 8. Local-Only Adoption State

Both ALSAC repos explicitly handle the "git initialized but not yet on GitHub" state with caveats throughout their docs. The kit assumes GitHub is already connected.

Action: Add guidance in the adoption checklist and project adapter template for the local-only intermediate state. The CLI should eventually handle this as `agentic-sdlc init --local-only`.

### 9. Env Var / Secrets Scaffolding

None of the three repos formalize env var documentation as part of the kit, but all three require it operationally. The CLI vision includes prompting for required vs optional env vars and generating `.env.example`.

Action: Add a `templates/env-manifest.md` or `.env.example` template. Add `env_vars` as an optional section in the project adapter contract.

## What The Kit Has That The Proving Grounds Underuse

### Topology Modes

The kit's adapter contract and examples reference `topology:combined`, `topology:split`, and `topology:specialized`. beOwtBruhs is the first repo to implement both `combined` and `split` execution. The ALSAC repos run `combined` only. No repo has implemented `specialized` yet. Topology concepts should stay in the kit but `specialized` remains unproven. Combined and split patterns should be documented from beOwtBruhs learnings. Specialized should stay defined but flagged as untested.

### Issue Draft Location

The kit recommends `.agentic/issues/drafts/`. The proving grounds do not use this consistently. Keep it as a recommendation but do not make it a blocker for adoption or compliance.

### Plan Visibility Mode

The kit formalizes where the preflight plan must be posted. The proving grounds post plans but do not explicitly configure this field. The adapter template should keep this field but provide a sensible default (issue comment).

## Extraction Sequence

Work should be executed as issues in `agentic-sdlc-ops` using the issue-first model.

### Phase 1 — Template Gaps

1. Add `templates/task-classes.md`
2. Add `templates/platform-actors.md`
3. Add `templates/label-catalog.md`
4. Add `templates/gh-cli-sop.md`
5. Add `templates/issue-first-workflow.md`
6. Add `templates/env-manifest.md`
7. Update `templates/project-adapter.md` to include task class and env var sections
8. Update `templates/issue-template.md` to include a task class section

### Phase 2 — Reference Artifacts

9. Add reference validation scripts under `templates/scripts/`
10. Populate `.github/workflows/examples/` with reference workflows
11. Add a concrete ALSAC-style example adapter under `examples/aws-data-platform/`

### Phase 3 — Standards Updates

12. Add task class guidance to `standards/project-adapter-contract.md`
13. Add local-only adoption state guidance to `adoption/adoption-checklist.md`
14. Update `docs/product-plan.md` to reflect current scope and success criteria

### Phase 4 — CLI Foundation

15. Scaffold `cli/` package
16. Implement `agentic-sdlc init` that copies templates and prompts for adapter values
17. Add `--profile` support starting with `web-app` and `aws-serverless`
18. Add seed issue generation for first-run validation

## Success Criteria

- A new repo can run `agentic-sdlc init` and have a working ops layer in under 10 minutes
- The first agent-driven issue completes end-to-end (issue → preflight → implementation → PR → merge) in under 1 hour
- The same kit works for a Next.js web app and an AWS CDK serverless repo without changing the core standard
- No manual copy-paste of ops docs is required after CLI setup
