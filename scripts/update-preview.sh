#!/usr/bin/env bash
# Keep the desktop preview current with the main branch.
#
# With a remote configured: fetch + fast-forward `main`, then rebuild the
# debug binary only when HEAD changed, then restart a running preview.
# Without a remote: rebuild-only mode (tracks local `main`).
#
# Safe by design: never pulls over uncommitted changes, never rewrites
# history, never merges a non-fast-forward move (warns instead), does nothing
# when the built commit already matches HEAD, and restarts only the preview
# binary it owns — a release/packaged `lts-desktop` is never touched.
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

# Match the preview by path, not by process name: a packaged release build is
# also called `lts-desktop`, and killing someone's release test mid-run is not
# this script's business (it did exactly that once).
if pgrep -f 'target/debug/lts-desktop' >/dev/null; then
  pkill -f 'target/debug/lts-desktop'
  sleep 1
  # A transient oneshot service kills its whole cgroup when it exits, so a
  # `setsid … &` child never survives the updater that started it — the
  # relaunched preview died with the service and the preview simply vanished.
  # Hand it to systemd as its own transient unit instead.
  if command -v systemd-run >/dev/null 2>&1; then
    systemd-run --user --quiet --unit=lts-preview --collect \
      --property=Type=simple --property=Environment=DISPLAY=:0 \
      ./scripts/launch-preview.sh
  else
    setsid ./scripts/launch-preview.sh >/tmp/lts-launch.log 2>&1 </dev/null &
  fi
  echo "update-preview: rebuilt and restarted preview at $(git rev-parse --short "$HEAD")"
else
  echo "update-preview: rebuilt at $(git rev-parse --short "$HEAD") (no running preview instance)"
fi
