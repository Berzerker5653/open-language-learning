#!/usr/bin/env python3
"""AT-SPI labeling audit for the desktop app: assert every actionable element
carries a non-empty accessible name, and (with --drill) walk the hub
destinations the same way the smoke walker does, re-auditing each view.

This checks exactly what Orca would read - the accessibility tree - without
any speech. Run against a live app instance:

    scripts/a11y-atspi-audit.py [lts-desktop] [--drill]

Exit codes: 0 = PASS (every actionable element named; every nav destination
reached when --drill is requested), 1 = FAIL otherwise.

Assertions are role-based, never language-based. --drill locates the nav
buttons from the live tree (named buttons/links/tabs under a landmark, i.e.
the routes nav), so a rename shows up as "not located" rather than a silent
skip. After a drill the app is returned to the first destination.
"""

import sys
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi  # noqa: E402

ACTIONABLE = {
    "button",
    "push button",
    "toggle button",
    "link",
    "entry",
    "password text",
    "combo box",
    "list box",
    "check box",
    "radio button",
    "slider",
    "spin button",
    "tab",
    "tree item",
}

NAV_TARGETS = {"today", "practice", "words", "my words", "progress", "settings"}

WAIT_S = 1.2


def states_of(acc):
    out = set()
    try:
        for st in acc.get_state_set().get_states():
            nm = str(getattr(st, "name", st))
            out.add(nm.replace("STATE_TYPE_", "").lower())
    except Exception:
        pass
    return out


def path_of(acc, depth=4):
    parts = []
    cur = acc
    while cur is not None and depth > 0:
        try:
            parts.append(f"{cur.get_role_name()}:{(cur.get_name() or '')[:40]}")
        except Exception:
            break
        try:
            cur = cur.get_parent()
        except Exception:
            cur = None
        depth -= 1
    return " < ".join(parts)


def audit_tree(acc, findings, seen, depth=0):
    try:
        role = acc.get_role_name()
        name = acc.get_name() or ""
    except Exception:
        return
    st = states_of(acc)
    if "hidden" in st or "invisible" in st:
        return
    if role in ACTIONABLE and id(acc) not in seen:
        seen.add(id(acc))
        if not name.strip():
            findings.append((role, path_of(acc), ",".join(sorted(st))))
    for i in range(acc.get_child_count()):
        try:
            child = acc.get_child_at_index(i)
        except Exception:
            continue
        if child is not None:
            audit_tree(child, findings, seen, depth + 1)


def find_app(match):
    desktop = Atspi.get_desktop(0)
    for i in range(desktop.get_child_count()):
        app = desktop.get_child_at_index(i)
        if app is not None and match in (app.get_name() or "").lower():
            return app
    return None


def nav_buttons(app):
    """Named buttons/links/tabs directly under a landmark/toolbar - the routes
    nav as it exists right now, discovered from the live tree."""
    found = []

    def walk(acc, depth=0):
        if depth > 14:
            return
        try:
            role = acc.get_role_name()
            parent = acc.get_parent()
            parent_role = parent.get_role_name() if parent else ""
        except Exception:
            return
        if role in ("button", "link", "tab") and parent_role in (
            "landmark",
            "panel",
            "section",
            "tool bar",
            "tab list",
        ):
            name = (acc.get_name() or "").strip()
            if name and name.lower() in NAV_TARGETS:
                found.append((name, acc))
        for i in range(acc.get_child_count()):
            try:
                child = acc.get_child_at_index(i)
            except Exception:
                continue
            if child is not None:
                walk(child, depth + 1)

    walk(app)
    out, names = [], set()
    for name, acc in found:
        if name.lower() not in names:
            names.add(name.lower())
            out.append((name, acc))
    return out


def activate(acc):
    try:
        n = Atspi.Action.get_n_actions(acc)
        if n and n > 0:
            return Atspi.Action.do_action(acc, 0)
    except Exception:
        pass
    try:
        Atspi.Component.grab_focus(acc)
        return True
    except Exception:
        return False


def report(view_label, app):
    findings, seen = [], set()
    audit_tree(app, findings, seen)
    print(f"{view_label}: {len(seen)} actionable elements checked, {len(findings)} unnamed")
    for role, p, st in findings:
        print(f"  UNNAMED [{role}] states={st} at {p}")
    return len(findings)


def main():
    args = sys.argv[1:]
    drill = "--drill" in args
    positional = [a for a in args if not a.startswith("--")]
    match = (positional[0] if positional else "lts-desktop").lower()

    Atspi.init()
    app = find_app(match)
    if app is None:
        print(f"FAIL: no application matching {match!r} on the accessibility bus")
        return 1

    print(f"auditing {app.get_name()!r} via AT-SPI (the same tree Orca reads)")
    fails = report("view 1 (as found)", app)
    views = 1

    if drill:
        targets = nav_buttons(app)
        got = {n.lower() for n, _ in targets}
        missing = [t for t in sorted(NAV_TARGETS) if not any(t in g or g in t for g in got)]
        if missing:
            print(f"drill: nav buttons not located for: {missing}")
            fails += len(missing)
        for name, acc in targets:
            if not activate(acc):
                print(f"drill: could not activate {name!r}")
                fails += 1
                continue
            time.sleep(WAIT_S)
            views += 1
            fails += report(f"view after {name!r}", app)
        if targets:
            activate(targets[0][1])
            time.sleep(0.5)

    status = "PASS" if fails == 0 else "FAIL"
    print(f"{status}: {views} views audited, {fails} unnamed actionable element(s)")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
