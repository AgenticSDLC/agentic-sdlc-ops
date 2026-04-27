# Web App Profile

This profile defines the exact installer behavior for `agentic-sdlc init --profile web-app`.

It is optimized for customer-facing web applications, including e-commerce storefronts, where user-visible changes, payments, auth, and fulfillment boundaries need explicit execution rules.

## Default Operating Mode

Unless the user explicitly selects otherwise, the `web-app` profile should assume:

- control plane: GitHub
- execution environment: local
- topology: `combined`

This means the repository uses GitHub Issues, labels, comments, and PRs as the visible execution system, while code changes, lint, build, and task verification run on the local machine.

The default `web-app` path does not assume:

- a GitHub Actions runner is executing the work
- a dispatcher service is handing tasks to builders
- a self-hosted runner is required

Those are optional later additions, not baseline requirements.

## Shared Responsibility Boundary

The `web-app` profile installs and verifies the operating overlay, but it does not own the full delivery stack.

Profile responsibility:

- infer repository type and starter verification
- install local operating artifacts
- install or verify GitHub lifecycle labels
- warn when validation maturity is too low for user-visible work

Repository responsibility:

- configure remote deployment hosting such as Vercel, AWS, or another platform
- configure CI and required checks
- configure preview environments when user-visible validation needs them
- define human QA and approval gates appropriate for the product
- maintain the environment, secrets, and provider credentials those systems require

This is a deliberate shared-responsibility model, not an incomplete implementation detail.

## Validation Modes

The `web-app` profile should make verification mode explicit.

Supported validation modes:

- `local-only`
  - lint and build run locally
  - no hosted preview deployment is required
  - no human QA gate is enforced before merge
- `preview-required`
  - a hosted preview deployment is expected
  - a human validates the user-visible change against that preview
  - merge should wait for that review
- `production-gated`
  - preview validation is required
  - an explicit human approval gate is required before merge or deploy

Baseline behavior:

- new `web-app` overlays may start at `local-only`
- `doctor` should warn when a user-visible repository is still only `local-only`
- repositories should move to `preview-required` once hosting and preview deploys exist

## Browser Validation Requirement

For `web-app`, browser automation is part of the validation contract.

Baseline expectation:

- Playwright should be configured in the repository
- a browser validation command such as `test:e2e` should exist
- user-visible changes should not rely on lint and build alone

At minimum, `doctor` should warn when:

- Playwright is not installed
- no Playwright config exists
- no browser validation command is defined

## Purpose

Use this profile for:

- full-stack web applications
- e-commerce storefronts
- content and account experiences in the same repository
- repositories where user-visible changes need stronger verification than backend-only systems

Do not use this profile for:

- AWS infrastructure-first repositories
- data platform repositories
- API-only repositories with no browser surface

## Prerequisites For `web-app init`

`agentic-sdlc init --profile web-app` installs the SDLC overlay on top of an existing application repository. It does not scaffold the application itself.

The command must evaluate prerequisites before asking for normal profile questions.

## Required Starting State

The target must already have:

- a local project directory
- a git repository, or an explicit user choice to initialize one now
- an existing web application scaffold
- a detectable package manifest or equivalent build definition
- at least one production build-equivalent command or enough evidence to choose a bounded stack preset

If those conditions are not met, `init` must stop with remediation instead of guessing.

## Prerequisite Checks

The installer should run these checks in order.

### 1. Directory Check

Pass when:

- the target directory exists

Fail when:

- the target path does not exist
- the target path is not a directory

Remediation:

- create the project directory first
- rerun `agentic-sdlc init --profile web-app` from that directory

### 2. Repository Check

Pass when:

- `.git/` exists

Soft-pass when:

- `.git/` does not exist, but the user confirms repository initialization now

Fail when:

- `.git/` does not exist and the user declines initialization

Default behavior:

- for a missing git repository, offer exactly two choices:
  - `initialize-git-now`
  - `stop-and-exit`

