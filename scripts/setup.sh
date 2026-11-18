#!/bin/sh
# One-time setup for a checkout or worktree: enable the repository hooks.
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo "hooks enabled (.githooks)"
