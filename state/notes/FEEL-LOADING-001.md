# FEEL-LOADING-001 — loading & pending feedback across surfaces

## Contract (frozen at card open)

The feel audit's loading sections (board body = audit sections 4-6,9) found the
app treating IPC as instant: My Words renders the PREVIOUS list while the new
one is in flight, Settings fills six independent reads with no signal at all,
Progress reflows as its staggered reads land, Settings toggles write to the
engine in total silence, the speech-model Download button stays live while a
hundreds-of-MB install runs, the LAN Pair button can be double-submitted, the
placement first fetch repeats on double-tap, and the pair result is an
unstyled bare `<p>`. This card gives every one of those a visible, honest
state on the FEEL-GLOBAL token layer.

1. **Skeleton primitive** — `packages/ui/src/styles.css` gains
   `@keyframes skeleton-pulse` (opacity 1 → 0.55 → 1; the `pulse` naming keeps
   it legal under the motion-budget pin, same precedent as `pulse-soft`) and
   `.skeleton-row` (a line-height-height block on `--surface-sunk` + `--line`,
   radius `--radius-sm`, breathing via skeleton-pulse) plus
   `.skeleton-list` (stacked rows) and `.skeleton-block` with
   `--facts/--summary/--stats/--map/--tree` min-height reservations. The global
   `prefers-reduced-motion` block flattens the breathing automatically.
2. **My Words** — `MyWordsPanel` gains `loading?: boolean`; while loading the
   saved-words list area renders `role="status" aria-label="Loading saved
   words"` over three `.skeleton-row`s (widths 100/72/55% via nth-child) and
   shows NEITHER stale items NOR the "Nothing mined yet" line. App:
   `wordsLoading` true for the `openWords` prime chain, finally false.
3. **Settings prime** — `Settings` gains `loading?: boolean`: a
   `.skeleton-list` (`data-testid="settings-loading-skeleton"`, role="status")
   appears under the h2 for the whole `openSettings` chain (`settingsLoading`,
   finally false) — six silent reads now announce themselves.
4. **Progress reservation** — while `progressLoading` the Progress route
   renders ONE skeleton shell (`aria-label="Loading progress"`: five
   `.skeleton-block` reservations in final order) INSTEAD of the live sections,
   so staggered arrivals no longer jump the page; the whole stack lands once
   at reserved heights. The old "Loading progress…" text line is replaced by
   the shell.
5. **Saved tick** — `Settings` gains `saveNotice?: string | null`: renders
   `.save-tick` (a `.notice` rule re-declared after `.notice` with a quiet
   `--ok` left border — success, not warning) carrying `✓ Saved`, `role=
   "status"` (aria-live). App calls `markSettingsSaved()` on the SUCCESS path
   of exactly the six toggles/selects (`setMicSetting`,
   `pickMicrophoneSetting`, `pickPlaybackSetting`, `setRomajiSetting`,
   `setKanaKeyboardSetting`, `selectSpeechModel`) and a timer ref clears it
   after ~2.5 s (never mid-render).
6. **Speech install pending** — App `installingSpeechModel: string | null`
   around `installSpeechModel` (try/finally). `Settings` prop
   `installingModelId`: the installing model's button reads `Installing…` +
   `aria-busy="true"`, ALL model buttons (Download and Remove) disable while
   any install runs (one installer at a time is the honest state).
7. **Pair** — `LanAccessCard`: `pairing` state with an entry guard; the Pair
   button is `disabled` + `aria-busy` mid-request (double-submit impossible).
   The result message becomes the exported presentational `PairResult`:
   ok → `.notice` `role="status"`, failure → `.alert` `role="alert"`, both
   `aria-live="polite"`, keeping `data-testid="lan-pair-message"`. The card's
   own `lanError` bare `class="error"` (no such rule exists in styles.css —
   measured) becomes the styled `.alert` with `role="alert"`.
8. **Placement first fetch** — App `placementLoading` around `openPlacement`;
   the Start placement button reads `Starting…` and disables mid-fetch, so a
   double tap cannot double-submit the plan.

## Guardrails

- FEEL-GLOBAL motion budget: the only new loop is `*pulse*`-named; entries
  ride existing fade-up (notice/alert already animate).
- button-affordance + a11y + ADR-0002 scans green unedited; disabled buttons
  ride `.btn:disabled` already pinned.
- `settings.test.tsx`, `words.test.tsx` journeys and static contracts stay
  green; new props are optional so every existing fixture still compiles.

## Verification

- Red-at-base contract: `apps/desktop/src/loading-feel.test.ts` (CSS pins) +
  `loading-feel.test.tsx` (SSR component contracts incl. exported
  `PairResult`) — red at base, green after.
- Real-engine capture `scripts/feel-loading-capture.mjs` (lts-serve + headless
  Chrome + raw CDP, same plumbing as feel-global-capture): injects a
  `window.fetch` delay so IPC latency is MEASURABLE, then asserts mid-flight
  `.skeleton-row`s on My Words/Settings, reserved-height Progress shell with
  <60px document jump across the staggered arrivals, the `✓ Saved` tick after
  a mic toggle, the installing/`Starting…` disabled states, and exactly ONE
  `/pair` POST for a double-click. Red at base (stash recipe), green at HEAD,
  screenshots in `state/evidence/FEEL-LOADING-001/`.
- LANE gates: `npx tsc --noEmit` + vitest in apps/desktop; no Rust touched.

## Oracle

Card attachment `onboard.png` (FEEL-TARGETS family): loading states are
HONEST and calm — real state named plainly, no fake progress, motion only on
the token family. This card's surfaces are the same language: a breathing
placeholder, not a spinner.
