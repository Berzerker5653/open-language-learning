import { useEffect, useRef, useState } from "react";
import { AppShell } from "@openlang/ui";
import {
  Onboarding,
  type OnboardingStep,
  type PackCandidate,
  type PrivacyNotice,
} from "./onboarding";
import {
  Home,
  ProgressView,
  type ProgressRow,
  type SessionPlan,
  type WorldEnvironment,
} from "./home";
import { EMPTY_PITCH, PronunciationPractice, type PronunciationResult } from "./pronunciation";
import { LanguagePanel, type CatalogEntry, type InstalledPack } from "./language";
import { WritingPractice, type WritingTaskView } from "./writing";

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

/** Tauri IPC when running inside the native shell; null in plain
 * browser/vitest runs, where the flow stays purely local. */
function detectInvoke(): Invoke | null {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return (cmd, args) => import("@tauri-apps/api/core").then((m) => m.invoke(cmd, args));
  }
  return null;
}

const EMPTY_PLAN: SessionPlan = {
  items: [],
  total_seconds: 0,
  budget_minutes: 5,
  seed: 0,
  planner_version: "session-planner-0.1.0",
};

/** Mono 16-bit PCM WAV (the native command's audio envelope). */
function toWav16(samples: Int16Array, rate: number): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const wstr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  wstr(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  wstr(8, "WAVE");
  wstr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wstr(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, samples[i] ?? 0, true);
  return new Uint8Array(buf);
}

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
  return btoa(bin);
}

/**
 * Desktop UI host. UX-001 onboarding (privacy notice, local profile,
 * Japanese pack install, skippable microphone), then UX-002 home /
 * time-budget practice / capability progress. The smoke handshake
 * (BOOT-002) runs on mount regardless of route.
 */
