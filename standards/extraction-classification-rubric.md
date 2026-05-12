# Extraction Classification Rubric

## Purpose

This rubric classifies candidate assets from proving-ground repositories before extraction into the public product.

Every candidate asset should be assigned exactly one primary classification.

## Classifications

### Universal Product Behavior

Extract when the behavior is required across supported repositories and belongs to a public contract or runtime seam.

### Configurable Product Policy

Extract only as declared policy, configuration, or generated defaults. Do not hardcode it as universal behavior.

### Profile Runtime

Extract behind a named profile such as `web-app` when the behavior is tied to a supported repository archetype.

### Proving-Ground Residue

Do not let this define the public product boundary. Use it only as evidence, reference material, or a rewrite candidate.

## Classification Questions

Ask these questions for each asset:

1. Is the behavior required across supported repositories?
2. Is it specific to a repository archetype such as `web-app`?
3. Is it really repository-owned policy or adapter input?
4. Is it provider-specific mechanics rather than core semantics?
5. Does it depend on hidden assumptions such as secrets, labels, prompts, branch rules, or manual operator habits?

## Extraction Rule

If an asset cannot be placed cleanly, do not extract it yet.

Ambiguous ownership is a Phase 1 design problem, not a sign to copy code first.
