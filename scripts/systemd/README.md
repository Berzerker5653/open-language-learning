# Preview auto-update (user-level)

`scripts/update-preview.sh` fast-forwards `main` (pulls from the first
configured remote when one exists), rebuilds the debug binary only when
HEAD changed, and restarts a running preview. It refuses to pull over
uncommitted changes and never merges non-fast-forward moves.

Install the timer (per user):

    cp scripts/systemd/lts-preview-update.{service,timer} ~/.config/systemd/user/
    systemctl --user daemon-reload
    systemctl --user enable --now lts-preview-update.timer

Runs every 15 minutes; `Persistent=true` catches up after boot gaps.
Override the tracked branch with `LTS_PREVIEW_BRANCH` in the unit.