Generated effect of `initialize-git-now`:

- run `git init`
- continue with `new-repo` assumptions

### 3. App Scaffold Check

Pass when at least one of the following is true:

- `package.json` exists
- `pnpm-workspace.yaml` exists with a web app package in the target scope
- another recognized web-app manifest exists and maps cleanly to a supported preset

Fail when:

- the directory has no recognizable web application scaffold

Remediation:

- scaffold the app first using the chosen framework vendor tool
- confirm the app runs and has its package manifest committed
- rerun `agentic-sdlc init --profile web-app`

### 4. Supported Stack Check

Pass when the installer can classify the repository into one of:

- `nextjs-pnpm`
- `nextjs-npm`
- `nextjs-yarn`
- `react-vite-pnpm`
- `react-vite-npm`
- `remix-pnpm`

Soft-pass when:

- the repository is clearly a web app, but does not match a preset exactly

Soft-pass behavior:

- select `custom`
- require exactly three user-supplied commands:
  - lint-equivalent
  - build-equivalent
  - test-or-smoke-equivalent

Fail when:

- the installer cannot determine that the repository is a web application
- the repository has no credible path to lint/build verification

Remediation:

- finish framework setup first
- ensure package scripts or equivalent commands exist
- rerun `init`

### 5. Verification Command Check

Pass when:

- lint-equivalent command exists
- production build-equivalent command exists

Soft-pass when:

- one or both commands are not detectable, but the repository otherwise matches a supported stack

Soft-pass behavior:

- ask the user to confirm the suggested commands from the selected preset

Fail when:

- no lint path can be defined
- no production build path can be defined

Remediation:

- add the missing scripts first
- rerun `init`

### 6. GitHub Availability Check

Pass when:

- the user intends normal GitHub-backed issue-first operation

Soft-pass when:

- GitHub remote, auth, labels, or workflows are not ready yet

Soft-pass behavior:

- offer exactly two choices:
  - `continue-local-only`
  - `stop-and-exit`

Generated effect of `continue-local-only`:

- install the same normative overlay
- document GitHub-dependent items as pending
- skip label creation and workflow installation that requires live GitHub access

Fail when:

- never; this check should degrade to `local-only` instead of blocking installation

### 7. Existing Overlay Check

Pass when:

- no prior `agentic-sdlc` overlay is present

Soft-pass when:

- some overlay artifacts already exist

Soft-pass behavior:

- classify as `existing-repo`
- preserve local content
- update only missing or explicitly generated blocks

Fail when:

- generated artifacts conflict with hand-authored local rules and cannot be merged safely

Remediation:

- report the exact conflicting files or sections
- require explicit user choice before replacement

## Minimum Detectable Signals

For `web-app`, the installer should look for these concrete signals before asking for manual input.

### Repository Signals

- `.git/`
- remote configuration if present

### Application Signals

- `package.json`
- `pnpm-lock.yaml`
- `package-lock.json`
- `yarn.lock`
- `pnpm-workspace.yaml`
- `next.config.js`
- `next.config.mjs`
- `vite.config.ts`
- `vite.config.js`
- `remix.config.js`

### Script Signals

From `package.json`, inspect:

- `scripts.lint`
- `scripts.build`
- `scripts.test`
- `scripts.test:e2e`

### Browser Surface Signals

Any of the following support classification as a user-facing web app:

- `app/`
- `pages/`
- `src/app/`
- `src/pages/`
- `src/routes/`

## Stop Conditions Before Questionnaire

The installer must stop before the normal questionnaire when:

- the directory does not exist
- no web app scaffold is detectable
- no package manifest or equivalent build definition exists
- no build-equivalent command can be defined
- no lint-equivalent command can be defined

These are hard stops because continuing would force the installer to invent operationally important values.

## Allowed Auto-Remediations

Before the questionnaire begins, `web-app init` may auto-remediate only the following:

