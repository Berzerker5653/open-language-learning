/**
 * APP-SPLIT-003B: the settings/import wiring slice, moved out of App()
 * without behavior change. App.tsx still owns every hook and the whole
 * Settings-route JSX; this module owns the bodies of the prime reads and
 * the export/restore/delete/switch handler family. The deps objects are
 * built once per render in App() (after every referenced binding is in
 * scope) and passed at each call site, so reads keep the exact old timing.
 */
import type {
  GoalCard,
  PlannedItem,
  ProgressRow,
  SessionOutcomeView,
  SessionPlan,
  SessionView,
  WorldEnvironment,
} from "../home";
import type { ImportOutcome, ImportPreview, KanaKeyboardMode, RomajiMode } from "../settings";
import type { ProfileSummary } from "../onboarding";
import type { Invoke } from "./primitives";
import type { ExplainSettingsView } from "./explain-wiring";
import { EMPTY_PLAN } from "./primitives";

/** The session-queue snapshot App keeps in a ref. Mirrors the ref's
 *  inline type in App.tsx; this slice only ever writes `null` to it. */
type SessionQueue = {
  items: PlannedItem[];
  index: number;
  done: number;
  notRunnable: number;
} | null;

/** What opening Settings primes: the six engine-backed writes plus the
 *  pack/speech/aligner/device refreshes Settings hosts (SETTINGS-001,
 *  K-77, FEEL-LOADING-001). All five refreshes stay App-owned hooks. */
export interface SettingsPrimeDeps {
  inv: Invoke | null;
  profileId: string | null;
  setMicEnabled: (v: boolean) => void;
  setMicDevice: (v: string | null) => void;
  setPlaybackDevice: (v: string | null) => void;
  setRomajiMode: (v: RomajiMode) => void;
  setKanaKeyboard: (v: KanaKeyboardMode) => void;
  /** G4-EXPLAIN-001: explain provider settings for this profile. */
  setExplainSettings: (v: ExplainSettingsView | null) => void;
  refreshSpeech: () => Promise<unknown>;
  refreshLanguages: (pid?: string) => Promise<unknown>;
  refreshAligner: () => Promise<unknown>;
  refreshMicrophones: () => Promise<unknown>;
  refreshOutputs: () => Promise<unknown>;
  setSettingsError: (v: string | null) => void;
}

/** The full deps of the export/restore/delete/switch family: state +
 *  setters, no hooks. Built once per render in App() as
 *  `settingsWiringDeps` (it extends SettingsPrimeDeps, so it doubles as
 *  the prime deps for openSettings/primeSettingsReads). */
export interface SettingsWiringDeps extends SettingsPrimeDeps {
  restorePath: string;
  restoreChecked: { path: string; preview: ImportPreview } | null;
  setRestoreOutcome: (v: ImportOutcome | null) => void;
  setRestoreChecked: (v: { path: string; preview: ImportPreview } | null) => void;
  setSettingsExportPath: (v: string | null) => void;
  setSettingsDeleteArmed: (v: boolean) => void;
  setSettingsSwitchArmed: (v: boolean) => void;
  setProfileId: (v: string | null) => void;
  setDisplayName: (v: string) => void;
  applyPlan: (plan: SessionPlan) => void;
  setEnvironments: (v: WorldEnvironment[] | null) => void;
  setMineCount: (v: number | null) => void;
  setGoals: (v: GoalCard[]) => void;
  setProgress: (v: ProgressRow[]) => void;
  sessionQueueRef: { current: SessionQueue };
  setSession: (v: SessionView | null) => void;
  setSessionOutcome: (v: SessionOutcomeView | null) => void;
  setSelectedPack: (v: string | null) => void;
  setActiveIds: (v: string[]) => void;
  setProfiles: (v: ProfileSummary[]) => void;
  setStep: (v: "welcome" | "resume") => void;
  setRoute: (v: "practice") => void;
}

export async function runSettingsPrimes(deps: SettingsPrimeDeps): Promise<void> {
  const { inv, profileId } = deps;
  if (!inv || !profileId) return;
  // Sweep finding 20: one failed read must not abort the other primes —
  // a broken speech catalogue takes neither the pack list nor the mic
  // pickers down with it. Each block reports its own failure.
  const fails: string[] = [];
  const soft = async (label: string, run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (e) {
      fails.push(`${label}: ${String(e)}`);
    }
  };
  await soft("microphone and writing settings", async () => {
    deps.setMicEnabled((await inv("get_microphone_enabled", { profileId })) as boolean);
    deps.setMicDevice((await inv("get_microphone_device", { profileId })) as string | null);
    deps.setPlaybackDevice((await inv("get_playback_device", { profileId })) as string | null);
    deps.setRomajiMode((await inv("get_romaji_mode", { profileId })) as RomajiMode);
    deps.setKanaKeyboard((await inv("get_kana_keyboard", { profileId })) as KanaKeyboardMode);
    deps.setExplainSettings(
      (await inv("explain_settings", { profileId })) as ExplainSettingsView,
    );
  });
  // K-77: Settings now hosts language-pack management and the speech
  // runtime status too, so opening it primes the reads the old
  // Languages tab did. K-90 deleted the synthesis status read.
  await soft("speech models", deps.refreshSpeech);
  await soft("language packs", () => deps.refreshLanguages!());
  await soft("aligner status", deps.refreshAligner);
  await deps.refreshMicrophones();
  await deps.refreshOutputs();
  if (fails.length > 0) deps.setSettingsError(fails.join(" "));
}

