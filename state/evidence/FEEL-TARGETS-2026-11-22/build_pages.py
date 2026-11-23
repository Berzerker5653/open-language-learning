#!/usr/bin/env python3
"""FEEL-TARGETS-2026-11-22: generate 6 TARGET mockup pages.

Tokens copied VERBATIM from packages/ui/src/styles.css :root (warm-cream
paper neutrals, single deep-teal accent, serif display stack). Motion is
shown as a mid-animation frame + a mono caption, per the card spec:
no confetti, no XP, calm-but-warm.
"""
import os

OUT = os.path.dirname(os.path.abspath(__file__))

TOKENS = """
/* tokens verbatim from packages/ui/src/styles.css :root */
:root {
  color-scheme: light;
  --bg: #f5f1e9;
  --surface: #fffdf9;
  --surface-sunk: #ece5d8;
  --ink: #241f18;
  --ink-soft: #5c544a;
  --ink-faint: #756c5d;
  --line: #e2dacc;
  --line-strong: #c9beab;
  --accent: #14615e;
  --accent-ink: #0e4a47;
  --accent-soft: #e2eeeb;
  --ok: #2e7d46;
  --ok-ink: #276b3c;
  --ok-soft: #e8f0e6;
  --warn: #8a6116;
  --warn-soft: #f6ecd7;
  --err: #b23a2e;
  --err-soft: #f7e5e1;
  --font-sans:
    system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Sans",
    "Yu Gothic UI", "Meiryo", sans-serif;
  --font-display:
    ui-serif, "Iowan Old Style", "Palatino Linotype", Georgia, "Noto Serif JP",
    "Hiragino Mincho ProN", "Yu Mincho", serif;
  --font-mono:
    ui-monospace, "SF Mono", "Cascadia Mono", "Noto Sans Mono", Menlo, Consolas, monospace;
  --radius: 8px;
  --radius-sm: 6px;
  --shadow: 0 1px 2px rgb(36 31 24 / 0.05);
  --content-max: 46rem;
}
"""

BASE = """
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: var(--font-sans); font-size: 1rem; line-height: 1.6;
  width: 390px;
}
h1, h2, h3 { font-family: var(--font-display); line-height: 1.25; margin: 0 0 0.5rem; }
h1 { font-size: 1.75rem; font-weight: 600; }
h2 { font-size: 1.3rem; font-weight: 600; }
.target-banner {
  font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 700;
  color: var(--warn); background: var(--warn-soft);
  border-bottom: 2px dashed var(--warn); padding: 0.5rem 1.25rem;
}
.legend {
  margin: 0; padding: 0.625rem 1.25rem 0.75rem;
  background: var(--surface); border-bottom: 1px solid var(--line);
  font-size: 0.8125rem; color: var(--ink-soft); line-height: 1.5;
}
.legend strong { color: var(--ink); }
.legend ul { margin: 0.25rem 0 0; padding-left: 1.1rem; }
header { background: var(--surface); border-bottom: 1px solid var(--line); }
.shell-bar {
  display: flex; align-items: center; gap: 0.5rem 1.25rem;
  padding: 0.5rem 1.25rem; min-height: 3.5rem;
}
.brand {
  font-family: var(--font-display); font-size: 1.1rem; font-weight: 600;
  letter-spacing: 0.01em; margin-right: auto;
}
.routes { display: flex; gap: 0.25rem; position: relative; border-bottom: 1px solid var(--line); }
.tab {
  appearance: none; background: none; border: 0;
  border-bottom: 2px solid transparent; color: var(--ink-soft);
  font: inherit; font-size: 0.9375rem; font-weight: 600;
  padding: 0.625rem 0.4rem; min-height: 2.75rem; cursor: pointer;
  white-space: nowrap; flex: 1; text-align: center;
}
.tab:hover { color: var(--ink); }
.tab[aria-current="page"] { color: var(--accent-ink); border-bottom-color: var(--accent); }
.page { padding: 1.25rem 1.25rem 2.5rem; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  min-height: 2.75rem; padding: 0.5rem 1.125rem;
  border-radius: var(--radius-sm); border: 1px solid var(--line-strong);
  background: var(--surface); color: var(--ink); font: inherit;
  font-size: 0.9375rem; font-weight: 600; cursor: pointer; text-align: center;
}
.btn--primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn--quiet { background: var(--surface); border-color: var(--line-strong); color: var(--ink); }
.btn-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0 1rem; }
.cap {
  font-family: var(--font-mono); font-size: 0.75rem; color: var(--warn);
  line-height: 1.5; margin: 0.35rem 0 1.1rem;
}
.t-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 0.9rem 1rem;
}
.sec-title {
  font-size: 0.8125rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--ink-faint); margin: 1.4rem 0 0.5rem;
}
.fold-note {
  text-align: center; font-family: var(--font-mono); font-size: 0.75rem;
  color: var(--ink-faint); border-top: 1px dashed var(--line-strong);
  margin: 1.75rem 0; padding-top: 0.75rem;
}
.bar-track {
  height: 8px; border-radius: 999px; background: var(--surface-sunk);
  border: 1px solid var(--line); overflow: hidden;
}
.bar-fill { height: 100%; border-radius: 999px; background: var(--accent); }
"""

