import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell, PackText } from "@openlang/ui";
import {
  Onboarding,
  ServePairingCard,
  type OnboardingStep,
  type SpeechComponent,
  type PackCandidate,
  type PrivacyNotice,
  type ProfileSummary,
} from "./onboarding";
import { PracticeHub, type HubMode } from "./hub";
import { remainingPlanSeconds, SessionChrome, StepDots } from "./session-chrome";
import { inLtsServeMode } from "./ipc";
import {
  Home,
  type PackUpdate,
  type PlannedItem,
  ProgressView,
  type ProgressRow,
  type SessionPlan,
  type GoalCard,
  GoalMap,
  CanDoSummary,
  GentleFacts,
  PlacementResultBand,
  type UnitPathNode,
  type NextOffer,
  type WorldEnvironment,
  type NextGoalView,
  type FirstRunStep,
  RUNNABLE_MODALITIES,
  type SessionOutcomeView,
  type SessionStatus,
  type SessionView,
  type CapstoneResult,
  type LearningFacts,
  bandHeader,
} from "./home";
import { MemoryStatsStrip, ProgressZeroState, type MemoryStats } from "./memory-stats";
import { EMPTY_PITCH, PronunciationPractice, type PronunciationResult } from "./pronunciation";
import { DictationPractice, type DictationResult, type DictationSentence } from "./dictation";
import {
  LanguagePanel,
  installedPacksDeclareSetting,
  packPosture,
  readFileB64,
  ROMANIZATION_DISPLAY_SETTING,
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
import {
  ErrorReviewPanel,
  type ErrorReviewCardView,
  type FormErrorOfferView,
} from "./error-review";
import { PracticeRunner, type PracticeTaskView } from "./practice";
import { LessonEncounter, drillStageId, stagePositionLabel, type LessonPlan } from "./lesson";
import { installHistoryNav, type AppLocation, type HistoryNav } from "./history-nav";
import { describeKanjiDecomposition } from "./kanji-decomposition";
import { playClip } from "./playback";
import { grammarLabelsEnabled, stressEnabled, type DisplaySettingsView } from "./stress";
import { ReadingPanel, type Story, type StorySummary, type WordCardView } from "./reading";
import { ShadowingPanel, type ShadowTarget } from "./shadowing";
import { attachKaraokeClock, type WordSpan } from "./word-timing";
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
  type KanaKeyboardMode,
} from "./settings";
import {
  inAppKeyboardForScripts,
  inputMethodAllowed,
  inputModeLabel,
  packDeclaresInAppKanaKeyboard,
} from "./ime";
import type { ImeCandidate } from "./ime-candidates";
import { LEXICON_CANDIDATES_METHOD_ID } from "./ime-candidates";
import { InputModeBubble } from "./kana-ime";
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

// Per-surface extraction (APP-SPLIT-001): the pure helpers below live in
// ./app/primitives (and ./app/placement-coverage for the placement note).
// Re-exported here so existing sibling imports (App.test.tsx,
// serve-banner.test.tsx) keep working unchanged.
import {
  after,
  activePackNote,
  detectInvoke,
  explainPackAbsence,
  loadSessionPack,
  NO_ACTIVE_PACK,
  packAttemptRequest,
  packRequest,
  serveDegradedBadge,
  SESSION_BRIDGE_MS,
  EMPTY_PLAN,
  toWav16,
  toB64,
  type Invoke,
  type PackRequest,
  type SessionPack,
} from "./app/primitives";
import { PlacementCoverageNote } from "./app/placement-coverage";
import { runSmokeHandshake } from "./app/walkthrough";
import { useServeProbe } from "./app/serve-probe";
import { handleHistoryPop, confirmHistoryExit, HistoryExitAsk } from "./app/history-wiring";
import {
  runSettingsPrimes,
  runProfileExport,
  runRestorePreview,
  runRestoreConfirm,
  runProfileDelete,
  runProfileSwitch,
  type SettingsWiringDeps,
} from "./app/settings-wiring";
import {
  runCancelInstall,
  runImportPack,
  runInstallCatalogPack,
  runRefreshInstalled,
  runRefreshLanguages,
  runUpdateFromCatalog,
  type PackWiringDeps,
} from "./app/pack-wiring";

