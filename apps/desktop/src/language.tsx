/**
 * Language management: the language being learned (a pack) is separate
 * from the app's own display language, which stays fixed. Installed
 * packs work fully offline; the community catalog points at versioned
 * GitHub releases and always labels packs as community content.
 */

export interface InstalledPack {
  pack_id: string;
  version: string;
  display_name: string;
  locale: string;
  trust_state: string;
}

export interface CatalogEntry {
  pack_id: string;
  version: string;
  display_name: string;
  locale: string;
  author: string;
  license: string;
  review_status: string;
  min_sdk_version: string;
  size_bytes: number;
  installed_version: string | null;
}

export interface TtsComponent {
  name: string;
  license: string;
  role: string;
}

export interface TtsModel {
  id: string;
  version: string;
  license_code: string;
  installed: boolean;
}

export interface TtsStatus {
  source: string;
  components: TtsComponent[];
  models: TtsModel[];
}

export interface SpeechModel {
  id: string;
  version: string;
  license_code: string;
  installed: boolean;
  size_bytes: number;
}

export interface LanguagePanelProps {
  installed: InstalledPack[];
  activeIds: string[];
  catalog: CatalogEntry[];
  catalogStatus: string;
  error: string | null;
  onSwitch(packId: string): void;
  onInstallCatalog(packId: string): void;
  tts: TtsStatus | null;
  onInstallModel(modelId: string): void;
  onDeleteModel(modelId: string): void;
  onImport(dataB64: string): void;
  speechModels: SpeechModel[];
  speechModel: string;
  onSelectSpeechModel(modelId: string): void;
}

const STATUS_LABELS: Record<string, string> = {
  live: "Community catalog is live.",
  cached: "Showing the last saved community catalog.",
  "no-catalog-url":
    "Community packs are coming soon — this build has no catalog configured yet. Meanwhile you can import a pack file you received from someone below.",
  "offline-no-cache": "Offline, and no catalog has been fetched on this device yet.",
};

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

// For the shipped pronunciation feature the sizes score identically, so the
// recommended pick is the lightest one; larger models only help future
// recognition-heavy features (ADR-0011).
const RECOMMENDED_SPEECH_MODEL = "org.openlanguage.speech.whisper-ggml-tiny";

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

async function readFileB64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

export function LanguagePanel(p: LanguagePanelProps) {
  return (
    <section aria-label="Languages">
      <h1>Languages</h1>
      <p>
        <small>
          This page changes the language you are <em>learning</em>. The app&apos;s own interface
          language is separate and unchanged. Installed packs work offline.
        </small>
      </p>
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}

      <h2>Installed packs</h2>
      {p.installed.length === 0 ? (
        <p className="empty">No packs installed yet.</p>
      ) : (
        <ul className="pack-list">
          {p.installed.map((i) => (
            <li key={i.pack_id} data-active={p.activeIds.includes(i.pack_id) ? "yes" : "no"}>
              {i.display_name} ({i.locale}) — v{i.version}, {i.trust_state}
              {p.activeIds.includes(i.pack_id) ? (
                <span className="badge badge--active">learning this language</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => p.onSwitch(i.pack_id)}
                >
                  Learn this
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2>Community catalog</h2>
      <p>{STATUS_LABELS[p.catalogStatus] ?? p.catalogStatus}</p>
      <p>
        <small>
          Community packs are made by their authors, not reviewed by us. They are declarative
          content only — they never run code. Every install is checksum-verified and validated.
        </small>
      </p>
      {p.catalog.length > 0 && (
        <ul className="pack-list">
          {p.catalog.map((c) => (
            <li key={c.pack_id}>
              <strong>{c.display_name}</strong> ({c.locale}) — community content by {c.author}
              <ul className="meta-list">
                <li>version {c.version}</li>
                <li>license: {c.license}</li>
                <li>size: {megabytes(c.size_bytes)} MB</li>
                <li>needs app SDK {c.min_sdk_version}</li>
                <li>
                  review status (author&apos;s claim):{" "}
                  {c.review_status === "reviewed" ? "author claims reviewed" : "unreviewed"}
                </li>
              </ul>
              {c.installed_version === c.version ? (
                <span className="badge">installed (v{c.installed_version})</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => p.onInstallCatalog(c.pack_id)}
                >
                  {c.installed_version ? `Update to v${c.version}` : `Install v${c.version}`}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2>Import a pack file</h2>
      <p>
        <small>
          Choose a <code>.lpk</code> pack archive from this device. It goes through the same
          validation as catalog installs.
        </small>
      </p>
      <input
        type="file"
        accept=".lpk"
        aria-label="Import pack file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void readFileB64(f).then(p.onImport);
        }}
      />

      <h2>Speech &amp; attribution</h2>
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
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => p.onInstallModel(m.id)}
                  >
                    Download
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="empty">Speech status unavailable.</p>
      )}

      <h2>Speech recognition &amp; pronunciation</h2>
      <p>
        <small>
          Optional. Choose a local speech model for pronunciation feedback, or turn it off. Models
          run entirely on this device — nothing is uploaded. Pronunciation feedback is{" "}
          <em>guided only</em> (no automatic scoring or mastery) until it has been calibrated. For
          pronunciation feedback the model sizes give the same result — pick one your device can
          comfortably run. Larger models mainly help future listening/recognition features, not
          pronunciation accuracy.
        </small>
      </p>
      <fieldset>
        <legend>Speech model</legend>
        <label className="speech-model">
          <input
            type="radio"
            name="speech-model"
            value="off"
            checked={p.speechModel === "off"}
            onChange={() => p.onSelectSpeechModel("off")}
          />{" "}
          Off — no speech model; speaking stays not assessed
        </label>
        {p.speechModels.map((m) => (
          <div key={m.id} className="speech-model">
            <label>
              <input
                type="radio"
                name="speech-model"
                value={m.id}
                checked={p.speechModel === m.id}
                onChange={() => p.onSelectSpeechModel(m.id)}
              />{" "}
              {SPEECH_MODEL_LABELS[m.id] ?? m.id} — {megabytes(m.size_bytes)} MB, {m.license_code}
              {m.installed ? " (installed)" : ""}
              {m.id === RECOMMENDED_SPEECH_MODEL ? (
                <span className="badge">recommended</span>
              ) : null}
            </label>
            {m.installed ? (
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => p.onDeleteModel(m.id)}
              >
                Remove
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => p.onInstallModel(m.id)}
              >
                Download ~{megabytes(m.size_bytes)} MB
              </button>
            )}
          </div>
        ))}
      </fieldset>
    </section>
  );
}
