import { useEffect, useRef, useState } from "react";
import { AppShell } from "@openlang/ui";
import {
  Onboarding,
  type OnboardingStep,
  type PackCandidate,
  type PrivacyNotice,
  type ProfileSummary,
} from "./onboarding";
import {
  Home,
  type PlannedItem,
  ProgressView,
  type ProgressRow,
  type SessionPlan,
  type WorldEnvironment,
} from "./home";
import { EMPTY_PITCH, PronunciationPractice, type PronunciationResult } from "./pronunciation";
import { LanguagePanel, type CatalogEntry, type InstalledPack } from "./language";
import { WritingPractice, type WritingTaskView } from "./writing";
import { PracticeRunner, type PracticeTaskView } from "./practice";
import {
  ScenarioPanel,
  type ScenarioOutcomeView,
  type ScenarioStepResult,
  type ScenarioSummaryView,
  type ScenarioView,
} from "./scenario";

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
function toWav16(samples: Int16Array, rate: number): Uint8Array<ArrayBuffer> {
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
    | "practice"
    | "progress"
    | "pronunciation"
    | "writing"
    | "language"
    | "scenarios"
    | "shadowing"
    | "reading"
    | "words"
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
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
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
  const [practiceTarget, setPracticeTarget] = useState<{
    contentId: string;
    modality: string;
  } | null>(null);
  const [practiceTask, setPracticeTask] = useState<PracticeTaskView | null>(null);
  const [practiceGraded, setPracticeGraded] = useState(false);
  const [practiceCorrect, setPracticeCorrect] = useState(false);
  const [practiceCorrectChoice, setPracticeCorrectChoice] = useState("");
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [practiceRevealed, setPracticeRevealed] = useState(false);
  const [scenarioList, setScenarioList] = useState<ScenarioSummaryView[]>([]);
  const [scenarioActive, setScenarioActive] = useState<ScenarioView | null>(null);
  const [scenarioStep, setScenarioStep] = useState<ScenarioStepResult | null>(null);
  const [scenarioOutcome, setScenarioOutcome] = useState<ScenarioOutcomeView | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [practiceAudio, setPracticeAudio] = useState<{ wavB64: string; source: string } | null>(
    null,
  );
  const [practiceAudioError, setPracticeAudioError] = useState<string | null>(null);

  const [practiceDraft, setPracticeDraft] = useState("");
  // The sticky header hides content when the page is scrolled; reset the
  // scroll position whenever the onboarding step or main route changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, route]);
  const [shadowItems, setShadowItems] = useState<
    { content_id: string; surface: string; reading: string | null; romaji: string | null }[]
  >([]);
  const [shadowIdx, setShadowIdx] = useState(0);
  const [storyList, setStoryList] = useState<
    { id: string; title: string; description: string | null; sentence_count: number }[]
  >([]);
  const [storyActive, setStoryActive] = useState<{
    id: string;
    title: string;
    sentences: {
      content_id: string;
      text: string;
      furigana: string | null;
      romaji: string | null;
      faded_by_mastery: boolean;
      gloss: string | null;
      known: {
        id: string;
        surface: string;
        reading: string | null;
        romaji: string | null;
        gloss: string;
      }[];
    }[];
  } | null>(null);
  const [storyLookup, setStoryLookup] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [mineItems, setMineItems] = useState<
    {
      id: string;
      surface: string;
      reading: string | null;
      gloss: string | null;
      source_citation: string;
      created_at: string;
      due_at: string | null;
    }[]
  >([]);
  const [mineSurface, setMineSurface] = useState("");
  const [mineReading, setMineReading] = useState("");
  const [mineGloss, setMineGloss] = useState("");
  const [mineSource, setMineSource] = useState("");
  const [mineError, setMineError] = useState<string | null>(null);
  const [mineReview, setMineReview] = useState<{
    item: (typeof mineItems)[number];
    revealed: boolean;
  } | null>(null);
  const [shadowError, setShadowError] = useState<string | null>(null);

  useEffect(() => {
    const inv = detectInvoke();
    if (!inv) return;
    void (async () => {
      const mode = (await inv("app_mode")) as { smoke: boolean };
      if (mode.smoke) {
        await inv("smoke_ack", { note: "home" });
        return;
      }
      // K-05: restart resumes an existing profile instead of re-running
      // onboarding (FIRST-LESSON known limit). This runs first: a pack
      // or notice failure must never strand a returning learner back at
      // the wizard.
      const ps = (await inv("list_profiles")) as ProfileSummary[];
      if (ps.length > 0) {
        setProfiles(ps);
        setStep("resume");
      }
      try {
        setNotice((await inv("privacy_notice")) as PrivacyNotice);
        setPacks((await inv("available_packs")) as PackCandidate[]);
      } catch {
        /* defaults render; onboarding install step will surface errors */
      }
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

  // K-05: resume an existing local profile at launch. The native side
  // validates the id; nothing is sent off this device.
  async function resumeProfile(id: string) {
    setOnboardError(null);
    if (!inv) return;
    try {
      const p = (await inv("resume_profile", { profileId: id })) as ProfileSummary;
      setProfileId(p.id);
      setDisplayName(p.display_name);
      const home = (await inv("home_state", { profileId: p.id })) as {
        display_name: string;
        plan: SessionPlan;
      };
      setDisplayName(home.display_name);
      setPlan(home.plan);
      const envs = (await inv("world_state", { profileId: p.id })) as WorldEnvironment[];
      setEnvironments(envs);
      setStep("done");
    } catch (e) {
      setOnboardError(`Could not resume this profile: ${String(e)}`);
    }
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

  // UX-003: first lessons. Plan items are runnable; grading, evidence,
  // and scheduling happen natively.
  async function openPractice(item: PlannedItem) {
    setPracticeError(null);
    setPracticeGraded(false);
    setPracticeCorrectChoice("");
    setPracticeRevealed(false);
    setPracticeTarget({ contentId: item.content_id, modality: item.modality });
    if (inv && profileId) {
      setPracticeAudio(null);
      setPracticeAudioError(null);
      try {
        const task = (await inv("practice_task", {
          profileId,
          contentId: item.content_id,
          modality: item.modality,
          revealReading: false,
        })) as PracticeTaskView;
        setPracticeTask(task);
        if (
          item.modality === "comprehension-listening" ||
          item.modality === "phonological-discrimination" ||
          item.modality === "orthographic-encoding"
        ) {
          try {
            const a = (await inv(
              item.modality === "phonological-discrimination"
                ? "contrast_audio"
                : item.modality === "orthographic-encoding"
                  ? "dictation_audio"
                  : "listening_audio",
              {
                profileId,
                contentId: item.content_id,
              },
            )) as { wav_b64: string; source: string };
            setPracticeAudio({ wavB64: a.wav_b64, source: a.source });
          } catch (e) {
            setPracticeAudioError(
              `No audio is available for this item yet (${String(e)}). Try again after installing a speech model, or practice other activities.`,
            );
          }
        }
      } catch (e) {
        setPracticeTask(null);
        setPracticeError(String(e));
      }
    } else {
      setPracticeTask(null);
    }
  }

  async function choosePractice(index: number) {
    if (!practiceTarget || !inv || !profileId) return;
    try {
      const g = (await inv("practice_submit", {
        profileId,
        contentId: practiceTarget.contentId,
        modality: practiceTarget.modality,
        choiceIndex: index,
        revealReading: practiceRevealed,
      })) as { correct: boolean; correct_choice: string };
      setPracticeCorrect(g.correct);
      setPracticeCorrectChoice(g.correct_choice);
      setPracticeGraded(true);
    } catch (e) {
      setPracticeError(String(e));
    }
  }

  // K-12: typed grading. The draft goes native; the expected string was
  // never sent to the UI, so cloze/dictation evidence stays honest.
  async function checkPractice() {
    if (!practiceTarget || !inv || !profileId) return;
    try {
      const g = (await inv("practice_submit", {
        profileId,
        contentId: practiceTarget.contentId,
        modality: practiceTarget.modality,
        choiceIndex: 0,
        answer: practiceDraft,
        revealReading: practiceRevealed,
      })) as { correct: boolean; correct_choice: string };
      setPracticeCorrect(g.correct);
      setPracticeCorrectChoice(g.correct_choice);
      setPracticeGraded(true);
    } catch (e) {
      setPracticeError(String(e));
    }
  }

  async function finishPractice() {
    setPracticeTarget(null);
    setPracticeTask(null);
    setPracticeAudio(null);
    setPracticeAudioError(null);
    setPracticeDraft("");
    setPracticeRevealed(false);
    if (inv && profileId) {
      setPlan((await inv("practice_plan", { profileId, minutes: budget })) as SessionPlan);
    }
  }

  function playPracticeAudio() {
    if (!practiceAudio) return;
    const bytes = Uint8Array.from(atob(practiceAudio.wavB64), (c) => c.charCodeAt(0));
    playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
  }

  // K-11: shadowing is a formative speak-along loop — play the model,
  // speak, play your own recording back. No analysis, no evidence.
  async function openShadowing() {
    setRoute("shadowing");
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setShadowItems(
        (await inv("shadowing_items", { profileId })) as {
          content_id: string;
          surface: string;
          reading: string | null;
          romaji: string | null;
        }[],
      );
      setShadowIdx(0);
      setShadowError(null);
    } catch (e) {
      setShadowError(String(e));
    }
  }

  async function playShadowModel() {
    const inv = detectInvoke();
    const item = shadowItems[shadowIdx];
    if (!inv || !item) return;
    try {
      const a = (await inv("speech_audio", {
        packId: selectedPack ?? "org.openlanguage.ja-demo",
        unitId: item.content_id,
        text: item.surface,
      })) as { wav_b64: string; source: string };
      setAudioMsg(null);
      const bytes = Uint8Array.from(atob(a.wav_b64), (c) => c.charCodeAt(0));
      playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
    } catch (e) {
      setAudioMsg(`No model audio is available for this item yet (${String(e)}).`);
    }
  }

  const shadowCurrent = shadowItems[shadowIdx] ?? null;

  // K-13: graded reading — formative input practice. No scoring, no
  // evidence; scaffolds fade by mastery natively, audio is media-first.
  async function openReading() {
    setRoute("reading");
    setStoryActive(null);
    setStoryLookup(null);
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setStoryList((await inv("story_list", { profileId })) as typeof storyList);
      setStoryError(null);
    } catch (e) {
      setStoryError(String(e));
    }
  }

  async function openStory(id: string) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setStoryActive((await inv("story_view", { profileId, storyId: id })) as typeof storyActive);
      setStoryLookup(null);
      setStoryError(null);
    } catch (e) {
      setStoryError(String(e));
    }
  }

  async function playStoryAudio(sentenceId: string) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      const a = (await inv("story_audio", { profileId, sentenceId })) as {
        wav_b64: string;
        source: string;
      };
      const bytes = Uint8Array.from(atob(a.wav_b64), (c) => c.charCodeAt(0));
      playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
    } catch (e) {
      setStoryError(`No audio is available for this sentence yet (${String(e)}).`);
    }
  }

  // K-14: learner-owned lexicon. Mined words are device-local, cited,
  // and scheduled by their own SRS rows — never mastery evidence.
  async function refreshMine() {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setMineItems((await inv("mine_list", { profileId })) as typeof mineItems);
      setMineError(null);
    } catch (e) {
      setMineError(String(e));
    }
  }

  async function openWords() {
    setRoute("words");
    setMineReview(null);
    await refreshMine();
  }

  async function addMine(sourceCitation?: string) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      await inv("mine_add", {
        profileId,
        surface: mineSurface,
        reading: mineReading || null,
        gloss: mineGloss || null,
        sourceCitation: (sourceCitation ?? mineSource) || "manual",
      });
      setMineSurface("");
      setMineReading("");
      setMineGloss("");
      setMineSource("");
      await refreshMine();
    } catch (e) {
      setMineError(String(e));
    }
  }

  async function mineFromStory(surface: string, reading: string | null, gloss: string) {
    const inv = detectInvoke();
    if (!inv || !profileId || !storyActive) return;
    try {
      await inv("mine_add", {
        profileId,
        surface,
        reading,
        gloss,
        sourceCitation: storyActive.id,
      });
      await refreshMine();
    } catch (e) {
      setStoryError(String(e));
    }
  }

  async function removeMine(id: string) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      await inv("mine_remove", { profileId, itemId: id });
      await refreshMine();
    } catch (e) {
      setMineError(String(e));
    }
  }

  async function gradeMine(again: boolean) {
    const inv = detectInvoke();
    if (!inv || !profileId || !mineReview) return;
    try {
      await inv("mine_grade", { profileId, itemId: mineReview.item.id, again });
      setMineReview(null);
      await refreshMine();
    } catch (e) {
      setMineError(String(e));
    }
  }

  function startMineReview() {
    const now = new Date().toISOString();
    const due = mineItems.find((m) => m.due_at !== null && m.due_at <= now);
    if (due) setMineReview({ item: due, revealed: false });
  }

  // READ-001: revealing a faded scaffold refetches the task with the
  // reading shown; the submit then records it as support (level 3).
  async function revealPracticeReading() {
    if (!practiceTarget || !inv || !profileId) return;
    setPracticeRevealed(true);
    try {
      const task = (await inv("practice_task", {
        profileId,
        contentId: practiceTarget.contentId,
        modality: practiceTarget.modality,
        revealReading: true,
      })) as PracticeTaskView;
      setPracticeTask(task);
    } catch (e) {
      setPracticeError(String(e));
    }
  }

  // K-01: scenario sessions. The dialogue graph, intents, recovery,
  // ladder, and transfers all come from pack data via the native
  // runtime; the UI only sends ids and intent labels.
  async function openScenarios() {
    setRoute("scenarios");
    setScenarioActive(null);
    setScenarioStep(null);
    setScenarioOutcome(null);
    setScenarioError(null);
    if (inv && profileId) {
      try {
        setScenarioList((await inv("scenario_list", { profileId })) as ScenarioSummaryView[]);
      } catch (e) {
        setScenarioList([]);
        setScenarioError(String(e));
      }
    }
  }

  async function startScenario(scenarioId: string) {
    if (!inv || !profileId) return;
    setScenarioError(null);
    setScenarioOutcome(null);
    setScenarioStep(null);
    try {
      setScenarioActive((await inv("scenario_start", { profileId, scenarioId })) as ScenarioView);
    } catch (e) {
      setScenarioError(String(e));
    }
  }

  async function attemptScenario(intent: string) {
    if (!inv || !profileId || !scenarioActive) return;
    setScenarioError(null);
    try {
      const step = (await inv("scenario_attempt", {
        profileId,
        scenarioId: scenarioActive.scenario_id,
        intent,
      })) as ScenarioStepResult & { view: ScenarioView };
      setScenarioStep({ result: step.result, recovery: step.recovery, completed: step.completed });
      setScenarioActive(step.view);
    } catch (e) {
      setScenarioError(String(e));
    }
  }

  async function supportScenario(level: number) {
    if (!inv || !profileId || !scenarioActive) return;
    setScenarioError(null);
    try {
      setScenarioActive(
        (await inv("scenario_support", {
          profileId,
          scenarioId: scenarioActive.scenario_id,
          level,
        })) as ScenarioView,
      );
    } catch (e) {
      setScenarioError(String(e));
    }
  }

  async function recoveryScenario(recoveryId: string) {
    if (!inv || !profileId || !scenarioActive) return;
    setScenarioError(null);
    setScenarioStep(null);
    try {
      setScenarioActive(
        (await inv("scenario_recovery", {
          profileId,
          scenarioId: scenarioActive.scenario_id,
          recoveryId,
        })) as ScenarioView,
      );
    } catch (e) {
      setScenarioError(String(e));
    }
  }

  async function transferScenario(variantId: string) {
    if (!inv || !profileId || !scenarioActive) return;
    setScenarioError(null);
    try {
      setScenarioActive(
        (await inv("scenario_transfer", {
          profileId,
          scenarioId: scenarioActive.scenario_id,
          variantId,
        })) as ScenarioView,
      );
    } catch (e) {
      setScenarioError(String(e));
    }
  }

  async function finishScenario() {
    if (!inv || !profileId || !scenarioActive) return;
    setScenarioError(null);
    try {
      setScenarioOutcome(
        (await inv("scenario_finish", {
          profileId,
          scenarioId: scenarioActive.scenario_id,
        })) as ScenarioOutcomeView,
      );
      setScenarioActive(null);
      setScenarioStep(null);
      setScenarioList((await inv("scenario_list", { profileId })) as ScenarioSummaryView[]);
    } catch (e) {
      setScenarioError(String(e));
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
    // K-11: in the shadowing route the recording is for self-comparison
    // only — no scorer exists, so nothing is analyzed (docs/05).
    if (route === "shadowing") return;
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
          profiles={profiles}
          onResume={(id) => void resumeProfile(id)}
          onCreateNew={() => setStep("welcome")}
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
          <button
            type="button"
            className="tab"
            aria-current={route === "scenarios" ? "page" : undefined}
            onClick={() => void openScenarios()}
          >
            Scenarios
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "shadowing" ? "page" : undefined}
            onClick={() => void openShadowing()}
          >
            Shadowing
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "reading" ? "page" : undefined}
            onClick={() => void openReading()}
          >
            Reading
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "words" ? "page" : undefined}
            onClick={() => void openWords()}
          >
            My Words
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
      ) : route === "shadowing" ? (
        <section aria-label="Shadowing">
          <h2>Shadowing</h2>
          <p className="empty">
            Play the model audio, speak along with it, then play your recording back. Shadowing is
            formative practice: nothing is scored or saved.
          </p>
          {shadowError && (
            <p role="alert" className="alert">
              {shadowError}
            </p>
          )}
          {audioMsg && (
            <p role="status" className="notice">
              {audioMsg}
            </p>
          )}
          {!shadowCurrent ? (
            <p className="empty">No shadowing targets are available in this pack yet.</p>
          ) : (
            <>
              <p className="surface">{shadowCurrent.surface}</p>
              {(shadowCurrent.reading ?? shadowCurrent.romaji) && (
                <p className="reading">{shadowCurrent.reading ?? shadowCurrent.romaji}</p>
              )}
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => void playShadowModel()}>
                  Play model audio
                </button>
                {!recording ? (
                  <button type="button" className="btn" onClick={recordAttempt}>
                    Record
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={stopAndCheck}>
                    Stop
                  </button>
                )}
                {attemptUrl && (
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => playBlobUrl(attemptUrl)}
                  >
                    Play my recording
                  </button>
                )}
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={shadowIdx === 0}
                  onClick={() => setShadowIdx((i) => Math.max(0, i - 1))}
                >
                  Previous
                </button>
                <span>
                  {shadowIdx + 1} / {shadowItems.length}
                </span>
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={shadowIdx >= shadowItems.length - 1}
                  onClick={() => setShadowIdx((i) => Math.min(shadowItems.length - 1, i + 1))}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      ) : route === "reading" ? (
        <section aria-label="Graded reading">
          <h2>{storyActive ? storyActive.title : "Graded reading"}</h2>
          <p className="empty">
            Read along at your level. Tapping a sentence plays its audio and looks up the words from
            your pack that appear in it. Reading is formative: nothing is scored or saved.
          </p>
          {storyError && (
            <p role="alert" className="alert">
              {storyError}
            </p>
          )}
          {!storyActive ? (
            storyList.length === 0 ? (
              <p className="empty">No stories are available in this pack yet.</p>
            ) : (
              <div role="group" aria-label="Stories" className="btn-row">
                {storyList.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => void openStory(s.id)}
                  >
                    {s.title} ({s.sentence_count})
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <div className="btn-row">
                <button type="button" className="btn btn--quiet" onClick={() => void openReading()}>
                  All stories
                </button>
              </div>
              {storyActive.sentences.map((s) => (
                <div key={s.content_id} className="field">
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => {
                      setStoryLookup(storyLookup === s.content_id ? null : s.content_id);
                      void playStoryAudio(s.content_id);
                    }}
                  >
                    {s.furigana && (
                      <small>
                        {s.furigana}
                        <br />
                      </small>
                    )}
                    {s.text}
                  </button>
                  {s.romaji && (
                    <p aria-label="Romaji">
                      <small>{s.romaji}</small>
                    </p>
                  )}
                  {storyLookup === s.content_id && (
                    <div aria-label="Word lookup">
                      {s.gloss && <p className="notice">{s.gloss}</p>}
                      {s.known.length === 0 ? (
                        <p className="empty">No pack words match this sentence yet.</p>
                      ) : (
                        <ul>
                          {s.known.map((w) => (
                            <li key={w.id}>
                              {w.surface}
                              {w.reading ? ` (${w.reading})` : ""}
                              {w.romaji ? ` ${w.romaji}` : ""} — {w.gloss}
                              {"  "}
                              <button
                                type="button"
                                className="btn btn--quiet"
                                onClick={() => void mineFromStory(w.surface, w.reading, w.gloss)}
                              >
                                Mine
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </section>
      ) : route === "words" ? (
        <section aria-label="My words">
          <h2>My words</h2>
          <p className="empty">
            Words you chose to keep, with where you met them. Reviews are self-graded and stay on
            this device; they never count as mastery evidence.
          </p>
          {mineError && (
            <p role="alert" className="alert">
              {mineError}
            </p>
          )}
          {mineReview ? (
            <div className="field">
              <p className="prompt">{mineReview.item.surface}</p>
              {mineReview.revealed ? (
                <>
                  <p>{mineReview.item.gloss ?? mineReview.item.reading ?? "(no gloss)"}</p>
                  <p className="notice">Met in: {mineReview.item.source_citation}</p>
                  <div className="btn-row">
                    <button type="button" className="btn" onClick={() => void gradeMine(false)}>
                      I knew it
                    </button>
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => void gradeMine(true)}
                    >
                      Again
                    </button>
                  </div>
                </>
              ) : (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => setMineReview({ ...mineReview, revealed: true })}
                  >
                    Reveal
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={startMineReview}>
                Review due words
              </button>
            </div>
          )}
          <div className="field">
            <label htmlFor="mine-surface">Word or phrase</label>
            <input
              id="mine-surface"
              value={mineSurface}
              onChange={(e) => setMineSurface(e.target.value)}
            />
            <label htmlFor="mine-reading">Reading (optional)</label>
            <input
              id="mine-reading"
              value={mineReading}
              onChange={(e) => setMineReading(e.target.value)}
            />
            <label htmlFor="mine-gloss">Meaning (optional)</label>
            <input
              id="mine-gloss"
              value={mineGloss}
              onChange={(e) => setMineGloss(e.target.value)}
            />
            <label htmlFor="mine-source">Where did you meet it? (citation)</label>
            <input
              id="mine-source"
              value={mineSource}
              onChange={(e) => setMineSource(e.target.value)}
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={mineSurface.trim() === ""}
                onClick={() => void addMine()}
              >
                Add to my words
              </button>
            </div>
          </div>
          {mineItems.length === 0 ? (
            <p className="empty">Nothing mined yet. Add a word above or from a story lookup.</p>
          ) : (
            <ul>
              {mineItems.map((m) => (
                <li key={m.id}>
                  {m.surface}
                  {m.reading ? ` (${m.reading})` : ""}
                  {m.gloss ? ` — ${m.gloss}` : ""}
                  {"  ·  "}
                  <small>
                    {m.source_citation}
                    {m.due_at ? ` · due ${m.due_at.slice(0, 10)}` : " · not scheduled yet"}
                  </small>
                  {"  "}
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => void removeMine(m.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
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
      ) : route === "scenarios" ? (
        <ScenarioPanel
          scenarios={scenarioList}
          active={scenarioActive}
          lastStep={scenarioStep}
          outcome={scenarioOutcome}
          error={scenarioError}
          onStart={(id) => void startScenario(id)}
          onAttempt={(intent) => void attemptScenario(intent)}
          onSupport={(level) => void supportScenario(level)}
          onRecovery={(id) => void recoveryScenario(id)}
          onTransfer={(id) => void transferScenario(id)}
          onFinish={() => void finishScenario()}
          onBack={() => void openScenarios()}
        />
      ) : practiceTarget && practiceTask ? (
        <>
          {practiceError && (
            <p role="alert" className="alert">
              {practiceError}
            </p>
          )}
          <PracticeRunner
            task={practiceTask}
            graded={practiceGraded}
            correct={practiceCorrect}
            correctChoice={practiceCorrectChoice}
            audioSource={
              practiceAudio ? (practiceAudio.source as "licensed-recording" | "model-output") : null
            }
            audioError={practiceAudioError}
            onChoose={(i) => void choosePractice(i)}
            onNext={() => void finishPractice()}
            onPlayAudio={playPracticeAudio}
            heading={
              practiceTarget.modality === "orthography-recognition"
                ? "Which one matches?"
                : practiceTarget.modality === "production-writing"
                  ? "Fill in the blank"
                  : undefined
            }
            draft={practiceDraft}
            onDraft={setPracticeDraft}
            onCheck={() => void checkPractice()}
            revealed={practiceRevealed}
            onReveal={
              practiceTarget.modality === "orthography-recognition" ||
              practiceTarget.modality === "phonological-discrimination" ||
              practiceTarget.modality === "production-writing" ||
              practiceTarget.modality === "orthographic-encoding"
                ? undefined
                : () => void revealPracticeReading()
            }
          />
        </>
      ) : practiceTarget ? (
        <section aria-label="Practice">
          <p className="empty">
            This activity has no practice runner yet.
            {practiceError ? ` ${practiceError}` : ""}
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => setPracticeTarget(null)}
            >
              Back to plan
            </button>
          </div>
        </section>
      ) : (
        <Home
          displayName={displayName}
          plan={plan}
          activeBudget={budget}
          onBudget={(m) => void changeBudget(m)}
          environments={environments}
          onStart={(item) => void openPractice(item)}
        />
      )}
    </AppShell>
  );
}
