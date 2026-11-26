# SERVE-PAIR-ONBOARD-001 — serve-mode first-contact pairing card on the onboarding screen

Live violation (owner phone, serve mode): an unpaired device opens the served
page and can reach neither the profile chooser (every /api call is gated with
`pairing required`) nor Settings — the welcome step renders as a dead wizard
with a bare error string and no way to pair. The pairing form that exists
today lives ONLY in Settings → Local network access (`LanAccessCard`), which
an unpaired device cannot open either — every engine call 401s, the card is
unreachable, and the learner is stranded.

## Root cause

`App.tsx` renders the onboarding wizard unconditionally at step `welcome`
(and every step before `done`). Nothing detects the unpaired gate; the first
engine call an unpaired device makes is the K-05 resume `list_profiles`,
whose failure is caught and painted as a plain error string — the pairing
affordance exists nowhere an unpaired device can reach.

## The fix

- A self-contained `ServePairingCard` presentational component in
  `onboarding.tsx`: the PIN form (`id="serve-pair-pin"`, `inputMode="numeric"`,
  `maxLength={6}`, `pattern="[0-9]*"`), a submit control (`data-testid=
  "serve-pair-submit"`) that starts disabled and stays disabled until a PIN
  is in, and honest copy that names how to get the PIN (Settings → Local
  network access on the computer running LTS). No cloud/internet wording —
  serve mode is LAN-only HTTP, the card must never imply otherwise.
- The submit POSTs to the serve bridge's own `/pair` endpoint (same shape as
  `LanAccessCard`: `{ pin }` → `{ paired }`). Success → full page reload
  (the pairing cookie is set; a fresh boot then passes the gate and enters
  the normal onboarding). Failure → the bridge's `error` text rides an
  assertive `role="alert"`.
- `App.tsx`: on mount, in serve mode only, attempt an engine call; when the
  rejection message contains "pairing required", set `serveUnpaired` and
  render `<ServePairingCard />` in place of the wizard (same AppShell).
  Paired devices and desktop mode render exactly as before.
- Desktop mode is untouched: no marker, no fetch, no card.

## Evidence gates

- Vitest contract (red at base): the untracked `serve-pairing.test.tsx` —
  form renders with the PIN input, disabled submit, "Local network access"
  + "pairing PIN" copy, and zero cloud/internet wording.
- Full desktop suite stays green (665/667 pre-fix, 667/667 after).
- No Rust changes: the serve bridge's `/pair` endpoint, PIN lifecycle, and
  pairing gate are unchanged. The card adds no network surface of its own.
