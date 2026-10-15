# Local desktop bundle build — performed on the Gaming PC, 2026-10-15

Nothing here was uploaded or released. This is the application shell at the published
version `0.4.0-alpha.1` (`apps/desktop/package.json:3`, `tauri.conf.json:4`), built and
checked locally: the reference-pack version bump (`0.4.1`) is a separate artifact line
and is covered by `state/evidence/RC-0.4.1-2026-10-15/`.

Reproduce with `./state/evidence/BUNDLE-LOCAL-2026-10-15/bundle-build.sh`; the full log
is `build.log`. Host: Gaming PC (inference host `lab-main`), CachyOS, node `v26.11.1`,
npm `12.2.0`, cargo `1.97.1`, system WebKitGTK `2.54.1`.

## Toolchain prerequisite that had to be resolved first

`tauri.conf.json:2-4` sets `beforeBuildCommand: "pnpm build"`, so the bundle build
shells out to **pnpm**, which this machine did not have (no `pnpm`, and `corepack` is
absent from node 26.11.1). `package.json` pins `packageManager: "pnpm@12.8.1"` and
`engines.node: ">=26"`.

The pinned manager was installed **in isolation**, without touching global tools:
`npm pack pnpm@12.8.1` into `~/.local/opt/pnpm-12.8.1/src`, then a wrapper
`~/.local/opt/pnpm-12.8.1/pnpm` that runs `node …/bin/pnpm.mjs`. Integrity verified
against registry metadata before extraction:

```
registry dist.integrity = sha512-9kupB1B/XOr+BsjTjmBS0BeURFgOwSed3Vv8EctIqoomRLZlmOB+dh2oSHKp/FfV+QK4f6SdAkGY1VhhKqu+RQ==
computed               = 9kupB1B/XOr+BsjTjmBS0BeURFgOwSed3Vv8EctIqoomRLZlmOB+dh2oSHKp/FfV+QK4f6SdAkGY1VhhKqu+RQ==
registry dist.shasum   = 162a874a11ccdeada2f9d36c6997845326286965   computed = same
pnpm --version → 12.8.1     pnpm's own engines.node → ">=18.*"  (compatible with node 26)
```

`npm install --prefix … pnpm@12.8.1` was tried first and produced **no binary**: npm 12
blocks install scripts by default (`npm warn install-scripts`), and pnpm's package
installs its CLI through a postinstall. Worth knowing before anyone repeats it. On the
wrapper's first run pnpm downloaded its native `linux-x64` binary — an outbound fetch
made by pnpm itself, not by this repository.

## Clean-environment dependency install (no shared node_modules)

`git worktree add tmp/wt-clean HEAD` at `fd76786`, then in that worktree with the
isolated pnpm:

```
pnpm install --frozen-lockfile → Packages: +151, "Done in 152ms", exit 0, node_modules 171 MB
pnpm fmt:check → All matched files use Prettier code style!
pnpm lint      → exit 0
pnpm -r typecheck → 6 packages, exit 0
pnpm -r test   → exit 0
pnpm -r build  → exit 0 (vite, dist/index.html + assets)
```

**What this does and does not prove.** It proves the lockfile resolves and a correct
`node_modules` is built with the pinned manager on a second, independent workspace copy
(no symlink, no host `node_modules` reuse). It does **not** prove a cold install from
the network: pnpm reported `resolved 151, reused 151, downloaded 0`, i.e. every package
came from the local content-addressable store, which a previous run had warmed. A
genuinely cold `pnpm install --frozen-lockfile` (empty store) remains unverified on this
host; CI covers that path on every push.

## Bundles actually built

| stage | result |
|---|---|
| `pnpm tauri build --no-bundle` | exit 0 → `target/release/lts-desktop` 37,728,352 B, sha256 `c87c8cf05b2de5e760757e7a483cfdd5aa3de02620e9e701d264776657ea20b6` (release build 2m23s, incremental) |
| `pnpm tauri build --bundles appimage` | exit 0 → `open-language-learning-platform_0.4.0-alpha.1_amd64.AppImage` 119,142,904 B, sha256 `2a5fa861bf639e64ec15cffb8fd0e063f52963d67adc42352a386824867c6d62` — **this is the raw linuxdeploy output and is not a distributable artifact**; see "Finalize step" below |
| `pnpm tauri build --bundles deb` | exit 0 → `open-language-learning-platform_0.4.0-alpha.1_amd64.deb` 12,493,856 B, sha256 `3de3b3bb8d5df9ca0bb15b93413306e150aee4e1afde733a8907d62b7497671f` |

`ar t` on the deb gives `debian-binary control.tar.gz data.tar.gz`; its `control` is
`Package: open-language-learning-platform`, `Version: 0.4.0-alpha.1`,
`Architecture: amd64`, `Installed-Size: 36848`,
`Depends: libwebkit2gtk-4.1-0, libgtk-3-0`, payload binary `usr/bin/lts-desktop`.
The published alpha's deb is listed at 12 MB in `README.md:17` — consistent. The
AppImage is **113.62 MiB here versus 73 MB published** (`README.md:18`): the builder's
distro decides what gets bundled, so local sizes are not comparable to the published
artifact.

## The WebKit inheritance claim, measured instead of asserted

