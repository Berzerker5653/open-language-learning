#!/usr/bin/env bash
# Keep the desktop preview current with the main branch.
#
# With a remote configured: fetch + fast-forward `main`, then rebuild the
# debug binary only when HEAD changed, then restart a running preview.
# Without a remote: rebuild-only mode (tracks local `main`).
#
# Safe by design: never pulls over uncommitted changes, never rewrites
# history, never merges a non-fast-forward move (warns instead), and does
# nothing when the built commit already matches HEAD.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh
export WEBKIT_DISABLE_DMABUF_RENDERER=1
export DISPLAY="${DISPLAY:-:0}"

BRANCH="${LTS_PREVIEW_BRANCH:-main}"
STAMP="target/preview-built-commit"
HEAD=$(git rev-parse HEAD)

die() {
  echo "update-preview: $*" >&2
  exit 1
}

CURRENT=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT" != "$BRANCH" ]; then
  die "on branch $CURRENT, not $BRANCH; refusing to switch branches automatically"
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "update-preview: working tree has uncommitted changes; skipping pull" >&2
else
  REMOTE=$(git remote | head -n1 || true)
  if [ -n "$REMOTE" ]; then
    if git fetch "$REMOTE" 2>/dev/null; then
      if git merge --ff-only "$REMOTE/$BRANCH" 2>/dev/null; then
        HEAD=$(git rev-parse HEAD)
      else
        echo "update-preview: $REMOTE/$BRANCH is not fast-forwardable; staying at $(git rev-parse --short "$HEAD")" >&2
      fi
    else
      echo "update-preview: fetch from $REMOTE failed; using local $BRANCH" >&2
    fi
  fi
fi

if [ "$(cat "$STAMP" 2>/dev/null || echo none)" = "$HEAD" ]; then
  echo "update-preview: up to date at $(git rev-parse --short "$HEAD")"
  exit 0
fi

export PATH="$HOME/.npm-global/bin:$PATH"
pnpm install --frozen-lockfile
pnpm --filter @openlang/desktop exec tauri build --debug --no-bundle
echo "$HEAD" >"$STAMP"

if pgrep -x lts-desktop >/dev/null; then
  pkill -x lts-desktop
  sleep 1
  setsid ./scripts/launch-preview.sh >/tmp/lts-launch.log 2>&1 </dev/null &
  echo "update-preview: rebuilt and restarted preview at $(git rev-parse --short "$HEAD")"
else
  echo "update-preview: rebuilt at $(git rev-parse --short "$HEAD") (no running instance)"
fi
