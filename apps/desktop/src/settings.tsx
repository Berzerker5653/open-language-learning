/**
 * SETTINGS-001 + K-77: the single Settings surface. Every control here
 * persists through an engine command (`microphone-enabled`, `romaji-mode`,
 * the speech-model preference, `install_model`/`delete_model`, and profile
 * export/delete) — nothing is stored only in the UI. K-77 (owner
 * 2026-10-09): the Languages tab is gone; this route also renders the
 * Language-packs panel, and the speech model picker exists exactly once,
 * here, together with the runtime-availability statement. Copy follows
 * docs/18: it never claims a capability this build lacks. K-90 deleted the
 * synthesis payloads, so the remaining downloads are recognition models;
 * the speech-based checks (pronunciation feedback, dictation recognition)
 * also need a recognition runtime this build may not ship, so a model download here does not make them work —
 * the copy says so instead of implying otherwise. Presentational
 * component: state and IPC live in the App container so every control is
 * renderable in tests.
 */

import type { Microphone, SpeakerOutput } from "./capture";
import { megabytes, type AlignerStatus, type DeviceTier } from "./language";
export type RomajiMode = "auto" | "always" | "off";

export interface SpeechModelPref {
  id: string;
  version: string;
  license_code: string;
  installed: boolean;
  /// False when the catalog lists a payload this build cannot deliver;
  /// the card must not offer a download for it.
  installable: boolean;
  size_bytes: number;
}

/** What `build_identity` answers: the release this binary was built from. */
export interface BuildIdentity {
  version: string;
  commit: string;
  dirty: boolean;
}
/** What `profile_import_preview` answers: what a backup on disk holds, and
 *  whether this build can read it. Read-only — nothing has been written. */
export interface ImportPreview {
  format_version: number;
  supported: boolean;
  source_profile_name: string;
  exported_at: string;
  events: number;
  corrections: number;
  goals: number;
  mastery: number;
  saved_words: number;
  scheduled_items: number;
  pack_installs: number;
  selected_packs: number;
  recordings: number;
  warnings: string[];
}

/** What `profile_import` answers: the state the store actually holds after
 *  a restore, read back rather than echoed from the file. */
export interface ImportOutcome {
  profile_id: string;
  display_name: string;
  events: number;
  goals: number;
  saved_words: number;
  scheduled_items: number;
  warnings: string[];
}

export interface SettingsProps {
  /** Stored `microphone-enabled` for this profile (false when unset). */
  microphoneEnabled: boolean;
  onSetMicrophone(enabled: boolean): void;
  /** K-64: stored capture device for this profile (null = system default). */
  microphoneDevice: string | null;
  /** Named audio inputs; empty until the browser has granted access once. */
  microphoneDevices: Microphone[];
  onPickMicrophone(deviceId: string | null): void;
  /** Re-ask the browser for named inputs. */
  onDetectMicrophones(): void;
  /** K-88: stored output device for this profile (null = system default). */
  playbackDevice: string | null;
  /** Named audio outputs; empty when the system reveals none. */
  playbackOutputs: SpeakerOutput[];
  /** Whether this webview can route one element to one output at all. */
  canRouteOutput: boolean;
  onPickPlaybackDevice(deviceId: string | null): void;
  /** Stored `romaji-mode` (exactly the reader's vocabulary). */
  romajiMode: RomajiMode;
  onSetRomajiMode(mode: RomajiMode): void;
  /** The one speech-model preference app-wide (get/set_speech_model). */
  speechModel: string;
  speechModels: SpeechModelPref[];
  onSelectSpeechModel(modelId: string): void;
  onInstallModel(modelId: string): void;
  onDeleteModel(modelId: string): void;
  /** D4 (ADR-0019): the speech runtime this build carries, null until read. */
  aligner: AlignerStatus | null;
  /** K-46: runtime device-tier detection for the recommended model. */
  deviceTier: DeviceTier | null;
  /** Path returned by the last `profile_export`, null until one runs. */
  exportPath: string | null;
  onExport(): void;
  /** R06: a backup path the learner named, plus what the engine said about
   *  it. Nothing is written until `onConfirmRestore`. */
  restorePath: string;
  restorePreview: ImportPreview | null;
  restoreOutcome: ImportOutcome | null;
  onRestorePathChange(path: string): void;
  onPreviewRestore(): void;
  onConfirmRestore(): void;
  /** Two-step delete: armed=false shows only the arming control. */
  deleteArmed: boolean;
  onArmDelete(): void;
  onCancelDelete(): void;
  onConfirmDelete(): void;
  /** O-06 2026-10-10: two-step "leave this profile" — nothing is deleted. */
  switchArmed: boolean;
  onArmSwitch(): void;
  onCancelSwitch(): void;
  onConfirmSwitch(): void;
  /** Release identity this binary reports; null until the read resolves. */
  buildIdentity: BuildIdentity | null;
  error: string | null;
}