export function App() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [route, setRoute] = useState<
    "practice" | "progress" | "pronunciation" | "writing" | "language"
  >("practice");
  const [notice, setNotice] = useState<PrivacyNotice>({
    title: "Your data stays on this device",
    points: [
      "Everything runs locally unless you enable an online provider.",
      "No account is required; profiles live on this device.",
    ],
  });
  const [packs, setPacks] = useState<PackCandidate[]>([]);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [budget, setBudget] = useState(5);
  const [plan, setPlan] = useState<SessionPlan>(EMPTY_PLAN);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [pronResult, setPronResult] = useState<PronunciationResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [attemptUrl, setAttemptUrl] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<WorldEnvironment[]>([]);
  const [installed, setInstalled] = useState<InstalledPack[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogStatus, setCatalogStatus] = useState("no-catalog-url");
  const [audioMsg, setAudioMsg] = useState<string | null>(null);
  const [langError, setLangError] = useState<string | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [writingTask, setWritingTask] = useState<WritingTaskView | null>(null);
  const [writingScaffold, setWritingScaffold] = useState<{
    reading?: string;
    romaji?: string;
  }>({});
  const [writingDraft, setWritingDraft] = useState("");
  const [writingGraded, setWritingGraded] = useState(false);
  const [writingCorrect, setWritingCorrect] = useState(false);
  const [writingUsedHint, setWritingUsedHint] = useState(false);
  const [writingError, setWritingError] = useState<string | null>(null);

  // The sticky header hides content when the page is scrolled; reset the
  // scroll position whenever the onboarding step or main route changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, route]);

  useEffect(() => {
    const inv = detectInvoke();
    if (!inv) return;
    void (async () => {
      const mode = (await inv("app_mode")) as { smoke: boolean };
      if (mode.smoke) {
        await inv("smoke_ack", { note: "home" });
        return;
      }
      setNotice((await inv("privacy_notice")) as PrivacyNotice);
      setPacks((await inv("available_packs")) as PackCandidate[]);
    })();
  }, []);

  const inv = detectInvoke();

  async function refreshLanguages() {
    if (!inv) return;
    setInstalled((await inv("installed_packs")) as InstalledPack[]);
    if (profileId) setActiveIds((await inv("active_pack", { profileId })) as string[]);
    const c = (await inv("catalog_packs")) as { entries: CatalogEntry[]; status: string };
    setCatalog(c.entries);
    setCatalogStatus(c.status);
  }

  async function switchLearning(packId: string) {
    if (!inv || !profileId) return;
    try {
      await inv("switch_pack", { profileId, packId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    }
    await refreshLanguages();
  }

  async function installCatalogPack(packId: string) {
    if (!inv) return;
    try {
      await inv("install_catalog_pack", { packId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    }
    await refreshLanguages();
  }

  async function importPack(dataB64: string) {
    if (!inv) return;
    try {
      await inv("import_pack", { dataB64 });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    }
    await refreshLanguages();
  }

  async function createProfile() {
    setOnboardError(null);
    if (inv) {
      try {
        const p = (await inv("create_profile", { displayName: profileName })) as {
          id: string;
          display_name: string;
        };
        setProfileId(p.id);
        setDisplayName(p.display_name);
      } catch (e) {
        setOnboardError(
          `Could not create the local profile: ${String(e)} You can try again; nothing was sent off this device.`,
        );
        return;
      }
    } else {
      setProfileId("local-dev-profile");
      setDisplayName(profileName);
    }
    setStep("packs");
  }

  async function install(id: string) {
    setOnboardError(null);
    if (inv) {
      try {
        await inv("install_pack", { packId: id });
      } catch (e) {
        setOnboardError(`Could not install that pack: ${String(e)}`);
        return;
      }
    }
    setInstalledPacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  async function finishOnboarding(micEnabled: boolean) {
    setOnboardError(null);
    if (inv && profileId && selectedPack) {
      try {
        await inv("complete_onboarding", { profileId, packId: selectedPack, micEnabled });
        const home = (await inv("home_state", { profileId })) as {
          display_name: string;
          plan: SessionPlan;
        };
        setDisplayName(home.display_name);
        setPlan(home.plan);
        const envs = (await inv("world_state", { profileId })) as WorldEnvironment[];
        setEnvironments(envs);
      } catch (e) {
        setOnboardError(`Setup could not be completed: ${String(e)}`);
        return;
      }
    }
    setStep("done");
  }

  async function changeBudget(minutes: number) {
    setBudget(minutes);
    if (inv && profileId) {
      setPlan((await inv("practice_plan", { profileId, minutes })) as SessionPlan);
    }
  }

  async function openProgress() {
    setRoute("progress");
    if (inv && profileId) {
      setProgress((await inv("progress_summary", { profileId })) as ProgressRow[]);
    }
  }

  // WRITE-001: typed production-writing practice. Grading and evidence
  // recording happen natively; hints are scaffolds recorded as support.
  async function openWriting() {
    setRoute("writing");
    setWritingError(null);
    setWritingDraft("");
    setWritingGraded(false);
    setWritingScaffold({});
    setWritingUsedHint(false);
    if (inv && profileId) {
      try {
        const t = (await inv("writing_task", { profileId })) as {
          item_id: string;
          prompt_text: string;
          answer_reading: string | null;
          answer_romaji: string | null;
        } | null;
        if (t) {
          setWritingTask({ item_id: t.item_id, prompt_text: t.prompt_text });
          setWritingScaffold({
            reading: t.answer_reading ?? undefined,
            romaji: t.answer_romaji ?? undefined,
          });
        } else {
          setWritingTask(null);
        }
      } catch (e) {
        setWritingTask(null);
        setWritingError(String(e));
      }
    } else {
      setWritingTask(null);
    }
  }

  function showWritingHint(kind: "reading" | "romaji") {
    setWritingUsedHint(true);
    setWritingTask((prev) =>
      prev
        ? {
            ...prev,
            reading_hint: kind === "reading" ? writingScaffold.reading : prev.reading_hint,
            romaji_hint: kind === "romaji" ? writingScaffold.romaji : prev.romaji_hint,
          }
        : prev,
    );
  }

  async function submitWriting() {
    if (!writingTask) return;
    setWritingError(null);
    if (inv && profileId) {
      try {
        const grade = (await inv("writing_submit", {
          profileId,
          itemId: writingTask.item_id,
          answer: writingDraft,
          usedHint: writingUsedHint,
        })) as { correct: boolean };
        setWritingCorrect(grade.correct);
        setWritingGraded(true);
      } catch (e) {
        setWritingError(String(e));
      }
    }
  }

  // SPEECH-005: guided pronunciation practice. The attempt blob lives in
  // memory only (docs/08); nothing audio is ever persisted.
  const DEMO_UNITS = {
    short_unit: "ja.lex.demo.obasan",
    long_unit: "ja.lex.demo.obaasan",
    short_text: "おばさん",
    long_text: "おばあさん",
  };

  function playBlobUrl(url: string) {
    const audio = new Audio(url);
    void audio.play();
  }

  async function playReference(which: "short" | "long") {
    const inv = detectInvoke();
    if (!inv) return;
    const unitId = which === "short" ? DEMO_UNITS.short_unit : DEMO_UNITS.long_unit;
    try {
      const b64 = (await inv("reference_audio", {
        packId: selectedPack ?? "org.openlanguage.ja-demo",
        unitId,
      })) as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      setAudioMsg(null);
      playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
    } catch {
      setAudioMsg(
        "No licensed audio is available for this item yet, and this build does not include speech synthesis. Text practice still works.",
      );
    }
  }

  async function analyzeWav(wav: Uint8Array) {
    const inv = detectInvoke();
    if (!inv) {
      setPronResult({ corrections: [], abstain_reason: "aligner-unavailable", pitch: EMPTY_PITCH });
      return;
    }
    try {
      const result = (await inv("pronunciation_check", {
        attempt: {
          pack_id: selectedPack ?? "org.openlanguage.ja-demo",
          ...DEMO_UNITS,
          wav_b64: toB64(wav),
        },
      })) as PronunciationResult;
      setPronResult(result);
    } catch {
      setPronResult({
        corrections: [],
        abstain_reason: "abstained:engine-error",
        pitch: EMPTY_PITCH,
      });
    }
  }

  // WebKitGTK does not enable MediaRecorder, so capture PCM directly via
  // WebAudio (enabled by default) and build the WAV in JS. The attempt
  // lives in memory only (docs/08); nothing audio is ever persisted.
  interface Capture {
    ctx: AudioContext;
    src: MediaStreamAudioSourceNode;
    proc: ScriptProcessorNode;
    stream: MediaStream;
    bufs: Float32Array[];
  }
  const captureRef = useRef<Capture | null>(null);

  function recordAttempt() {
    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        setAudioMsg(`Microphone unavailable: ${String(e)}`);
        return;
      }
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        const bufs: Float32Array[] = [];
        proc.onaudioprocess = (e) => bufs.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        src.connect(proc);
        proc.connect(ctx.destination);
        captureRef.current = { ctx, src, proc, stream, bufs };
        setAudioMsg(null);
        setRecording(true);
      } catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        setAudioMsg(`Audio capture is not supported here: ${String(e)}`);
      }
    })();
  }

  function stopAndCheck() {
    setRecording(false);
    const cap = captureRef.current;
    captureRef.current = null;
    if (!cap) return;
    cap.proc.onaudioprocess = null;
    cap.proc.disconnect();
    cap.src.disconnect();
    cap.stream.getTracks().forEach((t) => t.stop());
    const rate = cap.ctx.sampleRate;
    void cap.ctx.close();
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
    const wav = toWav16(i16, rate);
    if (attemptUrl) URL.revokeObjectURL(attemptUrl);
    setAttemptUrl(URL.createObjectURL(new Blob([wav], { type: "audio/wav" })));
    void analyzeWav(wav);
  }

  if (step !== "done") {
    return (
      <AppShell
        productName="Open Language Learning Platform"
        nav={[{ id: "onboarding", label: "Setup" }]}
      >
        <Onboarding
          step={step}
          notice={notice}
          packs={packs}
          selectedPack={selectedPack}
          installedPacks={installedPacks}
          profileName={profileName}
          onProfileName={setProfileName}
          onCreateProfile={() => void createProfile()}
          onSelectPack={setSelectedPack}
          onInstall={(id) => void install(id)}
          onEnableMic={() => void finishOnboarding(true)}
          onSkipMic={() => void finishOnboarding(false)}
          onContinue={() => setStep("microphone")}
          error={onboardError}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      productName="Open Language Learning Platform"
      nav={[]}
      routeNav={
        <nav aria-label="Routes" className="routes">
          <button
            type="button"
            className="tab"
            aria-current={route === "practice" ? "page" : undefined}
            onClick={() => setRoute("practice")}
          >
            Practice
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "progress" ? "page" : undefined}
            onClick={() => void openProgress()}
          >
            Progress
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "pronunciation" ? "page" : undefined}
            onClick={() => setRoute("pronunciation")}
          >
            Pronunciation
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "writing" ? "page" : undefined}
            onClick={() => void openWriting()}
          >
            Writing
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "language" ? "page" : undefined}
            onClick={() => {
              setRoute("language");
              void refreshLanguages();
            }}
          >
            Languages
          </button>
        </nav>
      }
    >
      {route === "pronunciation" ? (
        <>
          {audioMsg && (
            <p role="status" className="notice">
              {audioMsg}
            </p>
          )}
          <PronunciationPractice
            shortText={DEMO_UNITS.short_text}
            longText={DEMO_UNITS.long_text}
            result={pronResult}
            recording={recording}
            hasAttempt={attemptUrl !== null}
            onRecord={recordAttempt}
            onStop={stopAndCheck}
            onPlayReference={(w) => void playReference(w)}
            onPlayAttempt={() => attemptUrl && playBlobUrl(attemptUrl)}
          />
        </>
      ) : route === "progress" ? (
        <ProgressView rows={progress} />
      ) : route === "writing" ? (
        <>
          {writingError && (
            <p role="alert" className="alert">
              {writingError}
            </p>
          )}
          {writingTask ? (
            <WritingPractice
              task={writingTask}
              draft={writingDraft}
              graded={writingGraded}
              correct={writingCorrect}
              onDraft={setWritingDraft}
              onSubmit={() => void submitWriting()}
              onHint={showWritingHint}
            />
          ) : (
            <section aria-label="Writing practice">
              <h2>Writing practice</h2>
              <p className="empty">
                No new writing targets in this pack right now. Practice other activities to unlock
                more, or install a larger language pack.
              </p>
            </section>
          )}
        </>
      ) : route === "language" ? (
        <LanguagePanel
          installed={installed}
          activeIds={activeIds}
          catalog={catalog}
          catalogStatus={catalogStatus}
          error={langError}
          onSwitch={(id) => void switchLearning(id)}
          onInstallCatalog={(id) => void installCatalogPack(id)}
          onImport={(b64) => void importPack(b64)}
        />
      ) : (
        <Home
          displayName={displayName}
          plan={plan}
          activeBudget={budget}
          onBudget={(m) => void changeBudget(m)}
          environments={environments}
        />
      )}
    </AppShell>
  );
}