export async function runProfileExport(deps: SettingsWiringDeps): Promise<void> {
  const { inv, profileId } = deps;
  if (!inv || !profileId) return;
  deps.setSettingsError(null);
  try {
    deps.setSettingsExportPath((await inv("profile_export", { profileId })) as string);
  } catch (e) {
    deps.setSettingsError(String(e));
  }
}

// R06: the check is read-only; the write only happens on the labelled
// confirm control, always as a new profile, never over the profile in use.
export async function runRestorePreview(deps: SettingsWiringDeps): Promise<void> {
  const { inv } = deps;
  if (!inv) return;
  deps.setSettingsError(null);
  deps.setRestoreOutcome(null);
  const path = deps.restorePath.trim();
  try {
    const preview = (await inv("profile_import_preview", {
      path,
      mode: "new",
    })) as ImportPreview;
    deps.setRestoreChecked({ path, preview });
  } catch (e) {
    deps.setRestoreChecked(null);
    deps.setSettingsError(String(e));
  }
}

export async function runRestoreConfirm(deps: SettingsWiringDeps): Promise<void> {
  const { inv, restoreChecked } = deps;
  if (!inv || !restoreChecked || !restoreChecked.preview.supported) return;
  deps.setSettingsError(null);
  try {
    const outcome = (await inv("profile_import", {
      path: restoreChecked.path,
      mode: "new",
    })) as ImportOutcome;
    deps.setRestoreOutcome(outcome);
    // The restored profile is in the picker without a restart.
    deps.setProfiles((await inv("list_profiles")) as ProfileSummary[]);
  } catch (e) {
    deps.setSettingsError(String(e));
  }
}

// Two-step delete: the first click only arms the confirmation; only
// the labelled confirm control fires `profile_delete` (never a
// native window.confirm).
export async function runProfileDelete(deps: SettingsWiringDeps): Promise<void> {
  const { inv, profileId } = deps;
  if (!inv || !profileId) return;
  deps.setSettingsError(null);
  try {
    await inv("profile_delete", { profileId });
  } catch (e) {
    deps.setSettingsError(String(e));
    return;
  }
  // The profile no longer exists: back to the wizard, clean state.
  deps.setProfileId(null);
  deps.setDisplayName("");
  deps.applyPlan(EMPTY_PLAN);
  deps.setEnvironments(null);
  deps.setMineCount(null);
  deps.setGoals([]);
  deps.setProgress([]);
  // Sweep finding 15: an in-flight or paused session belongs to the
  // deleted profile — neither the panel nor the summary may survive it.
  deps.sessionQueueRef.current = null;
  deps.setSession(null);
  deps.setSessionOutcome(null);
  // D7: a deleted profile's active pack must not be carried into the
  // next session — there is no active pack until one is chosen.
  deps.setSelectedPack(null);
  deps.setActiveIds([]);
  deps.setMicEnabled(false);
  deps.setRomajiMode("auto");
  deps.setSettingsExportPath(null);
  deps.setSettingsDeleteArmed(false);
  deps.setStep("welcome");
}

// O-06 2026-10-10 (P1): leave the current profile without deleting it.
// Same clean-state discipline as profile deletion — no surface from the
// old profile may carry into the next session — but the picker shows the
// resume list, not the new-profile wizard. Progress is untouched.
export async function runProfileSwitch(deps: SettingsWiringDeps): Promise<void> {
  const { inv, profileId } = deps;
  if (!inv || !profileId) return;
  deps.setSettingsError(null);
  deps.setProfileId(null);
  deps.setDisplayName("");
  deps.applyPlan(EMPTY_PLAN);
  deps.setEnvironments(null);
  deps.setMineCount(null);
  deps.setGoals([]);
  deps.setProgress([]);
  // Sweep finding 15: same discipline as deletion — the old profile's
  // session (panel, summary, queue) must not carry into the next one.
  deps.sessionQueueRef.current = null;
  deps.setSession(null);
  deps.setSessionOutcome(null);
  // D7 discipline: no active pack until the next profile chooses one.
  deps.setSelectedPack(null);
  deps.setActiveIds([]);
  deps.setMicEnabled(false);
  deps.setRomajiMode("auto");
  deps.setSettingsExportPath(null);
  deps.setSettingsDeleteArmed(false);
  deps.setSettingsSwitchArmed(false);
  try {
    deps.setProfiles((await inv("list_profiles")) as ProfileSummary[]);
    deps.setStep("resume");
    // Land where a launch-time resume lands, not in Settings.
    deps.setRoute("practice");
  } catch (e) {
    // Honest failure: stay where we are with an error, never strand the
    // learner on an empty picker.
    deps.setSettingsError(`The profile list could not be loaded: ${String(e)}`);
  }
}