def page(card_id, title, legend, body, extra_css="", nav_html=None):
    nav_html = nav_html or NAV_TODAY
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
{TOKENS}{BASE}{extra_css}
</style>
</head>
<body>
<div class="target-banner">TARGET for {card_id} — reference only</div>
<div class="legend"><strong>Motion legend — every animation shown as one static mid-frame:</strong>
<ul>
{legend}
</ul>
</div>
<header>
  <div class="shell-bar"><span class="brand">Open Language Learning Platform</span></div>
  {nav_html}
</header>
<main class="page" id="main">
{body}
</main>
</body>
</html>
"""

def nav(active):
    labels = ["Today", "Practice", "My words", "Progress", "Settings"]
    tabs = "".join(
        f'<button type="button" class="tab"'
        + (' aria-current="page"' if t == active else "")
        + f">{t}</button>\n  "
        for t in labels
    )
    return f'<nav aria-label="Routes" class="routes">\n  {tabs}\n</nav>'

NAV_TODAY = nav("Today")

# ------------------------------------------------------------------ 1 global
gs_css = """
.routes--mid .tab-underline {
  position: absolute; bottom: -1px; left: 39px; width: 78px; height: 2px;
  background: var(--accent);
}
.routes--mid .tab[aria-current="page"] { border-bottom-color: transparent; }
.routes--mid .tab--heading { color: var(--ink); }
.state-lab { font-family: var(--font-mono); font-size: 0.6875rem; color: var(--ink-faint);
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
.btn--hover { background: var(--accent-ink); border-color: var(--accent-ink); }
.btn--pressed {
  background: var(--accent-ink); border-color: var(--accent-ink);
  transform: translateY(2px); box-shadow: inset 0 2px 3px rgb(14 74 71 / 0.45);
}
.toast {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: var(--surface); border: 1px solid var(--line-strong);
  border-radius: var(--radius); box-shadow: 0 4px 12px rgb(36 31 24 / 0.14);
  padding: 0.6rem 0.9rem; font-size: 0.9375rem; font-weight: 600;
}
.tick {
  width: 1.25rem; height: 1.25rem; border-radius: 50%; background: var(--ok-soft);
  border: 1.5px solid var(--ok); color: var(--ok); display: inline-flex;
  align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;
  flex: none;
}
.sheet-stage { position: relative; height: 300px; border: 1px solid var(--line);
  border-radius: var(--radius); overflow: hidden; background: var(--surface-sunk); }
.sheet-stage .ghost { padding: 0.75rem 1rem; color: var(--ink-faint); font-size: 0.875rem; }
.scrim { position: absolute; inset: 0; background: rgb(36 31 24 / 0.22); }
.sheet {
  position: absolute; left: 0; right: 0; bottom: 0; background: var(--surface);
  border-top: 1px solid var(--line-strong); border-radius: 14px 14px 0 0;
  box-shadow: 0 -6px 18px rgb(36 31 24 / 0.12); padding: 0.6rem 1.1rem 1.1rem;
  transform: translateY(40%);
}
.sheet .grab { width: 34px; height: 4px; border-radius: 999px; background: var(--line-strong);
  margin: 0 auto 0.7rem; }
.sheet .word { font-family: var(--font-display); font-size: 1.75rem; font-weight: 600; }
.sheet .gloss { color: var(--ink-soft); margin: 0.1rem 0 0.75rem; }
"""
gs = page(
    "FEEL-GLOBAL-STATES", "FEEL global states — TARGET",
    """<li>Tab underline slides between routes — 250ms ease-out; drawn at the ~50% frame.</li>
<li>Primary button: hover darkens to --accent-ink; :active presses down translateY(2px) with a darker shade — 120ms.</li>
<li>Toast rises 12px + fades in over 250ms ease-out, auto-dismisses after 2.5s — drawn mid-rise.</li>
<li>Bottom sheet slides up over 300ms ease-out behind a dim scrim — drawn at ~60% travel.</li>""",
    """
<div class="sec-title">Tab bar — sliding underline (mid-slide frame)</div>
<nav aria-label="Routes" class="routes routes--mid">
  <button type="button" class="tab" aria-current="page">Today</button>
  <button type="button" class="tab tab--heading">Practice</button>
  <button type="button" class="tab">My words</button>
  <button type="button" class="tab">Progress</button>
  <button type="button" class="tab">Settings</button>
  <span class="tab-underline"></span>
</nav>
<div class="cap">(underline slides 250ms ease-out — frame at ~50% from Today toward Practice; the old underline does not snap, it glides)</div>

<div class="sec-title">Primary button — rest / hover / pressed</div>
<div style="display:flex; gap:0.6rem;">
  <div><div class="state-lab">rest</div><button class="btn btn--primary">Continue</button></div>
  <div><div class="state-lab">hover</div><button class="btn btn--primary btn--hover">Continue</button></div>
  <div><div class="state-lab">:active pressed</div><button class="btn btn--primary btn--pressed">Continue</button></div>
</div>
<div class="cap">(press = translateY(2px) + darker shade --accent-ink, 120ms ease-out; a chunky Duolingo-style press, still our deep teal — one accent, no extra color)</div>

<div class="sec-title">“Saved” toast (mid-rise frame)</div>
<div class="toast"><span class="tick">✓</span>“бить” saved to My words</div>
<div class="cap">(toast rises 12px + fades in 250ms ease-out, sits above the tab bar, fades away after 2.5s; the ✓ tick is shape + text, never color alone)</div>

<div class="sec-title">Word card — bottom sheet (half-slid-up frame)</div>
<div class="sheet-stage">
  <div class="ghost">My words · 12 cards</div>
  <div class="scrim"></div>
  <div class="sheet">
    <div class="grab"></div>
    <div class="word">дом</div>
    <div class="gloss">house; home</div>
    <div class="btn-row" style="margin:0;">
      <button class="btn btn--primary">Review now</button>
      <button class="btn btn--quiet">Due in 3 days</button>
    </div>
  </div>
</div>
<div class="cap">(sheet slides up 300ms ease-out, scrim dims behind it — frame at ~60% of travel; drag handle + rounded top for a soft, warm edge)</div>
""",
    gs_css,
)

# ------------------------------------------------------------------ 2 drill
dr_css = """
.sess-head { display: flex; justify-content: space-between; font-size: 0.875rem;
  color: var(--ink-soft); font-weight: 600; margin-bottom: 0.3rem; }
.kicker { font-size: 0.8125rem; color: var(--ink-faint); font-weight: 600; margin: 0 0 0.25rem; }
.glyph-tile {
  background: var(--surface-sunk); border: 1px solid var(--line); border-radius: var(--radius);
  width: 96px; height: 96px; margin: 0.6rem auto; display: flex;
  align-items: center; justify-content: center;
  font-family: var(--font-display); font-size: 3.25rem; font-weight: 600;
}
.q-prompt { text-align: center; color: var(--ink-soft); font-size: 0.9375rem; margin: 0.25rem 0 0.9rem; }
.choice {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  min-height: 3rem; padding: 0.5rem 0.9rem; margin-bottom: 0.5rem;
  border-radius: var(--radius); border: 1px solid var(--line-strong);
  background: var(--surface); font: inherit; font-size: 1rem; font-weight: 600;
  color: var(--ink); cursor: pointer;
}
.choice--correct {
  border: 2px solid var(--ok); background: var(--ok-soft); color: var(--ok-ink);
  box-shadow: 0 0 0 3px var(--ok-soft);
}
.glyph { font-family: var(--font-mono); font-weight: 700; }
.choice .ring {
  width: 1.5rem; height: 1.5rem; border-radius: 50%; background: var(--ok);
  color: #fff; display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.875rem; font-weight: 700;
}
.verdict { border-left: 3px solid var(--ok); background: var(--ok-soft);
  border-radius: var(--radius); padding: 0.8rem 1rem; }
.verdict .v-title { font-weight: 700; color: var(--ok-ink); }
.verdict .v-sub { color: var(--ink-soft); font-size: 0.9375rem; }
.summary {
  border: 1px solid var(--line-strong); border-radius: 12px; background: var(--surface);
  padding: 1.4rem 1.2rem 1.5rem; text-align: center; box-shadow: var(--shadow);
}
.summary .s-line { color: var(--ink-soft); margin: 0 0 1.1rem; }
"""
dr = page(
    "FEEL-DRILL", "FEEL drill — TARGET",
    """<li>Session bar eases to its new fraction over 300ms ease-out each time a card lands — drawn at 60%.</li>
<li>Correct choice: green ring scales in + soft fill fades, 150ms; wrong taps shake once (not drawn).</li>
<li>Verdict card slides up 8px + fades in 200ms ease-out.</li>
<li>End-of-session card fades + scales 0.98→1 over 250ms — calm close: no confetti, no badges, no flames.</li>""",
    """
<div class="sec-title">Session progress (mid-fill frame)</div>
<div class="t-card">
  <div class="sess-head"><span>Session · 3 of 5 cards</span><span>60%</span></div>
  <div class="bar-track"><div class="bar-fill" style="width:60%;"></div></div>
  <div class="cap">(fill eases to the new fraction over 300ms ease-out when each card lands — frame at 60%; the bar is a session line, not an XP meter)</div>
</div>

<div class="sec-title">Recognition question</div>
<div class="t-card">
  <div class="kicker">Recognize the script · ~40s</div>
  <h2>Printed Cyrillic: Б б, П п, Д д, Г г</h2>
  <div class="glyph-tile">б</div>
  <div class="q-prompt">Which sound does this letter make?</div>
  <button class="choice choice--correct">b <span class="ring">✓</span></button>
  <button class="choice" style="opacity:0.6;">p</button>
  <button class="choice" style="opacity:0.6;">d</button>
  <button class="choice" style="opacity:0.6;">g</button>
  <div class="cap">(correct pick: ring scales in + soft --ok-soft fill fades 150ms; the other choices dim as the answers lock — state is ring + check, not color alone)</div>
</div>

<div class="sec-title">Verdict (mid-rise frame)</div>
<div class="verdict">
  <div class="v-title">✓ Correct — <span class="glyph">б</span> makes the sound b</div>
  <div class="v-sub">As in бить · “to hit”</div>
</div>
<div class="cap">(verdict slides up 8px + fades in 200ms ease-out; next card follows on its own — one quiet motion, no celebration burst)</div>

<div class="fold-note">— below the fold —</div>

<div class="summary">
  <h2>Session complete</h2>
  <p class="s-line">4 of 5 learned — бить comes back tomorrow</p>
  <button class="btn btn--primary">Back to your path</button>
  <div class="cap">(card fades + scales 0.98→1 over 250ms ease-out; quiet outline, single primary action — calm-but-warm, never confetti)</div>
</div>
""",
    dr_css,
    nav_html=nav("Practice"),
)

# ------------------------------------------------------------------ 3 my-words
mw_css = """
.word-card {
  display: flex; align-items: center; gap: 0.75rem;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 0.8rem 1rem; margin-bottom: 0.6rem;
}
.word-card .w { font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; }
.word-card .g { color: var(--ink-soft); font-size: 0.9375rem; margin-left: 0.5rem; }
.due {
  margin-left: auto; flex: none; font-size: 0.8125rem; font-weight: 600;
  color: var(--accent-ink); background: var(--accent-soft);
  border: 1px solid var(--line); border-radius: 999px; padding: 0.2rem 0.7rem;
  display: inline-flex; gap: 0.35rem; align-items: center;
}
.due::before { content: "◷"; font-size: 0.875rem; }
.swipe-wrap { position: relative; border-radius: var(--radius); overflow: hidden; margin-bottom: 0.6rem; }
.reveal {
  position: absolute; top: 0; right: 0; bottom: 0; width: 92px; z-index: 3;
  background: var(--err); color: #fff; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.15rem;
  font-size: 0.8125rem; font-weight: 700;
  box-shadow: -6px 0 10px rgb(36 31 24 / 0.10);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.reveal .trash { font-size: 1.1rem; }
.word-card--swiped { transform: translateX(-26px); transition: none; margin-bottom: 0;
  padding-left: 12px; }
.undo-chip {
  display: inline-flex; gap: 0.4rem; align-items: center;
  background: var(--surface); border: 1px solid var(--line-strong);
  border-radius: 999px; box-shadow: var(--shadow); padding: 0.3rem 0.85rem;
  font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.04em;
  margin: 0.5rem 0 0.2rem; color: var(--ink);
}
.undo-chip::before { content: "↺"; font-size: 1rem; }
"""
mw = page(
    "FEEL-MY-WORDS", "FEEL my-words — TARGET",
    """<li>Cards are static rows; tapping a card raises its sheet (see global-states).</li>
<li>Swipe left drags the card with the finger while the red Remove panel slides in over its right end — ~200ms to settle; the due pill tucks under the panel mid-gesture.</li>
<li>On release: card springs back over 200ms and an UNDO chip fades in for 4s — drawn mid-swipe with the chip already shown.</li>
<li>Friendly due pill ("in 3 days") replaces raw dates; clock glyph so meaning never rides color alone.</li>""",
    """
<h1>My words</h1>
<div class="word-card">
  <span class="w">дом</span><span class="g">house; home</span>
  <span class="due">in 3 days</span>
</div>
<div class="swipe-wrap">
  <div class="reveal"><span class="trash">🗑</span>Remove</div>
  <div class="word-card word-card--swiped">
    <span class="w">год</span><span class="g">year</span>
    <span class="due">tomorrow</span>
  </div>
</div>
<div class="undo-chip">UNDO</div>
<div class="cap">(mid-swipe frame at ~30%: the card drags ~26px left while the red Remove panel slides in over its right end — swipe follows the finger, settles in ~200ms; the UNDO chip fades in after release and lives 4s, so a mis-swipe is always one tap from back)</div>
<div class="word-card">
  <span class="w">бить</span><span class="g">to hit</span>
  <span class="due">in 3 days</span>
</div>
<div class="cap">(rows are rounded cards on warm paper with a hairline border and near-invisible shadow — generous 0.6rem gaps, no dividers, no streak counters)</div>
""",
    mw_css,
    nav_html=nav("My words"),
)

# ------------------------------------------------------------------ 4 progress
pg_css = """
.dim { margin-bottom: 0.9rem; }
.dim-head { display: flex; justify-content: space-between; font-size: 0.9375rem;
  font-weight: 600; margin-bottom: 0.25rem; }
.dim-head .pct { font-family: var(--font-mono); font-weight: 400; color: var(--ink-soft); font-size: 0.8125rem; }
.cal-wrap { position: relative; }
.cal { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; }
.cell { aspect-ratio: 1; border-radius: 3px; background: var(--surface-sunk); border: 1px solid var(--line); }
.cell--1 { background: var(--accent-soft); }
.cell--2 { background: #bcd7d2; }
.cell--3 { background: var(--accent); border-color: var(--accent-ink); }
.cell--hover { outline: 2px solid var(--accent-ink); transform: scale(1.15); position: relative; z-index: 2; }
.tip {
  position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%);
  background: var(--ink); color: var(--surface); font-size: 0.75rem;
  font-family: var(--font-mono); border-radius: var(--radius-sm);
  padding: 0.3rem 0.55rem; white-space: nowrap; z-index: 4;
}
.tip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  border: 5px solid transparent; border-top-color: var(--ink); }
/* hovered cell sits near the grid's right edge: anchor the tip rightward so it never spills past the page */
.cell--hover .tip { left: auto; right: -8px; transform: none; }
.cell--hover .tip::after { left: auto; right: 12px; transform: none; }
.cal-cap-row { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--ink-faint); margin-top: 0.4rem; }
.empty {
  border: 1px dashed var(--line-strong); border-radius: var(--radius);
  background: var(--surface); padding: 1.5rem 1.1rem; text-align: center;
  color: var(--ink-soft); font-size: 0.9375rem;
}
.empty .e-title { font-family: var(--font-display); font-size: 1.1rem; color: var(--ink); margin-bottom: 0.2rem; }
.empty .e-mark { font-size: 1.5rem; color: var(--ink-faint); margin-bottom: 0.4rem; }
"""
pg = page(
    "FEEL-PROGRESS", "FEEL progress — TARGET",
    """<li>Dimension bars grow from their previous value over 400ms ease-out, % label counting up — drawn mid-fill.</li>
