/**
 * Language management: the language being learned (a pack) is separate
 * from the app's own display language, which stays fixed. Installed
 * packs work fully offline; the community catalog points at versioned
 * GitHub releases and always labels packs as community content.
 */
import type { DisplaySettingsView } from "./stress";

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
  /// False when the catalog lists a payload this build cannot deliver; the
  /// panel must not offer a download for it.
  installable: boolean;
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
  installable: boolean;
  size_bytes: number;
}

/// K-43: the pack's own content claims, read from its installed files.
/// Display-only; `trust_state` passes through from the install gate and
/// is never promoted by these numbers.
export interface PackClaims {
  pack_id: string;
  version: string;
  trust_state: string;
  counts: {
    units: number;
    goals: number;
    assessments: number;
    lexicon: number;
    sentences: number;
    grammar: number;
    orthography: number;
    kanji: number;
    phonological_contrasts: number;
    stories: number;
  };
  postures: { kind: string; posture: string; count: number }[];
  provenance: { id: string; title: string; url: string; license: string; access: string }[];
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
  /// K-41: stress-mark visibility (display setting; null until loaded).
  display: DisplaySettingsView | null;
  onSelectStressMode(mode: "auto" | "on" | "off"): void;
  /// K-43: per-pack content claims (null until loaded).
  claims: PackClaims[] | null;
  /// K-46: runtime device-tier detection for the recommended model.
  deviceTier: DeviceTier | null;
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

/// Owner 2026-10-07: per-item draft badges are retired; every pack is
/// stated AI-generated, once, at pack level. Derived from the pack's
/// own review-posture tallies so the statement stays truthful if items
/// later carry `validated`/`verified` records — and it never claims a
/// review those records do not show.
export function packPosture(postures: { posture: string; count: number }[]): string {
  const REVIEWED = new Set(["validated", "verified"]);
  let reviewed = 0;
  let total = 0;
  for (const r of postures) {
    total += r.count;
    if (REVIEWED.has(r.posture)) reviewed += r.count;
  }
  if (total === 0 || reviewed === 0) return "AI-generated content · not human-reviewed";
  if (reviewed < total) return "AI-generated content · not fully human-reviewed";
  return "AI-generated content · every item carries a review record";
}

/// Relabel the posture words in the claim tallies: `draft` is now the
/// pack's honest self-description, `review-needed` its queue state.
const POSTURE_LABELS: Record<string, string> = {
  draft: "AI-generated, unreviewed",
  "review-needed": "awaiting review",
};

// K-46: the recommended speech model is detected at runtime from this
// device (PERF-001 tiers in docs/performance/BUDGETS.yaml), never a
// static constant. The shipped pronunciation feature scores the same
// on every whisper size (ADR-0011), so the recommendation is the
// largest model this device can comfortably run — and honest copy
// says why. `recommended_speech_model` (native) measures cores and
// RAM; null means detection failed and nothing is recommended.
export interface DeviceTier {
  cores: number;
  total_ram_mb: number;
  tier: "low" | "typical" | "high";
  recommended_model: string | null;
}

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
          {p.installed.map((i) => {
            const claims = p.claims?.find((x) => x.pack_id === i.pack_id);
            return (
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
                {claims ? (
                  <p className="meta pack-posture">{packPosture(claims.postures)}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {p.claims?.map((c) => (
        <div key={c.pack_id} className="claims" aria-label={`Content claims for ${c.pack_id}`}>
          <h3>What this pack claims ({c.version})</h3>
          <p>
            <small>
              These numbers are read from the pack&apos;s own files — they are the pack&apos;s
              claims, not our verification. Install posture stays &ldquo;{c.trust_state}&rdquo;
              regardless of these counts.
            </small>
          </p>
          <ul className="meta-list">
            <li>{c.counts.units} curriculum units</li>
            <li>{c.counts.goals} communicative goals</li>
            <li>{c.counts.assessments} assessment definitions</li>
            <li>{c.counts.lexicon} lexicon entries</li>
            <li>{c.counts.sentences} example sentences</li>
            <li>{c.counts.grammar} grammar concepts</li>
            <li>{c.counts.orthography} writing-system symbols</li>
            <li>{c.counts.kanji} kanji entries</li>
            <li>{c.counts.phonological_contrasts} sound contrasts</li>
            <li>{c.counts.stories} reading stories</li>
          </ul>
          {c.postures.length > 0 && (
            <>
              <h4>Review posture (the pack&apos;s own labels)</h4>
              <ul className="meta-list">
                {c.postures.map((r) => (
                  <li key={`${r.kind}:${r.posture}`}>
                    {r.kind}: {r.count} {POSTURE_LABELS[r.posture] ?? r.posture}
                  </li>
                ))}
              </ul>
            </>
          )}
          {c.provenance.length > 0 && (
            <>
              <h4>Stated sources</h4>
              <ul className="meta-list">
                {c.provenance.map((s) => (
                  <li key={s.id}>
                    {s.title}
                    {s.license ? ` — ${s.license}` : ""}
                    {s.access ? ` (${s.access})` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}

      <h2>Display settings</h2>
      <div role="group" aria-label="Stress-mark visibility">
        <p>
          <small>
            Some packs mark stressed vowels (e.g. сего́дня). Highlight them in readings and hints.
            {p.display && !p.display.pack_has_stress
              ? " The current pack's data carries no stress marks, so nothing changes until it does."
              : ""}
          </small>
        </p>
        {(["auto", "on", "off"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className="btn btn--quiet"
            aria-pressed={(p.display?.stress_mode ?? "auto") === m}
            onClick={() => p.onSelectStressMode(m)}
          >
            {m === "auto" ? "Automatic" : m === "on" ? "Always highlight" : "Off"}
          </button>
        ))}
      </div>

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

      <h2>Speech recognition &amp; pronunciation</h2>
      <p>
        <small>
          Optional. These local models feed the speech-based checks — pronunciation alignment and
          dictation recognition — or you can turn them off. They run entirely on this device;
          nothing is uploaded. Honest limit: both checks also need a speech runtime (whisper.cpp)
          that this build does not include, so while it is absent they abstain, and downloading a
          model here does not change that. Pronunciation feedback is <em>guided only</em> (no
          automatic scoring or mastery) until it has been calibrated. For pronunciation feedback
          the model sizes give the same result — pick one your device can comfortably run. Larger
          models mainly help future listening/recognition features, not pronunciation accuracy.
          {p.deviceTier
            ? ` This device was detected as the ${p.deviceTier.tier} tier (${p.deviceTier.cores} cores, ${Math.round(p.deviceTier.total_ram_mb)} MB RAM).`
            : " This device's tier could not be detected, so no model is recommended — pick one your device can comfortably run."}
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
              {p.deviceTier?.recommended_model === m.id ? (
                <span className="badge">recommended for this device</span>
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
          </div>
        ))}
      </fieldset>
    </section>
  );
}
