import { useEffect, useRef, useState } from "react";
import { AppShell, PackText } from "@openlang/ui";
import { invoke } from "@tauri-apps/api/core";
import {
  Onboarding,
  type OnboardingStep,
  type SpeechComponent,
  type PackCandidate,
  type PrivacyNotice,
  type ProfileSummary,
} from "./onboarding";
import { PracticeHub, type HubMode } from "./hub";
import {
  Home,
  type PlannedItem,
  ProgressView,
  type ProgressRow,
  type SessionPlan,
  type GoalCard,
  GoalMap,
  CanDoSummary,
  type WorldEnvironment,
  type NextGoalView,
  type FirstRunStep,
  RUNNABLE_MODALITIES,
  type SessionOutcomeView,
  type SessionStatus,
  type SessionView,
} from "./home";
import { EMPTY_PITCH, PronunciationPractice, type PronunciationResult } from "./pronunciation";
import { DictationPractice, type DictationResult, type DictationSentence } from "./dictation";
import {
  LanguagePanel,
  packPosture,
  readFileB64,
  type CatalogEntry,
  type InstalledPack,
  type PackClaims,
  type SpeechModel,
  type DeviceTier,
  type AlignerStatus,
  type InstallOutcome,
  type InstallReceipt,
} from "./language";
import { WritingPractice, type WritingTaskView } from "./writing";
import { PracticeRunner, type PracticeTaskView } from "./practice";
import { LessonEncounter, stageForDrill, type LessonPlan } from "./lesson";
import { playClip } from "./playback";
import { stressEnabled, type DisplaySettingsView } from "./stress";
import { ReadingPanel, type Story, type StorySummary } from "./reading";
import { ShadowingPanel, type ShadowTarget } from "./shadowing";
import { MyWordsPanel, type MineItem } from "./words";
import {
  ScenarioPanel,
  type ScenarioOutcomeView,
  type ScenarioStepResult,
  type ScenarioSummaryView,
  type ScenarioView,
} from "./scenario";
import {
  Settings,
  type BuildIdentity,
  type ImportOutcome,
  type ImportPreview,
  type RomajiMode,
} from "./settings";
import {
  CaptureOwner,
  captureLimitReached,
  listMicrophones,
  listOutputs,
  MAX_CAPTURE_SECONDS,
  openMicrophone,
  type CaptureSessionLike,
  type Microphone,
  type SpeakerOutput,
} from "./capture";
import { audioFailureMessage, isMediaMissing } from "./speech-readiness";
import type { EngineProgress } from "./progress";

export type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
/**
 * K-62 witness: every stage the engine reports is recorded as it arrives, so
 * the headless walkthrough can prove the renderer heard the progress channel
 * rather than trusting that a listener was wired up.
 */
const progressStages: EngineProgress[] = [];

// StrictMode invokes mount effects twice in a development build. The launch
// handshake is idempotent, but this walkthrough drives a real pack install and
// a full click tour, so it runs once per process instead of twice per mount.
let walkthroughRan = false;

/** Resolves with `value` after `ms`: a bounded wait, never an open-ended one. */
function after<T>(ms: number, value: T): Promise<T> {
  const { promise, resolve } = Promise.withResolvers<T>();
  setTimeout(() => resolve(value), ms);
  return promise;
}

/** Tauri IPC when running inside the native shell; null in plain
 * browser/vitest runs, where the flow stays purely local. */
function detectInvoke(): Invoke | null {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return (cmd, args) =>
      invoke(cmd, args).catch((e: unknown) => Promise.reject(explainPackAbsence(e)));
  }
  return null;
}

/**
 * D7: honest refusal copy for a profile with no active pack. Nothing is
 * ever built against a guessed pack id, so the message names the fix
 * (the Settings → Language packs section is where a pack becomes active).
 */
export const NO_ACTIVE_PACK =
  "No pack is active for this profile. Choose one under Settings → Language packs.";

/** The engine's fixed tokens for "this profile has no language chosen yet".
 * Every route renders its failure through `String(e)`, so translating once at
 * the IPC boundary turns a bare token into the sentence that names the fix —
 * a dead end with a way out is not a dead end (owner 2026-10-12). */
const PACK_ABSENCE_TOKENS = ["no active language pack"] as const;

export function explainPackAbsence(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return (PACK_ABSENCE_TOKENS as readonly string[]).includes(message) ? NO_ACTIVE_PACK : message;
}

/**
 * The pack a session practises with, resolved from the profile itself.
 * `active_pack` returns the ids the profile selected at onboarding: the
 * first is the active one, an empty list means none is active, and more
 * than one distinct id is a conflict the app surfaces instead of picking
 * through silently. Never falls back to a default pack id.
 */
export type SessionPack = {
  packId: string | null;
  ids: string[];
  note: string | null;
};

export async function loadSessionPack(inv: Invoke, profileId: string): Promise<SessionPack> {
  const ids = (await inv("active_pack", { profileId })) as string[];
  return { packId: ids[0] ?? null, ids, note: activePackNote(ids) };
}

/**
 * A note for the ambiguous case: the profile reports more than one
 * *different* active pack. The first one is used, and the conflict is
 * surfaced instead of guessed away. Repeats of one id are not a conflict.
 */
export function activePackNote(ids: string[]): string | null {
  const others = ids.slice(1).filter((id) => id !== ids[0]);
  return others.length > 0
    ? `This profile has more than one active pack (${ids.join(", ")}). Using ${ids[0]}; choose a single pack under Settings → Language packs.`
    : null;
}

/**
 * Outcome of a pack-scoped native call. `ok: false` is the refusal path:
 * no pack is active, so the command was never invoked.
 */
export type PackRequest<T> = { ok: true; packId: string; value: T } | { ok: false; error: string };

/** A pack-scoped command with the pack id at the top level of the payload
 * (the IPC spelling of the engine's `pack_id` argument). */
export async function packRequest<T>(
  inv: Invoke,
  packId: string | null,
  cmd: string,
  args: Record<string, unknown>,
): Promise<PackRequest<T>> {
  if (!packId) return { ok: false, error: NO_ACTIVE_PACK };
  return { ok: true, packId, value: (await inv(cmd, { packId, ...args })) as T };
}

/** The same guard for the speech attempts, which carry the pack id as
 * `pack_id` inside the nested `attempt` payload. */
