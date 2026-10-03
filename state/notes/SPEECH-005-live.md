# SPEECH-005 — live native verification of the microphone path

Date: 2026-10-03

## What was verified

End-to-end on the built debug binary, driven through the real GUI with a
virtual microphone (ALSA loopback fed by `paplay` of a synthetic
vowel-like WAV; PipeWire default source pointed at the loopback input):

1. Onboarding "Enable microphone" → `microphone-enabled` setting.
2. Pronunciation tab → Record attempt → `getUserMedia` succeeds (mic
   source shows RUNNING in `pactl`), Stop and check → PCM captured,
   WAV built in JS, `pronunciation_check` invoked natively.
3. Result card renders the honest abstain: "We could not confidently
   match what we heard to the expected words" (synthetic tone is not
   speech; the engine abstains instead of inventing a score, per
   docs/05 confidence rules). No mastery evidence is written (grep of
   `evidence_events` shows only writing rows).

## Bugs found and fixed while verifying

- WebKitGTK denies webview permission requests unless the app answers
  them: added `on_permission_request` on the window builder (Microphone
  allowed — the UI gates it behind the explicit mic setting + privacy
  notice; everything else denied). Window is now built in `setup()`
  (`tauri.conf.json` `windows: []`).
- `recordAttempt` had no error handling (silent failure) and
  `stopAndCheck` never stopped the recorder. Fixed.
- WebKitGTK does not enable `MediaRecorder` (`NotSupportedError`), and
  the user-local webkit sysroot shipped without GStreamer, so audio
  decode/playback failed. Capture now uses WebAudio
  (`MediaStreamAudioSourceNode` + `ScriptProcessorNode`) straight to
  PCM/WAV — no MediaRecorder, no decode round-trip. GStreamer
  (core + base + good + pipewire plugin) was installed into the
  user-local sysroot and `GST_PLUGIN_PATH` is exported by
  `scripts/tauri-env.sh`.

## Remaining (owner-only)

Real-speech feedback quality (alignment, prosody bands) needs a human
speaker and calibrated review; cannot be self-certified.
