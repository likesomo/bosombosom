#!/usr/bin/env bash
# Snapshot the whole working tree (tracked + untracked, respecting .gitignore) into refs/loop/<name>
# without touching the branch, the index, or the stash. Usage: bash tools/checkpoint.sh <name> "<message>"
# Restore one file:  git checkout refs/loop/<name> -- <path>
# Restore all:       git checkout refs/loop/<name> -- .   (then delete files the snapshot did not have)
set -euo pipefail
name="$1"; msg="${2:-loop checkpoint}"
tmp_index="$(git rev-parse --git-dir)/loop-index-$$"
trap 'rm -f "$tmp_index"' EXIT
GIT_INDEX_FILE="$tmp_index" git add -A
tree="$(GIT_INDEX_FILE="$tmp_index" git write-tree)"
commit="$(git commit-tree "$tree" -p HEAD -m "$msg")"
git update-ref "refs/loop/$name" "$commit"
echo "refs/loop/$name -> $commit"
