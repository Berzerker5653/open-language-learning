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
  type GoalCard,
  GoalMap,
  type WorldEnvironment,
  type NextGoalView,
  type FirstRunStep,
} from "./home";
import { EMPTY_PITCH, PronunciationPractice, type PronunciationResult } from "./pronunciation";
import { DictationPractice, type DictationResult, type DictationSentence } from "./dictation";
import {
  LanguagePanel,
  packPosture,
  type CatalogEntry,
  type InstalledPack,
  type PackClaims,
  type SpeechModel,
  type TtsStatus,
  type DeviceTier,
  type AlignerStatus,
} from "./language";
import { WritingPractice, type WritingTaskView } from "./writing";
import { PracticeRunner, type PracticeTaskView } from "./practice";
import { stressEnabled, type DisplaySettingsView } from "./stress";
import { Ruby } from "./ruby";
import {
  ScenarioPanel,
  type ScenarioOutcomeView,
  type ScenarioStepResult,
  type ScenarioSummaryView,
  type ScenarioView,
} from "./scenario";
import { Settings, type RomajiMode } from "./settings";
import { listMicrophones, openMicrophone, type Microphone } from "./capture";
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
    return (cmd, args) => import("@tauri-apps/api/core").then((m) => m.invoke(cmd, args));
  }
  return null;
}

/**
 * D7: honest refusal copy for a profile with no active pack. Nothing is
 * ever built against a guessed pack id, so the message names the fix
 * (the Languages page is where a pack becomes active).
 */
