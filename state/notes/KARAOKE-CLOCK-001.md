# KARAOKE-CLOCK-001 — karaoke lit in jsdom, stayed dark in the real webview

## Found (2026-11-08, controller device test under Xvfb)
The WORD-TIMING-001 render contract passed 351 jsdom tests, but on the
release binary the karaoke chip never lit during real playback. The
chain was verified link by link on a clean data dir:
- installed pack contains media/words.jsonl (4,819 rows);
- sidecar row for the shown clip exists with the exact entry id
  (`ru.lex.argue.utverzhdenie`, span 0.0-1.44 s);
- Rust attach path reads the same store layout it is given;
- audio genuinely played (PipeWire sink-input count went 0 -> 1);
- pixel sampling: identical #F5F1E9 background behind the word in
  idle AND mid-playback frames — zero accent-soft chip pixels.
So the clock, not the data, was the dead link: the clock relied on
the audio element's `timeupdate`, and WebKitGTK delivered zero such
events before `ended` on short blob clips (~1.4 s).

## Fix
`attachKaraokeClock` (word-timing.ts): frame-rate pump sampling
`audio.currentTime` while the element plays; `timeupdate` kept as a
second source; startAt seek + stopAt pause preserved for
click-to-hear-word. Testable via injected frame source. Tests pin the
regression directly: a pump run with NO timeupdate events still ticks,
the stopAt window closes the clock with null, and timeupdate passthrough
still works.

Also fixed by the same card: the shadowing Play button had NO playing
state at all — the exact reason the dark-karaoke bug survived every
earlier manual look. It now reads "Playing…" with aria-busy.

## Not fixed here (recorded)
- Writing mode on the Russian pack shows "Show romaji" — Japanese term
  leaking via the pack schema's `romaji` field name. Copy/schema naming
  question, not playback.
- xdotool-typed profile name arrived mangled ("Karaoke Test" ->
  "Karaide Test") — could be an xdotool artifact; not reproduced in-app.

## Additional device-test smell (2026-11-08, unreprobed)
On the shadow card, Tab focus landed on an editable text field holding
junk ("yteep...") where the surface word should be read-only, and stray
keystrokes had filled it. Either the surface renders as an input on this
build, or another mode's field shares the card. Worth a follow-up:
a learner could corrupt the prompt with stray typing. Not chased
tonight (Xvfb env degraded); reproducible check belongs in the clean
Xvfb re-run that also lands the chip pixel evidence.
