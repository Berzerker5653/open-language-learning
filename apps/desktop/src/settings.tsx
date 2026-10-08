/**
 * SETTINGS-001: the Settings surface. Every control here persists through
 * an engine command (`microphone-enabled`, `romaji-mode`, the speech-model
 * preference shared with Languages → Speech, and profile export/delete) —
 * nothing is stored only in the UI. Copy follows docs/18: it never claims
 * a capability this build lacks. In particular the speech-based checks
 * (pronunciation feedback, dictation recognition) also need a speech
 * runtime that this build does not ship, so a model download here does
 * not make them work — the copy says so instead of implying otherwise.
 * Presentational component: state and IPC live in the App container so
 * every control is renderable in tests.
 */

export type RomajiMode = "auto" | "always" | "off";

export interface SpeechModelPref {
  id: string;
  version: string;
  license_code: string;
  installed: boolean;
  size_bytes: number;
}

export interface SettingsProps {
  /** Stored `microphone-enabled` for this profile (false when unset). */
  microphoneEnabled: boolean;
  onSetMicrophone(enabled: boolean): void;
  /** Stored `romaji-mode` (exactly the reader's vocabulary). */
  romajiMode: RomajiMode;
  onSetRomajiMode(mode: RomajiMode): void;
  /** Same preference as Languages → Speech (get/set_speech_model). */
  speechModel: string;
  speechModels: SpeechModelPref[];
  onSelectSpeechModel(modelId: string): void;
  /** Path returned by the last `profile_export`, null until one runs. */
  exportPath: string | null;
  onExport(): void;
  /** Two-step delete: armed=false shows only the arming control. */
  deleteArmed: boolean;
  onArmDelete(): void;
  onCancelDelete(): void;
  onConfirmDelete(): void;
  error: string | null;
}

const ROMAJI_MODES: { value: RomajiMode; label: string }[] = [
  { value: "auto", label: "Auto — fade as my reading grows" },
  { value: "always", label: "Always show romaji" },
  { value: "off", label: "Off — Japanese script only" },
];

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
        <h3>Speech model</h3>
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
            This is the same preference as Languages → Speech; downloads and removals are managed
            there. Honest limit: the speech-based checks (pronunciation feedback and dictation
            recognition) also need a speech runtime that this build does not include. While that
            runtime is absent those checks abstain, and choosing or downloading a model here does
            not change that — nothing else is affected.
          </small>
        </p>
      </div>

      <div className="card">
        <h3>Profile data</h3>
        <p>
          <small>
            The privacy notice promises you can export or delete your local profile data at any
            time — both are here. The export is a readable JSON file with your profile, settings,
            learning evidence, and schedule. Recording metadata is not included, and no audio is
            ever part of an export.
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
            Deleting removes this profile and all of its learning data on this device, and cannot
            be undone. The app asks for one explicit confirmation before anything is deleted.
          </small>
        </p>
      </div>
    </section>
  );
}
