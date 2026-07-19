# GitHub Setup Prerequisites

One-time GitHub settings the overlay's automation depends on. Every item here
was learned from a real setup failure in an adopter repository — skipping them
produces the failures documented below. Complete this checklist before
publishing the first issue.

## 1. Actions Workflow Permissions (org level)

**Failure if skipped:** the draft PR bootstrapper fails with
`HttpError: GitHub Actions is not permitted to create or approve pull requests.`

New GitHub organizations default Actions to read-only. Change BOTH settings at
the **organization** level (repo-level settings inherit the org ceiling):

- `github.com → <org> → Settings → Actions → General`
  - Workflow permissions: **Read and write**
  - Enable **"Allow GitHub Actions to create and approve pull requests"**

## 2. WORKFLOW_TOKEN Secret (lifecycle event PAT)

**Failure if skipped:** the issue readiness validator passes but the
`ready-for-build → in-progress` auto-transition fails, and the bootstrapper
never fires. Combined-topology PR creation/readiness also fails before CI can
start. Events created with the default `GITHUB_TOKEN` do not trigger
downstream workflows — a PAT is required for both lifecycle transitions and
the combined builder-push → ready-PR handoff.

**The trap:** fine-grained access (FGA) tokens are bound to a single
**Resource Owner**. A token created under your personal account has no
authority over org-owned repositories — every API call returns `404 Not
Found` even though the secret is set and visible in logs.

Recommended setup (FGA token):

- `github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens`
- Resource owner: **the organization that owns the repo** (not your personal account)
- Repository access: the target repository (or all org repositories)
- Permissions: Issues R/W, Contents R/W, Pull requests R/W, Workflows R/W
- If the org requires approval, confirm it at
  `github.com/organizations/<org>/settings/personal-access-tokens`
- Set the secret: `gh secret set WORKFLOW_TOKEN --repo <org>/<repo>`

A classic PAT with `repo` + `workflow` scopes also works, but only after it is
explicitly authorized for the organization.

**Note the token's expiry date** somewhere the team will see it — an expired
`WORKFLOW_TOKEN` reproduces the original failure silently.

The bootstrapper uses this token only when a combined PR should become ready.
Split-topology PRs remain drafts until their verifier handoff. Labels
`merge:human-required`, `hold`, and `needs-human`, plus a stop comment,
suppress automatic readiness.

## 3. Replace GitHub Default Labels

**Failure if skipped:** the 9 default labels (`bug`, `documentation`,
`duplicate`, `enhancement`, `good first issue`, `help wanted`, `invalid`,
`question`, `wontfix`) conflict with the overlay label catalog and pollute
routing.

```bash
for label in "bug" "documentation" "duplicate" "enhancement" "good first issue" "help wanted" "invalid" "question" "wontfix"; do
  gh label delete "$label" --repo <org>/<repo> --yes
done
```

Then run `agentic-sdlc init` (or `doctor`) to create the catalog labels, and
see `docs/LABEL-CATALOG.md` for the canonical set. `doctor` warns while
default labels remain.

## 4. Optional: Independent Verifier Identity (split topology)

By default, any account may post the verifier pass attestation — fine for a
single operator, but it means the builder's own account could attest its own
work. The gates already enforce **commit binding** (a pass must name the
exact head SHA it audited via `<!-- split-verifier-sha: <sha> -->`, and a new
push invalidates it). To additionally enforce **who** may attest:

1. Create a separate identity the builder cannot act as — a machine-user
   account with its own PAT, or a GitHub App.
2. Run the verifier role authenticated as that identity (e.g.
   `GH_TOKEN=<verifier-pat> agentic-sdlc runtime split --issue <n> --role verifier`).
3. List the identity in `VERIFIER_ALLOWLIST` in `scripts/merge-gate-policy.mjs`.
   While the list is non-empty, pass attestations from any other author are
   rejected with `verifier-not-authorized`.

Leave `VERIFIER_ALLOWLIST` empty to skip identity enforcement.

## 5. Publish-Time Label Rules

**Failure if skipped:** the readiness validator rejects issues with
`Issue must have either an assignee or an agent-* label` /
`Issue must include a topology label`.

- Every task issue needs a topology label (`topology:combined` or
  `topology:split`) and at least one `agent-*` routing label **at publish
  time**. `agentic-sdlc issue publish` applies these automatically.
- Do **not** apply `ready-for-build` at publish time to issues with upstream
  dependencies — publish with `--state none` and add `ready-for-build` when
  the dependency chain clears:

```bash
agentic-sdlc issue publish --spec <draft> --state none
gh issue edit <number> --add-label "ready-for-build"   # when unblocked
```

## 6. Auto-Merge Checks Permission And Trigger Set

**Failure if skipped:** `policy-auto-merge` fails with
`Resource not accessible by integration` while calling the Checks API, or
creates repeated policy jobs for workflow completions that do not belong to
an open PR.

The generated workflow declares `checks: read`; preserve that permission when
adapting its `permissions` block. Replace the placeholder
`workflow_run.workflows` list with only workflows whose completion can change
the required-check decision.

The workflow resolves an open PR before checkout and coalesces evaluations by
PR head SHA. If many completed policy runs still appear:

1. remove unrelated workflow names from `workflow_run.workflows`;
2. confirm every upstream workflow reports the PR head SHA;
3. confirm the generated concurrency group is intact; and
4. inspect the resolver log before changing merge policy.