- initialize git after explicit user confirmation
- classify the repo as `local-only`
- choose a stack preset from detectable files
- choose default verification commands from that preset
- create missing overlay directories such as `.agentic/issues/drafts/`

It must not:

- scaffold the application
- invent package scripts that do not exist
- guess framework type without concrete file evidence
- install labels into GitHub without GitHub availability
- replace hand-written local adapter sections silently

## Prerequisite Outcome States

The prerequisite phase should finish in one of these states before normal installation begins:

- `ready`
  - all required prerequisites are satisfied
- `ready-local-only`
  - installation may proceed, but GitHub-backed lifecycle setup is deferred
- `ready-with-custom-verification`
  - installation may proceed, but the repository needs explicit custom command mapping
- `blocked-missing-app`
  - no usable web application scaffold detected
- `blocked-missing-verification`
  - required lint or build gates cannot be defined
- `blocked-conflict`
  - existing overlay content conflicts with safe generated updates

## Greenfield But Already Scaffolded

A newly created project still counts as valid input for `web-app init` if:

- the framework scaffold has already been created
- the repository can lint and build, or the equivalent commands can be defined safely
- the user accepts `new-repo` defaults

This is the expected path for:

- `create-next-app` followed by `agentic-sdlc init --profile web-app`
- Vite scaffold followed by `agentic-sdlc init --profile web-app`
- Remix scaffold followed by `agentic-sdlc init --profile web-app`

## Installer Contract

The installer must not ask open-ended questions when a durable default or bounded choice is available.

The installer should:

- prefill values from the repository where possible
- present bounded select lists for operational choices
- explain the generated effect of each choice
- write exact defaults into generated artifacts
- allow `custom` only where repository reality genuinely requires it

## Questionnaire

Each field below is required unless marked optional.

### 1. Repository Name

- input type: text
- default: basename of the target directory
- generated effect: used in `AGENTS.md`, seed issue title, and adapter metadata

### 2. Install Mode

- input type: select
- default: `new-repo`

Options:

- `new-repo`
  - install full normative overlay and recommended accelerators
- `existing-repo`
  - install normative overlay, detect existing docs and commands, avoid replacing local content
- `local-only`
  - install local artifacts without assuming GitHub labels or workflows are available yet

### 3. Web App Shape

- input type: select
- default: `storefront`

Options:

- `storefront`
  - customer-facing commerce site with catalog, cart, checkout, and account surfaces
- `saas-app`
  - authenticated application with dashboard-style experiences
- `marketing-site`
  - content-heavy public site with lighter application logic
- `admin-console`
  - internal or staff-facing operational interface

Generated effect:

- controls stop-and-ask defaults
- controls evidence expectations for user-visible changes
- controls seed issue type

### 4. Stack Preset

- input type: select
- default: `nextjs-pnpm`

Options:

- `nextjs-pnpm`
- `nextjs-npm`
- `nextjs-yarn`
- `react-vite-pnpm`
- `react-vite-npm`
- `remix-pnpm`
- `custom`

Generated effect:

- sets default verification commands
- sets package-manager examples in generated docs
- sets browser-smoke guidance

If `custom` is selected, the installer must still require:

- one lint-equivalent command
- one production build-equivalent command
- one task-relevant test or smoke command

### 5. Default Topology

- input type: select
- default: `combined`

Options:

- `combined`
  - one execution path handles planning, implementation, and verification
- `split`
  - planning and implementation may be handed off across visible roles

`specialized` is intentionally excluded from the default profile questionnaire because it is not a production-ready baseline.

### 6. Runner Mode

- input type: select
- default: `none-local`

Options:

- `none-local`
  - no autonomous remote runner contract is installed
- `github-hosted`
  - generate workflow-facing runner guidance
- `self-hosted`
  - generate runner contract and runner SOP placeholders

### 7. Plan Visibility Mode

- input type: select
- default: `issue-comment`

Options:

- `issue-comment`
- `pr-description`
- `issue-comment-and-pr-description`

Recommended default for `web-app`: `issue-comment`