`source scripts/tauri-env.sh` puts the user-local sysroot first:
`pkg-config --modversion webkit2gtk-4.1` → **2.52.6**. But the built binary has **no
`RPATH`/`RUNPATH`** (`readelf -d`), and `ldd` resolves
`libwebkit2gtk-4.1.so.0 → /usr/lib/libwebkit2gtk-4.1.so.0`, i.e. the host's **2.54.1**.
The deb states that explicitly as `Depends: libwebkit2gtk-4.1-0`. So the bundle compiles
against the sysroot headers and runs against whatever WebKitGTK the host provides — the
reason `docs/21_HUMAN_REVIEW_RUNBOOKS.md` A.2 records both versions per machine.

## Headless start of the built AppImage (a check CI does not do)

`open-language-learning-platform_…_AppImage --appimage-extract-and-run` under
`xvfb-run -a`, with `XDG_DATA_HOME/CONFIG/CACHE` pointed at a throwaway directory so the
owner's real app data was untouched, `WEBKIT_DISABLE_DMABUF_RENDERER=1`, 25 s timeout:

- exit `124` — still running when the timeout fired; no panic, no fatal error;
- only `MESA-EGL: warning: DRI3 error: Could not get DRI3 device` (software rendering);
- WebKit created its tree in the isolated store: `org.openlanguage.app/CacheStorage`,
  `hsts-storage.sqlite`, `storage` → the webview subsystem initialized;
- the captured screen averaged `0.6725` mean intensity (not blank).

Two later attempts with a hand-started `Xvfb` instead of `xvfb-run` produced a black
capture and `xdotool` saw only the root window, so **rendered UI is not proven by these
runs** — only process start plus WebKit initialization. A screenshot review on a real
display (or the owner's `mode.smoke` path) is still required.

## Checks a human must still perform (not machine-substitutable here)

- Install the deb on a clean Debian/Ubuntu boot and the AppImage on a clean
  rolling-release boot, then launch from a fresh user account (never done here; the
  Gaming PC is neither a clean boot nor a deb host).
- The O-06 hands-on sweep (`docs/21` Runbook B).
- `scripts/smoke-desktop.sh` on this machine: blocked — `ss` shows the owner's vite
  holding `127.0.0.1:1420` (node pid 1142354), which the script needs free. Not run.
- Windows and macOS runtime: only the manual `platform-bundles` job builds them, unsigned
  and labelled `UNTESTED`; `platform-compile` proves they compile, nothing more.
- Cold-store `pnpm install --frozen-lockfile` (see above).

## Ledger consequence

`RELEASE-EVIDENCE-001` stays **blocked**: a locally built artifact plus a headless start
is not the clean-boot smoke and hands-on evidence that card asks for, and nothing here
was published. What changed is that "the bundle cannot be built on this host" is no
longer true, and the specific machine-performable checks are now listed with results.

## Finalize step: the 119 MB AppImage was the wrong artifact

Recorded after the fact, because the first pass here reported only the linuxdeploy output
and that number is misleading. Proof: `--appimage-extract` the 119 MB file and
`find squashfs-root -name 'libwebkit2gtk-4.1*' -o -name 'libjavascriptcoregtk-4.1*'`
returns **both libraries** — exactly the K-59-follow defect: WebKitGTK bakes its
helper-process directory (`WebKitWebProcess`, `WebKitNetworkProcess`, `injected-bundle`)
into the `.so` at compile time, on this machine a `$HOME` path, and an AppImage mounted at
`/` can never provide a private `$HOME`, so every foreign host SIGABRTs at webview spawn.
The deb has no such problem because it declares those as package dependencies.

`scripts/finalize-appimage.sh <AppDir>` (needs `~/.cache/tauri/linuxdeploy-*.AppImage`,
which the bundle build already downloaded) was run against
`…/bundle/appimage/open-language-learning-platform.AppDir`:

- size **119,142,904 B → 72,837,624 B**, new sha256 `8c3b591395c4f8fdf44ebfbdce08bfe96390f0c1ae5b75eff5846433baaa70ee`;
- re-extract and the same `find` returns **0** hits;
- `ldd` on the AppDir binary now resolves `libwebkit2gtk-4.1.so.0 => /usr/lib/…`, i.e. the
  target's system WebKit, which matches the deb's `Depends:` and is the documented Tauri
  runtime dependency;
- `scripts/test-finalize-appimage.sh` → `ok`, exit 0.

Sanity comparison against the published artifact: the 0.4.0-alpha.1 plain AppImage on the
release is **72,739,320 B** — the same finalize shape, 98,304 B apart because the content
tree moved. So the published asset was finalized and this host's first build was not.

**Headless-start re-check is currently blocked, and why.** After finalizing, the AppImage
exits in ~3 s with status 0 and creates no storage: `pgrep` shows the **owner's running
`lts-desktop` (pid 3200353)**, and `tauri-plugin-single-instance` focuses the existing
window and lets the second instance exit cleanly. That is the guard, not a crash — but it
means the "starts headless" observation above cannot be repeated while the owner's app is
open, and killing the owner's process is not mine to do. Any future headless bundle smoke
must either stop that instance first (owner's call) or run with a distinct
`identifier`/`XDG_*` pair, which is what the app's single-instance key derives from.

Consequence for `RELEASE-EVIDENCE-001` and for anyone quoting bundle numbers: **use the
finalized 72,837,624 B / `8c3b5913…` figure**, and state finalize status whenever an
AppImage size is reported.