export async function packAttemptRequest<T>(
  inv: Invoke,
  packId: string | null,
  cmd: string,
  attempt: Record<string, unknown>,
): Promise<PackRequest<T>> {
  if (!packId) return { ok: false, error: NO_ACTIVE_PACK };
  const payload = { attempt: { pack_id: packId, ...attempt } };
  return { ok: true, packId, value: (await inv(cmd, payload)) as T };
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
    | "dictation"
    | "writing"
    | "scenarios"
    | "shadowing"
    | "reading"
    | "words"
    | "placement"
    | "kanji"
    | "settings"
    | "hub"
  >("practice");
  const [notice, setNotice] = useState<PrivacyNotice>({
    title: "Your data stays on this device",
    points: [
      "Everything runs locally unless you enable an online provider.",
      "No account is required; profiles live on this device.",
    ],
  });
  const [packs, setPacks] = useState<PackCandidate[]>([]);
  /** D7: the pack the wizard chose this session. It is also seeded from
   * the profile's `active_pack` on profile load and on a pack switch, so
   * a returning session (no wizard) has the profile's own pack and every
   * pack-scoped call uses it. Null means no pack is active. */
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);
  const [installedUnknown, setInstalledUnknown] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [budget, setBudget] = useState(5);
  const [plan, setPlan] = useState<SessionPlan>(EMPTY_PLAN);
  // Review finding R04: the engine needs an attempt identity to tell a
  // retry apart from genuine variation. One id per presented plan: retries
  // of a task the learner is looking at collapse into a single observation
  // (docs/03 §5), while a refetched plan — budget change, refresh, profile
  // switch — is a new session and its attempts are new observations. It is
  // never derived from the plan's contents or the clock: a fresh id per
  // call collapses nothing, a clock-derived id merges unrelated days.
  const planSessionRef = useRef("");
  // R04: a supplied reading and a romaji reveal disqualify different
  // mastery dimensions, so the engine needs which hint was used, not just
  // that some hint was.
  const [writingHintKind, setWritingHintKind] = useState<"reading" | "romaji" | null>(null);
  function applyPlan(next: SessionPlan) {
    planSessionRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `plan-${Math.random().toString(36).slice(2, 10)}`;
    setPlan(next);
  }
  // K-66: derived guidance from the engine. `undefined` = home_state has
  // not answered; `null` = the pack declares no goal map. The app never
  // composes these strings itself (ADR-0020).
  const [nextGoal, setNextGoal] = useState<NextGoalView | null | undefined>(undefined);
  const [firstRunSteps, setFirstRunSteps] = useState<FirstRunStep[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [writingLoaded, setWritingLoaded] = useState(false);
  const [pronResult, setPronResult] = useState<PronunciationResult | null>(null);
  const [dictTarget, setDictTarget] = useState("おばあさん");
  const [dictResult, setDictResult] = useState<DictationResult | null>(null);
  const [dictSentence, setDictSentence] = useState<DictationSentence | null>(null);
  const [dictOffset, setDictOffset] = useState(0);
  const [recording, setRecording] = useState(false);
  const [attemptUrl, setAttemptUrl] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<WorldEnvironment[]>([]);
  // R14: a failed playback must be something the learner can see, not a
  // silent Audio error in the console.
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  // R14: a retained recording URL lives until it is replaced or this screen
  // goes away. Nothing else may revoke it while state still holds it.
  useEffect(() => {
    return () => {
      if (attemptUrl) URL.revokeObjectURL(attemptUrl);
    };
  }, [attemptUrl]);
  const [goals, setGoals] = useState<GoalCard[]>([]);
  const [installed, setInstalled] = useState<InstalledPack[]>([]);
  const [claims, setClaims] = useState<PackClaims[] | null>(null);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogStatus, setCatalogStatus] = useState("no-catalog-url");
  const [audioMsg, setAudioMsg] = useState<string | null>(null);
  const [langError, setLangError] = useState<string | null>(null);
  const [installOutcome, setInstallOutcome] = useState<InstallOutcome | null>(null);
  const [installReceipt, setInstallReceipt] = useState<InstallReceipt | null>(null);
  const [alignerStatus, setAlignerStatus] = useState<AlignerStatus | null>(null);
  const [buildIdentity, setBuildIdentity] = useState<BuildIdentity | null>(null);
  const [speechModels, setSpeechModels] = useState<SpeechModel[]>([]);
  const [speechModel, setSpeechModel] = useState<string>("off");
  const [deviceTier, setDeviceTier] = useState<DeviceTier | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [installingPack, setInstallingPack] = useState<string | null>(null);
  const [micChosen, setMicChosen] = useState(false);
  const [speechComponents, setSpeechComponents] = useState<SpeechComponent[]>([]);
  const [speechInstalling, setSpeechInstalling] = useState(false);
  const [writingTask, setWritingTask] = useState<WritingTaskView | null>(null);
  const [writingScaffold, setWritingScaffold] = useState<{
    reading?: string;
    romaji?: string;
  }>({});
  const [writingDraft, setWritingDraft] = useState("");
  const [writingGraded, setWritingGraded] = useState(false);
  const [writingCorrect, setWritingCorrect] = useState(false);
  const [writingExpected, setWritingExpected] = useState("");
  const [writingUsedHint, setWritingUsedHint] = useState(false);
  const [writingError, setWritingError] = useState<string | null>(null);
  const [practiceTarget, setPracticeTarget] = useState<{
    contentId: string;
    modality: string;
  } | null>(null);
  const [practiceTask, setPracticeTask] = useState<PracticeTaskView | null>(null);
  const [display, setDisplay] = useState<DisplaySettingsView | null>(null);
  const [practiceGraded, setPracticeGraded] = useState(false);
  const [practiceCorrect, setPracticeCorrect] = useState(false);
  const [practiceCorrectChoice, setPracticeCorrectChoice] = useState("");
  const [practiceError, setPracticeError] = useState<string | null>(null);
  // R11: the journey the pack authored the item with, and whether the
  // learner has moved past its encounter into the drill.
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [lessonSeen, setLessonSeen] = useState(false);
  const [practiceRevealed, setPracticeRevealed] = useState(false);
  // One bounded session over the plan the planner already produced. The
  // queue is a snapshot taken when the learner begins, so "3 of 5" cannot
  // drift when the plan is re-planned after each activity. It lives in a ref
  // because the loop advances inside async handlers, and it is deliberately
  // not persisted: a session is for this sitting.
  const [session, setSession] = useState<SessionView | null>(null);
  const [sessionOutcome, setSessionOutcome] = useState<SessionOutcomeView | null>(null);
  const sessionQueueRef = useRef<{
    items: PlannedItem[];
    index: number;
    done: number;
    notRunnable: number;
  } | null>(null);
  const [scenarioList, setScenarioList] = useState<ScenarioSummaryView[]>([]);
  const [scenarioActive, setScenarioActive] = useState<ScenarioView | null>(null);
  const [scenarioStep, setScenarioStep] = useState<ScenarioStepResult | null>(null);
  const [scenarioOutcome, setScenarioOutcome] = useState<ScenarioOutcomeView | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [practiceAudio, setPracticeAudio] = useState<{ wavB64: string; source: string } | null>(
    null,
  );
  const [practiceAudioError, setPracticeAudioError] = useState<string | null>(null);
  const [placementItems, setPlacementItems] = useState<
    { assessment_id: string; goal_id: string; content_id: string; modality: string }[]
  >([]);
  const [placementIdx, setPlacementIdx] = useState(0);
  const [placementTask, setPlacementTask] = useState<PracticeTaskView | null>(null);
  const [placementGraded, setPlacementGraded] = useState(false);
  const [placementCorrect, setPlacementCorrect] = useState(false);
  const [placementCorrectChoice, setPlacementCorrectChoice] = useState("");
  const [placementHits, setPlacementHits] = useState(0);
  const [placementFinished, setPlacementFinished] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [kanjiCards, setKanjiCards] = useState<
    {
      id: string;
      character: string;
      radicals: string[];
      mnemonic: string | null;
      status: string;
      meaning_due: string | null;
      reading_due: string | null;
    }[]
  >([]);
  const [kanjiActive, setKanjiActive] = useState<(typeof kanjiCards)[number] | null>(null);
  const [kanjiStage, setKanjiStage] = useState<"meaning" | "reading" | null>(null);
  const [kanjiTask, setKanjiTask] = useState<PracticeTaskView | null>(null);
  const [kanjiGraded, setKanjiGraded] = useState(false);
  const [kanjiCorrect, setKanjiCorrect] = useState(false);
  const [kanjiCorrectChoice, setKanjiCorrectChoice] = useState("");
  const [kanjiError, setKanjiError] = useState<string | null>(null);
  // I03: the hub advertises the kanji drill only when the active pack has
  // character data. The answer comes from `kanji_available`, never from
  // `kanjiCards`: that list is loaded when the mode opens, so gating on it
  // hides the card and makes the drill unreachable. Unknown counts as
  // available — a failed capability read must not quietly delete a mode, and
  // the mode screen itself reports the real error.
  const [kanjiAvailable, setKanjiAvailable] = useState(true);
  // SETTINGS-001: engine-backed settings state. micEnabled mirrors the
  // stored `microphone-enabled`; it gates getUserMedia at the capture
  // site, so a wrong value here is a privacy bug, not a cosmetic one.
  const [micEnabled, setMicEnabled] = useState(false);
  // K-64: the stored capture device (null = system default) plus the list the
  // browser will name. Labels only exist once access has been granted, so an
  // empty list is expected on a fresh profile and the copy says so.
  const [micDevice, setMicDevice] = useState<string | null>(null);
  const [micDevices, setMicDevices] = useState<Microphone[]>([]);
  // K-88: the output device this profile plays on (null = system default).
  const [playbackDevice, setPlaybackDevice] = useState<string | null>(null);
  const [playbackOutputs, setPlaybackOutputs] = useState<SpeakerOutput[]>([]);
  const [canRouteOutput, setCanRouteOutput] = useState(false);
  const [romajiMode, setRomajiMode] = useState<RomajiMode>("auto");
  const [settingsExportPath, setSettingsExportPath] = useState<string | null>(null);
  // R06: restoring is preview-first. `restoreChecked` remembers exactly which
  // path was checked, so editing the field drops a stale preview instead of
  // letting a confirm write a file the learner never saw.
  const [restorePath, setRestorePath] = useState("");
  const [restoreChecked, setRestoreChecked] = useState<{
    path: string;
    preview: ImportPreview;
  } | null>(null);
  const [restoreOutcome, setRestoreOutcome] = useState<ImportOutcome | null>(null);
  const [settingsDeleteArmed, setSettingsDeleteArmed] = useState(false);
  const [settingsSwitchArmed, setSettingsSwitchArmed] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [practiceDraft, setPracticeDraft] = useState("");
  // A route change is a navigation, not a re-render: the sticky header
  // would hide the top of the new page (reset the scroll), and both screen
  // readers and sighted keyboard users otherwise stay parked in the old
  // content. Focus the new route's own h1 — every route surface renders
  // exactly one, so announcing it *is* the navigation announcement. While
  // the onboarding wizard owns the flow it manages its own focus.
  const routeHeading = useRef<HTMLElement | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (step !== "done") return;
    const heading = document.querySelector<HTMLElement>("#main h1");
    if (!heading || heading === routeHeading.current) return;
    routeHeading.current = heading;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [step, route]);
  // K-76: null until the first real load answers, so the surface can tell
  // "still loading" apart from "this pack has no targets".
  const [shadowItems, setShadowItems] = useState<ShadowTarget[] | null>(null);
  const [shadowIdx, setShadowIdx] = useState(0);
  const [storyList, setStoryList] = useState<StorySummary[]>([]);
  const [storyActive, setStoryActive] = useState<Story | null>(null);
  const [storyLookup, setStoryLookup] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [mineItems, setMineItems] = useState<MineItem[]>([]);
  const [mineSurface, setMineSurface] = useState("");
  const [mineReading, setMineReading] = useState("");
  const [mineGloss, setMineGloss] = useState("");
  const [mineSource, setMineSource] = useState("");
  const [mineError, setMineError] = useState<string | null>(null);
  const [mineNotice, setMineNotice] = useState<string | null>(null);
  const [mineReview, setMineReview] = useState<{ item: MineItem; revealed: boolean } | null>(null);
  const [shadowError, setShadowError] = useState<string | null>(null);

  useEffect(() => {
    const inv = detectInvoke();
    if (!inv) return;
    void (async () => {
      const mode = (await inv("app_mode")) as { smoke: boolean };
      if (mode.smoke) {
        // The headless walkthrough is a once-per-process act, and it belongs
        // to the smoke branch alone: a StrictMode dev remount — or a test
        // that mounts the app twice — must still reach the returning-learner
        // resume below, instead of stranding it at the wizard.
        if (walkthroughRan) return;
        walkthroughRan = true;
        await inv("smoke_ack", { note: "home" });
        // POLISH-001: full-route walkthrough. Drive onboarding
        // deterministically (local profile + bundled default pack), then
        // click each route nav button so the real open* handlers run.
        // Wait n animation frames so React commits and paints.
        const painted = async (frames: number) => {
          const { promise, resolve } = Promise.withResolvers<void>();
          let left = frames;
          const tick = () => (left-- > 0 ? requestAnimationFrame(tick) : resolve());
          requestAnimationFrame(tick);
          await promise;
        };
        // Poll until a predicate holds (up to `frames` animation
        // frames) — needed when the next step depends on React state
        // landing, not just on a fixed paint budget.
        const waitUntil = async (pred: () => boolean, frames = 60) => {
          const { promise, resolve } = Promise.withResolvers<void>();
          let left = frames;
          const tick = () => (pred() || left-- <= 0 ? resolve() : requestAnimationFrame(tick));
          requestAnimationFrame(tick);
          await promise;
        };
        // A frame budget that never completes must produce a readable marker,
        // not a harness timeout: exit 124 says nothing about where the webview
        // stopped painting.
        const paintedOrStall = async (label: string) => {
          const stalled = await Promise.race([painted(4).then(() => false), after(3000, true)]);
          if (stalled) await inv("smoke_ack", { note: `paint-stall:${label}` });
        };
        try {
          const existing = (await inv("list_profiles")) as ProfileSummary[];
          const first = existing[0];
          const p = first
            ? ((await inv("resume_profile", {
                profileId: first.id,
              })) as ProfileSummary)
            : ((await inv("create_profile", {
                displayName: "smoke",
              })) as ProfileSummary);
          setProfileId(p.id);
          setDisplayName(p.display_name);
          // D7: the smoke walkthrough installs the first bundled
          // candidate — the same list the wizard is shown — instead of
          // naming a pack id here.
          const bundled = (await inv("available_packs")) as PackCandidate[];
          const packId = bundled[0]?.pack_id;
          if (!packId) throw new Error("no bundled pack is available to install");
          setSelectedPack(packId);
          await inv("install_pack", { packId });
          // K-62: the owner's complaint was an install that gives back no
          // sign of life. The stages are only worth asserting if the renderer
          // really heard them, so the smoke run reports each stage by name as
          // it arrived over the event channel.
          for (let i = 0; i < 20 && progressStages.length < 3; i++) {
            await after(50, undefined);
          }
          for (const stage of ["prepare", "install", "record"]) {
            await inv("smoke_ack", {
              note: `progress:${stage}:${
                progressStages.some((p2) => p2.operation === "install-pack" && p2.stage === stage)
                  ? "heard"
                  : "SILENT"
              }`,
            });
          }
          await inv("complete_onboarding", {
            profileId: p.id,
            packId,
            micEnabled: false,
          });
          setMicEnabled((await inv("get_microphone_enabled", { profileId: p.id })) as boolean);
          const home = (await inv("home_state", {
            profileId: p.id,
          })) as { display_name: string; plan: SessionPlan; next_goal: NextGoalView | null };
          setDisplayName(home.display_name);
          applyPlan(home.plan);
          setNextGoal(home.next_goal);
          // K-66: on a fresh profile every planned item is an
          // introduction, and first-run guidance must be non-empty for
          // the ja-JP pack. The script asserts both markers.
          const freshSteps = (await inv("first_run_steps", { profileId: p.id })) as FirstRunStep[];
          setFirstRunSteps(freshSteps);
          await inv("smoke_ack", { note: `fresh-plan:${home.plan.items.length}` });
          await inv("smoke_ack", { note: `first-run:${freshSteps.length}` });
          setEnvironments((await inv("world_state", { profileId: p.id })) as WorldEnvironment[]);
          setDisplay((await inv("display_settings", { profileId: p.id })) as DisplaySettingsView);
          const goalRows = (await inv("goal_map", { profileId: p.id })) as GoalCard[];
          await inv("smoke_ack", { note: `goal-map:${goalRows.length}` });
          setStep("done");
          // sweep-walkthrough-stall: no bare frame wait — a frozen rAF must
          // name itself instead of parking the walkthrough unmarked.
          await paintedOrStall("hub-paint");
          const buttons = Array.from(document.querySelectorAll('nav[aria-label="Routes"] button'));
          for (const b of buttons) {
            const label = (b.textContent ?? "").trim();
            // K-63: "switching routes feels slow" is an impression; this is the
            // measurement. Timed from the click to the paint a learner would
            // actually see, inside the real webview over real IPC.
            const started = performance.now();
            (b as HTMLButtonElement).click();
            await paintedOrStall(label);
            await inv("smoke_ack", {
              note: `route-ms:${label}:${Math.round(performance.now() - started)}`,
            });
            await inv("smoke_ack", { note: `route:${label}` });
            // K-64: the microphone picker is a Settings control backed by a
            // stored setting. Walking the route proves it is really rendered,
            // not just present in the component source.
            if (label === "Settings") {
              await inv("smoke_ack", {
                note: `mic-picker:${document.querySelector("#mic-device") ? "present" : "ABSENT"}`,
              });
            }
          }
          // K-63-follow: one tab costs six times what every other tab costs, and
          // (K-77) the heavy tab is now Settings, which carries the folded
          // Language-packs panel.
          // the two halves need different fixes. Leave the tab, come back, and
          // time the return: by now the panel's commands are warm and its data
          // is memoized, so whatever is left is the remount's fetch chain plus
          // painting the panel. If the number survives, it is paint.
          const navTo = (label: string) =>
            buttons.find((b) => (b.textContent ?? "").trim() === label) as
              HTMLButtonElement | undefined;
          const away = navTo("Today");
          const back = navTo("Settings");
          if (away && back) {
            away.click();
            await paintedOrStall("Today");
            const again = performance.now();
            back.click();
            await paintedOrStall("Settings");
            await inv("smoke_ack", {
              note: `route-2ms:Settings:${Math.round(performance.now() - again)}`,
            });
          }
          // K-81: the nav is five destinations now; the practice modes hide
          // behind the hub, so the walk drills the hub the way a learner
          // does — the route floor counts modes, not just tabs.
          const practiceTab = navTo("Practice");
          if (!practiceTab) throw new Error("Practice hub tab missing");
          for (const mode of [
            "Pronunciation",
            "Speaking",
            "Writing",
            "Scenarios",
            "Shadowing",
            "Reading",
            "Kanji",
            "Placement",
          ]) {
            practiceTab.click();
            await paintedOrStall("practice-tab");
            const card = Array.from(
              document.querySelectorAll('[aria-label="Practice modes"] button'),
            ).find((b) => (b.textContent ?? "").trim() === mode) as HTMLButtonElement | undefined;
            if (!card) throw new Error(`hub card "${mode}" missing`);
            const started = performance.now();
            card.click();
            await paintedOrStall(mode);
            await inv("smoke_ack", {
              note: `route-ms:${mode}:${Math.round(performance.now() - started)}`,
            });
            await inv("smoke_ack", { note: `route:${mode}` });
            if (mode === "Shadowing") {
              // Owner finding 8: the pass reported Play/Record as grey and
              // unclickable. Nothing in the code ever disables them, so the
              // walk records what the live card actually rendered.
              const sec = document.querySelector('[aria-label="Shadowing"]');
              const bs = sec
                ? Array.from(sec.querySelectorAll("button")).map((b) => b as HTMLButtonElement)
                : [];
              await inv("smoke_ack", {
                note: `shadow-buttons:${bs.length}:${bs.filter((b) => b.disabled).length}`,
              });
            }
          }
          // K-63: route switching was reported as feeling dead. Split the cost
          // into the commands a route runs and the paint that follows, because
          // the fix differs by half. These are warm calls: the state a learner
          // is already in when they click the tab.
          const timed = async (cmd: string, args?: Record<string, unknown>) => {
            const t = performance.now();
            await inv(cmd, args);
            await inv("smoke_ack", {
              note: `call-ms:${cmd}:${Math.round(performance.now() - t)}`,
            });
          };
          const warm: Array<[string, Record<string, unknown> | undefined]> = [
            ["installed_packs", undefined],
            ["pack_claims", undefined],
            ["catalog_packs", undefined],
            ["available_models", undefined],
            ["aligner_status", undefined],
            ["scenario_list", { profileId: p.id }],
            ["home_state", { profileId: p.id }],
            ["active_pack", { profileId: p.id }],
            ["placement_plan", { profileId: p.id }],
            ["kanji_list", { profileId: p.id }],
            ["goal_map", { profileId: p.id }],
            ["practice_plan", { profileId: p.id, minutes: 10 }],
            ["writing_task", { profileId: p.id }],
            // Not content: this proves the command is actually registered in the
            // native handler list. The web layer calling a command the Rust side
            // never registered fails silently outside a typed call site.
            ["build_identity", undefined],
          ];
          for (const [cmd, args] of warm) {
            await timed(cmd, args);
          }
          // K-60: scenario actions died at the IPC boundary because the
          // native view structs renamed their keys to kebab-case. Walk
          // the real click path (nav button -> list row -> Start) so the
          // regression is caught by the headless walkthrough, not only
          // by unit tests.
          const scenarios = (await inv("scenario_list", {
            profileId: p.id,
          })) as ScenarioSummaryView[];
          if (scenarios.length === 0) {
            await inv("smoke_ack", { note: "scenario-started:none-locked" });
          } else {
            // K-75: the native list leads with the playable scenario and
            // marks it as the recommendation, so the walkthrough follows
            // that row instead of whatever the pack files sort to first.
            const scen = scenarios.find((s) => s.recommended) ?? scenarios[0];
            if (!scen) throw new Error("scenario list row vanished");
            const practiceTab = navTo("Practice");
            if (!practiceTab) throw new Error("Practice tab missing");
            practiceTab.click();
            await painted(4);
            const scenCard = Array.from(
              document.querySelectorAll('[aria-label="Practice modes"] button'),
            ).find((b) => (b.textContent ?? "").trim() === "Scenarios") as
              HTMLButtonElement | undefined;
            if (!scenCard) throw new Error("Scenarios hub card missing");
            scenCard.click();
            await painted(4);
            const row = Array.from(document.querySelectorAll("li")).find((li) =>
              (li.textContent ?? "").includes(scen.title),
            );
            if (!row) throw new Error(`scenario row for "${scen.title}" missing`);
            const start = Array.from(row.querySelectorAll("button")).find(
              (b) => (b.textContent ?? "").trim() === "Start",
            ) as HTMLButtonElement | undefined;
            if (scen.unlocked) {
              if (!start) throw new Error("Start button missing on unlocked scenario");
              start.click();
              await waitUntil(() => !!document.querySelector('[aria-label="Scenario"]'));
              if (!document.querySelector('[aria-label="Scenario"]'))
                throw new Error("scenario session did not open");
              if (document.querySelector('[aria-label="Scenario"] [role="alert"]'))
                throw new Error("scenario start surfaced an error to the learner");
              await inv("smoke_ack", { note: `scenario-started:${scen.scenario_id}` });
              const action = document.querySelector(
                '[aria-label="Ways to respond"] button',
              ) as HTMLButtonElement | null;
              const intent = (action?.textContent ?? "").trim();
              try {
                if (intent) {
                  const step = (await inv("scenario_attempt", {
                    profileId: p.id,
                    scenarioId: scen.scenario_id,
                    intent,
                  })) as ScenarioStepResult;
                  await inv("smoke_ack", {
                    note: `scenario-step:${scen.scenario_id}:${step.result}`,
                  });
                } else {
                  await inv("smoke_ack", {
                    note: `scenario-step:${scen.scenario_id}:abstained`,
                  });
                }
              } catch (e) {
                await inv("smoke_ack", {
                  note: `scenario-step:${scen.scenario_id}:error:${String(e)}`,
                });
              }
              // O-06 2026-10-10: the owner reported the Support box and the
              // Transfer variants "do nothing". Click them the way a learner
              // does and report what visibly changes.
              const support = document.querySelector(
                '[aria-label="Scenario"] fieldset.ladder button',
              ) as HTMLButtonElement | null;
              if (support) {
                support.click();
                await waitUntil(() => support.disabled, 2000);
                await inv("smoke_ack", {
                  note: `scenario-support:${scen.scenario_id}:${support.disabled ? "consumed" : "no-visible-change"}`,
                });
              } else {
                await inv("smoke_ack", { note: `scenario-support:${scen.scenario_id}:no-ladder` });
              }
              const transfer = document.querySelector(
                '[aria-label="Scenario"] fieldset.transfers button',
              ) as HTMLButtonElement | null;
              if (transfer) {
                transfer.click();
                await waitUntil(() => (transfer.textContent ?? "").includes("✓"), 2000);
                await inv("smoke_ack", {
                  note: `scenario-transfer:${scen.scenario_id}:${(transfer.textContent ?? "").includes("✓") ? "done" : "no-visible-change"}`,
                });
              } else {
                await inv("smoke_ack", {
                  note: `scenario-transfer:${scen.scenario_id}:none-offered`,
                });
              }
            } else {
              await inv("smoke_ack", {
                note: `scenario-locked:${scen.scenario_id}:${scen.locked_reason ?? "?"}`,
              });
            }
          }
          // D4 (ADR-0019): the app must be able to state, over real IPC, which
          // aligner runtime this build carries. The value is build-dependent;
          // the requirement is that the answer exists.
          const al = (await inv("aligner_status")) as AlignerStatus;
          await inv("smoke_ack", {
            note: `aligner:${al.available ? "yes" : "no"}:${al.available ? (al.source ?? "?") : (al.reason ?? "?")}`,
          });
          await inv("smoke_ack", {
            note: `routes-complete:${buttons.length}`,
          });
        } catch (e) {
          await inv("smoke_ack", { note: `walkthrough-error:${String(e)}` });
        }
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
      // sweep-ts-dup-install: installed state is its own read, because a
      // failure here must not render confident Install buttons for packs
      // already on the device — the step says the state is unknown instead,
      // and install() re-checks before moving bytes.
      try {
        const installed = (await inv("installed_packs")) as InstalledPack[];
        setInstalledPacks(installed.map((i) => i.pack_id));
      } catch {
        setInstalledUnknown(true);
      }
    })();
  }, []);

  const inv = detectInvoke();
  // K-62: one status line driven by what the engine reports, never by a timer
  // the UI invents. Stages are pushed to a module-level witness as well so the
  // headless walkthrough can prove the channel actually delivered them.
  const [engineProgress, setEngineProgress] = useState<EngineProgress | null>(null);

  useEffect(() => {
    // No bridge (plain browser tab, test DOM) means no event source: importing
    // the Tauri event API there would fail, so the listener is not registered.
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<EngineProgress>("engine-progress", (e) => {
          progressStages.push(e.payload);
          setEngineProgress(e.payload);
        }),
      )
      .then((un) => {
        if (cancelled) un();
        else unlisten = un;
      })
      .catch(() => {
        // Progress is a nicety: losing it must never turn into an error the
        // learner sees, and the operation itself still reports its own failure.
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // `pid` lets the resume/finish flows prime the Home active-pack
  // header before the Settings route has been opened (the state
  // profileId is not yet visible to this closure there).
  //
  // K-63: these reads used to be awaited one after another, each landing its
  // own state update, so opening the tab re-rendered the app several times for
  // ~4 ms of actual reading. They run together now and commit in one block.
  async function refreshLanguages(pid?: string) {
    if (!inv) return;
    const active = pid ?? profileId;
    const [installed, claims, session, catalog] = await Promise.all([
      inv("installed_packs") as Promise<InstalledPack[]>,
      inv("pack_claims") as Promise<PackClaims[]>,
      active ? loadSessionPack(inv, active) : Promise.resolve(null),
      inv("catalog_packs") as Promise<{ entries: CatalogEntry[]; status: string }>,
    ]);
    setInstalled(installed);
    setClaims(claims);
    if (session) {
      setActiveIds(session.ids);
      // D7: the profile's own active pack seeds every pack-scoped call,
      // so a returning session (no wizard this run) and a pack switch
      // from Settings both aim at the right pack. No pack here means no pack:
      // the panels refuse instead of guessing one.
      setSelectedPack(session.packId);
      if (session.note) setLangError(session.note);
    }
    setCatalog(catalog.entries);
    setCatalogStatus(catalog.status);
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
    setInstallOutcome(null);
    setInstallReceipt(null);
    setLangError(null);
    try {
      const res = (await inv("install_catalog_pack", { packId })) as {
        receipt: InstallReceipt | null;
      } | null;
      if (res?.receipt) setInstallReceipt(res.receipt);
    } catch (e) {
      const reason = String(e).replace(/^install-catalog-pack failed:\s*/, "");
      setInstallOutcome(
        reason.includes("install cancelled")
          ? { kind: "cancelled", pack_id: packId, message: reason }
          : { kind: "failed", pack_id: packId, message: reason },
      );
    } finally {
      setEngineProgress(null);
    }
    await refreshLanguages();
  }

  // Cancel asks the engine to stop the install whose progress is on screen —
  // the transfer or the unpack, whichever is running. The engine answers
  // through the normal failure path with its `install cancelled` reason, so
  // the outcome shows as cancelled — never as a client-side guess that
  // nothing happened.
  async function cancelInstall() {
    if (!inv) return;
    const subject = engineProgress?.subject;
    if (!subject) return;
    await inv("cancel_pack_install", { packId: subject }).catch(() => undefined);
  }

  async function importPack(dataB64: string) {
    if (!inv) return;
    try {
      await inv("import_pack", { dataB64 });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    } finally {
      setEngineProgress(null);
    }
    await refreshLanguages();
  }

  async function refreshAligner() {
    if (!inv) return;
    setAlignerStatus((await inv("aligner_status")) as AlignerStatus);
  }

  // The release identity is app-wide, not per-profile, and ADR-0015 makes a
  // runtime report worthless without it. Read it as soon as the bridge exists;
  // a failed read says "unknown" rather than pretending to still be loading.
  useEffect(() => {
    if (!inv) return;
    void inv("build_identity")
      .then((v) => setBuildIdentity(v as BuildIdentity))
      .catch(() => setBuildIdentity({ version: "unknown", commit: "unknown", dirty: false }));
  }, [inv]);

  // I03: ask the engine whether this profile's pack teaches characters, so the
  // hub can advertise the kanji drill before anything has been opened.
  useEffect(() => {
    if (!inv || !profileId) return;
    let live = true;
    setKanjiAvailable(true);
    void inv("kanji_available", { profileId })
      .then((v) => live && setKanjiAvailable(Boolean(v)))
      .catch(() => live && setKanjiAvailable(true));
    return () => {
      live = false;
    };
  }, [inv, profileId]);

  async function installSpeechModel(modelId: string) {
    if (!inv) return;
    try {
      await inv("install_model", { modelId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    } finally {
      setEngineProgress(null);
    }
    await refreshSpeech();
  }

  async function deleteSpeechModel(modelId: string) {
    if (!inv) return;
    try {
      await inv("delete_model", { modelId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    }
    await refreshSpeech();
  }

  async function refreshSpeech() {
    if (!inv) return;
    const models = (await inv("available_models")) as Array<{
      id: string;
      version: string;
      runtime: string;
      license_code: string;
      installed: boolean;
      installable: boolean;
      size_bytes: number;
    }>;
    setSpeechModels(
      models
        .filter((m) => m.runtime === "whisper.cpp")
        .map((m) => ({
          id: m.id,
          version: m.version,
          license_code: m.license_code,
          installed: m.installed,
          installable: m.installable,
          size_bytes: m.size_bytes,
        })),
    );
    setSpeechModel((await inv("get_speech_model")) as string);
    setDeviceTier((await inv("recommended_speech_model")) as DeviceTier);
  }

  async function selectSpeechModel(modelId: string) {
    if (!inv) return;
    setLangError(null);
    try {
      await inv("set_speech_model", { modelId });
    } catch (e) {
      setLangError(String(e));
    }
    await refreshSpeech();
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
      // sweep-ts-dup-install: the disabled-state may be stale if the launch
      // read failed; a fresh check keeps the label honest and skips a
      // pointless call (the engine no-ops an already-current install).
      try {
        const fresh = (await inv("installed_packs")) as InstalledPack[];
        if (fresh.some((i) => i.pack_id === id)) {
          setInstalledPacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
          setInstalledUnknown(false);
          return;
        }
      } catch {
        /* still unknown: proceed — the engine no-ops a current install */
      }
      setInstallingPack(id);
      try {
        // K-73 made this command async, so `engine-progress` events now
        // actually reach the webview while it runs; the stage line above
        // the pack list is what makes the minute-long wait visible (K-69).
        await inv("install_pack", { packId: id });
      } catch (e) {
        setOnboardError(`Could not install that pack: ${String(e)}`);
        return;
      } finally {
        setInstallingPack(null);
        setEngineProgress(null);
      }
    }
    setInstalledPacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  // Owner 2026-10-12: a pack downloaded outside the app has to be usable the
  // moment the wizard asks for a language. Same command and validation as
  // Settings -> import; the record it returns marks the row Installed and
  // selects it, so no second install is asked for.
  async function locatePackOnboarding(file: File) {
    setOnboardError(null);
    if (!inv) return;
    setInstallingPack("__locate__");
    try {
      const imported = (await inv("import_pack", {
        dataB64: await readFileB64(file),
      })) as InstalledPack;
      setInstalledPacks((prev) =>
        prev.includes(imported.pack_id) ? prev : [...prev, imported.pack_id],
      );
      setPacks((await inv("available_packs")) as PackCandidate[]);
      setSelectedPack(imported.pack_id);
    } catch (e) {
      setOnboardError(`That pack file could not be installed: ${String(e)}`);
    } finally {
      setInstallingPack(null);
      setEngineProgress(null);
    }
  }

  // Choosing a learning language is not a gate: skipping leaves the profile
  // with no active pack, and Settings sets it later.
  function skipPackChoice() {
    setOnboardError(null);
    setSelectedPack(null);
    setStep("microphone");
  }

  /** K-72: plain names for the speech components, so the onboarding step
   * reads as capabilities, not raw catalog ids the learner cannot act on.
   * Since ADR-0024 deleted runtime synthesis the catalog carries recognition
   * models only, so the model size is what distinguishes the rows. */
  function speechLabel(m: { id: string; runtime: string }): string {
    const tail = m.id.slice(m.id.lastIndexOf(".") + 1);
    if (m.runtime === "whisper.cpp")
      return `Speech recognition (Whisper ${tail.charAt(0).toUpperCase()}${tail.slice(1)})`;
    if (m.runtime === "sherpa-onnx") return "Speech recognition (sherpa-onnx Whisper)";
    return m.id;
  }

  async function loadSpeechComponents() {
    if (!inv) return;
    try {
      const all = (await inv("available_models")) as Array<{
        id: string;
        runtime: string;
        installed: boolean;
        installable: boolean;
        size_bytes: number;
        role: "recognition" | "synthesis";
      }>;
      setSpeechComponents(
        all.map((m) => ({
          id: m.id,
          name: speechLabel(m),
          installed: m.installed,
          installable: m.installable,
          size_bytes: m.size_bytes,
          role: m.role,
        })),
      );
    } catch {
      // A failed catalog read leaves the list empty; the step then offers
      // nothing to install rather than pretending components exist.
      setSpeechComponents([]);
    }
  }

  // K-72: "yes" to the microphone does not end setup — it chains into
  // the speech setup step, so the downloads are handled (or consciously
  // skipped) the moment the learner opts into speaking.
  function chooseMicrophone() {
    setMicChosen(true);
    setStep("speech-setup");
    void loadSpeechComponents();
  }

  async function installSpeechComponents() {
    if (!inv) return;
    setOnboardError(null);
    setSpeechInstalling(true);
    try {
      for (const c of speechComponents.filter((x) => !x.installed && x.installable)) {
        await inv("install_model", { modelId: c.id });
      }
    } catch (e) {
      setOnboardError(`Speech download failed: ${String(e)}`);
    } finally {
      setSpeechInstalling(false);
      setEngineProgress(null);
    }
    await loadSpeechComponents();
  }

  async function finishOnboarding(micEnabled: boolean) {
    setOnboardError(null);
    if (inv && profileId) {
      try {
        await inv("complete_onboarding", { profileId, packId: selectedPack ?? null, micEnabled });
      } catch (e) {
        // Worth stopping for: nothing was recorded, so the same button is the
        // retry.
        setOnboardError(`Setup could not be completed: ${String(e)}`);
        return;
      }
      // Same entry invariant as resume — the profile exists from here on, so a
      // failed fill-in read must not hold the learner inside the wizard.
      try {
        const home = (await inv("home_state", { profileId })) as {
          display_name: string;
          plan: SessionPlan;
          next_goal: NextGoalView | null;
        };
        setDisplayName(home.display_name);
        applyPlan(home.plan);
        setNextGoal(home.next_goal);
        setFirstRunSteps((await inv("first_run_steps", { profileId })) as FirstRunStep[]);
        const envs = (await inv("world_state", { profileId })) as WorldEnvironment[];
        setEnvironments(envs);
        setDisplay((await inv("display_settings", { profileId })) as DisplaySettingsView);
        await loadProfilePrefs(profileId);
      } catch (e) {
        console.error("setup fill-in reads failed", e);
      }
      void refreshLanguages(profileId).catch(() => {});
    }
    setStep("done");
  }

  // K-05: resume an existing local profile at launch. The native side
  // validates the id; nothing is sent off this device.
  async function resumeProfile(id: string) {
    setOnboardError(null);
    if (!inv) return;
    let p: ProfileSummary;
    try {
      p = (await inv("resume_profile", { profileId: id })) as ProfileSummary;
    } catch (e) {
      setOnboardError(`Could not resume this profile: ${String(e)}`);
      return;
    }
    setProfileId(p.id);
    setDisplayName(p.display_name);
    // Owner 2026-10-12: opening your own profile must never depend on a
    // content read. The step flips here, so every read below only fills the
    // screens in — if one fails the learner is still inside the app, where
    // Home says plainly that no language is set, instead of being held at
    // the resume gate by an error they cannot act on.
    setStep("done");
    try {
      const home = (await inv("home_state", { profileId: p.id })) as {
        display_name: string;
        plan: SessionPlan;
        next_goal: NextGoalView | null;
      };
      setDisplayName(home.display_name);
      applyPlan(home.plan);
      setNextGoal(home.next_goal);
      setFirstRunSteps((await inv("first_run_steps", { profileId: p.id })) as FirstRunStep[]);
      const envs = (await inv("world_state", { profileId: p.id })) as WorldEnvironment[];
      setEnvironments(envs);
      setDisplay((await inv("display_settings", { profileId: p.id })) as DisplaySettingsView);
      await loadProfilePrefs(p.id);
    } catch (e) {
      console.error("profile entry reads failed", e);
    }
    void refreshLanguages(p.id).catch(() => {});
  }

  async function changeBudget(minutes: number) {
    const previous = budget;
    setBudget(minutes);
    if (inv && profileId) {
      try {
        applyPlan((await inv("practice_plan", { profileId, minutes })) as SessionPlan);
      } catch (e) {
        // The optimistic value is only real once the engine has rebuilt the
        // plan around it; otherwise the learner keeps the old budget.
        setBudget(previous);
        setSettingsError(
          `The study budget could not be saved: ${String(e)}. Reverted to ${previous} minutes.`,
        );
      }
    }
  }

  // K-41: stress-mark visibility toggle (display setting only).
  async function setStressMode(mode: "auto" | "on" | "off") {
    if (inv && profileId) {
      setDisplay(
        (await inv("set_display_settings", { profileId, stressMode: mode })) as DisplaySettingsView,
      );
    }
  }

  // SETTINGS-001: Settings controls are engine-backed; values come from
  // and go back to the store via the new commands — no UI-only setting.
  async function loadProfilePrefs(pid: string) {
    if (!inv) return;
    try {
      setMicEnabled((await inv("get_microphone_enabled", { profileId: pid })) as boolean);
      setMicDevice((await inv("get_microphone_device", { profileId: pid })) as string | null);
      setPlaybackDevice((await inv("get_playback_device", { profileId: pid })) as string | null);
      setRomajiMode((await inv("get_romaji_mode", { profileId: pid })) as RomajiMode);
    } catch {
      /* keep the conservative defaults; opening Settings re-reads them */
    }
  }

  async function openSettings() {
    setRoute("settings");
    setSettingsError(null);
    setSettingsExportPath(null);
    setSettingsDeleteArmed(false);
    if (!inv || !profileId) return;
    try {
      setMicEnabled((await inv("get_microphone_enabled", { profileId })) as boolean);
      setMicDevice((await inv("get_microphone_device", { profileId })) as string | null);
      setPlaybackDevice((await inv("get_playback_device", { profileId })) as string | null);
      setRomajiMode((await inv("get_romaji_mode", { profileId })) as RomajiMode);
      await refreshSpeech();
      // K-77: Settings now hosts language-pack management and the speech
      // runtime status too, so opening it primes the reads the old
      // Languages tab did. K-90 deleted the synthesis status read.
      await refreshLanguages();
      await refreshAligner();
      await refreshMicrophones();
      await refreshOutputs();
    } catch (e) {
      setSettingsError(String(e));
    }
  }

  // K-64: names exist only after the browser has granted microphone access
  // once, and a session with no microphone (or no permission handler) can
  // refuse the query outright. That must leave Settings intact: the picker
  // stays empty and the copy explains why. The timeout is not politeness —
  // WebKitGTK is entitled to sit on a device query it can never answer, and a
  // settings nicety is not allowed to freeze the app.
  async function refreshMicrophones() {
    try {
      const listed = await Promise.race([
        listMicrophones(navigator.mediaDevices),
        after<Microphone[]>(2000, []),
      ]);
      setMicDevices(listed);
    } catch {
      setMicDevices([]);
    }
  }

  // K-88: outputs, same discipline as microphones — WebKitGTK is entitled
  // to sit on a device query it can never answer, so the race and the empty
  // list are legal answers. The capability probe is what the Settings copy
  // branches on: we never show a picker this runtime cannot honour.
  async function refreshOutputs() {
    const probe = new Audio();
    setCanRouteOutput(
      typeof (probe as HTMLMediaElement & { setSinkId?: unknown }).setSinkId === "function",
    );
    try {
      const listed = await Promise.race([
        listOutputs(navigator.mediaDevices),
        after<SpeakerOutput[]>(2000, []),
      ]);
      setPlaybackOutputs(listed);
    } catch {
      setPlaybackOutputs([]);
    }
  }

  async function setMicSetting(enabled: boolean) {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      setMicEnabled((await inv("set_microphone_enabled", { profileId, enabled })) as boolean);
    } catch (e) {
      setSettingsError(String(e));
    }
  }

  async function pickMicrophoneSetting(deviceId: string | null) {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      setMicDevice((await inv("set_microphone_device", { profileId, deviceId })) as string | null);
    } catch (e) {
      setSettingsError(String(e));
    }
  }

  async function pickPlaybackSetting(deviceId: string | null) {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      setPlaybackDevice(
        (await inv("set_playback_device", { profileId, deviceId })) as string | null,
      );
    } catch (e) {
      setSettingsError(String(e));
    }
  }

  async function setRomajiSetting(mode: RomajiMode) {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      setRomajiMode((await inv("set_romaji_mode", { profileId, mode })) as RomajiMode);
    } catch (e) {
      setSettingsError(String(e));
    }
  }

  async function exportProfileData() {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      setSettingsExportPath((await inv("profile_export", { profileId })) as string);
    } catch (e) {
      setSettingsError(String(e));
    }
  }
  // R06: the check is read-only; the write only happens on the labelled
  // confirm control, always as a new profile, never over the profile in use.
  async function previewRestore() {
    if (!inv) return;
    setSettingsError(null);
    setRestoreOutcome(null);
    const path = restorePath.trim();
    try {
      const preview = (await inv("profile_import_preview", {
        path,
        mode: "new",
      })) as ImportPreview;
      setRestoreChecked({ path, preview });
    } catch (e) {
      setRestoreChecked(null);
      setSettingsError(String(e));
    }
  }

  async function confirmRestore() {
    if (!inv || !restoreChecked || !restoreChecked.preview.supported) return;
    setSettingsError(null);
    try {
      const outcome = (await inv("profile_import", {
        path: restoreChecked.path,
        mode: "new",
      })) as ImportOutcome;
      setRestoreOutcome(outcome);
      // The restored profile is in the picker without a restart.
      setProfiles((await inv("list_profiles")) as ProfileSummary[]);
    } catch (e) {
      setSettingsError(String(e));
    }
  }

  // Two-step delete: the first click only arms the confirmation; only
  // the labelled confirm control fires `profile_delete` (never a
  // native window.confirm).
  async function confirmProfileDelete() {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      await inv("profile_delete", { profileId });
    } catch (e) {
      setSettingsError(String(e));
      return;
    }
    // The profile no longer exists: back to the wizard, clean state.
    setProfileId(null);
    setDisplayName("");
    applyPlan(EMPTY_PLAN);
    setEnvironments([]);
    setGoals([]);
    setProgress([]);
    // D7: a deleted profile's active pack must not be carried into the
    // next session — there is no active pack until one is chosen.
    setSelectedPack(null);
    setActiveIds([]);
    setMicEnabled(false);
    setRomajiMode("auto");
    setSettingsExportPath(null);
    setSettingsDeleteArmed(false);
    setStep("welcome");
  }

  // O-06 2026-10-10 (P1): leave the current profile without deleting it.
  // Same clean-state discipline as profile deletion — no surface from the
  // old profile may carry into the next session — but the picker shows the
  // resume list, not the new-profile wizard. Progress is untouched.
  async function switchProfile() {
    if (!inv || !profileId) return;
    setSettingsError(null);
    setProfileId(null);
    setDisplayName("");
    applyPlan(EMPTY_PLAN);
    setEnvironments([]);
    setGoals([]);
    setProgress([]);
    // D7 discipline: no active pack until the next profile chooses one.
    setSelectedPack(null);
    setActiveIds([]);
    setMicEnabled(false);
    setRomajiMode("auto");
    setSettingsExportPath(null);
    setSettingsDeleteArmed(false);
    setSettingsSwitchArmed(false);
    try {
      setProfiles((await inv("list_profiles")) as ProfileSummary[]);
      setStep("resume");
      // Land where a launch-time resume lands, not in Settings.
      setRoute("practice");
    } catch (e) {
      // Honest failure: stay where we are with an error, never strand the
      // learner on an empty picker.
      setSettingsError(`The profile list could not be loaded: ${String(e)}`);
    }
  }
  async function openProgress() {
    setRoute("progress");
    setProgressError(null);
    if (inv && profileId) {
      setProgressLoading(true);
      try {
        setProgress((await inv("progress_summary", { profileId })) as ProgressRow[]);
        setGoals((await inv("goal_map", { profileId })) as GoalCard[]);
      } catch (e) {
        // An honest alert, never an empty "no progress yet" claim: the data
        // may exist; the read is what failed.
        setProgressError(`Progress could not be loaded: ${String(e)}`);
      } finally {
        setProgressLoading(false);
      }
    }
  }

  // WRITE-001: typed production-writing practice. Grading and evidence
  // recording happen natively; hints are scaffolds recorded as support.
  async function openWriting() {
    setRoute("writing");
    setWritingError(null);
    setWritingLoaded(false);
    setWritingDraft("");
    setWritingGraded(false);
    setWritingExpected("");
    setWritingScaffold({});
    setWritingUsedHint(false);
    setWritingHintKind(null);
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
        setWritingLoaded(true);
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
    setWritingHintKind(kind);
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
          hintKind: writingHintKind,
          sessionId: planSessionRef.current,
        })) as { correct: boolean; expected?: string };
        setWritingCorrect(grade.correct);
        setWritingExpected(grade.correct ? "" : (grade.expected ?? ""));
        setWritingGraded(true);
      } catch (e) {
        setWritingError(String(e));
      }
    }
  }

  // UX-003: first lessons. Plan items are runnable; grading, evidence,
  // and scheduling happen natively.
  async function openPractice(item: PlannedItem) {
    // Review finding R02: a saved (mined) word is scheduled by its own
    // scheduler and has no pack content behind it, so it opens the saved
    // word's review card — a pack practice task on a `mine-…` id could only
    // fail, and mined practice must never become mastery evidence.
    if (item.reason === "saved-review") {
      const miner = detectInvoke();
      if (!miner || !profileId) return;
      try {
        // The engine owns what "due" means (D8): ask it for the due list
        // and open that word's card instead of re-deriving due-ness here.
        const due = (await miner("mine_due", { profileId })) as MineItem[];
        const found = due.find((m) => m.id === item.content_id);
        setRoute("words");
        if (!found) {
          setMineNotice("That saved word is not due right now.");
          return;
        }
        setMineNotice(null);
        setMineReview({ item: found, revealed: false });
      } catch (e) {
        setMineError(String(e));
      }
      return;
    }
    setPracticeError(null);
    setPracticeGraded(false);
    setPracticeCorrectChoice("");
    setPracticeRevealed(false);
    setPracticeTarget({ contentId: item.content_id, modality: item.modality });
    setLesson(null);
    setLessonSeen(false);
    if (inv && profileId) {
      try {
        setLesson(
          (await inv("lesson_plan", {
            profileId,
            contentId: item.content_id,
          })) as LessonPlan | null,
        );
      } catch {
        // A unit that declares no activities has no lesson to show; the
        // drill alone is the honest fallback, never a fabricated summary.
        setLesson(null);
      }
    }
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
            // K-78/K-90: the only audio failure left is the pack shipping
            // no recording; the engine's own sentence says so, and anything
            // unexpected surfaces its raw text rather than a canned claim.
            setPracticeAudioError(
              isMediaMissing(String(e))
                ? `${audioFailureMessage(String(e))} Text practice still works.`
                : `Audio failed: ${String(e)}. Text practice still works.`,
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
        sessionId: planSessionRef.current,
        stageId: stageForDrill(lesson, practiceTarget.modality),
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
        sessionId: planSessionRef.current,
        stageId: stageForDrill(lesson, practiceTarget.modality),
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
      try {
        applyPlan((await inv("practice_plan", { profileId, minutes: budget })) as SessionPlan);
      } catch (e) {
        setPracticeError(`The plan could not be refreshed: ${String(e)}`);
      }
    }
    // A session keeps working the activities it started with; the refreshed
    // plan is read the next time Home is, not re-selected mid-session.
    if (sessionQueueRef.current) void advanceSession(1);
  }

  /// An activity belongs to a session only if this build has a practice
  /// screen for it: the hub's verb table is that guarantee, and a saved word
  /// opens a review card instead of a runner. Anything else is named in the
  /// session summary rather than silently dropped.
  function isSessionRunnable(item: PlannedItem): boolean {
    return item.reason !== "saved-review" && RUNNABLE_MODALITIES[item.modality] !== undefined;
  }

  function publishSession(status: SessionStatus | null) {
    const q = sessionQueueRef.current;
    setSession(
      q && status
        ? { status, total: q.items.length, done: q.done, notRunnable: q.notRunnable }
        : null,
    );
  }

  async function startSession() {
    const runnable = plan.items.filter(isSessionRunnable);
    const notRunnable = plan.items.length - runnable.length;
    if (runnable.length === 0) {
      // Nothing this build can run: name that instead of opening a loop.
      setSessionOutcome({ done: 0, total: plan.items.length, reason: "finished", notRunnable });
      return;
    }
    const first = runnable[0];
    if (!first) return; // the empty case above already covers this
    sessionQueueRef.current = { items: runnable, index: 0, done: 0, notRunnable };
    setSessionOutcome(null);
    publishSession("running");
    await openPractice(first);
  }

  /// `counted` is the activity that just ended. When the snapshot runs out
  /// the session closes with a plain summary — no reward language, and no
  /// claim that an activity the learner never did was finished.
  async function advanceSession(counted: number) {
    const q = sessionQueueRef.current;
    if (!q) return;
    q.done += counted;
    q.index += 1;
    const next = q.items[q.index];
    if (next) {
      publishSession("running");
      await openPractice(next);
      return;
    }
    const outcome: SessionOutcomeView = {
      done: q.done,
      total: q.items.length + q.notRunnable,
      reason: "finished",
      notRunnable: q.notRunnable,
    };
    sessionQueueRef.current = null;
    setSession(null);
    setSessionOutcome(outcome);
  }

  function closeSession(reason: "stopped") {
    const q = sessionQueueRef.current;
    if (!q) return;
    const outcome: SessionOutcomeView = {
      done: q.done,
      total: q.items.length + q.notRunnable,
      reason,
      notRunnable: q.notRunnable,
    };
    sessionQueueRef.current = null;
    setSession(null);
    setSessionOutcome(outcome);
    setPracticeTarget(null);
    setPracticeTask(null);
    setLesson(null);
    setLessonSeen(false);
  }

  function pauseSession() {
    if (!sessionQueueRef.current) return;
    setPracticeTarget(null);
    setPracticeTask(null);
    setLesson(null);
    setLessonSeen(false);
    publishSession("paused");
  }

  async function resumeSession() {
    const q = sessionQueueRef.current;
    if (!q) return;
    const current = q.items[q.index];
    if (!current) return; // an exhausted queue has already closed the session
    publishSession("running");
    await openPractice(current);
  }

  // K-15: placement — low-stakes diagnosis per pack assessment. Each
  // assessment gets two support-0 questions, and the session id tells the
  // engine they were presented together: two correct answers on one prompt
  // establish `supported`, not `independent`, which needs a second prompt
  // (R04; the multi-prompt generators are ACTIVITY-MODEL-001). Evidence is
  // tagged Diagnostic natively.
  async function openPlacement() {
    setRoute("placement");
    setPlacementFinished(false);
    setPlacementGraded(false);
    setPlacementHits(0);
    setPlacementError(null);
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      const planned = (await inv("placement_plan", { profileId })) as typeof placementItems;
      const seq = planned.flatMap((p) => [p, p]);
      setPlacementItems(seq);
      setPlacementIdx(0);
      const first = seq[0];
      if (first) {
        setPlacementTask(
          (await inv("practice_task", {
            profileId,
            contentId: first.content_id,
            modality: first.modality,
            revealReading: false,
          })) as PracticeTaskView,
        );
      } else {
        setPlacementTask(null);
        setPlacementFinished(true);
      }
    } catch (e) {
      setPlacementError(String(e));
    }
  }

  async function answerPlacement(index: number) {
    const inv = detectInvoke();
    const item = placementItems[placementIdx];
    if (!inv || !profileId || !item) return;
    try {
      const g = (await inv("placement_submit", {
        profileId,
        assessmentId: item.assessment_id,
        contentId: item.content_id,
        modality: item.modality,
        choiceIndex: index,
        sessionId: planSessionRef.current,
      })) as { correct: boolean; correct_choice: string };
      if (g.correct) setPlacementHits((c) => c + 1);
      setPlacementCorrect(g.correct);
      setPlacementCorrectChoice(g.correct_choice);
      setPlacementGraded(true);
    } catch (e) {
      setPlacementError(String(e));
    }
  }

  async function nextPlacement() {
    const inv = detectInvoke();
    const next = placementIdx + 1;
    setPlacementGraded(false);
    if (next >= placementItems.length) {
      setPlacementFinished(true);
      setPlacementTask(null);
      return;
    }
    const item = placementItems[next];
    if (!item) {
      setPlacementFinished(true);
      setPlacementTask(null);
      return;
    }
    setPlacementIdx(next);
    if (!inv || !profileId) return;
    try {
      setPlacementTask(
        (await inv("practice_task", {
          profileId,
          contentId: item.content_id,
          modality: item.modality,
          revealReading: false,
        })) as PracticeTaskView,
      );
    } catch (e) {
      setPlacementError(String(e));
    }
  }

  // K-16: kanji drill — WaniKani-style meaning then reading for one
  // character; grading and evidence go native on the two existing
  // dimensions, and the scheduler decides when it resurfaces.
  async function openKanji() {
    setRoute("kanji");
    setKanjiActive(null);
    setKanjiStage(null);
    setKanjiTask(null);
    setKanjiError(null);
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setKanjiCards((await inv("kanji_list", { profileId })) as typeof kanjiCards);
    } catch (e) {
      setKanjiError(String(e));
    }
  }

  async function startKanji(card: (typeof kanjiCards)[number]) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    setKanjiActive(card);
    setKanjiStage("meaning");
    setKanjiGraded(false);
    setKanjiError(null);
    try {
      setKanjiTask(
        (await inv("practice_task", {
          profileId,
          contentId: card.id,
          modality: "recall-meaning",
          revealReading: false,
        })) as PracticeTaskView,
      );
    } catch (e) {
      setKanjiTask(null);
      setKanjiError(String(e));
    }
  }

  async function chooseKanji(index: number) {
    const inv = detectInvoke();
    if (!inv || !profileId || !kanjiActive || !kanjiStage) return;
    try {
      const g = (await inv("practice_submit", {
        profileId,
        contentId: kanjiActive.id,
        modality: kanjiStage === "meaning" ? "recall-meaning" : "orthography-recognition",
        choiceIndex: index,
        revealReading: false,
        sessionId: planSessionRef.current,
      })) as { correct: boolean; correct_choice: string };
      setKanjiCorrect(g.correct);
      setKanjiCorrectChoice(g.correct_choice);
      setKanjiGraded(true);
    } catch (e) {
      setKanjiError(String(e));
    }
  }

  async function nextKanji() {
    const inv = detectInvoke();
    if (!inv || !profileId || !kanjiActive) return;
    setKanjiGraded(false);
    if (kanjiStage === "meaning") {
      setKanjiStage("reading");
      try {
        setKanjiTask(
          (await inv("practice_task", {
            profileId,
            contentId: kanjiActive.id,
            modality: "orthography-recognition",
            revealReading: false,
          })) as PracticeTaskView,
        );
      } catch (e) {
        setKanjiTask(null);
        setKanjiError(String(e));
      }
      return;
    }
    setKanjiActive(null);
    setKanjiStage(null);
    setKanjiTask(null);
    try {
      setKanjiCards((await inv("kanji_list", { profileId })) as typeof kanjiCards);
    } catch (e) {
      setKanjiError(String(e));
    }
  }

  function playPracticeAudio() {
    if (!practiceAudio) return;
    const bytes = Uint8Array.from(atob(practiceAudio.wavB64), (c) => c.charCodeAt(0));
    playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
  }

  // K-81: the hub's entry points. Each card reuses the exact open* handler
  // its former tab used, so behavior cannot depend on how the learner got
  // there.
  function openMode(mode: HubMode) {
    switch (mode) {
      case "pronunciation":
        setRoute("pronunciation");
        break;
      case "dictation":
        void openDictation();
        break;
      case "writing":
        void openWriting();
        break;
      case "scenarios":
        void openScenarios();
        break;
      case "shadowing":
        void openShadowing();
        break;
      case "reading":
        void openReading();
        break;
      case "kanji":
        void openKanji();
        break;
      case "placement":
        void openPlacement();
        break;
    }
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
    const item = shadowItems?.[shadowIdx];
    if (!inv || !item) return;
    try {
      const req = await packRequest<{ wav_b64: string; source: string }>(
        inv,
        selectedPack,
        "speech_audio",
        // K-65b: the native side resolves the speakable string from the pack
        // record. Sending the written form here is what played noise for
        // kanji-primary entries.
        { contentId: item.content_id },
      );
      if (!req.ok) {
        setAudioMsg(audioFailureMessage(req.error));
        return;
      }
      const a = req.value;
      setAudioMsg(null);
      const bytes = Uint8Array.from(atob(a.wav_b64), (c) => c.charCodeAt(0));
      playBlobUrl(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
    } catch (e) {
      setAudioMsg(audioFailureMessage(String(e)));
    }
  }

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
      setStoryError(audioFailureMessage(String(e)));
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
      const res = (await inv("mine_add", {
        profileId,
        surface: mineSurface,
        reading: mineReading || null,
        gloss: mineGloss || null,
        sourceCitation: (sourceCitation ?? mineSource) || "manual",
      })) as { id: string; was_new: boolean };
      // K-61: a repeat mine keeps the original entry (and its review
      // history). Say so in the learner's own words instead of letting a
      // database constraint surface as an error.
      if (!res.was_new) {
        setMineNotice(`"${mineSurface.trim()}" is already in My words — kept the original entry.`);
      }
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
      const res = (await inv("mine_add", {
        profileId,
        surface,
        reading,
        gloss,
        sourceCitation: storyActive.id,
      })) as { id: string; was_new: boolean };
      // K-61: mining a word already kept is not an error; the original
      // entry (and its review history) stays. Note it for when the
      // learner opens My words — never as a story error.
      if (!res.was_new) {
        setMineNotice(`"${surface}" is already in My words — kept the original entry.`);
      }
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

  async function startMineReview() {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      // D8: the engine owns what "due" means (`mine_due` compares the stored
      // schedule against the same clock the scheduler wrote). Comparing
      // `due_at` to a client-side clock here could disagree with it, so the
      // duplicated local filter is gone.
      const due = (await inv("mine_due", { profileId })) as typeof mineItems;
      const [first] = due;
      if (!first) {
        setMineNotice("Nothing is due for review right now.");
        return;
      }
      setMineNotice(null);
      setMineReview({ item: first, revealed: false });
    } catch (e) {
      setMineError(String(e));
    }
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
  // memory only (docs/08); the engine stages short-lived WAVs in a private
  // temp dir it sweeps at startup, and no audio is ever uploaded or kept.
  // The contrast pair comes from the installed pack's phonology data (K-32),
  // never from app-internal language content.
  interface PronDemo {
    short_unit: string;
    long_unit: string;
    short_text: string;
    long_text: string;
    contrast_id: string;
    feature_id: string;
    description: string;
    measure: string | null;
  }
  const [pronDemo, setPronDemo] = useState<PronDemo | null>(null);
  useEffect(() => {
    const inv = detectInvoke();
    if (!inv) return;
    let live = true;
    // D7: with no active pack there is no phonology to read; the guard
    // refuses and the panel says why, instead of asking the engine for a
    // default pack.
    void packRequest<PronDemo>(inv, selectedPack, "pronunciation_demo", {})
      .then((r) => {
        if (!live) return;
        if (!r.ok) {
          setPronDemo(null);
          setAudioMsg(r.error);
          return;
        }
        setPronDemo(r.value);
        setAudioMsg((m) => (m === NO_ACTIVE_PACK ? null : m));
      })
      .catch(() => live && setPronDemo(null));
    return () => {
      live = false;
    };
  }, [selectedPack]);

  function playBlobUrl(url: string, retained = false) {
    const audio = new Audio(url);
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

  async function fetchDictation(offset: number) {
    const inv = detectInvoke();
    if (!inv) return;
    try {
      const req = await packRequest<DictationSentence>(inv, selectedPack, "dictation_target", {
        offset,
      });
      if (!req.ok) {
        setAudioMsg(req.error);
        setDictSentence(null);
        return;
      }
      setDictSentence(req.value);
      setDictTarget(req.value.reading);
      setDictResult(null);
    } catch {
      setDictSentence(null);
    }
  }

  function openDictation() {
    setRoute("dictation");
    setDictOffset(0);
    void fetchDictation(0);
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
  const captureRouteRef = useRef<"pronunciation" | "dictation">("pronunciation");

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
  }, [captureOwner, profileId, micEnabled, route, step, installedPacks]);

  // The same release when the app itself goes away (window closed, the
  // profile list swapped the tree out).
  useEffect(() => () => captureOwner.cancel(), [captureOwner]);

  if (step !== "done") {
    return (
      <AppShell productName="Open Language Learning Platform" nav={[]}>
        <Onboarding
          step={step}
          notice={notice}
          packs={packs}
          selectedPack={selectedPack}
          installedPacks={installedPacks}
          installedUnknown={installedUnknown}
          profileName={profileName}
          onProfileName={setProfileName}
          onCreateProfile={() => void createProfile()}
          onSelectPack={setSelectedPack}
          onInstall={(id) => void install(id)}
          onLocatePack={(f) => void locatePackOnboarding(f)}
          onSkipPack={skipPackChoice}
          onEnableMic={chooseMicrophone}
          onSkipMic={() => void finishOnboarding(false)}
          onInstallSpeech={() => void installSpeechComponents()}
          onSkipSpeech={() => void finishOnboarding(true)}
          onStartSpeech={() => void finishOnboarding(true)}
          speechComponents={speechComponents}
          speechInstalling={speechInstalling}
          micChosen={micChosen}
          onContinue={() => setStep("microphone")}
          profiles={profiles}
          onResume={(id) => void resumeProfile(id)}
          onCreateNew={() => setStep("welcome")}
          error={onboardError}
          progress={engineProgress}
          installing={installingPack}
        />
      </AppShell>
    );
  }

  // Owner 2026-10-07: one pack-level posture statement, derived from
  // the active pack's own review-posture tallies, shown wherever the
  // pack is named. Null (no claim) until installed/claims data loads.
  const activeClaims = claims?.find((c) => c.pack_id === activeIds[0]);
  // ADR-0029: the pack's own manifest declares whether its content is written
  // right-to-left (`capabilities.rtl`); the host reads it and ships it on the
  // installed-pack listing. It steers only pack-text containers, never the
  // banner or route navigation.
  const activeRecord = installed.find((i) => i.pack_id === activeIds[0]);
  const activePack =
    activeIds[0] && activeClaims
      ? {
          name: activeRecord?.display_name ?? activeIds[0],
          posture: packPosture(activeClaims.postures),
        }
      : null;

  return (
    <AppShell
      productName="Open Language Learning Platform"
      nav={[]}
      packDirection={activeRecord?.rtl ? "rtl" : "ltr"}
      packLocale={activeRecord?.locale}
      routeNav={
        <nav aria-label="Routes" className="routes">
          {/* K-81 option A (owner 2026-10-10): five destinations. The modes
              behind Practice are unchanged routes; the hub replaced tabs. */}
          <button
            type="button"
            className="tab"
            aria-current={route === "practice" ? "page" : undefined}
            onClick={() => {
              setPracticeTarget(null);
              setRoute("practice");
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="tab"
            aria-current={
              route === "hub" ||
              route === "pronunciation" ||
              route === "dictation" ||
              route === "writing" ||
              route === "scenarios" ||
              route === "shadowing" ||
              route === "reading" ||
              route === "kanji" ||
              route === "placement"
                ? "page"
                : undefined
            }
            onClick={() => setRoute("hub")}
          >
            Practice
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "words" ? "page" : undefined}
            onClick={() => void openWords()}
          >
            My Words
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
            aria-current={route === "settings" ? "page" : undefined}
            onClick={() => void openSettings()}
          >
            Settings
          </button>
        </nav>
      }
    >
      {playbackError ? (
        <p role="alert" className="alert" data-testid="playback-error">
          {playbackError}
        </p>
      ) : null}
      {route === "hub" ? (
        <PracticeHub onOpen={openMode} kanjiAvailable={kanjiAvailable} />
      ) : route === "pronunciation" ? (
        <>
          {audioMsg && (
            <p role="status" className="notice">
              {audioMsg}
            </p>
          )}
          {pronDemo ? (
            <PronunciationPractice
              shortText={pronDemo.short_text}
              longText={pronDemo.long_text}
              description={pronDemo.description}
              featureId={pronDemo.feature_id}
              measure={pronDemo.measure}
              result={pronResult}
              recording={recording}
              hasAttempt={attemptUrl !== null}
              onRecord={() => {
                captureRouteRef.current = "pronunciation";
                recordAttempt();
              }}
              onStop={stopAndCheck}
              onPlayReference={(w) => void playReference(w)}
              onPlayAttempt={() => attemptUrl && playBlobUrl(attemptUrl, true)}
            />
          ) : (
            <section aria-label="Pronunciation">
              <h1>Pronunciation</h1>
              <p className="empty">
                The selected pack declares no pronunciation contrasts yet, so there is nothing to
                practice here.
              </p>
            </section>
          )}
        </>
      ) : route === "dictation" ? (
        <>
          {audioMsg && (
            <p role="status" className="notice">
              {audioMsg}
            </p>
          )}
          <DictationPractice
            target={dictTarget}
            onTargetChange={setDictTarget}
            sentence={dictSentence}
            onNewSentence={() => newDictationSentence()}
            result={dictResult}
            recording={recording}
            hasAttempt={attemptUrl !== null}
            onRecord={() => {
              captureRouteRef.current = "dictation";
              recordAttempt();
            }}
            onStop={stopAndCheck}
            onPlayAttempt={() => attemptUrl && playBlobUrl(attemptUrl, true)}
          />
        </>
      ) : route === "shadowing" ? (
        <ShadowingPanel
          items={shadowItems}
          index={shadowIdx}
          error={shadowError}
          audioMsg={audioMsg}
          recording={recording}
          attemptUrl={attemptUrl}
          onRetry={() => void openShadowing()}
          onOpenSetup={() => void openSettings()}
          onPlayModel={() => void playShadowModel()}
          onRecord={recordAttempt}
          onStop={stopAndCheck}
          onPlayAttempt={() => {
            if (attemptUrl) playBlobUrl(attemptUrl, true);
          }}
          onStep={(delta) =>
            setShadowIdx((i) => Math.max(0, Math.min((shadowItems?.length ?? 0) - 1, i + delta)))
          }
        />
      ) : route === "reading" ? (
        <ReadingPanel
          storyList={storyList}
          storyActive={storyActive}
          storyLookup={storyLookup}
          storyError={storyError}
          onOpenStory={(id) => void openStory(id)}
          onBack={() => void openReading()}
          onPlaySentence={(id) => void playStoryAudio(id)}
          onToggleLookup={(id) => setStoryLookup(storyLookup === id ? null : id)}
          onMine={(surface, reading, gloss) => void mineFromStory(surface, reading, gloss)}
        />
      ) : route === "words" ? (
        <MyWordsPanel
          items={mineItems}
          review={mineReview}
          error={mineError}
          notice={mineNotice}
          draft={{
            surface: mineSurface,
            reading: mineReading,
            gloss: mineGloss,
            source: mineSource,
          }}
          onDraftChange={(field, value) =>
            field === "surface"
              ? setMineSurface(value)
              : field === "reading"
                ? setMineReading(value)
                : field === "gloss"
                  ? setMineGloss(value)
                  : setMineSource(value)
          }
          onAdd={() => void addMine()}
          onRemove={(id) => void removeMine(id)}
          onGrade={(again) => void gradeMine(again)}
          onStartReview={startMineReview}
          onReveal={() => setMineReview((r) => (r ? { ...r, revealed: true } : r))}
        />
      ) : route === "placement" ? (
        <section aria-label="Placement">
          <h1>Placement</h1>
          <p className="empty">
            Low-stakes checks on what you may already know — two quick questions per goal. Correct
            answers mark known foundations, and practice skips ahead automatically.
          </p>
          {placementError && (
            <p role="alert" className="alert">
              {placementError}
            </p>
          )}
          {placementFinished ? (
            <div className="field">
              <p>
                Placement complete: {placementHits} of {placementItems.length} correct. Known
                foundations unlock in Practice automatically.
              </p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void openPlacement()}
                >
                  Run again
                </button>
              </div>
            </div>
          ) : placementTask ? (
            <PracticeRunner
              task={placementTask}
              graded={placementGraded}
              correct={placementCorrect}
              correctChoice={placementCorrectChoice}
              onChoose={(i) => void answerPlacement(i)}
              onNext={() => void nextPlacement()}
              stress={stressEnabled(display)}
            />
          ) : (
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void openPlacement()}
              >
                Start placement
              </button>
            </div>
          )}
        </section>
      ) : route === "kanji" ? (
        <section aria-label="Kanji">
          <h1>Kanji</h1>
          <p className="empty">
            Characters your pack teaches, with their decomposition. Drill the meaning, then the
            reading; the scheduler brings each one back when it is due.
          </p>
          {kanjiError && (
            <p role="alert" className="alert">
              {kanjiError}
            </p>
          )}
          {kanjiActive && kanjiTask ? (
            <div className="field">
              <PackText tag="p" className="prompt">
                {kanjiActive.character}
              </PackText>
              <p>
                <small>
                  <PackText tag="span">{kanjiActive.radicals.join(" + ")}</PackText>
                  {kanjiActive.mnemonic ? (
                    <>
                      {" — "}
                      <em dir="ltr">{kanjiActive.mnemonic}</em>
                    </>
                  ) : null}
                </small>
              </p>
              <PracticeRunner
                task={kanjiTask}
                graded={kanjiGraded}
                correct={kanjiCorrect}
                correctChoice={kanjiCorrectChoice}
                heading={kanjiStage === "meaning" ? "What does it mean?" : "How do you read it?"}
                onChoose={(i) => void chooseKanji(i)}
                stress={stressEnabled(display)}
                onNext={() => void nextKanji()}
              />
            </div>
          ) : kanjiCards.length ? (
            <ul className="story-list">
              {kanjiCards.map((c) => (
                <li key={c.id}>
                  <button type="button" className="btn" onClick={() => void startKanji(c)}>
                    <PackText tag="span">{c.character}</PackText>{" "}
                    <small>
                      {(c.meaning_due ?? c.reading_due)
                        ? `due ${c.meaning_due ?? c.reading_due}`
                        : "new"}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">
              Your current pack teaches no kanji, so there is nothing to drill here.
            </p>
          )}
        </section>
      ) : route === "progress" ? (
        <>
          {progressError && (
            <p role="alert" className="alert">
              {progressError}
              <button type="button" className="btn" onClick={() => void openProgress()}>
                Retry
              </button>
            </p>
          )}
          {progressLoading && <p className="empty">Loading progress…</p>}
          {!progressError && (
            <>
              <CanDoSummary goals={goals} rows={progress} nextGoal={nextGoal} />
              <GoalMap goals={goals} />
              <ProgressView rows={progress} />
            </>
          )}
        </>
      ) : route === "writing" ? (
        <>
          {writingTask && writingError && (
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
              expected={writingExpected}
              onDraft={setWritingDraft}
              onSubmit={() => void submitWriting()}
              stress={stressEnabled(display)}
              onHint={showWritingHint}
            />
          ) : writingError ? (
            // A failed read is an error, never the empty-state story: the
            // pack may well have targets. (K-76/K-78 discipline.)
            <section aria-label="Writing practice">
              <h1>Writing practice</h1>
              <p role="alert" className="alert">
                {writingError}
                <button type="button" className="btn" onClick={() => void openWriting()}>
                  Retry
                </button>
              </p>
            </section>
          ) : writingLoaded ? (
            <section aria-label="Writing practice">
              <h1>Writing practice</h1>
              <p className="empty">
                No new writing targets in this pack right now. Practice other activities to unlock
                more, or install a larger language pack.
              </p>
            </section>
          ) : (
            <section aria-label="Writing practice">
              <h1>Writing practice</h1>
              <p className="empty">Loading…</p>
            </section>
          )}
        </>
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
      ) : route === "settings" ? (
        <>
          <LanguagePanel
            installed={installed}
            activeIds={activeIds}
            catalog={catalog}
            catalogStatus={catalogStatus}
            error={langError}
            onSwitch={(id) => void switchLearning(id)}
            onInstallCatalog={(id) => void installCatalogPack(id)}
            onImport={(b64) => void importPack(b64)}
            display={display}
            onSelectStressMode={(m) => void setStressMode(m)}
            claims={claims}
            progress={engineProgress}
            outcome={installOutcome}
            receipt={installReceipt}
            onCancelInstall={() => void cancelInstall()}
          />
          <Settings
            microphoneEnabled={micEnabled}
            onSetMicrophone={(v) => void setMicSetting(v)}
            microphoneDevice={micDevice}
            microphoneDevices={micDevices}
            onPickMicrophone={(id) => void pickMicrophoneSetting(id)}
            onDetectMicrophones={() => void refreshMicrophones()}
            romajiMode={romajiMode}
            onSetRomajiMode={(m) => void setRomajiSetting(m)}
            speechModel={speechModel}
            speechModels={speechModels}
            onSelectSpeechModel={(id) => void selectSpeechModel(id)}
            onInstallModel={(id) => void installSpeechModel(id)}
            onDeleteModel={(id) => void deleteSpeechModel(id)}
            aligner={alignerStatus}
            deviceTier={deviceTier}
            buildIdentity={buildIdentity}
            exportPath={settingsExportPath}
            onExport={() => void exportProfileData()}
            restorePath={restorePath}
            restorePreview={
              restoreChecked && restoreChecked.path === restorePath.trim()
                ? restoreChecked.preview
                : null
            }
            restoreOutcome={restoreOutcome}
            onRestorePathChange={(path) => {
              setRestorePath(path);
              setRestoreOutcome(null);
            }}
            onPreviewRestore={() => void previewRestore()}
            onConfirmRestore={() => void confirmRestore()}
            deleteArmed={settingsDeleteArmed}
            onArmDelete={() => setSettingsDeleteArmed(true)}
            onCancelDelete={() => setSettingsDeleteArmed(false)}
            playbackDevice={playbackDevice}
            playbackOutputs={playbackOutputs}
            canRouteOutput={canRouteOutput}
            onPickPlaybackDevice={(id) => void pickPlaybackSetting(id)}
            onConfirmDelete={() => void confirmProfileDelete()}
            switchArmed={settingsSwitchArmed}
            onArmSwitch={() => setSettingsSwitchArmed(true)}
            onCancelSwitch={() => setSettingsSwitchArmed(false)}
            onConfirmSwitch={() => void switchProfile()}
            error={settingsError}
          />
        </>
      ) : practiceTarget && practiceTask ? (
        <>
          {practiceError && (
            <p role="alert" className="alert">
              {practiceError}
            </p>
          )}
          {lesson && !lessonSeen ? (
            <LessonEncounter
              lesson={lesson}
              onStart={() => setLessonSeen(true)}
              onScenario={(scenarioId) => {
                void startScenario(scenarioId);
                setRoute("scenarios");
              }}
            />
          ) : (
            <>
              {lesson ? (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn"
                    data-testid="lesson-revisit"
                    onClick={() => setLessonSeen(false)}
                  >
                    Show the lesson again
                  </button>
                </div>
              ) : null}
              <PracticeRunner
                routeHeading="Practice"
                task={practiceTask}
                graded={practiceGraded}
                correct={practiceCorrect}
                correctChoice={practiceCorrectChoice}
                audioSource={
                  practiceAudio
                    ? (practiceAudio.source as "licensed-recording" | "model-output")
                    : null
                }
                audioError={practiceAudioError}
                onChoose={(i) => void choosePractice(i)}
                onNext={() => void finishPractice()}
                nextLabel={
                  session
                    ? session.total - session.done > 1
                      ? "Continue to next activity"
                      : "Finish session"
                    : undefined
                }
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
                stress={stressEnabled(display)}
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
          )}
          {session ? (
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--quiet"
                data-session-pause
                onClick={pauseSession}
              >
                Pause session
              </button>
              <button
                type="button"
                className="btn btn--quiet"
                data-session-stop
                onClick={() => closeSession("stopped")}
              >
                Stop session
              </button>
            </div>
          ) : null}
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
          activePack={activePack}
          noPack={activeIds.length === 0}
          onChooseLanguage={() => setRoute("settings")}
          plan={plan}
          activeBudget={budget}
          onBudget={(m) => void changeBudget(m)}
          environments={environments}
          nextGoal={nextGoal}
          firstRunSteps={firstRunSteps}
          onStart={(item) => void openPractice(item)}
          onStartSession={() => void startSession()}
          session={session}
          sessionOutcome={sessionOutcome}
          onResumeSession={() => void resumeSession()}
          onStopSession={() => closeSession("stopped")}
          onDismissSessionSummary={() => setSessionOutcome(null)}
        />
      )}
    </AppShell>
  );
}