export {
  after,
  activePackNote,
  detectInvoke,
  explainPackAbsence,
  loadSessionPack,
  NO_ACTIVE_PACK,
  packAttemptRequest,
  packRequest,
  serveDegradedBadge,
  SESSION_BRIDGE_MS,
  EMPTY_PLAN,
} from "./app/primitives";
export type { Invoke, PackRequest, SessionPack } from "./app/primitives";

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
  const [installedUnknown, setInstalledUnknown] = useState(false);
  // Sweep finding 19: "no active pack" and "the pack read failed" are
  // different states; Home distinguishes them like `installedUnknown` does.
  const [packsUnknown, setPacksUnknown] = useState(false);
  // HOME-FLASH-001: `true` while the profile-entry pack read is in flight.
  // Home must render neutral in this window — a pack-absent warning is only
  // honest on a SETTLED no-pack state, never on a read that is still running.
  const [packsPending, setPacksPending] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  // UI-HYGIENE-001: archived profiles stay out of the chooser unless the
  // learner asks to see them (so they can be un-archived).
  const [chooserShowHidden, setChooserShowHidden] = useState(false);
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
  // U02: every pack-scoped async fill carries the generation it started
  // under; a language switch bumps the generation so late old-pack
  // responses are dropped instead of repopulating the screen.
  const packSwitchGen = useRef(0);
  const [packSwitching, setPackSwitching] = useState(false);
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
  // PATH-VIEW-001: the Today tab's unit path, straight from `unit_path`.
  const [pathNodes, setPathNodes] = useState<UnitPathNode[]>([]);
  // PATH-WHATSNEXT-001: the engine's single answer ("what do I do now?").
  const [nextOffer, setNextOffer] = useState<NextOffer | null | undefined>(undefined);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [writingLoaded, setWritingLoaded] = useState(false);
  const [pronResult, setPronResult] = useState<PronunciationResult | null>(null);
  // No hardcoded language here (U04): the target arrives from the ACTIVE
  // pack's sentence pool; switching packs refetches, and a fetch failure
  // clears it rather than leaving another language behind.
  const [dictTarget, setDictTarget] = useState("");
  const [dictResult, setDictResult] = useState<DictationResult | null>(null);
  const [dictSentence, setDictSentence] = useState<DictationSentence | null>(null);
  const [dictOffset, setDictOffset] = useState(0);
  const [recording, setRecording] = useState(false);
  const [attemptUrl, setAttemptUrl] = useState<string | null>(null);
  // ACCUMULATION-METERS-001 (U11): null until the world_state read lands —
  // the Today-header worlds meter abstains on a pending read.
  const [environments, setEnvironments] = useState<WorldEnvironment[] | null>(null);
  // ACCUMULATION-METERS-001 (U11): null until the mine_list read lands.
  const [mineCount, setMineCount] = useState<number | null>(null);
  // R14: a failed playback must be something the learner can see, not a
  // silent Audio error in the console.
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  // F-07 (run L1): while a listening clip plays, the play button carries a
  // pressed state and a status region says "playing" — start/stop must be
  // perceivable without sight of the waveform.
  const [clipPlaying, setClipPlaying] = useState(false);
  // R14: a retained recording URL lives until it is replaced or this screen
  // goes away. Nothing else may revoke it while state still holds it.
  useEffect(() => {
    return () => {
      if (attemptUrl) URL.revokeObjectURL(attemptUrl);
    };
  }, [attemptUrl]);
  const [goals, setGoals] = useState<GoalCard[]>([]);
  // PROGRESS-STATS-001: memory instruments for the progress route; null
  // until read, and a failed read stays silent (the strip is an extra,
  // never a reason to withhold the progress page itself).
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
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
  // FEEL-LOADING-001: the model whose install_model transfer is in flight;
  // the Download button must not stay live through a hundreds-of-MB pull.
  const [installingSpeechModel, setInstallingSpeechModel] = useState<string | null>(null);
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
  // FIX-ERR-SRS-LOOP-001-2 (D3): the per-form review OFFER the writing
  // verdict carried, and the ledger ids the learner has accepted in this
  // view. A card exists ONLY behind an explicit `error_review_accept`
  // click — these states track that act, they never cause it.
  const [writingOffer, setWritingOffer] = useState<FormErrorOfferView | null>(null);
  const [acceptedOffers, setAcceptedOffers] = useState<string[]>([]);
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
  // UNIT-CAPSTONE-001: while a section review session runs, it owns the
  // attempt-group id for every graded submit: finishPractice re-keys
  // planSessionRef after each activity (the refreshed plan is a new plan),
  // but one review must stay ONE attempt group from its first item to
  // `capstone_complete`, which recounts the items engine-side.
  const capstoneSessionRef = useRef<{ packId: string; band: string; id: string } | null>(null);
  const [capstoneResult, setCapstoneResult] = useState<CapstoneResult | null>(null);
  // WARM-MOMENTS-001: gentle facts for the Progress tab; null until the
  // engine answers — GentleFacts then abstains rather than faking zeroes.
  const [learningFacts, setLearningFacts] = useState<LearningFacts | null>(null);

  function activeSessionId(): string {
    return capstoneSessionRef.current ? capstoneSessionRef.current.id : planSessionRef.current;
  }
  // SESSION-CHROME-001: start instant of the running session, for the
  // measured time the end-of-session summary reports. Not persisted — a
  // session is for this sitting, and its clock is too.
  const sessionStartedAtRef = useRef<number | null>(null);
  // SESSION-FLOW-COPY-001 (owner phone dogfood): one start per session.
  // Between activities the session shows a short "Next: <what>" bridge and
  // opens the next runner itself — no second "Start practicing" wall. The
  // bridge is a transition, not a gate: it is cancelable by the same pause
  // control that owns the session, and reduced-motion users skip it.
  const [sessionBridge, setSessionBridge] = useState<string | null>(null);
  const bridgeRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    finish: (proceeded: boolean) => void;
  } | null>(null);

  /// Cancel an in-flight bridge (pause/stop/pack-switch). Resolves the
  /// pending advance as "did not proceed" so the session never opens an
  /// activity behind the learner's back.
  function cancelSessionBridge() {
    const b = bridgeRef.current;
    if (!b) return;
    clearTimeout(b.timer);
    bridgeRef.current = null;
    setSessionBridge(null);
    b.finish(false);
  }

  function sessionBridgeLabel(item: PlannedItem): string {
    const verb = RUNNABLE_MODALITIES[item.modality] ?? "more practice";
    return `Next: ${verb}`;
  }

  function prefersReducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /// Show the bridge for SESSION_BRIDGE_MS, then report whether the session
  /// may proceed. False means the learner (or a navigation) took over.
  function showSessionBridge(item: PlannedItem): Promise<boolean> {
    if (prefersReducedMotion()) return Promise.resolve(true);
    setSessionBridge(sessionBridgeLabel(item));
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        bridgeRef.current = null;
        setSessionBridge(null);
        resolve(true);
      }, SESSION_BRIDGE_MS);
      bridgeRef.current = {
        timer,
        finish: (proceeded) => {
          setSessionBridge(null);
          resolve(proceeded);
        },
      };
    });
  }
  const [scenarioList, setScenarioList] = useState<ScenarioSummaryView[]>([]);
  const [scenarioActive, setScenarioActive] = useState<ScenarioView | null>(null);
  const [scenarioStep, setScenarioStep] = useState<ScenarioStepResult | null>(null);
  const [scenarioOutcome, setScenarioOutcome] = useState<ScenarioOutcomeView | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  // SCENARIO-TRANSFER-001: verdict of the last answer to the open
  // transfer practice; the engine decides it, the UI only displays it.
  const [scenarioTransferResult, setScenarioTransferResult] = useState<string | null>(null);
  const [practiceAudio, setPracticeAudio] = useState<{ wavB64: string; source: string } | null>(
    null,
  );
  const [practiceAudioError, setPracticeAudioError] = useState<string | null>(null);
  // RU-MODALITY-PRACTICE-001: the free-ASR check for the guided-speaking
  // card's recording. Formative only: this result feeds that card's
  // abstention notice, never a verdict, evidence, or mastery.
  const [practiceSpeakCheck, setPracticeSpeakCheck] = useState<DictationResult | null>(null);
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
  // FEEL-LOADING-001: the first placement fetch (plan + first task) is slow
  // enough to double-tap; while it runs the Start button is disabled.
  const [placementLoading, setPlacementLoading] = useState(false);
  // U05: what the engine made of every declared rubric — `planned` rows plus
  // honest abstentions with machine-readable reasons. Fetched when the
  // Placement surface opens, never in the boot batch (the scan is a full
  // pack pass with per-pair build verification).
  const [placementCoverage, setPlacementCoverage] = useState<
    { assessment_id: string; goal_id: string; status: string; reason?: string }[]
  >([]);
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
  const [kanaKeyboard, setKanaKeyboard] = useState<KanaKeyboardMode>("off");
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
  // FEEL-LOADING-001: the six prime reads of openSettings land at their own
  // pace and used to populate the page silently; the tick confirms the six
  // toggles/selects whose IPC write used to fire with no feedback. The
  // timer ref clears the tick without leaving pending state in a render.
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaveNotice, setSettingsSaveNotice] = useState<string | null>(null);
  const saveTickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function markSettingsSaved() {
    setSettingsSaveNotice("Saved");
    if (saveTickTimer.current) clearTimeout(saveTickTimer.current);
    saveTickTimer.current = setTimeout(() => setSettingsSaveNotice(null), 2500);
  }

  const [practiceDraft, setPracticeDraft] = useState("");
  // A route change, a wizard step change, a lesson page and an activity-card
  // turn are all navigations: both screen readers and sighted keyboard users
  // otherwise stay parked in the old content, and Orca announces nothing on
  // arrival (F-01, owner run L1). Routes, wizard steps and lesson pages swap
  // the `#main h1` node — a new node gets tabIndex -1 and focus, which IS the
  // A new card announces its question h2 — the card header's h1 only says
  // the activity name — and grading never moves focus off the card.
  // Scrolling resets because the sticky header would
  // otherwise hide the top of the new page.
  const routeHeading = useRef<HTMLElement | null>(null);
  const cardKey = useRef<string | null>(null);
  // FEEL-GLOBAL-001: the routes underline GLIDES (global-states target:
  // "the old underline does not snap, it glides"). One indicator lives on
  // the nav (.routes::after); its x/width are measured from the active tab
  // per route change and on nav resize, and the nav wears .routes--glides
  // so the active tab's static border steps aside while measured.
  const routesRef = useRef<HTMLElement | null>(null);
  const routesRo = useRef<(ResizeObserver & { observedNav?: HTMLElement }) | null>(null);
  // No dep array: a route change moves aria-current on a STABLE nav node
  // (so measuring per render is the catch), AND the nav can MOUNT long
  // after the first render (the profile chooser renders without routeNav;
  // resuming adds it with no route change at all).
  useEffect(() => {
    const nav = routesRef.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('.tab[aria-current="page"]');
      if (!active) {
        nav.style.setProperty("--tab-live", "0");
        return;
      }
      nav.classList.add("routes--glides");
      nav.style.setProperty("--tab-x", `${active.offsetLeft}px`);
      nav.style.setProperty("--tab-w", `${active.offsetWidth}px`);
      nav.style.setProperty("--tab-live", "1");
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    if (routesRo.current?.observedNav === nav) return;
    routesRo.current?.disconnect();
    const ro = new ResizeObserver(measure) as ResizeObserver & { observedNav?: HTMLElement };
    ro.observedNav = nav;
    ro.observe(nav);
    routesRo.current = ro;
  });
  useEffect(() => {
    // FEEL-GLOBAL-001: the route reset is a navigation, so it glides; the
    // browser forces an instant jump when prefers-reduced-motion is set.
    window.scrollTo({ top: 0, behavior: "smooth" });
    const h1 = document.querySelector<HTMLElement>("#main h1");
    const item = practiceTask?.item_id ?? null;
    // The task preloads while the lesson page is still up; the card only
    // becomes the visible screen when its runner takes the content slot.
    const cardShown = Boolean(practiceTask) && !(lesson && !lessonSeen);
    if (item && cardShown && item !== cardKey.current) {
      // A card just arrived. The card header remounts an h1 too ("Practice"),
      // but the question h2 is what says what to do — announce that.
      cardKey.current = item;
      routeHeading.current = h1;
      const target = document.querySelector<HTMLElement>("#main h2") ?? h1;
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      return;
    }
    if (!item) cardKey.current = null;
    if (h1 && h1 !== routeHeading.current) {
      routeHeading.current = h1;
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
  }, [step, route, lesson, lessonSeen, practiceTask?.item_id]);
  // K-76: null until the first real load answers, so the surface can tell
  // "still loading" apart from "this pack has no targets".
  const [shadowItems, setShadowItems] = useState<ShadowTarget[] | null>(null);
  const [shadowIdx, setShadowIdx] = useState(0);
  const [storyList, setStoryList] = useState<StorySummary[]>([]);
  const [storyActive, setStoryActive] = useState<Story | null>(null);
  // READER-FLOW-001: the word card open inside the reading paragraph —
  // which sentence, which raw token, and the `word_card` answer (`card`
  // null while loading) — plus the word-audio blob URL when
  // `story_word_audio` answered; null audio means no Play button.
  const [storyWord, setStoryWord] = useState<{
    sentenceId: string;
    token: string;
    card: WordCardView | null;
    audioUrl: string | null;
  } | null>(null);
  const storyWordGenRef = useRef<{ sentenceId: string; token: string } | null>(null);
  const storyWordAudioRef = useRef<string | null>(null);
  // WORDCARD-OFFSCREEN-001: the tapped word's button, remembered so the
  // phone bottom-sheet card can return focus to it when it closes.
  // Mutable (not state): a DOM element, and focus moves in an effect.
  const storyWordAnchorRef = useRef<{
    el: HTMLElement | null;
    closing: boolean;
  }>({ el: null, closing: false });
  const [storyError, setStoryError] = useState<string | null>(null);
  const [mineItems, setMineItems] = useState<MineItem[]>([]);
  // FEEL-MYWORDS-001: the id the engine returns from mine_add; the landed
  // row plays the one-shot success pulse once.
  const [mineFlashId, setMineFlashId] = useState<string | null>(null);
  // FEEL-LOADING-001: while openWords awaits mine_list the panel must not
  // render the PREVIOUS list as if it were current (the stale-list bug).
  const [wordsLoading, setWordsLoading] = useState(false);
  const [mineSurface, setMineSurface] = useState("");
  const [mineReading, setMineReading] = useState("");
  const [mineGloss, setMineGloss] = useState("");
  const [mineSource, setMineSource] = useState("");
  const [mineError, setMineError] = useState<string | null>(null);
  const [mineNotice, setMineNotice] = useState<string | null>(null);
  const [mineReview, setMineReview] = useState<{ item: MineItem; revealed: boolean } | null>(null);
  // FIX-ERR-SRS-LOOP-001-2 (D3): the review-queue drill view over ACCEPTED
  // error-review cards. Nothing lands here except through an explicit
  // accept click on a dictation/writing offer (never silent).
  const [errCards, setErrCards] = useState<ErrorReviewCardView[]>([]);
  const [errReview, setErrReview] = useState<{
    card: ErrorReviewCardView;
    revealed: boolean;
  } | null>(null);
  const [errError, setErrError] = useState<string | null>(null);
  const [errNotice, setErrNotice] = useState<string | null>(null);
  // SESSION-CHROME-001 (U6): the scheduler's predicted next interval for
  // the two grade buttons, read from the item's existing state. Null = no
  // preview fetched (or the fetch failed), and the buttons show no number.
  const [minePreview, setMinePreview] = useState<{
    again_seconds: number;
    good_seconds: number;
  } | null>(null);
  useEffect(() => {
    const inv = detectInvoke();
    if (!inv || !profileId || !mineReview) {
      setMinePreview(null);
      return;
    }
    let live = true;
    void inv("srs_interval_preview", { profileId, itemId: mineReview.item.id })
      .then((v) => {
        if (live) setMinePreview(v as { again_seconds: number; good_seconds: number });
      })
      .catch(() => {
        // A failed preview degrades to plain buttons — the grades
        // themselves work exactly as before.
        if (live) setMinePreview(null);
      });
    return () => {
      live = false;
    };
  }, [mineReview?.item.id, profileId]);
  const [shadowError, setShadowError] = useState<string | null>(null);
  // WORD-TIMING-001: the karaoke clock (in-clip seconds, null when nothing
  // of this clip is playing) plus one retained clip URL per shadowing item.
  // The retained URL is what makes click-to-hear-word seek the already
  // loaded clip instead of re-fetching it; it is revoked exactly when the
  // item or the screen changes.
  const [shadowTime, setShadowTime] = useState<number | null>(null);
  const shadowClipRef = useRef<{ contentId: string; url: string } | null>(null);
  const releaseShadowClip = () => {
    if (shadowClipRef.current) URL.revokeObjectURL(shadowClipRef.current.url);
    shadowClipRef.current = null;
    setShadowTime(null);
  };
  useEffect(() => {
    if (route !== "shadowing") releaseShadowClip();
  });

  useEffect(() => {
    const inv = detectInvoke();
    if (!inv) return;
    void (async () => {
      if (
        await runSmokeHandshake(inv, {
          setProfileId,
          setDisplayName,
          setSelectedPack,
          setMicEnabled,
          setNextGoal,
          setFirstRunSteps,
          setPathNodes,
          setNextOffer,
          setEnvironments,
          setDisplay,
          setStep,
          applyPlan,
        })
      )
        return;
      // K-05: restart resumes an existing profile instead of re-running
      // onboarding (FIRST-LESSON known limit). This runs first: a pack
      // or notice failure must never strand a returning learner back at
      // the wizard.
      try {
        const ps = (await inv("list_profiles")) as ProfileSummary[];
        if (ps.length > 0) {
          setProfiles(ps);
          setStep("resume");
        }
      } catch (e) {
        // K-05's stranding rule applies here too: if the resume list
        // cannot be read the learner must be told, and creating a new
        // local profile stays reachable from the welcome step.
        setOnboardError(
          `Existing profiles could not be checked: ${String(e)} You can create a new local profile, or restart the app to try again.`,
        );
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
      await refreshInstalled();
      // PACK-UPDATE-UX-001: the wizard may name a catalogue version only if
      // the catalogue has been read, so boot reads it here too (a cached
      // local read on the engine's blocking pool). A failure leaves the
      // version prose silent rather than wrong.
      try {
        const cat = (await inv("catalog_packs")) as {
          entries: CatalogEntry[];
          status: string;
        };
        setCatalog(cat.entries);
        setCatalogStatus(cat.status);
      } catch {
        /* no catalogue read: the wizard stays version-silent */
      }
    })();
  }, []);

  // The bridge is app-wide and installed before the first render, so its
  // identity must be stable: a fresh closure per render re-fires every effect
  // that lists `inv` as a dependency, and an effect that resets state on
  // re-entry (kanji availability) then loops forever for any pack that
  // answers false — an RU pack, for instance.
  const inv = useMemo(() => detectInvoke(), []);

  // Per-surface extraction (APP-SPLIT-001): the serve-mode probe slice
  // (pairing probe, engine-progress listener, capability report) lives in
  // ./app/serve-probe — pure move, zero behavior change.
  const {
    serveUnpaired,
    engineProgress,
    setEngineProgress,
    serveNotice,
    serveBadge,
    serveMicNamesAvailable,
  } = useServeProbe(inv);

  // APP-SPLIT-003C: one props bundle (state + setters) for the
  // pack/session/claims refresh wiring slice in ./app/pack-wiring. Built
  // per render right after the probe slice so every referenced binding is
  // in scope BEFORE the boot effect can call refreshInstalled() from its
  // async IIFE; the moved bodies read exactly what the old inline closures
  // captured. App() keeps owning every hook; these are plain values and
  // setters.
  const packWiringDeps: PackWiringDeps = {
    inv,
    profileId,
    engineProgress,
    setPacksPending,
    setPacksUnknown,
    setInstalled,
    setInstalledUnknown,
    setClaims,
    setActiveIds,
    setSelectedPack,
    setLangError,
    setCatalog,
    setCatalogStatus,
    setOnboardError,
    setInstallingPack,
    setEngineProgress,
    setInstallOutcome,
    setInstallReceipt,
  };

  // `pid` lets the resume/finish flows prime the Home active-pack
  // header before the Settings route has been opened (the state
  // profileId is not yet visible to this closure there).
  //
  // K-63: these reads used to be awaited one after another, each landing its
  // own state update, so opening the tab re-rendered the app several times for
  // ~4 ms of actual reading. They run together now and commit in one block.
  // APP-SPLIT-003C: the pack/session/claims refresh read lives in
  // ./app/pack-wiring (runRefreshLanguages) — pure move, zero behavior
  // change. App() keeps owning every hook; `packWiringDeps` is passed at
  // each call site.
  async function refreshLanguages(pid?: string) {
    await runRefreshLanguages(packWiringDeps, pid);
  }

  // PACK-UPDATE-UX-001: one read, one container update. The wizard used to
  // keep its own list of installed ids while Settings kept InstalledPack
  // records, which is exactly how the two drifted apart. Every install path
  // now re-reads the same records the panel renders, so a pack landing on
  // the device updates one state and both surfaces see it.
  // APP-SPLIT-003C: pure move to ./app/pack-wiring (runRefreshInstalled).
  async function refreshInstalled(): Promise<InstalledPack[] | null> {
    return runRefreshInstalled(packWiringDeps);
  }

  // PACK-UPDATE-UX-001: the wizard's Update control. install_catalog_pack is the
  // same path the Settings panel uses, so there is one write path per source.
  // Afterwards both containers are refreshed from the engine and the catalogue
  // rather than edited by hand: a stale row only clears when the records say so.
  // APP-SPLIT-003C: pure move to ./app/pack-wiring (runUpdateFromCatalog).
  async function updateFromCatalog(id: string) {
    await runUpdateFromCatalog(packWiringDeps, id);
  }

  // U02: a language change is one coordinated transition, not a settings
  // refresh. The native switch lands first; then every display the old pack
  // filled is dropped — plan snapshot, in-flight task, lesson, placement
  // run, story, shadowing, dictation, phonology demo, kanji drill — before
  // the new pack answers, so an old card can never submit against the new
  // pack. Learner-owned state (mined words, profile settings) is kept:
  // those belong to the learner, not the language. The profile-entry reads
  // then re-run under a generation guard; `packSwitching` is the loading
  // promise Home shows while the new context settles.
  async function switchLearning(packId: string) {
    if (!inv || !profileId) return;
    try {
      await inv("switch_pack", { profileId, packId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
      return;
    }
    const gen = ++packSwitchGen.current;
    setPackSwitching(true);
    // A session belongs to the pack it was started in: tear it down here so
    // Home can never offer "Resume session" over another pack's items.
    sessionQueueRef.current = null;
    capstoneSessionRef.current = null;
    setCapstoneResult(null);
    setSession(null);
    setSessionOutcome(null);
    setRoute("practice");
    applyPlan(EMPTY_PLAN);
    setNextGoal(undefined);
    setFirstRunSteps([]);
    setPathNodes([]);
    setNextOffer(undefined);
    setEnvironments(null);
    setMineCount(null);
    setPracticeTarget(null);
    setPracticeTask(null);
    setPracticeGraded(false);
    setPracticeCorrect(false);
    setPracticeCorrectChoice("");
    setPracticeSpeakCheck(null);
    setLesson(null);
    setLessonSeen(false);
    setPlacementItems([]);
    setPlacementIdx(0);
    setPlacementTask(null);
    setPlacementGraded(false);
    setPlacementCorrect(false);
    setPlacementCorrectChoice("");
    setPlacementHits(0);
    setPlacementFinished(false);
    setPlacementError(null);
    setPlacementCoverage([]);
    setShadowItems(null);
    setShadowIdx(0);
    setStoryList([]);
    setStoryActive(null);
    closeStoryWordCard(false);
    setPronDemo(null);
    setPronResult(null);
    setDictSentence(null);
    setDictTarget("");
    setDictResult(null);
    setDictOffset(0);
    setKanjiCards([]);
    setKanjiActive(null);
    setKanjiStage(null);
    setKanjiTask(null);
    setKanjiGraded(false);
    setKanjiCorrect(false);
    setKanjiCorrectChoice("");
    setKanjiError(null);
    try {
      await refreshLanguages();
      const home = (await inv("home_state", { profileId })) as {
        display_name: string;
        plan: SessionPlan;
        next_goal: NextGoalView | null;
      };
      if (gen !== packSwitchGen.current) return;
      setDisplayName(home.display_name);
      applyPlan(home.plan);
      setNextGoal(home.next_goal);
      setFirstRunSteps((await inv("first_run_steps", { profileId })) as FirstRunStep[]);
      setPathNodes((await inv("unit_path", { profileId })) as UnitPathNode[]);
      setNextOffer((await inv("current_offer", { profileId })) as NextOffer | null);
      if (gen !== packSwitchGen.current) return;
      setEnvironments((await inv("world_state", { profileId })) as WorldEnvironment[]);
      void refreshMine();
      setDisplay((await inv("display_settings", { profileId })) as DisplaySettingsView);
      await loadProfilePrefs(profileId);
    } catch (e) {
      if (gen === packSwitchGen.current) {
        setLangError(`The language was switched, but the screens could not re-read: ${String(e)}`);
      }
    } finally {
      if (gen === packSwitchGen.current) setPackSwitching(false);
    }
  }

  // APP-SPLIT-003C: pure moves to ./app/pack-wiring (runInstallCatalogPack,
  // runCancelInstall, runImportPack).
  async function installCatalogPack(packId: string) {
    await runInstallCatalogPack(packWiringDeps, packId);
  }

  // Cancel asks the engine to stop the install whose progress is on screen —
  // the transfer or the unpack, whichever is running. The engine answers
  // through the normal failure path with its `install cancelled` reason, so
  // the outcome shows as cancelled — never as a client-side guess that
  // nothing happened.
  async function cancelInstall() {
    await runCancelInstall(packWiringDeps);
  }

  async function importPack(dataB64: string) {
    await runImportPack(packWiringDeps, dataB64);
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
    // U02: `selectedPack` changes only when the session's active pack does,
    // so the probe re-runs exactly once per pack change (U01's acceptance)
    // and never on typing or unrelated display state.
  }, [inv, profileId, selectedPack]);

  async function installSpeechModel(modelId: string) {
    if (!inv) return;
    // FEEL-LOADING-001: a hundreds-of-MB transfer gets an honest state —
    // Settings disables every model button and names this one as installing.
    setInstallingSpeechModel(modelId);
    try {
      await inv("install_model", { modelId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    } finally {
      setEngineProgress(null);
      setInstallingSpeechModel(null);
    }
    try {
      await refreshSpeech();
    } catch (e) {
      setLangError(`The speech model list could not be re-read: ${String(e)}`);
    }
  }

  async function deleteSpeechModel(modelId: string) {
    if (!inv) return;
    try {
      await inv("delete_model", { modelId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    }
    try {
      await refreshSpeech();
    } catch (e) {
      setLangError(`The speech model list could not be re-read: ${String(e)}`);
    }
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
      markSettingsSaved();
    } catch (e) {
      setLangError(String(e));
    }
    try {
      await refreshSpeech();
    } catch (e) {
      setLangError(`The speech model list could not be re-read: ${String(e)}`);
    }
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
      const fresh = await refreshInstalled();
      if (fresh?.some((i) => i.pack_id === id)) return;
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
      // PACK-UPDATE-UX-001: take the record from the same authoritative
      // read every other surface uses. `install_pack` answers a
      // PackCandidate with no version (lib.rs:422-432), so nothing here
      // invents one; a failed re-read leaves the step saying its state is
      // unknown, where retry, another pack, the file input and "Skip for
      // now" all stay available.
      await refreshInstalled();
    }
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
      setInstalled((prev) =>
        prev.some((i) => i.pack_id === imported.pack_id) ? prev : [...prev, imported],
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
        setPathNodes((await inv("unit_path", { profileId })) as UnitPathNode[]);
        setNextOffer((await inv("current_offer", { profileId })) as NextOffer | null);
        const envs = (await inv("world_state", { profileId })) as WorldEnvironment[];
        setEnvironments(envs);
        setDisplay((await inv("display_settings", { profileId })) as DisplaySettingsView);
        await loadProfilePrefs(profileId);
      } catch (e) {
        console.error("setup fill-in reads failed", e);
      }
      // HOME-FLASH-001: the pack read is still in flight — Home renders the
      // neutral state (no pack-absent warning) until refreshLanguages settles.
      setPacksPending(true);
      void refreshLanguages(profileId).catch(() => {});
    }
    setStep("done");
  }

  // K-05: resume an existing local profile at launch. The native side
  // validates the id; nothing is sent off this device.
  // UI-HYGIENE-001: archive a chooser profile (a test run or an old
  // experiment) without deleting any of its data.
  async function toggleProfileHidden(id: string, hidden: boolean) {
    if (!inv) return;
    try {
      await inv("set_profile_hidden", { profileId: id, hidden });
      setProfiles((await inv("list_profiles")) as ProfileSummary[]);
    } catch (e) {
      setOnboardError(`Could not update this profile: ${String(e)}`);
    }
  }

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
    // HOME-FLASH-001: the pack read is still in flight — Home renders the
    // neutral state (no pack-absent warning) until refreshLanguages settles.
    setPacksPending(true);
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
      setPathNodes((await inv("unit_path", { profileId: p.id })) as UnitPathNode[]);
      setNextOffer((await inv("current_offer", { profileId: p.id })) as NextOffer | null);
      const envs = (await inv("world_state", { profileId: p.id })) as WorldEnvironment[];
      setEnvironments(envs);
      // ACCUMULATION-METERS-001: prime the kept-words count for the Today
      // header meters in parallel with the world read.
      void refreshMine();
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
      const gen = packSwitchGen.current;
      try {
        const next = (await inv("practice_plan", { profileId, minutes })) as SessionPlan;
        if (gen !== packSwitchGen.current) return;
        applyPlan(next);
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
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      setDisplay(
        (await inv("set_display_settings", { profileId, stressMode: mode })) as DisplaySettingsView,
      );
    } catch (e) {
      // The engine did not answer, so `display` never changed — the toggle
      // on screen still shows the real stored value. Say the write failed.
      setSettingsError(`The stress-mark setting could not be saved: ${String(e)}`);
    }
  }

  // GRAMMAR-LABELS-001: the one global show/hide for the interlinear
  // grammar labels (display setting only — grading and scheduling never
  // see it). The stress-mode key is sent unchanged so the write cannot
  // clobber it.
  async function setGrammarLabelsSetting(on: boolean) {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      setDisplay(
        (await inv("set_display_settings", {
          profileId,
          stressMode: display?.stress_mode ?? "auto",
          grammarLabels: on,
        })) as DisplaySettingsView,
      );
    } catch (e) {
      setSettingsError(`The grammar-label setting could not be saved: ${String(e)}`);
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
      setKanaKeyboard((await inv("get_kana_keyboard", { profileId: pid })) as KanaKeyboardMode);
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
    // FEEL-LOADING-001: six reads, no signal, until now.
    setSettingsLoading(true);
    try {
      await primeSettingsReads();
    } finally {
      setSettingsLoading(false);
    }
  }

  async function primeSettingsReads() {
    // APP-SPLIT-003B: the prime-read bodies live in
    // ./app/settings-wiring — pure move, zero behavior change. The deps
    // bundle is built per render at the bottom of App().
    await runSettingsPrimes(settingsWiringDeps);
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

  // K-MODULARIZE: one tiny save path for the engine-backed settings toggles
  // below — the same guard, clear-error, apply-and-confirm shape was repeated
  // verbatim in five handlers. `saveSetting` is that shape; each handler is
  // now one line.
  async function saveSetting<T>(
    cmd: string,
    args: Record<string, unknown>,
    apply: (result: T) => void,
  ) {
    if (!inv || !profileId) return;
    setSettingsError(null);
    try {
      apply((await inv(cmd, args)) as T);
      markSettingsSaved();
    } catch (e) {
      setSettingsError(String(e));
    }
  }

  async function setMicSetting(enabled: boolean) {
    await saveSetting<boolean>("set_microphone_enabled", { profileId, enabled }, setMicEnabled);
  }

  async function pickMicrophoneSetting(deviceId: string | null) {
    await saveSetting<string | null>(
      "set_microphone_device",
      { profileId, deviceId },
      setMicDevice,
    );
  }

  async function pickPlaybackSetting(deviceId: string | null) {
    await saveSetting<string | null>(
      "set_playback_device",
      { profileId, deviceId },
      setPlaybackDevice,
    );
  }

  async function setRomajiSetting(mode: RomajiMode) {
    await saveSetting<RomajiMode>("set_romaji_mode", { profileId, mode }, setRomajiMode);
  }

  // Issue #2 phase 1: the in-app kana keyboard is a profile setting that
  // never touches the system layout.
  async function setKanaKeyboardSetting(mode: KanaKeyboardMode) {
    await saveSetting<KanaKeyboardMode>("set_kana_keyboard", { profileId, mode }, setKanaKeyboard);
  }

  // IME-TOGGLE-UX-001: resolve the active pack's in-app keyboard from its
  // own manifest `scripts:` plus the converter registry in ime.ts — never
  // from a locale or a language code. Null means the pack declares no
  // in-app keyboard: no bubble, no live input layer, and the shortcut
  // no-ops. The stored per-profile setting names the converter it selects
  // (phase 1: "romaji-kana" is exactly the converter id), so the layer is
  // live only when the setting and the pack's declaration agree.
  const activeKeyboard = useMemo(() => {
    const record = installed.find((i) => i.pack_id === activeIds[0]);
    if (!record) return null;
    // IN-APP-IME-001 phase 2: the pack's declared input-method map gates
    // converters on top of the script grant (absent map = unchanged).
    return inAppKeyboardForScripts(record.scripts, {
      declared: record.input_methods_declared,
      methods: record.input_methods,
    });
  }, [installed, activeIds]);
  // IN-APP-IME-001 phase 2: pack-lexicon conversion candidates for the
  // kana fields. The engine's `ime_candidates` command answers ONLY from
  // the active pack's lexicon (plus the separately-labeled aux slice) —
  // never a baked-in word list — and the pack's declared input-method
  // allowlist rules the lookup out before it is ever called (absent map =
  // current behavior). The gate's feature id mirrors the manifest id, so
  // packs can switch conversion off without an engine change.
  const imeCandidates = useMemo(() => {
    if (!inv || profileId === null) return undefined;
    const record = installed.find((i) => i.pack_id === activeIds[0]);
    if (!record) return undefined;
    if (
      !inputMethodAllowed(
        { declared: record.input_methods_declared, methods: record.input_methods },
        LEXICON_CANDIDATES_METHOD_ID,
      )
    ) {
      return undefined;
    }
    return (kana: string) => inv("ime_candidates", { kana, profileId }) as Promise<ImeCandidate[]>;
  }, [installed, activeIds, profileId]);
  const inAppInputOn =
    activeKeyboard !== null &&
    kanaKeyboard !== "off" &&
    activeKeyboard.converter.id === kanaKeyboard;

  // IME-TOGGLE-UX-001 (acceptance 1): the documented in-app shortcut
  // Ctrl+Shift+K (Cmd+Shift+K on macOS) flips the active pack's in-app
  // keyboard from any in-app screen, without opening Settings. It writes
  // the same per-profile setting Settings shows — one value, one write
  // path, pack capability gating intact — and it no-ops when the active
  // pack declares no in-app keyboard. The listener sits on window in
  // capture phase so a focused in-app keyboard field can never eat it, and
  // `useKanaIME` independently stands down for modified keys.
  const activeKeyboardRef = useRef(activeKeyboard);
  useEffect(() => {
    activeKeyboardRef.current = activeKeyboard;
  }, [activeKeyboard]);
  useEffect(() => {
    if (step !== "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== "k" && e.code !== "KeyK") return;
      const keyboard = activeKeyboardRef.current;
      if (!keyboard) return;
      e.preventDefault();
      e.stopPropagation();
      void setKanaKeyboardSetting(
        keyboard.converter.id === kanaKeyboard
          ? "off"
          : (keyboard.converter.id as KanaKeyboardMode),
      );
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [step, kanaKeyboard, inv, profileId]);
  // APP-SPLIT-003B: the export/restore/delete/switch handler bodies live
  // in ./app/settings-wiring (runProfileExport, runRestorePreview,
  // runRestoreConfirm, runProfileDelete, runProfileSwitch) — pure move,
  // zero behavior change; App() passes `settingsWiringDeps` at each
  // call site below.
  async function openProgress() {
    setRoute("progress");
    setProgressError(null);
    if (inv && profileId) {
      setProgressLoading(true);
      try {
        setProgress((await inv("progress_summary", { profileId })) as ProgressRow[]);
        setGoals((await inv("goal_map", { profileId })) as GoalCard[]);
        try {
          setMemoryStats((await inv("memory_stats", { profileId })) as MemoryStats);
        } catch {
          setMemoryStats(null);
        }
        // WARM-MOMENTS-001: a gentle-facts read failure degrades ONLY the
        // gentle facts — the capability page itself stays honest and whole.
        try {
          setLearningFacts((await inv("learning_facts", { profileId })) as LearningFacts);
        } catch {
          setLearningFacts(null);
        }
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
    setWritingOffer(null);
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
          sessionId: activeSessionId(),
        })) as { correct: boolean; expected?: string; offer?: FormErrorOfferView };
        setWritingCorrect(grade.correct);
        setWritingExpected(grade.correct ? "" : (grade.expected ?? ""));
        // FIX-ERR-SRS-LOOP-001-2 (D3): the offer rides the verdict but
        // schedules nothing — it renders as an explicit choice the learner
        // can take or leave.
        setWritingOffer(grade.correct ? null : (grade.offer ?? null));
        setWritingGraded(true);
      } catch (e) {
        setWritingError(String(e));
      }
    }
  }

  // UX-003: first lessons. Plan items are runnable; grading, evidence,
  // and scheduling happen natively.
  async function openPractice(item: PlannedItem, opts: { showLessonCard?: boolean } = {}) {
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
    setPracticeSpeakCheck(null);
    setPracticeTarget({ contentId: item.content_id, modality: item.modality });
    setLesson(null);
    // SESSION-FLOW-COPY-001: inside a running session only the FIRST
    // activity shows the lesson encounter card and its Start control —
    // that click is the session's one start. Later activities arrive
    // through the bridge and open the runner directly; the card stays one
    // tap away on the "Show the lesson again" control.
    setLessonSeen(opts.showLessonCard === false);
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
          item.modality === "orthographic-encoding" ||
          // RU-MODALITY-PRACTICE-001: the guided-speaking card plays the
          // pack recording of the sentence it shows; the same honest
          // media miss (K-78) says so when the pack ships none.
          item.modality === "production-speaking"
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
        sessionId: activeSessionId(),
        stageId: drillStageId(lesson),
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
        sessionId: activeSessionId(),
        stageId: drillStageId(lesson),
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
    setPracticeSpeakCheck(null);
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
        ? {
            status,
            total: q.items.length,
            done: q.done,
            notRunnable: q.notRunnable,
            // SESSION-CHROME-001 (U3) + SESSION-TIMER-001: remaining time
            // is the engine's own price for the items still to work,
            // including the open one — derived by the tested helper so the
            // header always starts from the full queue's real estimate.
            remainingSeconds: remainingPlanSeconds(q.items, q.index),
          }
        : null,
    );
  }

  async function startSession() {
    const runnable = plan.items.filter(isSessionRunnable);
    const notRunnable = plan.items.length - runnable.length;
    if (runnable.length === 0) {
      // Nothing this build can run: name that instead of opening a loop.
      setSessionOutcome({
        done: 0,
        total: plan.items.length,
        reason: "finished",
        notRunnable,
        minutes: null,
        forms: [],
      });
      return;
    }
    const first = runnable[0];
    if (!first) return; // the empty case above already covers this
    sessionQueueRef.current = { items: runnable, index: 0, done: 0, notRunnable };
    // SESSION-CHROME-001: wall time measured across the whole session,
    // reported in the summary as time actually spent — never an estimate.
    sessionStartedAtRef.current = Date.now();
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
      // SESSION-FLOW-COPY-001: the session advances itself. A short bridge
      // names what comes next, then the runner opens — no second Start
      // click. If the learner paused or stopped during the bridge, the
      // advance resolves as "did not proceed" and nothing opens.
      publishSession("running");
      const proceeded = await showSessionBridge(next);
      if (!proceeded || !sessionQueueRef.current) return;
      await openPractice(next, { showLessonCard: false });
      return;
    }
    const outcome = sessionOutcomeFrom(q, "finished");
    sessionQueueRef.current = null;
    sessionStartedAtRef.current = null;
    setSession(null);
    setSessionOutcome(outcome);
    // UNIT-CAPSTONE-001: completing the queue of a section review closes
    // the review — the engine records the attempt (pass OR fail). Stopping
    // mid-review never reaches this line: no queue exhaustion, no attempt.
    if (capstoneSessionRef.current) await finishCapstoneSession();
  }

  /// SESSION-CHROME-001 (U3): the end-of-session card. Time is measured
  /// wall clock, never re-estimated; forms are the surfaces the finished
  /// items put in front of the learner, deduped in first-seen order.
  function sessionOutcomeFrom(
    q: { items: PlannedItem[]; done: number; notRunnable: number },
    reason: "finished" | "stopped",
  ): SessionOutcomeView {
    const start = sessionStartedAtRef.current;
    const minutes = start === null ? null : Math.round((Date.now() - start) / 60_000);
    const seen = new Set<string>();
    const forms: string[] = [];
    for (const it of q.items.slice(0, Math.min(q.done, q.items.length))) {
      const s = it.surface;
      if (s && !seen.has(s)) {
        seen.add(s);
        forms.push(s);
      }
    }
    return {
      done: q.done,
      total: q.items.length + q.notRunnable,
      reason,
      notRunnable: q.notRunnable,
      minutes,
      forms,
    };
  }

  function closeSession(reason: "stopped") {
    const q = sessionQueueRef.current;
    if (!q) return;
    cancelSessionBridge();
    // UNIT-CAPSTONE-001: stopping mid-review records NOTHING — an attempt
    // exists only when the whole review ran to the end.
    capstoneSessionRef.current = null;
    const outcome = sessionOutcomeFrom(q, reason);
    sessionQueueRef.current = null;
    sessionStartedAtRef.current = null;
    setSession(null);
    setSessionOutcome(outcome);
    setPracticeTarget(null);
    setPracticeTask(null);
    setLesson(null);
    setLessonSeen(false);
  }

  function pauseSession() {
    if (!sessionQueueRef.current) return;
    // The bridge is part of the running session: pausing cancels it, and
    // nothing opens behind the learner.
    cancelSessionBridge();
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

  // UNIT-CAPSTONE-001: the section review rides the same session runner as
  // the plan — the engine serves the item list (`capstone_plan`), the
  // runner grades every item through the normal submit path, and closing
  // the review asks the engine to recount the recall itself
  // (`capstone_complete`), never trusting the UI's tallies.
  async function startCapstoneSession(node: UnitPathNode) {
    if (!inv || !profileId) return;
    setCapstoneResult(null);
    try {
      const p = (await inv("capstone_plan", {
        profileId,
        packId: node.pack_id,
        band: node.band ?? "other",
      })) as SessionPlan;
      const runnable = p.items.filter(isSessionRunnable);
      const first = runnable[0];
      if (!first) {
        setCapstoneResult({
          passed: false,
          items: 0,
          correct: 0,
          friendly: bandHeader(node.band ?? "other").friendly ?? node.band ?? "Section",
          band: node.band ?? "other",
          error: "this section's review has no runnable activities in this build",
        });
        return;
      }
      // Same id discipline as a plan session: one id per presented review;
      // its attempt groups collapse retries inside the sitting (docs/03 §5).
      const sid =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `capstone-${Math.random().toString(36).slice(2, 10)}`;
      capstoneSessionRef.current = { packId: node.pack_id, band: node.band ?? "other", id: sid };
      sessionQueueRef.current = {
        items: runnable,
        index: 0,
        done: 0,
        notRunnable: p.items.length - runnable.length,
      };
      sessionStartedAtRef.current = Date.now();
      setSessionOutcome(null);
      publishSession("running");
      await openPractice(first, { showLessonCard: false });
    } catch (e) {
      capstoneSessionRef.current = null;
      setSession(null);
      setCapstoneResult({
        passed: false,
        items: 0,
        correct: 0,
        friendly: bandHeader(node.band ?? "other").friendly ?? node.band ?? "Section",
        band: node.band ?? "other",
        error: String(e),
      });
    }
  }

  /// Closes a finished review honestly: the engine recounts which selected
  /// items the learner actually recalled (attempt-grouped evidence),
  /// records the attempt — pass OR fail — and the path refreshes so the
  /// flipped counter/lock state shows immediately.
  async function finishCapstoneSession() {
    const c = capstoneSessionRef.current;
    capstoneSessionRef.current = null;
    if (!c || !inv || !profileId) return;
    try {
      const res = (await inv("capstone_complete", {
        profileId,
        packId: c.packId,
        band: c.band,
        sessionId: c.id,
      })) as { passed: boolean; items: number; correct: number };
      const header = bandHeader(c.band);
      setCapstoneResult({
        ...res,
        friendly: header.friendly ?? header.label,
        band: c.band,
      });
      setPathNodes((await inv("unit_path", { profileId })) as UnitPathNode[]);
    } catch (e) {
      const header = bandHeader(c.band);
      setCapstoneResult({
        passed: false,
        items: 0,
        correct: 0,
        friendly: header.friendly ?? header.label,
        band: c.band,
        error: String(e),
      });
    }
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
    setPlacementCoverage([]);
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    // FEEL-LOADING-001: plan + first task are two round trips; the Start
    // button disables while they run so a double tap cannot double-submit.
    setPlacementLoading(true);
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
    // U05: the coverage pass is presentation, not the run — a failure here
    // leaves the questions alone and simply says nothing extra.
    try {
      setPlacementCoverage(
        (await inv("placement_coverage", { profileId })) as {
          assessment_id: string;
          goal_id: string;
          status: string;
          reason?: string;
        }[],
      );
    } catch {
      setPlacementCoverage([]);
    } finally {
      setPlacementLoading(false);
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
        sessionId: activeSessionId(),
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
        sessionId: activeSessionId(),
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
    releaseShadowClip();
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setShadowItems((await inv("shadowing_items", { profileId })) as ShadowTarget[]);
      setShadowIdx(0);
      setShadowError(null);
    } catch (e) {
      setShadowError(String(e));
    }
  }

  /// WORD-TIMING-001: the model clip as a retained object URL, cached per
  /// shadowing item. The first fetch is the same `speech_audio` path as
  /// before; click-to-hear-word then seeks this same clip instead of
  /// refetching (R14 keeps ownership of the URL explicit: one retained clip
  /// for the current screen, revoked on item/screen change).
  async function shadowClipUrl(item: ShadowTarget): Promise<string> {
    const cached = shadowClipRef.current;
    if (cached && cached.contentId === item.content_id) return cached.url;
    const inv = detectInvoke();
    if (!inv) throw new Error(NO_ACTIVE_PACK);
    const req = await packRequest<{ wav_b64: string; source: string }>(
      inv,
      selectedPack,
      "speech_audio",
      // K-65b: the native side resolves the speakable string from the pack
      // record. Sending the written form here is what played noise for
      // kanji-primary entries.
      { contentId: item.content_id },
    );
    if (!req.ok) throw new Error(req.error);
    const a = req.value;
    const bytes = Uint8Array.from(atob(a.wav_b64), (c) => c.charCodeAt(0));
    if (cached) URL.revokeObjectURL(cached.url);
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    shadowClipRef.current = { contentId: item.content_id, url };
    return url;
  }

  async function playShadowModel() {
    const item = shadowItems?.[shadowIdx];
    if (!item) return;
    try {
      const url = await shadowClipUrl(item);
      setAudioMsg(null);
      playBlobUrl(url, true, { onTime: setShadowTime });
    } catch (e) {
      setAudioMsg(audioFailureMessage(e instanceof Error ? e.message : String(e)));
    }
  }

  /// WORD-TIMING-001: hear only this word — seek to the span start and pause
  /// at its end (the clip is a Blob-backed HTMLAudio, so `currentTime` is a
  /// plain seek; no clip re-request when the model clip is already loaded).
  async function playShadowWord(span: WordSpan) {
    const item = shadowItems?.[shadowIdx];
    if (!item) return;
    try {
      const url = await shadowClipUrl(item);
      setAudioMsg(null);
      playBlobUrl(url, true, { startAt: span.s, stopAt: span.e, onTime: setShadowTime });
    } catch (e) {
      setAudioMsg(audioFailureMessage(e instanceof Error ? e.message : String(e)));
    }
  }

  // K-13: graded reading — formative input practice. No scoring, no
  // evidence; scaffolds fade by mastery natively, audio is media-first.
  async function openReading() {
    setRoute("reading");
    setStoryActive(null);
    // Navigation drop, not a learner Close: never arms return-focus.
    closeStoryWordCard(false);
    // WORD-STATE-COLORING-001: refresh the kept-words list so the in-text
    // word states (learning = mined) are honest at the moment the reader opens.
    void refreshMine();
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
      closeStoryWordCard(false);
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

  // READER-FLOW-001: the word tap opens the card at that exact token.
  // `word_card` carries the lookup (and the honest off-pack answer);
  // `story_word_audio` answers whether the engine can slice that exact word
  // form out of the sentence clip — when it misses, the card simply has no
  // Play button, the app never guesses word audio.
  async function openStoryWordCard(sentenceId: string, token: string) {
    const inv = detectInvoke();
    // VOCAB-BUILDER-001: the tap records WHICH STORY it happened in —
    // no active story, no lookup call (the reader is the truth of the
    // story; the engine only shape-checks the id).
    const storyId = storyActive?.id;
    if (!inv || !profileId || !storyId) return;
    // The internal close supersedes an old card — deliberately NOT an
    // explicit close, so it never arms the return-focus (the anchor the
    // tap just captured belongs to the NEW card).
    closeStoryWordCard(false);
    storyWordGenRef.current = { sentenceId, token };
    setStoryWord({ sentenceId, token, card: null, audioUrl: null });
    const current = () => {
      const gen = storyWordGenRef.current;
      return gen !== null && gen.sentenceId === sentenceId && gen.token === token;
    };
    try {
      const card = (await inv("word_card", {
        profileId,
        sentenceId,
        storyId,
        token,
      })) as WordCardView;
      if (current()) {
        setStoryWord((prev) => (prev ? { ...prev, card } : prev));
      }
    } catch (e) {
      if (current()) setStoryError(String(e));
    }
    try {
      const a = (await inv("story_word_audio", { profileId, sentenceId, token })) as {
        wav_b64: string;
        source: string;
      };
      const bytes = Uint8Array.from(atob(a.wav_b64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
      if (current()) {
        storyWordAudioRef.current = url;
        setStoryWord((prev) => (prev ? { ...prev, audioUrl: url } : prev));
      } else {
        URL.revokeObjectURL(url);
      }
    } catch {
      // No audio for this word form: the card renders no Play button.
    }
  }

  function playStoryWordAudio(sentenceId: string, token: string) {
    const wc = storyWord;
    if (wc && wc.sentenceId === sentenceId && wc.token === token && wc.audioUrl) {
      // Retained: the clip belongs to the open card, not to one playback;
      // `closeStoryWordCard` releases the URL (R14 one-shot rules do not
      // own a URL this screen keeps for replays).
      playBlobUrl(wc.audioUrl, true);
    }
  }

  function closeStoryWordCard(explicit = true) {
    if (storyWordAudioRef.current) {
      URL.revokeObjectURL(storyWordAudioRef.current);
      storyWordAudioRef.current = null;
    }
    // WORDCARD-OFFSCREEN-001: only an EXPLICIT close (the Close button or
    // Escape) arms return-focus; navigation supersedes (tab switch, story
    // change) drop the card without stealing focus.
    if (explicit && storyWordAnchorRef.current.el) {
      storyWordAnchorRef.current.closing = true;
    }
    storyWordGenRef.current = null;
    setStoryWord(null);
  }

  // WORDCARD-OFFSCREEN-001: focus management for the phone bottom-sheet
  // card. On open, focus rides the card itself (measuring the applied
  // stylesheet, not the viewport width, so a mid-visit rotation can never
  // yank the page on a desktop-width inline card). On close, focus returns
  // to the tapped word button, keyboard position intact.
  useEffect(() => {
    const anchor = storyWordAnchorRef.current;
    if (storyWord === null) {
      if (anchor.closing && anchor.el && anchor.el.isConnected) {
        anchor.el.focus();
      }
      anchor.el = null;
      anchor.closing = false;
      return;
    }
    const card = document.querySelector<HTMLElement>(".word-card");
    if (card && getComputedStyle(card).position === "fixed") {
      card.focus();
    }
  }, [storyWord]);

  // K-14: learner-owned lexicon. Mined words are device-local, cited,
  // and scheduled by their own SRS rows — never mastery evidence.
  async function refreshMine() {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      const items = (await inv("mine_list", { profileId })) as typeof mineItems;
      setMineItems(items);
      // ACCUMULATION-METERS-001: the kept-words count the Today header shows.
      setMineCount(items.length);
      setMineError(null);
    } catch (e) {
      setMineError(String(e));
    }
  }

  async function openWords() {
    setRoute("words");
    setMineReview(null);
    setErrReview(null);
    setErrError(null);
    setErrNotice(null);
    setMineFlashId(null);
    // FEEL-LOADING-001: prime with the flag up so the panel shows skeleton
    // rows instead of yesterday's list (or a false empty state).
    setWordsLoading(true);
    try {
      await refreshMine();
      await refreshErrorReviews();
    } finally {
      setWordsLoading(false);
    }
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
      // FEEL-MYWORDS-001: the add lands with a pulse on the row that
      // arrived — or on the kept original when the mine was a repeat.
      setMineFlashId(res.id);
      setMineSurface("");
      setMineReading("");
      setMineGloss("");
      setMineSource("");
      await refreshMine();
    } catch (e) {
      setMineError(String(e));
    }
  }

  async function mineFromStory(surface: string, reading: string | null, gloss: string | null) {
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

  // VOCAB-BUILDER-001: the My-words drill replays the sentence the word
  // was met in, through the SAME `story_audio` sentence path the reader
  // uses — one audio truth, no second clip mechanism.
  async function playMineContext(sentenceId: string) {
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
      setMineError(audioFailureMessage(String(e)));
    }
  }

  // CONTENT-CONFIRM-001 (ADR-0040): the ONLY way a confirmation mark is
  // ever created — this explicit click. The engine resolves the pack from
  // the profile's active selection, attributes the mark to the profile,
  // and answers with who now stands behind the item; we splice that
  // attribution straight back into the open view.
  async function toggleContentConfirm(contentId: string) {
    const inv = detectInvoke();
    if (!inv || !profileId || !storyActive) return;
    const marks = storyActive.confirmations?.[contentId] ?? [];
    const mine = marks.some((c) => c.display_name === displayName);
    try {
      const res = (await inv(mine ? "content_unconfirm" : "content_confirm", {
        profileId,
        contentId,
      })) as { content_id: string; confirmed_by: { display_name: string; at: string }[] };
      setStoryActive((prev) =>
        prev
          ? {
              ...prev,
              confirmations: { ...(prev.confirmations ?? {}), [contentId]: res.confirmed_by },
            }
          : prev,
      );
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

  // FIX-ERR-SRS-LOOP-001-2 (D3): the ONLY front-end call sites of the
  // error-review commands. Accept is a deliberate click on an offer —
  // rendering offers never triggers these; the engine creates the card
  // inside `error_review_accept`, so an unaccepted offer schedules
  // nothing (the never-silent invariant, pinned in error-review.test).
  async function acceptErrorOffer(offer: FormErrorOfferView, fail: (msg: string) => void) {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      await inv("error_review_accept", { profileId, ledgerId: offer.ledger_id });
      setAcceptedOffers((prev) =>
        prev.includes(offer.ledger_id) ? prev : [...prev, offer.ledger_id],
      );
    } catch (e) {
      fail(String(e));
    }
  }

  async function refreshErrorReviews() {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      setErrCards((await inv("error_review_queue", { profileId })) as ErrorReviewCardView[]);
    } catch (e) {
      setErrError(String(e));
    }
  }

  function startErrorReview() {
    const [first] = errCards;
    if (!first) {
      setErrNotice("Nothing is due for review right now.");
      return;
    }
    setErrNotice(null);
    setErrReview({ card: first, revealed: false });
  }

  async function gradeErrorReview(again: boolean) {
    const inv = detectInvoke();
    if (!inv || !profileId || !errReview) return;
    try {
      await inv("error_review_grade", { profileId, cardId: errReview.card.card_id, again });
      setErrReview(null);
      await refreshErrorReviews();
    } catch (e) {
      setErrError(String(e));
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

  // U03: the engine answers which saved words were never scheduled; the UI
  // opens the existing reveal+self-grade card for one of them. The first
  // grade then goes through `mine_grade`, which seeds the schedule — the
  // same single grading path due reviews use.
  async function startNewMineReview() {
    const inv = detectInvoke();
    if (!inv || !profileId) return;
    try {
      const fresh = (await inv("mine_new", { profileId })) as typeof mineItems;
      const [first] = fresh;
      if (!first) {
        setMineNotice("No new words are waiting for their first review.");
        return;
      }
      setMineNotice(null);
      setMineReview({ item: first, revealed: false });
    } catch (e) {
      setMineError(String(e));
    }
  }

  function reviewMineNow(id: string) {
    const item = mineItems.find((m) => m.id === id);
    if (!item || item.due_at) return;
    setMineNotice(null);
    setMineReview({ item, revealed: false });
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
    // SCENARIO-TRANSFER-001: this opens the variant's practice payload;
    // it never marks a transfer done.
    setScenarioTransferResult(null);
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

  async function transferAnswerScenario(answer: string) {
    if (!inv || !profileId || !scenarioActive) return;
    setScenarioError(null);
    try {
      const res = (await inv("scenario_transfer_answer", {
        profileId,
        scenarioId: scenarioActive.scenario_id,
        answer,
      })) as { result: string; done: boolean; view: ScenarioView };
      setScenarioTransferResult(res.result);
      setScenarioActive(res.view);
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
  const captureRouteRef = useRef<"pronunciation" | "dictation" | "practice-speaking">(
    "pronunciation",
  );

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

  // PACK-UPDATE-UX-001: `available_packs` answers a PackCandidate with no
  // version field at all (lib.rs:287-313), so the wizard can only name a
  // catalogue version by joining against the catalogue this process has
  // read. No catalogue entry for a pack means no second version claim —
  // the step then says one version and nothing more.
  const wizardPacks = packs.map((pack) => ({
    ...pack,
    available_version: catalog.find((c) => c.pack_id === pack.pack_id)?.version ?? null,
  }));
  // The same join the Language packs panel makes per row (language.tsx:462):
  // a pack on the device whose installed version is not the catalogue
  // version has an update, and Settings is where it is applied.
  const packUpdates: PackUpdate[] = [];
  for (const entry of catalog) {
    if (entry.installed_version !== null && entry.installed_version !== entry.version) {
      packUpdates.push({
        pack_id: entry.pack_id,
        display_name: entry.display_name,
        installed_version: entry.installed_version,
        available_version: entry.version,
      });
    }
  }
  // JA-KANJI-DECOMP-UI-001: an element list is not always a list of parts, so
  // the drill names the case the card is in rather than joining glyphs
  // unexplained; kanji-decomposition.ts states the rule.
  const kanjiDecomposition = kanjiActive ? describeKanjiDecomposition(kanjiActive) : null;

  // WEB-HISTORY-001: browser back/forward integration for web (serve)
  // mode. The destination below is DERIVED from the same state that
  // renders the screens — the state machine stays the single source of
  // truth and history traversals are routed back through the app's own
  // navigation functions (src/history-nav.ts owns the mechanics). The
  // shim installs only under the serve marker or the acceptance-harness
  // flag, so desktop behavior is unchanged at the install seam.
  const appLocation: AppLocation = {
    tab: route === "practice" ? "" : route,
    session: session !== null,
    stage: practiceTarget !== null,
  };
  const historyNavRef = useRef<HistoryNav | null>(null);
  const currentLocationRef = useRef<AppLocation>(appLocation);
  currentLocationRef.current = appLocation;
  const [historyExitAsk, setHistoryExitAsk] = useState<AppLocation | null>(null);
  const historyPopRef = useRef<(target: AppLocation | null, guarded: boolean) => void>(() => {});
  historyPopRef.current = (target, guarded) =>
    handleHistoryPop(
      {
        step,
        appLocation,
        practiceTarget,
        route,
        sessionQueueRef,
        historyNavRef,
        setHistoryExitAsk,
        setRoute,
        pauseSession,
        resumeSession,
        leaveSoloStage: () => {
          setPracticeTarget(null);
          setPracticeTask(null);
          setLesson(null);
          setLessonSeen(false);
        },
      },
      target,
      guarded,
    );
  useEffect(() => {
    const nav = installHistoryNav({
      current: () => currentLocationRef.current,
      onPop: (target, guarded) => historyPopRef.current(target, guarded),
    });
    historyNavRef.current = nav;
    return () => nav?.teardown();
  }, []);
  useEffect(() => {
    const nav = historyNavRef.current;
    if (!nav || step !== "done" || profileId === null) return;
    nav.sync(appLocation);
    // The location strings are the only values that matter: pushing an
    // entry whose destination the history already names is a no-op,
    // which is what keeps the walk loop-free.
  }, [appLocation.tab, appLocation.session, appLocation.stage, step, profileId]);

  if (step !== "done") {
    return (
      <AppShell productName="Open Language Learning Platform" nav={[]}>
        {serveUnpaired ? (
          <ServePairingCard />
        ) : (
          <Onboarding
            step={step}
            notice={notice}
            packs={wizardPacks}
            selectedPack={selectedPack}
            installed={installed}
            onUpdatePack={(id) => void updateFromCatalog(id)}
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
            showHiddenProfiles={chooserShowHidden}
            onShowHiddenProfiles={setChooserShowHidden}
            onToggleHidden={(id, hidden) => void toggleProfileHidden(id, hidden)}
            error={onboardError}
            progress={engineProgress}
            installing={installingPack}
          />
        )}
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
  // SETTINGS-PACK-CAPABILITY-001: the in-app kana keyboard setting exists only
  // while the active pack's own manifest declares a script the keyboard can
  // type (manifest `scripts:`, plumbed in on the installed-pack record). A pack
  // that declares no such script — or no pack is active — grants no toggle;
  // this is the pack's declaration read back, never a language-code check.
  const packDeclaresKanaKeyboard = activeRecord
    ? packDeclaresInAppKanaKeyboard(activeRecord.scripts, {
        declared: activeRecord.input_methods_declared,
        methods: activeRecord.input_methods,
      })
    : false;
  // SETTINGS-SCOPE-001: the romaji card exists only while some INSTALLED
  // pack's manifest declares the `romanization-display` settings capability
  // — the union across installed packs, read back verbatim from each pack's
  // own manifest. A Russian-only learner sees no Japanese-only control;
  // installing a pack that grants it makes the card appear. Nothing here
  // reads a locale or a pack id.
  const packDeclaresRomanizationDisplay = installedPacksDeclareSetting(
    installed,
    ROMANIZATION_DISPLAY_SETTING,
  );
  // SETTINGS-SCOPE-001: the detect-microphones button honors the serve
  // bridge's own availability report instead of offering a click that the
  // browser will refuse (insecure context). Desktop mode never consults
  // this — the webview reveals inputs; only a serve report that names the
  // truth (or an unreachable bridge in serve mode, where the banner already
  // says so) changes the button.
  const micDetectUnavailableReason =
    inLtsServeMode() && serveMicNamesAvailable === false
      ? "Detect microphones is unavailable here: this context is not a secure context, so the browser reveals no microphone names. Recording from the system default still works."
      : null;
  const activePack =
    activeIds[0] && activeClaims
      ? {
          name: activeRecord?.display_name ?? activeIds[0],
          posture: packPosture(activeClaims.postures),
        }
      : null;

  // APP-SPLIT-003B: one props bundle (state + setters) for the
  // settings/import wiring slice in ./app/settings-wiring. Built per
  // render, AFTER every referenced binding is in scope, so the moved
  // bodies read exactly what the old inline closures captured. App()
  // keeps owning every hook; these are plain values and setters.
  const settingsWiringDeps: SettingsWiringDeps = {
    inv,
    profileId,
    restorePath,
    restoreChecked,
    setSettingsError,
    setRestoreOutcome,
    setRestoreChecked,
    setSettingsExportPath,
    setSettingsDeleteArmed,
    setSettingsSwitchArmed,
    setMicEnabled,
    setMicDevice,
    setPlaybackDevice,
    setRomajiMode,
    setKanaKeyboard,
    refreshSpeech,
    refreshLanguages,
    refreshAligner,
    refreshMicrophones,
    refreshOutputs,
    setProfileId,
    setDisplayName,
    applyPlan,
    setEnvironments,
    setMineCount,
    setGoals,
    setProgress,
    sessionQueueRef,
    setSession,
    setSessionOutcome,
    setSelectedPack,
    setActiveIds,
    setProfiles,
    setStep,
    setRoute,
  };

  return (
    <AppShell
      productName="Open Language Learning Platform"
      nav={[]}
      packDirection={activeRecord?.rtl ? "rtl" : "ltr"}
      packLocale={activeRecord?.locale}
      contentClassName="app-enter"
      routeNav={
        <nav ref={routesRef} aria-label="Routes" className="routes">
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
      {/* WEB-SERVE-001 scope 4 labels the browser bridge honestly; per
          SERVE-BANNER-001 (market meta rule) the full capability lines
          moved to Settings > About this build. Only a genuinely degraded
          capability rides the screen: at most this one quiet line, and
          only when the server's own report blocks the microphone here. */}
      {serveBadge ? (
        <p role="status" className="meta" data-testid="serve-badge">
          {serveBadge}
        </p>
      ) : null}
      {playbackError ? (
        <p role="alert" className="alert" data-testid="playback-error">
          {playbackError}
        </p>
      ) : null}
      {/* SESSION-CHROME-001 (U3): the thin in-session chrome rides every
          activity route while a bounded session runs, so the learner
          always sees how far into the session they are and roughly how
          much longer it holds. */}
      {session ? (
        <SessionChrome
          done={session.done}
          total={session.total}
          remainingSeconds={session.remainingSeconds ?? null}
          status={session.status}
        />
      ) : null}
      {route === "hub" ? (
        <PracticeHub
          onOpen={openMode}
          kanjiAvailable={kanjiAvailable}
          updates={packUpdates}
          onOpenLanguagePacks={() => setRoute("settings")}
          noPack={activeIds.length === 0 && !packsUnknown && !packsPending}
        />
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
            kanaInput={inAppInputOn}
            imeCandidates={imeCandidates}
            acceptedOffers={acceptedOffers}
            onAcceptOffer={(o) => void acceptErrorOffer(o, setAudioMsg)}
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
          playTime={shadowTime}
          playing={clipPlaying}
          onRetry={() => void openShadowing()}
          onOpenSetup={() => void openSettings()}
          onPlayModel={() => void playShadowModel()}
          onRecord={recordAttempt}
          onStop={stopAndCheck}
          onPlayAttempt={() => {
            if (attemptUrl) playBlobUrl(attemptUrl, true);
          }}
          onPlayWord={(span) => void playShadowWord(span)}
          onStep={(delta) => {
            // Changing item retires the retained clip (WORD-TIMING-001).
            releaseShadowClip();
            setShadowIdx((i) => Math.max(0, Math.min((shadowItems?.length ?? 0) - 1, i + delta)));
          }}
        />
      ) : route === "reading" ? (
        <ReadingPanel
          storyList={storyList}
          storyActive={storyActive}
          storyError={storyError}
          onOpenStory={(id) => void openStory(id)}
          onBack={() => void openReading()}
          onPlaySentence={(id) => void playStoryAudio(id)}
          wordCard={storyWord}
          wordAudioAvailable={storyWord !== null && storyWord.audioUrl !== null}
          onWordTap={(id, token) => void openStoryWordCard(id, token)}
          onWordAnchor={(el) => {
            storyWordAnchorRef.current.el = el;
            storyWordAnchorRef.current.closing = false;
          }}
          onWordPlay={(id, token) => playStoryWordAudio(id, token)}
          onWordClose={closeStoryWordCard}
          onMine={(surface, reading, gloss) => void mineFromStory(surface, reading, gloss)}
          profileName={displayName}
          minedSurfaces={mineItems.map((m) => m.surface)}
          grammarLabels={grammarLabelsEnabled(display)}
          onConfirm={(id) => void toggleContentConfirm(id)}
          onUnconfirm={(id) => void toggleContentConfirm(id)}
        />
      ) : route === "words" ? (
        <>
          <MyWordsPanel
            items={mineItems}
            loading={wordsLoading}
            flashId={mineFlashId}
            review={mineReview}
            intervalPreview={minePreview}
            error={mineError}
            notice={mineNotice}
            onPlayContext={(sentenceId) => void playMineContext(sentenceId)}
            draft={{
              surface: mineSurface,
              reading: mineReading,
              gloss: mineGloss,
              source: mineSource,
            }}
            kanaInput={inAppInputOn}
            imeCandidates={imeCandidates}
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
            onReviewNow={(id) => reviewMineNow(id)}
            onStartNewReview={() => void startNewMineReview()}
            onReveal={() => setMineReview((r) => (r ? { ...r, revealed: true } : r))}
          />
          <ErrorReviewPanel
            cards={errCards}
            review={errReview}
            error={errError}
            notice={errNotice}
            onStartReview={startErrorReview}
            onReveal={() => setErrReview((r) => (r ? { ...r, revealed: true } : r))}
            onGrade={(again) => void gradeErrorReview(again)}
          />
        </>
      ) : route === "placement" ? (
        <section aria-label="Placement">
          <h1>Placement</h1>
          <p className="empty">
            Low-stakes checks on what you may already know — two quick questions per goal. Correct
            answers mark known foundations, and practice skips ahead automatically.
          </p>
          <PlacementCoverageNote rows={placementCoverage} />
          {placementError && (
            <p role="alert" className="alert">
              {placementError}
            </p>
          )}
          {placementFinished ? (
            <div className="field">
              <PlacementResultBand hits={placementHits} total={placementItems.length} />
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
            <>
              <StepDots
                total={placementItems.length}
                current={placementIdx}
                label="Placement question"
              />
              <PracticeRunner
                task={placementTask}
                graded={placementGraded}
                correct={placementCorrect}
                correctChoice={placementCorrectChoice}
                onChoose={(i) => void answerPlacement(i)}
                onNext={() => void nextPlacement()}
                stress={stressEnabled(display)}
              />
            </>
          ) : (
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={placementLoading}
                aria-busy={placementLoading || undefined}
                onClick={() => void openPlacement()}
              >
                {placementLoading ? "Starting…" : "Start placement"}
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
              <StepDots
                total={2}
                current={kanjiStage === "meaning" ? 0 : 1}
                label="Kanji drill stage"
              />
              <PackText tag="p" className="prompt">
                {kanjiActive.character}
              </PackText>
              <p>
                <small>
                  <span>{kanjiDecomposition?.label}</span>
                  {kanjiDecomposition?.showParts ? (
                    <>
                      {" "}
                      <PackText tag="span">{kanjiDecomposition.parts.join(" + ")}</PackText>
                    </>
                  ) : null}
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
          {/* FEEL-LOADING-001: the four Progress reads land at different
              moments and used to reflow the page as each arrived. While any
              is in flight one reserved shell holds every section's height in
              final order — the content lands settled, and the page never
              jumps under the learner. */}
          {progressLoading ? (
            <div className="progress-skeleton" role="status" aria-label="Loading progress">
              <div className="skeleton-block skeleton-block--facts" />
              <div className="skeleton-block skeleton-block--summary" />
              <div className="skeleton-block skeleton-block--stats" />
              <div className="skeleton-block skeleton-block--map" />
              <div className="skeleton-block skeleton-block--tree" />
            </div>
          ) : (
            !progressError && (
              <>
                {/* WARM-MOMENTS-001: memory, not debt — above the capability
                  answers, below nothing; it abstains when the wire failed. */}
                <GentleFacts facts={learningFacts} />
                <CanDoSummary goals={goals} rows={progress} nextGoal={nextGoal} />
                {/* PROGRESS-STATS-001 (U14): instruments above the tree.
                    FEEL-PROGRESS-001: a learner the engine's OWN lifetime
                    facts place at zero (days_active and units_done both 0)
                    gets the designed honest zero-state instead of a strip
                    of abstentions; a failed facts read never triggers it. */}
                {learningFacts &&
                learningFacts.days_active === 0 &&
                learningFacts.units_done === 0 ? (
                  <ProgressZeroState onStart={() => setRoute("practice")} />
                ) : memoryStats ? (
                  <MemoryStatsStrip stats={memoryStats} />
                ) : null}
                <GoalMap goals={goals} />
                <ProgressView rows={progress} />
              </>
            )
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
              romanizationNoun={
                (activeRecord?.locale ?? "").toLowerCase().startsWith("ru")
                  ? "transliteration"
                  : "romaji"
              }
              onHint={showWritingHint}
              kanaInput={inAppInputOn}
              imeCandidates={imeCandidates}
              offer={writingOffer}
              offerAccepted={writingOffer ? acceptedOffers.includes(writingOffer.ledger_id) : false}
              onAcceptOffer={(o) => void acceptErrorOffer(o, setWritingError)}
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
          onTransferAnswer={(answer) => void transferAnswerScenario(answer)}
          transferResult={scenarioTransferResult}
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
            onToggleGrammarLabels={(on) => void setGrammarLabelsSetting(on)}
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
            kanaKeyboard={kanaKeyboard}
            onSetKanaKeyboard={(m) => void setKanaKeyboardSetting(m)}
            packDeclaresKanaKeyboard={packDeclaresKanaKeyboard}
            packDeclaresRomanizationDisplay={packDeclaresRomanizationDisplay}
            micDetectUnavailableReason={micDetectUnavailableReason}
            speechModel={speechModel}
            speechModels={speechModels}
            onSelectSpeechModel={(id) => void selectSpeechModel(id)}
            onInstallModel={(id) => void installSpeechModel(id)}
            onDeleteModel={(id) => void deleteSpeechModel(id)}
            aligner={alignerStatus}
            deviceTier={deviceTier}
            buildIdentity={buildIdentity}
            exportPath={settingsExportPath}
            onExport={() => void runProfileExport(settingsWiringDeps)}
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
            onPreviewRestore={() => void runRestorePreview(settingsWiringDeps)}
            onConfirmRestore={() => void runRestoreConfirm(settingsWiringDeps)}
            deleteArmed={settingsDeleteArmed}
            onArmDelete={() => setSettingsDeleteArmed(true)}
            onCancelDelete={() => setSettingsDeleteArmed(false)}
            playbackDevice={playbackDevice}
            playbackOutputs={playbackOutputs}
            canRouteOutput={canRouteOutput}
            onPickPlaybackDevice={(id) => void pickPlaybackSetting(id)}
            onConfirmDelete={() => void runProfileDelete(settingsWiringDeps)}
            switchArmed={settingsSwitchArmed}
            onArmSwitch={() => setSettingsSwitchArmed(true)}
            onCancelSwitch={() => setSettingsSwitchArmed(false)}
            onConfirmSwitch={() => void runProfileSwitch(settingsWiringDeps)}
            error={settingsError}
            loading={settingsLoading}
            saveNotice={settingsSaveNotice}
            installingModelId={installingSpeechModel}
            serveNotice={serveNotice}
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
              onStart={() => {
                // ENCOUNTER-BEFORE-TEST-001: finishing the encounter view
                // IS the completed encounter — the engine's test routes
                // (due-review, weak-skill) gate on this record. Once per
                // encounter view; the engine dedupes per
                // (profile, content, activity), and a failed write never
                // traps the learner — the next view re-records.
                if (inv && profileId) {
                  void inv("encounter_complete", {
                    profileId,
                    unitId: lesson.unit_id,
                  }).catch(() => {});
                }
                setLessonSeen(true);
              }}
              onScenario={(scenarioId) => {
                void startScenario(scenarioId);
                setRoute("scenarios");
              }}
            />
          ) : (
            <>
              {lesson && stagePositionLabel(lesson) ? (
                // U06: the learner sees where the engine's cursor sits on
                // the authored journey, from the unit's real counts.
                <p className="meta" data-testid="practice-stage-position">
                  {stagePositionLabel(lesson)}
                </p>
              ) : null}
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
                playing={clipPlaying}
                kanaInput={inAppInputOn}
                imeCandidates={imeCandidates}
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
                speakCheck={practiceSpeakCheck}
                recording={recording}
                hasAttempt={attemptUrl !== null}
                onRecord={() => {
                  captureRouteRef.current = "practice-speaking";
                  recordAttempt();
                }}
                onStop={stopAndCheck}
                onPlayAttempt={() => {
                  if (attemptUrl) playBlobUrl(attemptUrl, true);
                }}
              />
            </>
          )}
          {session ? (
            <div className="btn-row session-exit">
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
      ) : sessionBridge ? (
        // SESSION-FLOW-COPY-001: the inter-activity bridge. Announced
        // (role=status), visible, and cancellable — the pause control rides
        // here too, so the auto-advance is never something the learner has
        // to outrun.
        <section
          aria-label="Session bridge"
          data-testid="session-bridge"
          className="session-bridge"
        >
          <p role="status" aria-live="polite" className="session-bridge-label">
            {sessionBridge}
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--quiet"
              data-session-pause
              onClick={pauseSession}
            >
              Pause session
            </button>
          </div>
        </section>
      ) : practiceTarget ? (
        <section aria-label="Practice">
          <p className="empty">
            This activity is not ready to practice yet.
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
          noPack={activeIds.length === 0 && !packsUnknown && !packsPending}
          packsUnknown={packsUnknown}
          packsPending={packsPending}
          onChooseLanguage={() => setRoute("settings")}
          onExplore={() => setRoute("hub")}
          updates={packUpdates}
          plan={plan}
          packSwitching={packSwitching}
          activeBudget={budget}
          onBudget={(m) => void changeBudget(m)}
          environments={environments ?? undefined}
          myWordsCount={mineCount}
          worlds={
            environments == null
              ? null
              : environments.length === 0
                ? null
                : {
                    unlocked: environments.filter((e) => e.unlocked).length,
                    total: environments.length,
                  }
          }
          nextGoal={nextGoal}
          pathNodes={pathNodes}
          nextOffer={nextOffer}
          firstRunSteps={firstRunSteps}
          onStart={(item) => void openPractice(item)}
          onStartSession={() => void startSession()}
          session={session}
          sessionOutcome={sessionOutcome}
          onResumeSession={() => void resumeSession()}
          onStopSession={() => closeSession("stopped")}
          onDismissSessionSummary={() => setSessionOutcome(null)}
          onStartCapstone={(node) => void startCapstoneSession(node)}
          capstoneResult={capstoneResult}
        />
      )}
      <HistoryExitAsk
        ask={historyExitAsk}
        onKeep={() => setHistoryExitAsk(null)}
        onConfirmExit={() => confirmHistoryExit({ historyNavRef, setHistoryExitAsk, closeSession })}
      />
      {/* IME-TOGGLE-UX-001: the input-mode bubble is pinned to the app
          chrome (fixed position), so it rides every in-app route. It
          exists only while the active pack's declared scripts grant an
          in-app keyboard — a pack that ships no mapping data shows no
          bubble — and its label comes from that pack's own script
          metadata, never a language literal. It sits last in content
          order so a route's own status announcements stay the first
          status region on the page; screen-reader order follows. */}
      {activeKeyboard ? (
        <InputModeBubble
          on={inAppInputOn}
          label={inputModeLabel(activeKeyboard)}
          shortcutHint="Ctrl+Shift+K"
          onToggle={() =>
            void setKanaKeyboardSetting(
              inAppInputOn ? "off" : (activeKeyboard.converter.id as KanaKeyboardMode),
            )
          }
        />
      ) : null}
    </AppShell>
  );
}
