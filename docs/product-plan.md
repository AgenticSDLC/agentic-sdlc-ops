# Product Plan

`agentic-sdlc-ops` currently proves a documentation-first operating model for plan-first, issue-first, interruptible software delivery with coding agents. The next product problem is not more templates. It is making adoption easier than copy and paste, then making compliance and governance enforceable without keeping humans in the control plane.

## Product Thesis

Teams do not primarily need another coding agent. They need a reusable operating contract for how agent work is scoped, started, steered, verified, and completed inside a repository.

This repository already defines that contract. The product opportunity is to make it:

- easy to install
- easy to adapt to an existing repository
- easy to audit
- eventually easy to govern across many repositories

## Product Strategy

The product should evolve in three layers.

### 1. Bootstrap CLI

The first product surface should be a bootstrap CLI.

Purpose:

- make repository adoption fast and guided
- remove copy and paste as the default install path
- let maintainers answer questions instead of guessing valid values

Planned command shape:

- `agentic-sdlc init`

Expected behavior:

- ask a small set of structured questions
- apply sensible defaults and valid values
- install templates, adapter, labels, and workflow scaffolding
- support both new and existing repositories

Recommended install modes:

- `agentic-sdlc init --new-repo`
- `agentic-sdlc init --existing-repo`
- `agentic-sdlc init --profile web-app`
- `agentic-sdlc init --profile aws-infra`
- `agentic-sdlc init --profile data-platform`
- `agentic-sdlc init --profile api-service`

Generated artifacts:

- `AGENTS.md`
- local project adapter
- issue and PR templates
- lifecycle workflow scaffolding
- label setup instructions or script
- optional repository operations docs

### 2. Doctor / Compliance CLI

The second product surface should be a repository inspection and compliance CLI.

Purpose:

- inspect a repository and report whether it conforms to the operating model
- support both self-serve adoption and leadership-level governance

Planned command shape:

- `agentic-sdlc doctor`

Expected behavior:

- detect missing required files
- detect incomplete adapter fields
- detect absent lifecycle labels or workflow mappings
- detect drift from the standard
- produce human-readable remediation output

Recommended outputs:

- pass or fail summary
- missing baseline artifacts
- missing governance requirements
- explicit deviations recorded in the adapter
- next actions to reach compliance

### 3. GitHub App Governance Layer

The third product layer should be a GitHub App or similar stable governance identity.

Purpose:

- move governance and repository mutation into a stable automation identity
- support org-wide enforcement and reporting
- reduce reliance on individual developer shell auth

Planned responsibilities:

- issue and PR mutation under a stable identity
- org-wide compliance visibility
- label and workflow enforcement
- policy checks for issue and PR contract conformance
- exception handling for non-standard repositories

Important boundary:

- the GitHub App should enforce and orchestrate the model
- it should not replace the local project adapter
- repository-specific commands and architecture rules still belong locally

## Target Actors

### Solo Technical Founders

They need `init`. They want fast setup with good defaults, visible plans, and autonomous execution without becoming the scheduler for every task.

### Repo Maintainers

They need `init --existing-repo`. They want to retrofit a repository without throwing away current docs, CI, or architecture guidance.

### Platform Or Engineering Leads

They need `doctor`. They want one operating model across multiple repositories without forcing one stack or one deployment platform.

### CTOs And Heads Of Engineering

They need `doctor` plus the future GitHub App governance layer. They want enforceable repository standards, exception visibility, and org-level reporting.

### Infrastructure And Data-Platform Teams

They need profile-based installation. They want the same operating model without inheriting frontend assumptions.

### Open Source Maintainers, Agencies, And Small Studios

They need a fast bootstrap path and a clear execution contract. They want a reusable pattern that can be applied across many heterogeneous repositories.

## Initial Profiles

The first built-in CLI profiles should be:

- `web-app`
- `aws-infra`
- `data-platform`
- `api-service`

Each profile should provide:

- default issue sections
- default lifecycle labels
- default plan visibility mode
- default control signals
- starter verification hooks
- starter stop-and-ask conditions

Profiles should set defaults, not replace the local adapter.

## MVP Scope

The minimum useful product milestone should include:

- `agentic-sdlc init`
- `agentic-sdlc doctor`
- a profile system for common repository types
- generated local adapter from a structured questionnaire
- generated issue and PR templates
- generated workflow scaffolding
- repository compliance reporting

Explicitly defer:

- hosted runner infrastructure
- multi-repository dashboards
- full GitHub App governance
- central policy service
- deep IDE or editor integrations

## Governance Model

The governance layer should eventually check:

- required repository files exist
- adapter is present and complete
- issue and PR contracts are enforced
- lifecycle labels are installed
- automation hooks exist
- required checks are configured
- deviations are explicit rather than informal

Recommended enforcement path:

1. publish the standard
2. make adoption self-serve through the CLI
3. audit repositories with `doctor`
4. later enforce through GitHub App controls and branch protection

Governance before easy adoption will fail both culturally and operationally.

## Product Principles

- optimize for adoption before enforcement
- keep repository-specific rules local
- standardize control flow, not toolchains
- prefer visible automation over hidden magic
- make human steering possible without human scheduling
- keep GitHub as the visible control plane
- treat identity as part of the product, not an implementation detail

## Success Criteria

- a new repository can adopt the model in under 10 minutes
- an existing repository can be retrofitted without replacing its architecture docs
- a maintainer can run `doctor` and understand exactly what is missing
- a CTO can identify compliant and non-compliant repositories across an organization
- the same model works across Vercel, AWS, and non-UI repositories without changing the core standard