const ROMAJI_MODES: { value: RomajiMode; label: string }[] = [
  { value: "auto", label: "Auto — fade as my reading grows" },
  { value: "always", label: "Always show romaji" },
  { value: "off", label: "Off — Japanese script only" },
];

const SPEECH_MODEL_LABELS: Record<string, string> = {
  "org.openlanguage.speech.whisper-ggml-tiny": "Whisper Tiny — smallest, lightest",
  "org.openlanguage.speech.whisper-ggml-base": "Whisper Base — larger download and memory",
  "org.openlanguage.speech.whisper-ggml-small": "Whisper Small — largest download and memory",
};

/// One honest sentence about the speech runtime, distinguishing the three ways
/// it can be missing. Never claims a runtime this build does not ship, and
/// never calls a CPU-floor abstention an absence.
function alignerLine(a: AlignerStatus | null): string {
  if (!a) return "Speech runtime: status could not be read.";
  if (a.available) {
    const from =
      a.source === "bundled" ? "bundled in this build" : "resolved from a development runtime path";
    return `Speech runtime: whisper.cpp ${a.runtime_version ?? "version unknown"}, ${from}.`;
  }
  switch (a.reason) {
    case "speech-model-off":
      return "Speech runtime: available, but the speech model is switched off in the picker above, so speaking checks abstain until you pick one.";
    case "aligner-cpu-unsupported":
      return `Speech runtime: this build carries it, but this CPU is below the instruction set it was compiled for (${a.requires_cpu ?? "x86-64-v3"}). Speaking checks abstain; every other activity works.`;
    default:
      return "Speech runtime: this build does not include whisper.cpp, so pronunciation feedback and dictation abstain. Downloading a model here does not change that.";
  }
}

/**
 * I03: readiness before the controls. A learner should learn what speaking can
 * actually do on this device before reaching a control that cannot do it —
 * microphone, the selected model's presence, and the runtime status, in one
 * line, with the fix or the alternative named.
 */
export function speechReadiness(
  microphoneEnabled: boolean,
  speechModel: string,
  speechModels: { id: string; installed: boolean }[],
  aligner: AlignerStatus | null,
): string {
  const mic = microphoneEnabled
    ? "Microphone: allowed."
    : "Microphone: off — speaking activities abstain and nothing is recorded.";
  const chosen = speechModels.find((m) => m.id === speechModel);
  const model =
    speechModel === "off" || !chosen
      ? "Speech model: off — speaking checks say so instead of guessing."
      : chosen.installed
        ? `Speech model: ${speechModel} is already on this device.`
        : `Speech model: ${speechModel} is selected but not on this device yet — download it below, or speaking checks abstain.`;
  return `${mic} ${model} ${alignerLine(aligner)}`;
}

