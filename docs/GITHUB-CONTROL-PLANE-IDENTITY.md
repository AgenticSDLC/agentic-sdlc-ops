# GitHub Control Plane Identity

Agentic SDLC becomes bottlenecked when execution depends on a human's local shell session, keychain credential, or interactive `gh` login.

This repository recommends treating GitHub identity as a first-class part of the execution model.

## Execution Modes

### 1. GitHub-Native Agent Mode

Preferred when available.

Characteristics:

- execution is initiated inside GitHub
- identity is managed by GitHub's control plane
- less dependence on local developer shells

### 2. Hosted Agent With Stable Token

Preferred when GitHub-native agent execution is insufficient.

Characteristics:

- execution runs in a hosted or controlled runtime
- GitHub access is provided through a stable bot token or GitHub App token
- local shell auth is not required for normal execution

### 3. Local CLI-Assisted Mode

Acceptable for bootstrap and break-glass operation, but not ideal as the steady state.

Characteristics:

- relies on a developer's local `gh` session
- can vary by terminal, shell, extension, or keychain visibility
- keeps the human in the loop as the fallback identity

## Recommendation

For repositories that want real autonomous execution, prefer:

1. GitHub-native agent mode
2. GitHub App or stable bot identity
3. local CLI-assisted mode only as a bootstrap path

## Why GitHub App Identity Still Matters

GitHub-native coding agent features are a strong control-plane option when available. A GitHub App remains the most portable foundation when repositories need their own automation identity for issue mutation, PR mutation, label management, or cross-repository orchestration.

That makes the practical recommendation:

1. use GitHub-native agent execution when it satisfies the workflow
2. use a GitHub App when you need reusable automation identity across repositories
3. keep local CLI-assisted mode for bootstrap and break-glass work only

## Why This Matters

It is possible for:

- a developer terminal to have healthy `gh` auth
- an AI surface or sandbox to have broken `gh` auth

even on the same machine and in the same repository.

That means local CLI access is not a reliable long-term control plane for autonomous execution.

## Repository Adapter Guidance

A consuming repository should document:

- which execution mode it uses
- which identity owns issue and PR mutations
- whether local `gh` is only a bootstrap tool or part of normal operations
