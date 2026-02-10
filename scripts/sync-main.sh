#!/usr/bin/env bash
set -euo pipefail

# Sync local main with a fork's main branch and report ahead/behind status.
# Usage:
#   scripts/sync-main.sh [remote]
# Example:
#   scripts/sync-main.sh origin

REMOTE="${1:-origin}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not inside a git repository." >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "Error: remote '$REMOTE' does not exist." >&2
  echo "Available remotes:" >&2
  git remote -v >&2 || true
  exit 1
fi

echo "Fetching $REMOTE..."
git fetch "$REMOTE" --prune

if ! git show-ref --verify --quiet "refs/remotes/$REMOTE/main"; then
  echo "Error: '$REMOTE/main' not found." >&2
  exit 1
fi

if git show-ref --verify --quiet refs/heads/main; then
  echo "Resetting local main to $REMOTE/main..."
  git checkout main >/dev/null
  git reset --hard "$REMOTE/main" >/dev/null
else
  echo "Creating local main from $REMOTE/main..."
  git checkout -B main "$REMOTE/main" >/dev/null
fi

echo
if [[ "$CURRENT_BRANCH" != "main" && -n "$CURRENT_BRANCH" ]]; then
  echo "Returning to $CURRENT_BRANCH..."
  git checkout "$CURRENT_BRANCH" >/dev/null
fi

echo
if [[ -n "$CURRENT_BRANCH" ]]; then
  echo "Ahead/behind relative to $REMOTE/main:"
  git rev-list --left-right --count "$CURRENT_BRANCH...$REMOTE/main" \
    | awk '{printf("  %s is ahead by %s commit(s), behind by %s commit(s).\n", "'"$CURRENT_BRANCH"'", $1, $2)}'
fi

echo "Done. Local main is synced and ready."
