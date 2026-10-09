# K-59 second-machine bundle test — Omarchy, 2026-10-09

Host: Omarchy (Arch-based), x86_64, Hyprland/Wayland, system
webkit2gtk-4.1 2.52.6-1 and gtk3 present. No repo tree on that machine —
which is the point of the test. Artifacts transferred over LAN:
`open-language-learning-platform_0.1.0_amd64.AppImage` (428.91 MiB),
extracted with `--appimage-extract` (no FUSE needed).

## Defect found: the AppImage bundles a machine-local WebKit

First launch aborted (`SIGABRT`, coredump `…/usr/bin/lts-desktop`):

    (lts-desktop:157878) ERROR: Unable to spawn a new child process:
    Failed to spawn child process "/home/hunter/.wk41/WebKitNetworkProcess"
    (No such file or directory)

`ldd` showed `libwebkit2gtk-4.1.so.0 => squashfs-root/usr/bin/../lib/…` —
linuxdeploy collected the WebKit libs from this machine's private
`~/.wk41` build, whose helper-process libexec path is baked in at compile
time. Any machine without that exact directory dies at webview spawn.
**The deb does not have this problem**: it links system libraries and
declares them as dependencies. Follow-up card: K-59-follow (exclude
`libwebkit2gtk-*`/`libjavascriptcoregtk-*` from the AppImage payload).

Workaround used for the actual verification: moved the two bundled libs
out of `squashfs-root/usr/lib/`, so the loader falls back to the system
WebKit 2.52.6.

## Verification (system WebKit)

- The app rendered the onboarding wizard (`omarchy-onboarding.png`,
  `shot8` in `omarchy-shimmed-run.png`): four-step wizard, Welcome step,
  name field, privacy bullets — i.e. frontend, IPC and window all live.
- Engine proof via an `LD_PRELOAD` interposer on `open/open64/openat/openat64`
  (Rust std routes `File::open` through `open64`; a first shim missing
  that symbol saw nothing — itself a useful trap to remember):

      OPEN …/squashfs-root/usr/lib/open-language-learning-platform/packs/BUNDLED.yaml -> 33

  fd 33 = success, and no `abstaining`/`skipping` line followed, so the
  sidecar parsed and the pack candidate passed the manifest gate. This is
  exactly what `bundled_packs()` does on a machine with no repo tree.

## Honest limits

- The wizard was never advanced by input: `wtype` key events reach the
  Hyprland window (active, `acceptsInput`) but not the WebKit DOM — no
  pointer-injection exists without root and the host has no sudo for the
  test user. So the profile-creation click-through and the pack
  *install* leg were not exercised on that machine; install remains
  covered by the lib tests on the build machine.
- The deb was inspected byte-for-byte (extraction listing) but not
  installed: Omarchy is Arch, no dpkg.
- Per ADR-0015 this is an agent run report, not a human platform-status
  report; the K-59 row in KANBAN still awaits a human pass.

Test directory `~/lts-bundle-test` (AppImage, extraction, shim, data
dirs, screenshots) was removed from the host afterwards; nothing of the
repo was modified there and nothing was pushed anywhere.