<li>Calendar cell hover scales the cell 1.15x (120ms) and the tooltip fades in over 150ms — frame with tooltip open.</li>
<li>Empty state fades in over 250ms; it is honest (no invented numbers) and points to Today.</li>""",
    """
<h1>Progress</h1>
<div class="sec-title">Dimensions (mid-fill frame)</div>
<div class="dim">
  <div class="dim-head"><span>Script</span><span class="pct">62%</span></div>
  <div class="bar-track"><div class="bar-fill" style="width:62%;"></div></div>
</div>
<div class="dim">
  <div class="dim-head"><span>Vocabulary</span><span class="pct">45%</span></div>
  <div class="bar-track"><div class="bar-fill" style="width:45%;"></div></div>
</div>
<div class="dim">
  <div class="dim-head"><span>Listening</span><span class="pct">30%</span></div>
  <div class="bar-track"><div class="bar-fill" style="width:30%;"></div></div>
</div>
<div class="cap">(bars grow from the last visited value over 400ms ease-out while the % counts up — frame at ~70% of travel; one accent, no gold/gems)</div>

<div class="sec-title">Last 12 weeks</div>
<div class="cal-wrap">
  <div class="cal">
    <div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--2"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--3"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div>
    <div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--3"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--2"></div><div class="cell"></div><div class="cell"></div>
    <div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--2"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--1 cell--hover"><div class="tip">Nov 20 · 2 sessions</div></div><div class="cell cell--2"></div><div class="cell"></div>
    <div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--2"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div>
    <div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--3"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--1"></div><div class="cell cell--2"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div>
    <div class="cell cell--1"></div><div class="cell"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--2"></div><div class="cell cell--1"></div><div class="cell"></div>
    <div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell cell--2"></div><div class="cell"></div><div class="cell cell--1"></div><div class="cell"></div><div class="cell cell--1"></div>
  </div>
  <div class="cal-cap-row"><span>← 12 weeks ago</span><span>this week →</span></div>
