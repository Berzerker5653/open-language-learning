# MIC-BROWSER-SPIKE-001 — browser mic exercises over the tailnet HTTPS URL

Spike verdict: **works-with-caveats**. With tailscale-serve HTTPS, a browser page
on the tailnet can capture microphone audio and drive the existing scoring path
(`dictation_check` → whisper aligner) end-to-end. No shipped code changed; the
WEB-SERVE-001 bridge already carries everything. Run date: 2026-11-21, GamingPC.

## What was measured (all against the live serve stack)

Live stack: `lts-serve` on 127.0.0.1:17631 ← `tailscale serve` →
`https://gamingpc.taila9b12d.ts.net` (tailnet only). Data dir
`~/.local/share/openlang` with RU pack 0.4.6 installed and
`speech.json` = `org.openlanguage.speech.whisper-ggml-small`.

1. **Certificate trust**: the tailscale-serve cert for
   `gamingpc.taila9b12d.ts.net` is Let's Encrypt–issued (issuer `YE2`, expires
   2027-02-19) and verifies against the plain system CA store — no custom CA to
   install on phone browsers. Any tailnet device that resolves MagicDNS gets a
   green padlock, which is what makes the origin a secure context.
2. **Secure context + permissions** (headless Chrome 157, fake-mic devices,
   page navigated to the real ts.net origin):
   - `window.isSecureContext === true`, `navigator.mediaDevices.getUserMedia`
     present.
   - `getUserMedia({audio:true})` **GRANTED** in 103 ms; track settings normal
     (48 kHz mono, echoCancellation/autoGainControl on, reported track latency
     10 ms).
   - Post-grant `enumerateDevices()` revealed **named** inputs (3 audioinputs,
     labels visible) — the SETTINGS-SCOPE secure-context rule holds over the
     tailnet URL.
   - Note: the headless run auto-approved the prompt via
     `--use-fake-ui-for-media-stream`. On a real phone the browser's native
     per-origin mic prompt appears on first record — one tap, remembered per
     site. That tap is the only untested mile (no real phone on hand).
3. **Audio pipeline**: the PoC replayed App.tsx's exact chain
   (getUserMedia → AudioContext `createScriptProcessor(4096,1,1)` → Int16 WAV)
   inside the page, then POSTed same-origin to `/api/dictation_check`:
   - fake-mic take (system test tone): HTTP 200, engine answered honestly —
     `matched:false, heard:"[музыка] [музыка]"` (whisper heard the tone as
     music). Proves audio bytes reached the aligner.
   - real pack clip (`ru.sent.a1.kot-doma.u001.wav`, 1.6 s) POSTed from the
     page: HTTP 200, **`matched:true, heard:"Утром кошка на окне!"`** in
     2462 ms.
4. **Latency decomposition** (`server-latency.log` next to the PoC):
   - tailnet HTTPS: 2.45–2.53 s per scoring POST; direct localhost: 2.44–2.46 s
     → tailscale-serve + TLS overhead ≈ **10–90 ms**, negligible.
   - the ~2.4 s is **server-side whisper-ggml-small**. `GET /api/capabilities`
     over the same HTTPS path: 11 ms, so the wire is fine.

## Caveats (the honest list)

- **First-record permission tap on the phone is unverified** — headless bypassed
  the prompt. Standard behavior on Android Chrome and iOS Safari over HTTPS,
  but the phone acceptance is a 2-minute owner task, not agent-measurable here.
- **Phone tailnet prerequisites**: Tailscale app with MagicDNS enabled; without
  it the hostname never resolves (cert/DNS is all-or-nothing on the phone leg).
- **Plain-http tailnet URLs have no mic** (browser rule, already surfaced by
  `/api/capabilities`): HTTPS via tailscale-serve is the only mic-capable web
  path — and it works.
- **Speech model must be selected** on the device (privacy-first default `off`
  → engine abstains `speech-model-off`). The serve instance already selects
  whisper-ggml-small.
- **iOS Safari**: `createScriptProcessor` is deprecated-but-working there;
  AudioWorklet would be the modern swap if iOS users appear. Recording starts
  from a tap already, so the user-gesture autoplay rule is satisfied.
- **Payload bound**: `wav_b64` decoded cap is 10 MB ≈ ~100 s of 48 kHz mono
  16-bit; the app's 40 s capture limit keeps every attempt ≈ 4 MB decoded —
  comfortable.
- **Scoring runs on GamingPC's CPU** (ggml sidecar): single-learner fine,
  concurrent learners would queue; that's a WEB-001 capacity question, not a
  mic question.
- **Security posture unchanged**: the `/api` bridge exposes the full desktop
  command wiring to anything that can reach the URL; tailscale-serve keeps that
  tailnet-only (SEC sign-off stays a WEB-001 concern, per the note there).

## Next-step recommendation

1. Treat the browser mic path as **shipped and viable**; the remaining gate is
   one real-phone pass: phone on Tailscale → open
   `https://gamingpc.taila9b12d.ts.net` → dictation → Record → allow mic.
   Worth folding into REL-001/RELEASE-EVIDENCE-001 device evidence rather than a
   code card.
2. If ~2.4 s per attempt feels sluggish, the lever is model size, not the
   wire: `benchmarks/speech/PROBE.md` measured the constrained aligner at
   identical accuracy on tiny/base/small for contrast features, so A/B
   whisper-ggml-tiny latency for dictation before assuming small is required.
3. If mic exercises ever leave the tailnet (public hosting), revisit
   authentication first — the bridge has no auth, only network placement.

## PoC location (throwaway, never on main)

Branch `spike/mic-browser-spike`, commit `26c1778`, worktree
`~/game-dev/LTS-spike-worktrees/lts-mic-spike` (unmerged; dispose with
`git worktree remove ... && git branch -D spike/mic-browser-spike`).
Files: `spike/mic-poc/cdp-mic-poc.mjs` (CDP driver: navigate real origin,
grant mic, capture 2 s, POST both fake take and real clip),
`result-tailnet-https.json` (full measurement JSON), `server-latency.log`
(curl timing split).
