/**
 * APP-SPLIT-003F: the audio capture & scoring wiring slice, moved out of
 * App() without behavior change. App.tsx still owns every hook holding
 * state and all render output; this module owns the bodies of the slice's
 * handlers (playBlobUrl, the pronunciation/dictation/free-speaking/free-
 * writing openers, prompt fetches, graded submits, and the
 * analyzeWav/analyzeDictation/analyzeSpeaking/analyzeFreeSpeaking scorers)
 * plus the slice's own two refs (captureOwner, captureRouteRef) and its
 * two device-release effects. Every line below is the code that previously
 * lived inline in App(), verbatim: the App-owned closure captures were
 * replaced by one explicit deps object, and the effect dep arrays are
 * unchanged. Zero behavior change.
 */
import { useEffect, useRef } from "react";
import type { OnboardingStep } from "../onboarding";
import type { InstalledPack } from "../language";
import type { PracticeTaskView } from "../practice";
import type { DictationResult, DictationSentence } from "../dictation";
import type { FreeSpeakingScore } from "../free-speaking";
import type {
  WritingCheckResult,
  WritingJournalEntry,
  WritingMeters,
  WritingPrompt,
} from "../free-writing";
import { EMPTY_PITCH, type PronunciationResult } from "../pronunciation";
import { audioFailureMessage } from "../speech-readiness";
import { playClip } from "../playback";
import { attachKaraokeClock } from "../word-timing";
import {
  CaptureOwner,
  captureLimitReached,
  MAX_CAPTURE_SECONDS,
  openMicrophone,
  type CaptureSessionLike,
} from "../capture";
import {
  detectInvoke,
  packAttemptRequest,
  packRequest,
  toB64,
  toWav16,
  type Invoke,
} from "./primitives";

/** Every dependency of the audio capture & scoring slice: plain render
 *  values + setters (App keeps owning the useState hooks). Mirrors exactly
 *  what the old inline closures in App() captured. */
export interface CaptureWiringDeps {
  inv: Invoke | null;
  profileId: string | null;
  selectedPack: string | null;
  route: string;
  step: OnboardingStep;
  installed: InstalledPack[];
  pronDemo: {
    short_unit: string;
    long_unit: string;
    short_text: string;
    long_text: string;
    contrast_id: string;
    feature_id: string;
    description: string;
    measure: string | null;
  } | null;
  micEnabled: boolean;
  micDevice: string | null;
  playbackDevice: string | null;
  dictTarget: string;
  dictOffset: number;
  freeOffset: number;
  freePrompt: DictationSentence | null;
  fwOffset: number;
  fwPrompt: WritingPrompt | null;
  fwText: string;
  fwSubmitting: boolean;
  practiceTask: PracticeTaskView | null;
  attemptUrl: string | null;
  setRoute: (v: "dictation" | "free-speaking" | "free-writing") => void;
  setClipPlaying: (v: boolean) => void;
  setPlaybackError: (v: string | null) => void;
  setAudioMsg: (v: string | null) => void;
  setPronResult: (v: PronunciationResult | null) => void;
  setDictResult: (v: DictationResult | null) => void;
  setDictSentence: (v: DictationSentence | null) => void;
  setDictTarget: (v: string) => void;
  setDictOffset: (v: number) => void;
  setPracticeSpeakCheck: (v: DictationResult | null) => void;
  setFreeOffset: (v: number) => void;
  setFreeResult: (v: FreeSpeakingScore | null) => void;
  setFreePrompt: (v: DictationSentence | null) => void;
  setFreePromptError: (v: string | null) => void;
  setFwOffset: (v: number) => void;
  setFwResult: (v: WritingCheckResult | null) => void;
  setFwCheckError: (v: string | null) => void;
  setFwPrompt: (v: WritingPrompt | null) => void;
  setFwPromptError: (v: string | null) => void;
  setFwJournal: (v: WritingJournalEntry[]) => void;
  setFwJournalError: (v: string | null) => void;
  setFwMeters: (v: WritingMeters | null) => void;
  setFwSubmitting: (v: boolean) => void;
  setRecording: (v: boolean) => void;
  setAttemptUrl: (v: string | null) => void;
  refreshMicrophones: () => Promise<void>;
}