</div>
<div class="cap">(hovered cell scales 1.15x over 120ms, tooltip fades in 150ms — frame mid-hover; density is shape + text on tap, never color alone)</div>

<div class="sec-title">Fresh profile</div>
<div class="empty">
  <div class="e-mark">◌</div>
  <div class="e-title">Nothing studied yet</div>
  your first session is on <strong>Today</strong>
</div>
<div class="cap">(empty state fades in 250ms ease-out; honest copy pointing at the Today tab — no invented streak, no fake history)</div>
""",
    pg_css,
    nav_html=nav("Progress"),
)

# ------------------------------------------------------------------ 5 onboard
ob_css = """
.stepper { display: flex; align-items: flex-start; margin: 0.75rem 0 0.25rem; }
.step { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; width: 92px; }
.dot {
  width: 34px; height: 34px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-weight: 700; font-size: 0.9375rem;
}
.dot--done { background: var(--ok); color: #fff; border: 2px solid var(--ok-ink); }
.dot--active { background: var(--accent); color: #fff; border: 2px solid var(--accent-ink); box-shadow: 0 0 0 4px var(--accent-soft);
  box-shadow: 0 0 0 4px var(--accent-soft); }
.dot--todo { background: var(--surface); color: var(--ink-faint); border: 2px solid var(--line-strong); }
.step .s-lab { font-size: 0.75rem; color: var(--ink-soft); text-align: center; }
.link { flex: 1; height: 2px; margin-top: 16px; background: var(--line-strong); }
.link--done { background: var(--ok); }
.pack .p-line { font-family: var(--font-mono); font-size: 0.75rem; color: var(--ink-soft); margin: 0.35rem 0 0.5rem; }
"""
ob = page(
    "FEEL-ONBOARD", "FEEL onboard — TARGET",
    """<li>Stepper: the ✓ check draws along its stroke over 300ms; the connector between steps fills left→right over 250ms — frame at step 2 active.</li>
<li>Active dot gets a soft accent ring (0 0 0 4px --accent-soft) that fades in, 150ms.</li>
<li>Pack-install bar eases to each downloaded chunk and the MB label ticks per MB — frame at 45%.</li>""",
    """
<h1>Get started with Russian</h1>
<div class="sec-title">Setup — step 2 of 3 (frame mid-transition)</div>
<div class="stepper">
  <div class="step"><div class="dot dot--done">✓</div><div class="s-lab">Language pack</div></div>
  <div class="link link--done"></div>
  <div class="step"><div class="dot dot--active">2</div><div class="s-lab">Your first letters</div></div>
  <div class="link"></div>
  <div class="step"><div class="dot dot--todo">3</div><div class="s-lab">Daily plan</div></div>
</div>
<div class="cap">(the ✓ drew in over 300ms and the connector filled left→right over 250ms — drawn just after both settled; the active dot wears a soft accent ring that faded in 150ms)</div>

<div class="sec-title">Pack install (mid-download frame)</div>
<div class="t-card pack">
  <h2>Russian pack</h2>
  <div class="p-line">Downloading Russian pack · 132 MB of 293 MB</div>
  <div class="bar-track"><div class="bar-fill" style="width:45%;"></div></div>
  <div class="cap">(bar eases to each downloaded chunk — frame at 45%; honest byte counts, no fake progress, a quiet pause control would sit beside it)</div>
</div>
""",
    ob_css,
)

# ------------------------------------------------------------------ 6 settings
st_css = """
.field { margin: 0.5rem 0 0.25rem; }
.field > label { display: block; font-weight: 600; font-size: 0.9375rem; margin-bottom: 0.25rem; }
select.styled {
  appearance: none; -webkit-appearance: none; width: 100%;
  min-height: 2.75rem; padding: 0.5rem 2.4rem 0.5rem 0.75rem;
  border: 1px solid var(--accent); border-radius: var(--radius-sm);
  background: var(--surface)
    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="9" viewBox="0 0 14 9"><path d="M1 1l6 6 6-6" fill="none" stroke="%235c544a" stroke-width="2" stroke-linecap="round"/></svg>')
    right 0.75rem center no-repeat;
  font: inherit; font-size: 0.9375rem; color: var(--ink);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.tog-row { display: flex; align-items: center; gap: 0.75rem; }
.switch {
  width: 46px; height: 28px; border-radius: 999px; background: var(--accent);
  border: 1px solid var(--accent-ink); position: relative; flex: none;
}
.switch .knob { position: absolute; top: 2px; right: 3px; width: 22px; height: 22px;
  border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgb(36 31 24 / 0.25); }
.saved { color: var(--ok-ink); font-size: 0.875rem; font-weight: 700; white-space: nowrap; }
.det { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.det > .det-head { display: flex; justify-content: space-between; padding: 0.7rem 1rem;
  font-weight: 600; font-size: 0.9375rem; }
.det .chev { color: var(--ink-faint); transform: rotate(180deg); font-size: 0.8125rem; }
.det-body-clip { max-height: 46px; overflow: hidden; border-top: 1px solid var(--line);
  padding: 0.6rem 1rem 0; color: var(--ink-soft); font-size: 0.875rem; }
"""
st = page(
    "FEEL-SETTINGS", "FEEL settings — TARGET",
    """<li>Select: native arrow removed, custom chevron drawn; focus ring (--accent border + 3px --accent-soft halo) fades in over 120ms — frame with focus on.</li>
<li>Toggle: knob slides across over 150ms; the green "Saved ✓" fades in over 200ms then fades out after 1.5s — frame with both settled.</li>
<li>Disclosure: content expands over 250ms ease-out while the chevron rotates 180° — frame at ~60% open height.</li>""",
    """
<h1>Settings</h1>
<div class="sec-title">Sounds — styled select (focus frame)</div>
<div class="t-card">
  <div class="field">
    <label for="rate">Practice voice speed</label>
    <select id="rate" class="styled">
      <option>Slow — clearly separated</option>
      <option>Comfortable</option>
      <option>Natural pace</option>
    </select>
  </div>
  <div class="cap">(custom chevron replaces the native arrow; on focus the border takes --accent and a 3px --accent-soft halo fades in over 120ms — frame mid-focus, value applies instantly so no Save button is needed)</div>
</div>

<div class="sec-title">Reading — toggle with micro-feedback</div>
<div class="t-card">
  <div class="tog-row">
    <span class="switch"><span class="knob"></span></span>
    <span>Show transliteration under Cyrillic</span>
    <span class="saved">Saved ✓</span>
  </div>
  <div class="cap">(knob slid across in 150ms; "Saved ✓" faded in over 200ms and fades out after 1.5s — confirmation is text + check, not just green)</div>
</div>

<div class="sec-title">Disclosure mid-expand (frame at ~60%)</div>
<div class="det">
  <div class="det-head"><span>About your data</span><span class="chev">▾</span></div>
  <div class="det-body-clip">
    Your learning data lives on this device. Progress, My words and session
    history are stored in your local profile folder and never leave it
    unless you export them yourself. Deleting a profile removes its data
    completely — no hidden retention, no cloud sync.
  </div>
</div>
<div class="cap">(panel expanded over 250ms ease-out, chevron rotating 180° at the same time — frame clipped mid-height; the full text continues below the cut)</div>
""",
    st_css,
    nav_html=nav("Settings"),
)

pages = {
    "global-states": gs,
    "drill": dr,
    "my-words": mw,
    "progress": pg,
    "onboard": ob,
    "settings": st,
}
for name, html in pages.items():
    with open(os.path.join(OUT, name + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", name + ".html", len(html), "bytes")