export function Settings(p: SettingsProps) {
  return (
    <section aria-label="Settings">
      <h2>Settings</h2>
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}

      <div className="card">
        <h3>Microphone</h3>
        <label htmlFor="mic-enabled" className="radio-row">
          <input
            id="mic-enabled"
            type="checkbox"
            checked={p.microphoneEnabled}
            onChange={(e) => p.onSetMicrophone(e.target.checked)}
          />{" "}
          Allow microphone access for speaking activities
        </label>
        <p>
          <small>
            The setting is enforced: while it is off, the app never asks the system for microphone
            access — pressing Record shows a note pointing here instead. Speaking activities
            abstain; reading, writing, listening, and every other activity work without a
            microphone, and turning this off never blocks progress.
          </small>
        </p>
        <label htmlFor="mic-device">
          Microphone to record from
          <select
            id="mic-device"
            value={p.microphoneDevice ?? ""}
            onChange={(e) => p.onPickMicrophone(e.target.value || null)}
          >
            <option value="">System default</option>
            {p.microphoneDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <p>
          <small>
            {p.microphoneDevices.length === 0
              ? "There is nothing to list yet: the browser only reveals microphone names after you allow microphone access once. Recording from the system default works until then."
              : "The choice is stored for this profile. If the chosen microphone is unplugged, the app says so and records from the system default for that one recording instead of switching silently."}
          </small>
        </p>
        <p>
          <button id="mic-detect" type="button" onClick={p.onDetectMicrophones}>
            Detect microphones
          </button>
        </p>
      </div>

      <div className="card">
        <h3>Romaji (romanisation) display</h3>
        <fieldset>
          <legend>Show romaji alongside Japanese text</legend>
          {ROMAJI_MODES.map((m) => (
            <label key={m.value} className="radio-row">
              <input
                type="radio"
                name="romaji-mode"
                value={m.value}
                checked={p.romajiMode === m.value}
                onChange={() => p.onSetRomajiMode(m.value)}
              />{" "}
              {m.label}
            </label>
          ))}
        </fieldset>
        <p>
          <small>
            Romaji is a temporary scaffold: content is stored in Japanese script, and Auto fades
            romanisation as reading grows. Your choice is honored everywhere and never blocks
            progression.
          </small>
        </p>
      </div>

      <div className="card">
        <h3>Profile data</h3>
        <p>
          <small>
            The privacy notice promises you can export or delete your local profile data at any time
            — both are here, and switching profiles starts here too. Switching only leaves the
            current profile; it deletes nothing. An export is a readable JSON file holding your
            profile, settings, learning evidence, saved words, and review schedule. Recording
            metadata is not included, and no audio is ever part of an export.
          </small>
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={p.onExport}>
            Export profile data
          </button>
        </div>
        {p.exportPath && (
          <p className="notice" data-testid="settings-export-path">
            Export written to: {p.exportPath}
          </p>
        )}
        <div className="field">
          <label htmlFor="restore-path">Restore from a backup file</label>
          <input
            id="restore-path"
            type="text"
            data-testid="settings-restore-path"
            value={p.restorePath}
            onChange={(e) => p.onRestorePathChange(e.target.value)}
            placeholder="path shown by Export profile data"
          />
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--quiet"
            data-testid="settings-restore-check"
            onClick={p.onPreviewRestore}
            disabled={p.restorePath.trim() === ""}
          >
            Check a backup…
          </button>
        </div>
        {p.restorePreview && (
          <div className="notice" data-testid="settings-restore-preview">
            <p>
              <strong>{p.restorePreview.source_profile_name}</strong>, exported{" "}
              {p.restorePreview.exported_at} (backup format version{" "}
              {p.restorePreview.format_version}).
            </p>
            <ul>
              <li>{p.restorePreview.saved_words} saved words</li>
              <li>{p.restorePreview.events} recorded attempts</li>
              <li>{p.restorePreview.goals} goals</li>
              <li>{p.restorePreview.scheduled_items} scheduled reviews</li>
              <li>{p.restorePreview.pack_installs} language packs</li>
            </ul>
            {p.restorePreview.warnings.length > 0 && (
              <ul data-testid="settings-restore-warnings">
                {p.restorePreview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {p.restorePreview?.supported ? (
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="settings-restore-confirm"
              onClick={p.onConfirmRestore}
            >
              Restore as a new profile
            </button>
          </div>
        ) : null}
        {p.restoreOutcome && (
          <div className="notice" data-testid="settings-restore-result">
            <p>
              Restored as {p.restoreOutcome.display_name}. On this device now:{" "}
              {p.restoreOutcome.saved_words} saved words, {p.restoreOutcome.events} recorded
              attempts, {p.restoreOutcome.goals} goals, and {p.restoreOutcome.scheduled_items}{" "}
              scheduled reviews.
            </p>
            <p>
              <small data-testid="settings-restore-note">
                A restore reads a backup you exported. Nothing changed until you confirmed, the
                restore always creates a new profile instead of replacing the one you use, and a
                backup this version cannot read is refused rather than guessed at.
              </small>
            </p>
          </div>
        )}
        {p.switchArmed ? (
          <div role="group" aria-label="Switch profile confirmation" className="btn-row">
            <button type="button" className="btn btn--primary" onClick={p.onConfirmSwitch}>
              Yes, switch profile
            </button>
            <button type="button" className="btn btn--quiet" onClick={p.onCancelSwitch}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="btn-row">
            <button type="button" className="btn btn--quiet" onClick={p.onArmSwitch}>
              Switch profile…
            </button>
          </div>
        )}
        <p>
          <small data-testid="settings-switch-note">
            Switching deletes nothing: each profile keeps its own progress, saved words, and
            settings, and waits for you in the picker.
          </small>
        </p>
        {p.deleteArmed ? (
          <div role="group" aria-label="Delete confirmation" className="btn-row">
            <button type="button" className="btn btn--primary" onClick={p.onConfirmDelete}>
              Yes, delete this profile and all its local data
            </button>
            <button type="button" className="btn btn--quiet" onClick={p.onCancelDelete}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="btn-row">
            <button type="button" className="btn btn--quiet" onClick={p.onArmDelete}>
              Delete profile data…
            </button>
          </div>
        )}
        <p>
          <small data-testid="settings-delete-note">
            Deleting removes this profile and all of its learning data on this device, and cannot be
            undone. The app asks for one explicit confirmation before anything is deleted.
          </small>
        </p>
      </div>

      <div className="card">
        <h3>Speech</h3>
        {/* I03: this summary sits above the picker on purpose — the status is
            read before the controls are offered, not after a dead end. */}
        <p
          className="meta pack-posture"
          data-aligner={p.aligner?.available ? "yes" : "no"}
          data-testid="settings-speech-readiness"
        >
          {speechReadiness(p.microphoneEnabled, p.speechModel, p.speechModels, p.aligner)}
        </p>
        <label htmlFor="speech-model">
          Active speech model
          <select
            id="speech-model"
            value={p.speechModel}
            onChange={(e) => p.onSelectSpeechModel(e.target.value)}
          >
            <option value="off">Off — speaking activities abstain</option>
            {p.speechModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} — v{m.version}, {m.license_code}
                {m.installed ? " (installed)" : " (not downloaded)"}
              </option>
            ))}
          </select>
        </label>
        <p>
          <small>
            This is the app&apos;s one speech-model preference; the models themselves are listed
            below with their sizes, licenses, and downloads.
          </small>
        </p>

        <h4>Speech recognition &amp; pronunciation</h4>
        <p>
          <small>
            Optional. These local models feed the speech-based checks — pronunciation alignment and
            dictation recognition — or you can turn them off above. They run entirely on this
            device; nothing is uploaded. Pronunciation feedback is <em>guided only</em> (no
            automatic scoring or mastery) until it has been calibrated. For pronunciation feedback
            the model sizes give the same result — pick one your device can comfortably run. Larger
            models mainly help future listening/recognition features, not pronunciation accuracy.
            {p.deviceTier
              ? ` This device was detected as the ${p.deviceTier.tier} tier (${p.deviceTier.cores} cores, ${Math.round(p.deviceTier.total_ram_mb)} MB RAM).`
              : " This device's tier could not be detected, so no model is recommended — pick one your device can comfortably run."}
          </small>
        </p>

        {p.speechModels.length > 0 && (
          <ul className="pack-list">
            {p.speechModels.map((m) => (
              <li key={m.id}>
                {SPEECH_MODEL_LABELS[m.id] ?? m.id} — {megabytes(m.size_bytes)} MB, {m.license_code}
                {m.installed ? " (installed)" : ""}
                {p.deviceTier?.recommended_model === m.id ? (
                  <span className="badge">recommended for this device</span>
                ) : null}
                {m.installed ? (
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => p.onDeleteModel(m.id)}
                  >
                    Remove
                  </button>
                ) : m.installable ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => p.onInstallModel(m.id)}
                  >
                    Download ~{megabytes(m.size_bytes)} MB
                  </button>
                ) : (
                  <span className="meta">not published in this build</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <h4>Playback output</h4>
        {p.canRouteOutput ? (
          <div data-playback-route="picker">
            <label htmlFor="playback-device">
              Device to play audio on
              <select
                id="playback-device"
                value={p.playbackDevice ?? ""}
                onChange={(e) => p.onPickPlaybackDevice(e.target.value || null)}
              >
                <option value="">System default</option>
                {p.playbackOutputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <p>
              <small>
                {p.playbackOutputs.length === 0
                  ? "There is nothing to list yet: the system has not revealed any output names. Playback follows the system sound settings until it does."
                  : "The choice is stored for this profile: model audio and your own recordings play on it. If the device disappears, that one clip plays on the system default instead of failing."}
              </small>
            </p>
          </div>
        ) : (
          <p data-playback-route="system">
            <small>
              This runtime cannot direct playback to a chosen device, so there is no picker here —
              the system sound settings decide where audio plays.
            </small>
          </p>
        )}
      </div>

      <div className="card">
        <h3>Speech runtimes</h3>
        <p>
          <small>
            The engines this build ships and can load — honest status, not a choice. Pronunciation
            feedback and dictation recognition also need a recognition runtime: where it is absent,
            those checks abstain, and choosing or downloading a model does not change that.
          </small>
        </p>
      </div>

      <div className="card">
        <h3>About this build</h3>
        {p.buildIdentity ? (
          <p className="meta" data-build-commit={p.buildIdentity.commit}>
            Version <strong>{p.buildIdentity.version}</strong>, commit{" "}
            <strong>{p.buildIdentity.commit}</strong>
            {p.buildIdentity.dirty ? " (built from a modified working tree)" : ""}. Please quote
            both lines when you report a platform problem — a report that names only "the latest
            version" cannot be matched to a build.
          </p>
        ) : (
          <p className="meta">Loading build information…</p>
        )}
      </div>
    </section>
  );
}