Rationale:

- the issue is the control plane before the PR exists
- visibility is preserved even if branch or PR automation is delayed

### 8. Authoritative Issue Source

- input type: select
- default: `github-issue`

Options:

- `github-issue`
- `local-draft-then-github-issue`

Generated effect:

- controls whether `.agentic/issues/drafts/` is installed and documented

### 9. Lifecycle Label Pack

- input type: select
- default: `standard`

Options:

- `standard`
  - `ready-for-build`, `in-progress`, `in-review`, `done`
- `standard-with-routing`
  - standard lifecycle plus `topology:combined`, `topology:split`, `agent-builder`
- `verify-only`
  - do not create labels, only document and verify expected labels

For `new-repo`, default to `standard-with-routing`.

For `existing-repo`, default to `verify-only` if matching labels already exist, otherwise `standard`.

### 10. Workflow Scaffolding

- input type: select
- default: `recommended`

Options:

- `none`
- `recommended`
  - readiness validator, draft PR bootstrapper, issue/PR state sync
- `minimal`
  - readiness validator only

### 11. Optional Accelerator Pack

- input type: multiselect
- default:
  - `task-classes`
  - `gh-cli-sop`
  - `issue-first-workflow`

Options:

- `task-classes`
- `gh-cli-sop`
- `issue-first-workflow`
- `label-catalog`
- `env-manifest`
- `platform-actors`

Recommended defaults by app shape:

- `storefront`
  - `task-classes`, `gh-cli-sop`, `issue-first-workflow`, `env-manifest`
- `saas-app`
  - `task-classes`, `gh-cli-sop`, `issue-first-workflow`
- `marketing-site`
  - `task-classes`, `issue-first-workflow`
- `admin-console`
  - `task-classes`, `gh-cli-sop`

### 12. Seed Issue

- input type: select
- default: `yes`

Options:

- `yes`
- `no`

Recommended default: `yes`

## Generated Defaults

Unless the user selects a different bounded option, `web-app` must generate the following defaults.

### Project Type

- `web application`

### Issue Required Sections

- `Context`
- `Requirements`
- `Acceptance Criteria`
- `Target Files`

### Issue Draft Location

- if authoritative issue source is `github-issue`:
  - local drafts optional, recommended path `.agentic/issues/drafts/`
- if authoritative issue source is `local-draft-then-github-issue`:
  - local drafts enabled at `.agentic/issues/drafts/`

### Execution Start Condition

- implementation may begin when the issue has `in-progress`
- execution must not proceed if `hold` or `needs-human` is present

### Human Control Signals

Recognized labels:

- `hold`
- `needs-human`

Recognized comments:

- `stop`
- `hold`
- `change approach`
- `re-plan`

Default steering rule:

- issue comments and PR comments are both valid control surfaces
- once a PR exists, the PR becomes the preferred steering surface
- after detecting a valid stop signal, the agent posts a paused status update in the same thread

### State Labels

Lifecycle labels:

- `ready-for-build`
- `in-progress`
- `in-review`
- `done`

Supporting labels:

- `topology:combined`
- `topology:split`
- `agent-builder`
- `frontend`
- `backend`
- `full-stack`
- `config-only`
- `docs-only`
- `hold`
- `needs-human`

### Branch Naming

- default format: `issue-<number>-<slug>`
- branch is created from the issue title slug when the issue number is known
- repositories may create additional branches only when the local adapter explicitly allows it

### Required Pre-Read Docs

The installer should auto-detect and list the first existing file in each category:

- repository overview
  - `README.md`
- architecture
  - `docs/architecture.md`
  - `docs/ARCHITECTURE.md`
  - `docs/system-architecture.md`
- product constraints
  - `docs/product.md`
  - `docs/PRODUCT.md`
  - `docs/commerce-constraints.md`
- design constraints
  - `docs/design-system.md`
  - `docs/ui-guidelines.md`
- operations workflow
  - `docs/workflow.md`
  - `docs/operations.md`