export const NO_ACTIVE_PACK = "No pack is active for this profile. Choose one under Languages.";

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
    ? `This profile has more than one active pack (${ids.join(", ")}). Using ${ids[0]}; choose a single pack under Languages.`
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
    | "language"
    | "scenarios"
    | "shadowing"
    | "reading"
    | "words"
    | "placement"
    | "kanji"
    | "settings"
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
  const [profileName, setProfileName] = useState("");
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [budget, setBudget] = useState(5);
  const [plan, setPlan] = useState<SessionPlan>(EMPTY_PLAN);
  // K-66: derived guidance from the engine. `undefined` = home_state has
  // not answered; `null` = the pack declares no goal map. The app never
  // composes these strings itself (ADR-0020).
  const [nextGoal, setNextGoal] = useState<NextGoalView | null | undefined>(undefined);
  const [firstRunSteps, setFirstRunSteps] = useState<FirstRunStep[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [pronResult, setPronResult] = useState<PronunciationResult | null>(null);
  const [dictTarget, setDictTarget] = useState("おばあさん");
  const [dictResult, setDictResult] = useState<DictationResult | null>(null);
  const [dictSentence, setDictSentence] = useState<DictationSentence | null>(null);
  const [dictOffset, setDictOffset] = useState(0);
  const [recording, setRecording] = useState(false);
  const [attemptUrl, setAttemptUrl] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<WorldEnvironment[]>([]);
  const [goals, setGoals] = useState<GoalCard[]>([]);
  const [installed, setInstalled] = useState<InstalledPack[]>([]);
  const [claims, setClaims] = useState<PackClaims[] | null>(null);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogStatus, setCatalogStatus] = useState("no-catalog-url");
  const [audioMsg, setAudioMsg] = useState<string | null>(null);
  const [langError, setLangError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<TtsStatus | null>(null);
  const [alignerStatus, setAlignerStatus] = useState<AlignerStatus | null>(null);
  const [speechModels, setSpeechModels] = useState<SpeechModel[]>([]);
  const [speechModel, setSpeechModel] = useState<string>("off");
  const [deviceTier, setDeviceTier] = useState<DeviceTier | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [installingPack, setInstallingPack] = useState<string | null>(null);
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
  const [display, setDisplay] = useState<DisplaySettingsView | null>(null);
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
  // SETTINGS-001: engine-backed settings state. micEnabled mirrors the
  // stored `microphone-enabled`; it gates getUserMedia at the capture
  // site, so a wrong value here is a privacy bug, not a cosmetic one.
  const [micEnabled, setMicEnabled] = useState(false);
  // K-64: the stored capture device (null = system default) plus the list the
  // browser will name. Labels only exist once access has been granted, so an
  // empty list is expected on a fresh profile and the copy says so.
  const [micDevice, setMicDevice] = useState<string | null>(null);
  const [micDevices, setMicDevices] = useState<Microphone[]>([]);
  const [romajiMode, setRomajiMode] = useState<RomajiMode>("auto");
  const [settingsExportPath, setSettingsExportPath] = useState<string | null>(null);
  const [settingsDeleteArmed, setSettingsDeleteArmed] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

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
    {
      id: string;
      title: string;
      description: string | null;
      status: string;
      sentence_count: number;
    }[]
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
      status: string;
      known: {
        id: string;
        surface: string;
        reading: string | null;
        romaji: string | null;
        gloss: string;
        status: string;
      }[];
    }[];
    status: string;
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
  const [mineNotice, setMineNotice] = useState<string | null>(null);
  const [mineReview, setMineReview] = useState<{
    item: (typeof mineItems)[number];
    revealed: boolean;
  } | null>(null);
  const [shadowError, setShadowError] = useState<string | null>(null);

  useEffect(() => {
    const inv = detectInvoke();
    if (!inv) return;
    if (walkthroughRan) return;
    walkthroughRan = true;
    void (async () => {
      const mode = (await inv("app_mode")) as { smoke: boolean };
      if (mode.smoke) {
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
          const tick = () =>
            pred() || left-- <= 0 ? resolve() : requestAnimationFrame(tick);
          requestAnimationFrame(tick);
          await promise;
        };
        // A frame budget that never completes must produce a readable marker,
        // not a harness timeout: exit 124 says nothing about where the webview
        // stopped painting.
        const paintedOrStall = async (label: string) => {
          const stalled = await Promise.race([
            painted(4).then(() => false),
            after(3000, true),
          ]);
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
                progressStages.some(
                  (p2) => p2.operation === "install-pack" && p2.stage === stage,
                )
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
          setPlan(home.plan);
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
          await painted(4);
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
          // the two halves need different fixes. Leave the tab, come back, and
          // time the return: by now the panel's commands are warm and its data
          // is memoized, so whatever is left is the remount's fetch chain plus
          // painting the panel. If the number survives, it is paint.
          const navTo = (label: string) =>
            buttons.find((b) => (b.textContent ?? "").trim() === label) as
              | HTMLButtonElement
              | undefined;
          const away = navTo("Reading");
          const back = navTo("Languages");
          if (away && back) {
            away.click();
            await paintedOrStall("Reading");
            const again = performance.now();
            back.click();
            await paintedOrStall("Languages");
            await inv("smoke_ack", {
              note: `route-2ms:Languages:${Math.round(performance.now() - again)}`,
            });
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
            ["tts_status", undefined],
            ["aligner_status", undefined],
            ["scenario_list", { profileId: p.id }],
            ["home_state", { profileId: p.id }],
            ["active_pack", { profileId: p.id }],
            ["placement_plan", { profileId: p.id }],
            ["kanji_list", { profileId: p.id }],
            ["goal_map", { profileId: p.id }],
            ["practice_plan", { profileId: p.id, minutes: 10 }],
            ["writing_task", { profileId: p.id }],
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
            const scen = scenarios[0];
            if (!scen) throw new Error("scenario list row vanished");
            const navBtn = Array.from(
              document.querySelectorAll('nav[aria-label="Routes"] button'),
            ).find((b) => (b.textContent ?? "").trim() === "Scenarios") as
              | HTMLButtonElement
              | undefined;
            if (!navBtn) throw new Error("Scenarios nav button missing");
            navBtn.click();
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
  // header before the Languages route has been opened (the state
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
      // so a returning session (no wizard this run) and a Languages pack
      // switch both aim at the right pack. No pack here means no pack:
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
    try {
      await inv("install_catalog_pack", { packId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    } finally {
      setEngineProgress(null);
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
    } finally {
      setEngineProgress(null);
    }
    await refreshLanguages();
  }

  async function refreshTts() {
    if (!inv) return;
    setTtsStatus((await inv("tts_status")) as TtsStatus);
  }

  async function refreshAligner() {
    if (!inv) return;
    setAlignerStatus((await inv("aligner_status")) as AlignerStatus);
  }

  async function installTtsModel(modelId: string) {
    if (!inv) return;
    try {
      await inv("install_model", { modelId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    } finally {
      setEngineProgress(null);
    }
    await refreshTts();
    await refreshSpeech();
  }

  async function deleteTtsModel(modelId: string) {
    if (!inv) return;
    try {
      await inv("delete_model", { modelId });
      setLangError(null);
    } catch (e) {
      setLangError(String(e));
    }
    await refreshTts();
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

  async function finishOnboarding(micEnabled: boolean) {
    setOnboardError(null);
    if (inv && profileId && selectedPack) {
      try {
        await inv("complete_onboarding", { profileId, packId: selectedPack, micEnabled });
        const home = (await inv("home_state", { profileId })) as {
          display_name: string;
          plan: SessionPlan;
          next_goal: NextGoalView | null;
        };
        setDisplayName(home.display_name);
        setPlan(home.plan);
        setNextGoal(home.next_goal);
        setFirstRunSteps((await inv("first_run_steps", { profileId })) as FirstRunStep[]);
        const envs = (await inv("world_state", { profileId })) as WorldEnvironment[];
        setEnvironments(envs);
        setDisplay((await inv("display_settings", { profileId })) as DisplaySettingsView);
        await loadProfilePrefs(profileId);
        void refreshLanguages(profileId).catch(() => {});
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
        next_goal: NextGoalView | null;
      };
      setDisplayName(home.display_name);
      setPlan(home.plan);
      setNextGoal(home.next_goal);
      setFirstRunSteps((await inv("first_run_steps", { profileId: p.id })) as FirstRunStep[]);
      const envs = (await inv("world_state", { profileId: p.id })) as WorldEnvironment[];
      setEnvironments(envs);
      setDisplay((await inv("display_settings", { profileId: p.id })) as DisplaySettingsView);
      await loadProfilePrefs(p.id);
      void refreshLanguages(p.id).catch(() => {});
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
      setRomajiMode((await inv("get_romaji_mode", { profileId })) as RomajiMode);
      await refreshSpeech();
      await refreshMicrophones();
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
    setPlan(EMPTY_PLAN);
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

  async function openProgress() {
    setRoute("progress");
    if (inv && profileId) {
      setProgress((await inv("progress_summary", { profileId })) as ProgressRow[]);
      setGoals((await inv("goal_map", { profileId })) as GoalCard[]);
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

  // K-15: placement — low-stakes diagnosis per pack assessment. Each
  // goal gets two support-0 questions (two correct diagnostic answers
  // across prompts reach `independent`, so known foundations unlock via
  // prerequisite gating). Evidence is tagged Diagnostic natively.
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
        setAudioMsg(req.error);
        return;
      }
      const a = req.value;
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
  // memory only (docs/08); nothing audio is ever persisted. The contrast
  // pair comes from the installed pack's phonology data (K-32), never from
  // app-internal language content.
  interface PronDemo {
    short_unit: string;
    long_unit: string;
    short_text: string;
    long_text: string;
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

  function playBlobUrl(url: string) {
    const audio = new Audio(url);
    void audio.play();
  }

  async function playReference(which: "short" | "long") {
    const inv = detectInvoke();
    if (!inv) return;
    if (!pronDemo) return;
    const unitId = which === "short" ? pronDemo.short_unit : pronDemo.long_unit;
    try {
      const req = await packRequest<string>(inv, selectedPack, "reference_audio", { unitId });
      if (!req.ok) {
        setAudioMsg(req.error);
        return;
      }
      const bytes = Uint8Array.from(atob(req.value), (c) => c.charCodeAt(0));
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
  // lives in memory only (docs/08); nothing audio is ever persisted.
  interface Capture {
    ctx: AudioContext;
    src: MediaStreamAudioSourceNode;
    proc: ScriptProcessorNode;
    stream: MediaStream;
    bufs: Float32Array[];
  }
  const captureRef = useRef<Capture | null>(null);
  const captureRouteRef = useRef<"pronunciation" | "dictation">("pronunciation");

  function recordAttempt() {
    void (async () => {
      let stream: MediaStream;
      let fallbackNote: string | null = null;
      // SETTINGS-001: the stored `microphone-enabled` setting is enforced
      // at the capture site — while it is off, getUserMedia is never
      // requested. (Without the native engine no setting exists.)
      if (inv && !micEnabled) {
        setAudioMsg(
          "The microphone is turned off, so the app will not ask for microphone access. You can turn it on in Settings; everything else works without a microphone.",
        );
        return;
      }
      try {
        // K-64: record from the device this profile chose, when it chose one.
        const opened = await openMicrophone(navigator.mediaDevices, micDevice);
        stream = opened.stream;
        fallbackNote = opened.fellBack
          ? "Your saved microphone was not available, so this recording used the system default. Pick it again in Settings."
          : null;
        // A successful grant is also when the browser starts naming devices,
        // so the Settings picker fills up without a restart.
        await refreshMicrophones();
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
        setAudioMsg(fallbackNote);
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
    if (captureRouteRef.current === "dictation") {
      void analyzeDictation(wav);
    } else {
      void analyzeWav(wav);
    }
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
  const activePack =
    activeIds[0] && activeClaims
      ? {
          name: installed.find((i) => i.pack_id === activeIds[0])?.display_name ?? activeIds[0],
          posture: packPosture(activeClaims.postures),
        }
      : null;

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
            aria-current={route === "dictation" ? "page" : undefined}
            onClick={() => void openDictation()}
          >
            Speaking
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
              void refreshTts();
              void refreshAligner();
              void refreshSpeech();
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
          <button
            type="button"
            className="tab"
            aria-current={route === "placement" ? "page" : undefined}
            onClick={() => void openPlacement()}
          >
            Placement
          </button>
          <button
            type="button"
            className="tab"
            aria-current={route === "kanji" ? "page" : undefined}
            onClick={() => void openKanji()}
          >
            Kanji
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
      {route === "pronunciation" ? (
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
              result={pronResult}
              recording={recording}
              hasAttempt={attemptUrl !== null}
              onRecord={() => {
                captureRouteRef.current = "pronunciation";
                recordAttempt();
              }}
              onStop={stopAndCheck}
              onPlayReference={(w) => void playReference(w)}
              onPlayAttempt={() => attemptUrl && playBlobUrl(attemptUrl)}
            />
          ) : (
            <section aria-label="Pronunciation">
              <h2>Pronunciation</h2>
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
                    <Ruby surface={s.text} furigana={s.furigana} />
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
          {mineNotice && (
            <p role="status" className="notice">
              {mineNotice}
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
      ) : route === "placement" ? (
        <section aria-label="Placement">
          <h2>Placement</h2>
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
          <h2>Kanji</h2>
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
              <p className="prompt" lang="ja">
                {kanjiActive.character}
              </p>
              <p>
                <small>
                  {kanjiActive.radicals.join(" + ")}
                  {kanjiActive.mnemonic ? (
                    <>
                      {" — "}
                      <em>{kanjiActive.mnemonic}</em>
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
          ) : (
            <ul className="story-list">
              {kanjiCards.map((c) => (
                <li key={c.id}>
                  <button type="button" className="btn" onClick={() => void startKanji(c)}>
                    <span lang="ja">{c.character}</span>{" "}
                    <small>
                      {(c.meaning_due ?? c.reading_due)
                        ? `due ${c.meaning_due ?? c.reading_due}`
                        : "new"}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : route === "progress" ? (
        <>
          <GoalMap goals={goals} />
          <ProgressView rows={progress} />
        </>
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
              stress={stressEnabled(display)}
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
          tts={ttsStatus}
          onInstallModel={(id) => void installTtsModel(id)}
          onDeleteModel={(id) => void deleteTtsModel(id)}
          onImport={(b64) => void importPack(b64)}
          speechModels={speechModels}
          speechModel={speechModel}
          onSelectSpeechModel={(id) => void selectSpeechModel(id)}
          display={display}
          onSelectStressMode={(m) => void setStressMode(m)}
          claims={claims}
          deviceTier={deviceTier}
          aligner={alignerStatus}
          progress={engineProgress}
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
      ) : route === "settings" ? (
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
          exportPath={settingsExportPath}
          onExport={() => void exportProfileData()}
          deleteArmed={settingsDeleteArmed}
          onArmDelete={() => setSettingsDeleteArmed(true)}
          onCancelDelete={() => setSettingsDeleteArmed(false)}
          onConfirmDelete={() => void confirmProfileDelete()}
          error={settingsError}
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
          plan={plan}
          activeBudget={budget}
          onBudget={(m) => void changeBudget(m)}
          environments={environments}
          nextGoal={nextGoal}
          firstRunSteps={firstRunSteps}
          onStart={(item) => void openPractice(item)}
        />
      )}
    </AppShell>
  );
}
