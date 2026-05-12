# Profile Contract

## Purpose

This contract defines what a supported profile owns in the public product.

A profile is not a repository adapter and is not a control-plane provider.

## Profile Responsibilities

A profile defines:

- supported repository archetype
- profile-specific readiness and verification expectations
- generated overlay defaults
- optional workflow pack components
- supported topology stance for that archetype

## V1 Profile

The first supported profile is `web-app`.

For `web-app`, the public profile contract should cover:

- detection and initialization expectations
- baseline verification expectations for user-visible work
- validation mode meanings
- browser validation expectations
- supported topology posture

## Profile Boundaries

A profile must not own:

- provider-specific mutation mechanics
- repository-specific branch rules
- repository-specific documents
- business-domain rules

Those belong to the control-plane provider, repository adapter, or local repository policy.
