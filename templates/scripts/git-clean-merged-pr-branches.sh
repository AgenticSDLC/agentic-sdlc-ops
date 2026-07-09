#!/usr/bin/env bash
# Deletes local branches that have already been merged into main/master.
# Safe to run after merging PRs to keep the local branch list clean.

set -euo pipefail

git fetch origin --prune
git switch main >/dev/null 2>&1 || git switch master >/dev/null 2>&1
git pull --ff-only

protected_branch="$(git branch --show-current)"

for branch in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
  if [[ "$branch" == "main" || "$branch" == "master" || "$branch" == "$protected_branch" ]]; then
    continue
  fi

  if git merge-base --is-ancestor "$branch" HEAD; then
    echo "Deleting local merged branch: $branch"
    git branch -d "$branch"
  fi
done
