/**
 * SETTINGS-001 + K-77: the single Settings surface. Every control here
 * persists through an engine command (`microphone-enabled`, `romaji-mode`,
 * the speech-model preference, `install_model`/`delete_model`, and profile
 * export/delete) — nothing is stored only in the UI. K-77 (owner
 * 2026-10-09): the Languages tab is gone; this route also renders the
 * Language-packs panel, and the speech model picker exists exactly once,
 * here, together with the TTS payloads and the runtime-availability
 * statement. Copy follows docs/18: it never claims a capability this
 * build lacks. In particular the speech-based checks (pronunciation
 * feedback, dictation recognition) also need a speech runtime that this
 * build may not ship, so a model download here does not make them work —
 * the copy says so instead of implying otherwise. Presentational
 * component: state and IPC live in the App container so every control is
 * renderable in tests.
 */

import type { Microphone } from "./capture";
import { megabytes, type AlignerStatus, type DeviceTier, type TtsStatus } from "./language";
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
  /** Stored `romaji-mode` (exactly the reader's vocabulary). */
  romajiMode: RomajiMode;
  onSetRomajiMode(mode: RomajiMode): void;
  /** The one speech-model preference app-wide (get/set_speech_model). */
  speechModel: string;
  speechModels: SpeechModelPref[];
  onSelectSpeechModel(modelId: string): void;
  /** K-77: the speech-synthesis payloads (runtime/voice), null until read. */
  tts: TtsStatus | null;
  onInstallModel(modelId: string): void;
  onDeleteModel(modelId: string): void;
  /** D4 (ADR-0019): the speech runtime this build carries, null until read. */
  aligner: AlignerStatus | null;
  /** K-46: runtime device-tier detection for the recommended model. */
  deviceTier: DeviceTier | null;
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

const TTS_SOURCE_LABELS: Record<string, string> = {
  bundled: "Speech synthesis is included in this download.",
  model: "Speech synthesis is installed as a model download.",
  env: "Speech synthesis uses the local runtime you configured (LTS_TTS_DIR).",
  bench: "Speech synthesis uses a development runtime (not a shipped configuration).",
  none: "No speech synthesis is installed. Audio activities are disabled; everything else works offline.",
};

const TTS_MODEL_LABELS: Record<string, string> = {
  "org.openlanguage.speech.sherpa-onnx-runtime": "Speech runtime",
  "org.openlanguage.speech.kokoro-multi-lang": "Japanese voice model (Kokoro)",
};

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
            — both are here. The export is a readable JSON file with your profile, settings,
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
            Deleting removes this profile and all of its learning data on this device, and cannot be
            undone. The app asks for one explicit confirmation before anything is deleted.
          </small>
        </p>
      </div>

      <div className="card">
        <h3>Speech</h3>
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
            below with their sizes, licenses, and downloads. Honest limit: the speech-based checks
            (pronunciation feedback and dictation recognition) also need a speech runtime; this card
            states whether this build carries one and on what terms. Where the runtime is absent
            those checks abstain, and choosing or downloading a model here does not change that —
            nothing else is affected.
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
        <p className="meta pack-posture" data-aligner={p.aligner?.available ? "yes" : "no"}>
          {alignerLine(p.aligner)}
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

        <h4>Speech synthesis</h4>
        <p>
          <small>
            Speech synthesis is optional and separate from packs. Some downloads include it; you can
            also install it here or point the app at your own runtime.
          </small>
        </p>
        {p.tts ? (
          <>
            <p>{TTS_SOURCE_LABELS[p.tts.source] ?? p.tts.source}</p>
            {p.tts.components.length > 0 && (
              <ul className="meta-list">
                {p.tts.components.map((c) => (
                  <li key={c.name}>
                    {c.name} — {c.license} ({c.role})
                  </li>
                ))}
              </ul>
            )}
            <ul className="pack-list">
              {p.tts.models.map((m) => (
                <li key={m.id}>
                  {TTS_MODEL_LABELS[m.id] ?? m.id} — v{m.version}, {m.license_code}
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
                      Download
                    </button>
                  ) : (
                    // A payload this build has not staged: no button, and the
                    // reason stated instead of a download that would fail.
                    <span className="meta">not published in this build</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="empty">Speech status unavailable.</p>
        )}
      </div>
    </section>
  );
}