export function useCaptureWiring(deps: CaptureWiringDeps) {
  const {
    inv,
    profileId,
    selectedPack,
    route,
    step,
    installed,
    pronDemo,
    micEnabled,
    micDevice,
    playbackDevice,
    dictTarget,
    dictOffset,
    freeOffset,
    freePrompt,
    fwOffset,
    fwPrompt,
    fwText,
    fwSubmitting,
    practiceTask,
    attemptUrl,
    setRoute,
    setClipPlaying,
    setPlaybackError,
    setAudioMsg,
    setPronResult,
    setDictResult,
    setDictSentence,
    setDictTarget,
    setDictOffset,
    setPracticeSpeakCheck,
    setFreeOffset,
    setFreeResult,
    setFreePrompt,
    setFreePromptError,
    setFwOffset,
    setFwResult,
    setFwCheckError,
    setFwPrompt,
    setFwPromptError,
    setFwJournal,
    setFwJournalError,
    setFwMeters,
    setFwSubmitting,
    setRecording,
    setAttemptUrl,
    refreshMicrophones,
  } = deps;

  function playBlobUrl(
    url: string,
    retained = false,
    opts?: { startAt?: number; stopAt?: number; onTime?: (t: number | null) => void },
  ) {
    const audio = new Audio(url);
    const settle = () => {
      setClipPlaying(false);
      opts?.onTime?.(null);
    };
    audio.addEventListener("ended", settle);
    audio.addEventListener("error", settle);
    // WORD-TIMING-001: the karaoke clock, and click-to-hear-word spans.
    // KARAOKE-CLOCK-001: the pump in word-timing.ts drives the clock from
    // currentTime at frame rate; timeupdate alone left the karaoke chip
    // dark in the real WebKitGTK webview (starved events on short clips).
    if (opts?.onTime) {
      attachKaraokeClock(audio, {
        onTime: opts.onTime,
        startAt: opts.startAt,
        stopAt: opts.stopAt,
      });
    }
    setClipPlaying(true);
    // K-88: honour this profile's output device. If the chosen device has
    // vanished or this webview refuses to route, the system default answers
    // and the clip still plays — one clip on the wrong speaker beats a
    // silent failure.
    if (playbackDevice) {
      const route = audio as HTMLMediaElement & {
        setSinkId?: (id: string) => Promise<void>;
      };
      if (typeof route.setSinkId === "function") {
        void route.setSinkId(playbackDevice).catch(() => {
          /* the system default answers for this clip */
        });
      }
    }
    // R14: URL lifetime and the learner-visible complaint live in `playClip`,
    // where they are testable without a webview: a one-shot clip is revoked
    // when the webview is done with it, a retained recording is not, and a
    // failure always reaches the learner instead of the console.
    playClip({
      url,
      retained,
      audio,
      revoke: (u) => URL.revokeObjectURL(u),
      onError: setPlaybackError,
      onClearError: () => setPlaybackError(null),
    });
  }

  async function playReference(which: "short" | "long") {
    const inv = detectInvoke();
    if (!inv) return;
    if (!pronDemo) return;
    const unitId = which === "short" ? pronDemo.short_unit : pronDemo.long_unit;
    try {
      const req = await packRequest<string>(inv, selectedPack, "reference_audio", { unitId });
      if (!req.ok) {
        setAudioMsg(audioFailureMessage(req.error));
        return;
      }
      const bytes = Uint8Array.from(atob(req.value), (c) => c.charCodeAt(0));
      setAudioMsg(null);
      playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
    } catch (e) {
      // K-78: no invented cause. The engine's sentence already names whose
      // media is missing (the installed pack version, O-05 republish rides
      // that gap) — repeat it verbatim, do not dress it in a second copy.
      setAudioMsg(`${audioFailureMessage(String(e))} Text practice still works.`);
    }
  }

  async function analyzeWav(wav: Uint8Array) {
    // K-11: in the shadowing route the recording is for self-comparison
    // only — no scorer exists, so nothing is analyzed (docs/05).
    if (route === "shadowing") return;
    const inv = detectInvoke();
    if (!inv || !pronDemo) {
      setPronResult({
        corrections: [],
        abstain_reason: "aligner-unavailable",
        pitch: EMPTY_PITCH,
        mode: "guided",
        mode_reason: "no-calibration-record",
      });
      return;
    }
    try {
      const req = await packAttemptRequest<PronunciationResult>(
        inv,
        selectedPack,
        "pronunciation_check",
        { ...pronDemo, wav_b64: toB64(wav) },
      );
      if (!req.ok) {
        setAudioMsg(req.error);
        return;
      }
      setPronResult(req.value);
    } catch {
      setPronResult({
        corrections: [],
        abstain_reason: "abstained:engine-error",
        pitch: EMPTY_PITCH,
        mode: "guided",
        mode_reason: "no-calibration-record",
      });
    }
  }

  async function analyzeDictation(wav: Uint8Array) {
    // A failed sentence fetch leaves no comparison target; comparing against
    // nothing would manufacture a mismatch verdict (U04). Hold instead.
    if (!dictTarget.trim()) {
      setAudioMsg("No sentence loaded yet — wait for one, or type your own above.");
      return;
    }
    const inv = detectInvoke();
    if (!inv) {
      setDictResult({
        matched: null,
        heard: "",
        target: dictTarget,
        abstain_reason: "aligner-unavailable",
        mode: "guided",
      });
      return;
    }
    try {
      const req = await packAttemptRequest<DictationResult>(inv, selectedPack, "dictation_check", {
        target_text: dictTarget,
        wav_b64: toB64(wav),
      });
      if (!req.ok) {
        setAudioMsg(req.error);
        return;
      }
      setDictResult(req.value);
    } catch {
      setDictResult({
        matched: null,
        heard: "",
        target: dictTarget,
        abstain_reason: "aligner-unavailable",
        mode: "guided",
      });
    }
  }

  // RU-MODALITY-PRACTICE-001: the guided-speaking card's clip is never
  // scored — the same posture as the shadowing early-return above, where
  // a recording belongs to a surface with no scorer. It goes to
  // `dictation_check` only so the engine's own abstention vocabulary can
  // answer (missing pack locale, missing model, rejected quality), and
  // the result lands in state that card alone renders (ADR-0017 decision 1).
  async function analyzeSpeaking(wav: Uint8Array) {
    const inv = detectInvoke();
    const target = practiceTask?.surface ?? "";
    if (!inv) {
      setPracticeSpeakCheck({
        matched: null,
        heard: "",
        target,
        abstain_reason: "aligner-unavailable",
        mode: "guided",
      });
      return;
    }
    try {
      const req = await packAttemptRequest<DictationResult>(inv, selectedPack, "dictation_check", {
        target_text: target,
        wav_b64: toB64(wav),
      });
      if (!req.ok) {
        setAudioMsg(req.error);
        return;
      }
      setPracticeSpeakCheck(req.value);
    } catch {
      setPracticeSpeakCheck({
        matched: null,
        heard: "",
        target,
        abstain_reason: "aligner-unavailable",
        mode: "guided",
      });
    }
  }

  async function fetchDictation(offset: number) {
    const inv = detectInvoke();
    if (!inv) return;
    // PRACTICE-GATE-001: the sentence pool is encounter-gated engine-side,
    // so the request names the profile it is generated for.
    if (!profileId) return;
    try {
      const req = await packRequest<DictationSentence>(inv, selectedPack, "dictation_target", {
        profileId,
        offset,
      });
      if (!req.ok) {
        setAudioMsg(req.error);
        setDictSentence(null);
        // An unavailable pool never leaves last pack's sentence behind as a
        // comparison target (U04); the record guard then holds.
        setDictTarget("");
        return;
      }
      setDictSentence(req.value);
      // Scripts with a reading field cue the learner with it; scripts without
      // (Russian) compare against the surface itself.
      setDictTarget(req.value.reading ?? req.value.text);
      setDictResult(null);
    } catch {
      setDictSentence(null);
      setDictTarget("");
    }
  }

  function openDictation() {
    setRoute("dictation");
    setDictOffset(0);
    void fetchDictation(0);
  }

  // SPEAK-PRACTICE-001: free-speaking opens with a prompt from the same
  // encounter-gated pool (`dictation_target`) and a cleared score. No write
  // exists on this route: the score is screen state only.
  function openFreeSpeaking() {
    setRoute("free-speaking");
    setFreeOffset(0);
    setFreeResult(null);
    void fetchFreePrompt(0);
  }

  function newFreePrompt() {
    const next = freeOffset + 1;
    setFreeOffset(next);
    setFreeResult(null);
    void fetchFreePrompt(next);
  }

  async function fetchFreePrompt(offset: number) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      const req = await packRequest<DictationSentence>(inv, selectedPack, "dictation_target", {
        profileId,
        offset,
      });
      if (!req.ok) {
        setFreePrompt(null);
        setFreePromptError(req.error);
        return;
      }
      setFreePrompt(req.value);
      setFreePromptError(null);
    } catch (e) {
      setFreePrompt(null);
      setFreePromptError(String(e));
    }
  }

  // WRITE-PRACTICE-001: free writing. The prompt comes from the encounter-
  // gated lexicon pool (same gate as dictation), the check is purely
  // mechanical/offline, and the journal + meters are accumulation surfaces
  // re-read after each attempt. This route performs NO mastery/scheduler
  // write: the Rust contract test pins the store, the journey denylist pins
  // the wire — the private journal rows are the only write.
  function openFreeWriting() {
    setRoute("free-writing");
    setFwOffset(0);
    setFwResult(null);
    setFwCheckError(null);
    void fetchWritingPrompt(0);
    void fetchWritingJournal();
  }

  function newWritingPrompt() {
    const next = fwOffset + 1;
    setFwOffset(next);
    setFwResult(null);
    void fetchWritingPrompt(next);
  }

  async function fetchWritingPrompt(offset: number) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      const req = await packRequest<WritingPrompt>(inv, selectedPack, "writing_prompt", {
        profileId,
        offset,
      });
      if (!req.ok) {
        setFwPrompt(null);
        setFwPromptError(req.error);
        return;
      }
      setFwPrompt(req.value);
      setFwPromptError(null);
    } catch (e) {
      setFwPrompt(null);
      setFwPromptError(String(e));
    }
  }

  async function fetchWritingJournal() {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      const rows = await inv("writing_journal", { profileId, limit: 20 });
      setFwJournal(rows as WritingJournalEntry[]);
      setFwJournalError(null);
    } catch (e) {
      // A failed read is an error, never the empty-state story (K-76/K-78).
      setFwJournal([]);
      setFwJournalError(`The writing journal could not be loaded: ${String(e)}`);
    }
  }

  async function fetchWritingMeters() {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setFwMeters((await inv("writing_meters", { profileId })) as WritingMeters);
    } catch {
      // The Progress strip abstains on a failed read; it never invents a zero.
      setFwMeters(null);
    }
  }

  async function submitFreeWriting() {
    const inv = detectInvoke();
    if (!inv || !profileId || fwSubmitting) return;
    setFwSubmitting(true);
    setFwCheckError(null);
    try {
      const req = await packAttemptRequest<WritingCheckResult>(inv, selectedPack, "writing_check", {
        profile_id: profileId,
        targets: (fwPrompt?.targets ?? []).map((t) => t.item_id),
        text: fwText,
      });
      if (!req.ok) {
        setFwCheckError(req.error);
        return;
      }
      setFwResult(req.value);
      // Journal and meters are accumulation surfaces: refresh once the check
      // lands so the screen never replays a pre-attempt snapshot.
      await fetchWritingJournal();
      await fetchWritingMeters();
    } catch (e) {
      setFwCheckError(String(e));
    } finally {
      setFwSubmitting(false);
    }
  }

  // The recording goes to `free_speaking_check` — the engine's own abstention
  // vocabulary answers (missing aligner, model off, rejected quality, dead
  // sidecar), and the result lands in state this screen alone renders. The
  // wire attempt carries no profile/content id: the guided-only invariant is
  // structural on the Rust side.
  async function analyzeFreeSpeaking(wav: Uint8Array) {
    const inv = detectInvoke();
    const target = freePrompt?.text ?? "";
    if (!target) {
      setAudioMsg("No prompt loaded yet — wait for one, or press New prompt.");
      return;
    }
    if (!inv) {
      setFreeResult({
        words: [],
        heard: "",
        target,
        score: null,
        abstain_reason: "aligner-unavailable",
        mode: "guided",
      });
      return;
    }
    try {
      const req = await packAttemptRequest<FreeSpeakingScore>(
        inv,
        selectedPack,
        "free_speaking_check",
        { target_text: target, wav_b64: toB64(wav) },
      );
      if (!req.ok) {
        setAudioMsg(req.error);
        return;
      }
      setFreeResult(req.value);
    } catch {
      setFreeResult({
        words: [],
        heard: "",
        target,
        score: null,
        abstain_reason: "aligner-unavailable",
        mode: "guided",
      });
    }
  }

  function newDictationSentence() {
    const next = dictOffset + 1;
    setDictOffset(next);
    void fetchDictation(next);
  }

  // WebKitGTK does not enable MediaRecorder, so capture PCM directly via
  // WebAudio (enabled by default) and build the WAV in JS. The attempt
  // lives in memory only (docs/08); the scoring engine stages it briefly in a
  // private temp dir it sweeps at startup — never uploaded, never kept.
  // L01: the recording is owned by `captureOwner`, so every way out of the
  // flow — Stop, navigation, profile change, microphone off, unmount — goes
  // through one place that hands the device back.
  interface Capture extends CaptureSessionLike {
    bufs: Float32Array[];
    rate: number;
  }
  const captureOwner = useRef(new CaptureOwner<Capture>()).current;
  const captureRouteRef = useRef<
    "pronunciation" | "dictation" | "free-speaking" | "practice-speaking"
  >("pronunciation");

  function recordAttempt() {
    void (async () => {
      let fallbackNote: string | null = null;
      let unsupported: string | null = null;
      // SETTINGS-001: the stored `microphone-enabled` setting is enforced
      // at the capture site — while it is off, getUserMedia is never
      // requested. (Without the native engine no setting exists.)
      if (inv && !micEnabled) {
        setAudioMsg(
          "The microphone is turned off, so the app will not ask for microphone access. You can turn it on in Settings; everything else works without a microphone.",
        );
        return;
      }
      let cap: Capture | null;
      try {
        cap = await captureOwner.begin(async () => {
          // K-64: record from the device this profile chose, when it chose one.
          const opened = await openMicrophone(navigator.mediaDevices, micDevice);
          // A successful grant is also when the browser starts naming devices,
          // so the Settings picker fills up without a restart.
          await refreshMicrophones();
          fallbackNote = opened.fellBack
            ? "Your saved microphone was not available, so this recording used the system default. Pick it again in Settings."
            : null;
          const ctx = new AudioContext();
          try {
            const src = ctx.createMediaStreamSource(opened.stream);
            const proc = ctx.createScriptProcessor(4096, 1, 1);
            const bufs: Float32Array[] = [];
            const rate = ctx.sampleRate;
            let closed = false;
            proc.onaudioprocess = (e) => {
              if (closed) return;
              bufs.push(new Float32Array(e.inputBuffer.getChannelData(0)));
              // L01: a recording nobody stops still has to end. The limit
              // path runs the same stop control the learner would press, so
              // the frames stop growing and the attempt is reported.
              if (captureLimitReached(bufs.length, 4096, rate)) stopAtLimit();
            };
            src.connect(proc);
            proc.connect(ctx.destination);
            return {
              bufs,
              rate,
              close: () => {
                if (closed) return;
                closed = true;
                proc.onaudioprocess = null;
                proc.disconnect();
                src.disconnect();
                opened.stream.getTracks().forEach((t) => t.stop());
                void ctx.close();
              },
            };
          } catch (e) {
            // The graph failed after the device was granted: hand the device
            // back before reporting, and name what actually failed.
            opened.stream.getTracks().forEach((t) => t.stop());
            void ctx.close();
            unsupported = `Audio capture is not supported here: ${String(e)}`;
            throw e;
          }
        });
      } catch (e) {
        setAudioMsg(unsupported ?? `Microphone unavailable: ${String(e)}`);
        return;
      }
      if (!cap) {
        // L01: the learner left, switched profile or turned the microphone
        // off while the browser was still deciding. The grant that arrived
        // afterwards was closed by the owner instead of starting a recording
        // on a screen nobody is looking at.
        return;
      }
      setAudioMsg(fallbackNote);
      setRecording(true);
    })();
  }

  /** L01: the duration bound fired. End the recording the way the Stop
   *  control does, and say why it ended. */
  function stopAtLimit() {
    if (!captureOwner.active()) return;
    setAudioMsg(`That recording stopped on its own at the ${MAX_CAPTURE_SECONDS}-second limit.`);
    stopAndCheck();
  }

  function stopAndCheck() {
    setRecording(false);
    const cap = captureOwner.finish();
    if (!cap) return;
    // L01: giving the device back is not optional on any path.
    cap.close();
    const total = cap.bufs.reduce((n, b) => n + b.length, 0);
    const pcm = new Float32Array(total);
    let off = 0;
    for (const b of cap.bufs) {
      pcm.set(b, off);
      off += b.length;
    }
    const i16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      i16[i] = Math.max(-32767, Math.min(32767, Math.round((pcm[i] ?? 0) * 32767)));
    }
    const wav = toWav16(i16, cap.rate);
    if (attemptUrl) URL.revokeObjectURL(attemptUrl);
    setAttemptUrl(URL.createObjectURL(new Blob([wav], { type: "audio/wav" })));
    if (captureRouteRef.current === "dictation") {
      void analyzeDictation(wav);
    } else if (captureRouteRef.current === "free-speaking") {
      void analyzeFreeSpeaking(wav);
    } else if (captureRouteRef.current === "practice-speaking") {
      void analyzeSpeaking(wav);
    } else {
      void analyzeWav(wav);
    }
  }

  // L01: capture belongs to the flow that opened it. Leaving the screen
  // (route/step), switching or leaving the profile, changing installed packs,
  // or turning the microphone off abandons an in-flight recording: the device
  // is released and the frames dropped, so nothing audio survives its screen
  // and no audio state carries into the next profile.
  useEffect(() => {
    captureOwner.cancel();
    setRecording(false);
    setAudioMsg(null);
  }, [captureOwner, profileId, micEnabled, route, step, installed]);

  // The same release when the app itself goes away (window closed, the
  // profile list swapped the tree out).
  useEffect(() => () => captureOwner.cancel(), [captureOwner]);

  return {
    playBlobUrl,
    recordAttempt,
    stopAndCheck,
    openDictation,
    openFreeSpeaking,
    newFreePrompt,
    openFreeWriting,
    newWritingPrompt,
    submitFreeWriting,
    newDictationSentence,
    playReference,
    captureRouteRef,
  };
}