If no file exists for a category, omit that category instead of inserting a vague placeholder.

### Verification Presets

The installer must derive commands from the selected stack preset.

#### `nextjs-pnpm`

- lint: `pnpm lint`
- build: `pnpm build`
- test: `pnpm test`
- browser smoke: `pnpm test:e2e`

#### `nextjs-npm`

- lint: `npm run lint`
- build: `npm run build`
- test: `npm test`
- browser smoke: `npm run test:e2e`

#### `nextjs-yarn`

- lint: `yarn lint`
- build: `yarn build`
- test: `yarn test`
- browser smoke: `yarn test:e2e`

#### `react-vite-pnpm`

- lint: `pnpm lint`
- build: `pnpm build`
- test: `pnpm test`
- browser smoke: `pnpm test:e2e`

#### `react-vite-npm`

- lint: `npm run lint`
- build: `npm run build`
- test: `npm test`
- browser smoke: `npm run test:e2e`

#### `remix-pnpm`

- lint: `pnpm lint`
- build: `pnpm build`
- test: `pnpm test`
- browser smoke: `pnpm test:e2e`

#### `custom`

The installer must ask for exactly three commands:

- lint-equivalent
- build-equivalent
- test-or-smoke-equivalent

### Required Verification Gates

For all `web-app` repositories:

- lint must pass
- production build must pass

For all user-visible changes:

- task-relevant test or browser smoke coverage must pass

For `storefront` shape:

- browser smoke coverage is required for cart, checkout, account, or navigation changes

### User-Visible Change Policy

Default policy:

- screenshots required for user-visible changes
- browser smoke coverage required when navigation, forms, checkout, authentication, or pricing presentation changes
- preview link required when the repository supports preview deployments

### Evidence Requirements

Default evidence by change class:

- `frontend`
  - screenshots, verification summary, preview link if available
- `backend`
  - test output summary, affected endpoints or actions, build result
- `full-stack`
  - screenshots, verification summary, preview link if available
- `config-only`
  - changed config summary and build result
- `docs-only`
  - note that code verification was not required if the adapter explicitly allows skipping build

### Stop-And-Ask Defaults

For all `web-app` repositories:

- authentication or session model changes
- billing or payment provider changes
- tax, shipping, fulfillment, or refund behavior changes not explicitly scoped in the issue
- PII collection, retention, or deletion behavior changes
- architectural changes beyond the named subsystem

Additional `storefront` defaults:

- checkout flow changes beyond the acceptance criteria
- pricing, discount, or promotion rules not explicitly specified
- inventory reservation behavior changes

### Task Classes

Enabled by default:

- `frontend`
- `backend`
- `full-stack`
- `docs-only`
- `config-only`

Task class rules:

- `docs-only`
  - may skip build only if the local adapter explicitly says so
- `config-only`
  - must still pass lint and build unless the adapter narrows the gate safely

## Generated Artifact Set

For `web-app`, the installer must always generate:

- `AGENTS.md`
- local project adapter
- issue template
- PR template

The installer should also generate when selected:

- label setup script
- workflow examples
- GH CLI SOP
- task classes guide
- issue-first workflow doc
- environment manifest
- platform actors template

## Seed Issue

When `Seed Issue` is `yes`, generate exactly one starter issue.

Default seed issue title:

- `Pilot the issue-first web-app flow`

Default seed issue intent:

- change one user-visible surface
- touch one clearly bounded subsystem
- require screenshots and a passing build
- avoid payments, auth model changes, and broad architecture work

Recommended default seed issue for `storefront`:

- add or refine one catalog or product-listing UI behavior without modifying checkout

## Idempotency Rules

For this profile, the installer must:

- preserve existing verification commands if they already satisfy the required gates
- preserve existing local stop-and-ask conditions
- preserve existing pre-read docs when present
- update generated blocks only when they are marked as generated
- report `created`, `updated`, `skipped`, and `conflicted` artifacts in the final summary
