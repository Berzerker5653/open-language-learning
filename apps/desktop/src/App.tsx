import { useEffect, useState } from "react";
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
  const [route, setRoute] = useState<"practice" | "progress" | "pronunciation">("practice");
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

  async function createProfile() {
    if (inv) {
      const p = (await inv("create_profile", { displayName: profileName })) as {
        id: string;
        display_name: string;
      };
      setDisplayName(p.display_name);
    } else {
      setProfileId("local-dev-profile");
      setDisplayName(profileName);
    }
    setStep("packs");
  }

  async function install(id: string) {
    if (inv) await inv("install_pack", { packId: id });
    setInstalledPacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  async function finishOnboarding(micEnabled: boolean) {
    if (inv && profileId && selectedPack) {
      await inv("complete_onboarding", { profileId, packId: selectedPack, micEnabled });
      const home = (await inv("home_state", { profileId })) as {
        display_name: string;
        plan: SessionPlan;
      };
      setDisplayName(home.display_name);
      setPlan(home.plan);
      const envs = (await inv("world_state", { profileId })) as WorldEnvironment[];
      setEnvironments(envs);
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
    const b64 = (await inv("reference_audio", {
      packId: selectedPack ?? "org.openlanguage.ja-demo",
      unitId,
    })) as string;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
  }

  async function analyzeAttempt(blob: Blob) {
    if (attemptUrl) URL.revokeObjectURL(attemptUrl);
    setAttemptUrl(URL.createObjectURL(blob));
    const inv = detectInvoke();
    if (!inv) {
      setPronResult({ corrections: [], abstain_reason: "aligner-unavailable", pitch: EMPTY_PITCH });
      return;
    }
    try {
      const decoded = await new AudioContext().decodeAudioData(await blob.arrayBuffer());
      const pcm = decoded.getChannelData(0);
      const i16 = new Int16Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) {
        i16[i] = Math.max(-32767, Math.min(32767, Math.round((pcm[i] ?? 0) * 32767)));
      }
      const wav = toWav16(i16, decoded.sampleRate);
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
        abstain_reason: "abstained:decode-failed",
        pitch: EMPTY_PITCH,
      });
    }
  }

  function recordAttempt() {
    void (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void analyzeAttempt(new Blob(chunks, { type: rec.mimeType }));
      };
      setRecording(true);
      rec.start();
    })();
  }

  function stopAndCheck() {
    setRecording(false);
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
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      productName="Open Language Learning Platform"
      nav={[
        { id: "practice", label: "Practice" },
        { id: "progress", label: "Progress" },
        { id: "settings", label: "Settings" },
      ]}
    >
      {route === "pronunciation" ? (
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
      ) : route === "progress" ? (
        <ProgressView rows={progress} />
      ) : (
        <Home
          displayName={displayName}
          plan={plan}
          activeBudget={budget}
          onBudget={(m) => void changeBudget(m)}
          environments={environments}
        />
      )}
      <nav aria-label="Routes">
        <button type="button" onClick={() => setRoute("practice")}>
          Practice
        </button>
        <button type="button" onClick={() => void openProgress()}>
          Progress
        </button>
        <button type="button" onClick={() => setRoute("pronunciation")}>
          Pronunciation
        </button>
      </nav>
    </AppShell>
  );
}
