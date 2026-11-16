#!/usr/bin/env python3
# UX-PERSONA-001 fold re-verify driver: wizard steps at 1920x1080 and 1366x768.
# Fresh fake HOME per pass; keyboard choreography (Tab/Return) per the
# headless-desktop-apps recipe; screenshots land in this evidence dir.
import os
import shutil
import subprocess
import time

DISPLAY = ":97"
REPO = "/home/hunter/game-dev/LTS"
EV = f"{REPO}/state/evidence/UX-PERSONA-001"
BIN = f"{REPO}/target/release/lts-desktop"

AENV = {k: v for k, v in os.environ.items() if k not in ("WAYLAND_DISPLAY", "XDG_SESSION_TYPE")}
# Tauri picks the Wayland backend when WAYLAND_DISPLAY leaks into the env and
# silently ignores Xvfb's DISPLAY (window lands on the real desktop instead).
AENV.update(
    DISPLAY=DISPLAY,
    WEBKIT_DISABLE_DMABUF_RENDERER="1",
    WEBKIT_DISABLE_COMPOSITING_MODE="1",
)


def x(args, env=None):
    return subprocess.run(["xdotool"] + args, env=env or AENV, capture_output=True, text=True)


def find_win():
    for _ in range(80):
        cands = []
        for flag in ("--class", "--name"):
            for pat in ("open-language-learning", "Open Language", "language"):
                out = x(["search", flag, pat]).stdout.split()
                cands.extend(out)
        for w in dict.fromkeys(cands):
            g = x(["getwindowgeometry", "--shell", w]).stdout
            try:
                wd = int(g.split("WIDTH=")[1].split()[0])
            except (IndexError, ValueError):
                continue
            if wd > 100:
                # Top-level GTK window = lowest XID (created first); focus it.
                return min(dict.fromkeys(cands), key=lambda v: int(v))
        time.sleep(0.5)
    return None


def key(wid, keysym, env=None):
    # WebKitGTK ignores XSendEvent (--window) keys unless the top-level holds
    # X input focus; on our own Xvfb, set focus then use XTEST global input.
    x(["windowfocus", "--sync", wid], env=env)
    x(["key", "--clearmodifiers", keysym], env=env)


def type_text(wid, text, env=None):
    x(["windowfocus", "--sync", wid], env=env)
    x(["type", "--delay", "40", text], env=env)


def shot(wid, name):
    subprocess.run(["import", "-window", wid, f"{EV}/{name}.png"], env=AENV)
    print(f"SHOT {name}", flush=True)


def click(wid, xy, env=None):
    # XTEST pointer on our own Xvfb: real mouse input, window at (0,0).
    # Deliberate press-hold-release single click (never `click 1` twice:
    # a double click would fire the button under the cursor on the NEXT step).
    x(["mousemove", str(xy[0]), str(xy[1])], env=env)
    time.sleep(0.3)
    x(["mousedown", "1"], env=env)
    time.sleep(0.12)
    x(["mouseup", "1"], env=env)


# "Skip for now" centers measured from the captured frames (window at 0,0).
SKIP_PACK = {"1080": (832, 677), "768": (555, 676)}
# Filled after the probe pass captures the mic step layout.
SKIP_MIC = {"1080": (898, 333), "768": (621, 333)}


def step(appenv, prefix, w, h):
    xvfb = subprocess.Popen(["Xvfb", DISPLAY, "-screen", "0", f"{w}x{h}x24"])
    time.sleep(2)
    log = open(f"{EV}/{prefix}-app.log", "w")
    app = subprocess.Popen([BIN], env=appenv, stdout=log, stderr=log)
    try:
        wid = find_win()
        if wid is None:
            print(f"FAIL {prefix}: no window", flush=True)
            return
        print(f"WIN {prefix} {wid}", flush=True)
        # No WM on Xvfb: the window opens at Tauri's default 1100x720. Pin it
        # to the target viewport, else the "fold" test measures the wrong box.
        x(["windowsize", wid, str(w), str(h)])
        x(["windowmove", wid, "0", "0"])
        time.sleep(2)
        shot(wid, f"foldr-{prefix}-01-welcome")
        # Welcome: name the profile, then Create (Tab lands on the input first).
        key(wid, "Tab", appenv)
        type_text(wid, "Alex", appenv)
        time.sleep(0.5)
        shot(wid, f"foldr-{prefix}-01b-typed")
        key(wid, "Tab", appenv)
        key(wid, "Return", appenv)
        time.sleep(2)
        shot(wid, f"foldr-{prefix}-02-packs")
        # Packs: click "Skip for now" (WebKitGTK ignores XTEST key activation
        # on focused footer buttons in this harness; mouse on our own Xvfb is
        # real input).
        click(wid, SKIP_PACK[prefix], appenv)
        time.sleep(2)
        shot(wid, f"foldr-{prefix}-03-after-skip")
        shot(wid, f"foldr-{prefix}-04-current")
        # Mic step: click its Skip -> the final Start step.
        if SKIP_MIC[prefix]:
            click(wid, SKIP_MIC[prefix], appenv)
            time.sleep(2)
        shot(wid, f"foldr-{prefix}-05-start")
    finally:
        app.terminate()
        xvfb.terminate()
        time.sleep(1)
        subprocess.run(["pkill", "-x", "Xvfb"])
        log.close()


def main():
    for prefix, w, h in (("1080", 1920, 1080), ("768", 1366, 768)):
        home = f"/tmp/foldr-{prefix}"
        shutil.rmtree(home, ignore_errors=True)
        os.makedirs(home)
        appenv = dict(AENV, HOME=home)
        step(appenv, prefix, w, h)
    print("DRIVER DONE", flush=True)


if __name__ == "__main__":
    main()
