/**
 * Language-pack management (the "Language packs" section of Settings,
 * K-77): the language being learned (a pack) is separate from the app's
 * own display language, which stays fixed. Installed packs work fully
 * offline; the community catalog points at versioned GitHub releases and
 * always labels packs as community content. All speech UI — model picker
 * and runtime availability — lives in the single Settings → Speech card;
 * nothing here duplicates it.
 */
import { progressLine, type EngineProgress } from "./progress";

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

/// D4 (ADR-0019): the constrained-alignment runtime this build carries, as the
/// engine reports it. `source` is `"bundled"` (release sidecar payload) or
/// `"bench"` (development vendor tree); `reason` is the abstention token the
/// panel turns into copy, never a linguistic judgement.
export interface AlignerStatus {
  available: boolean;
  source: string | null;
  runtime_version: string | null;
  requires_cpu: string | null;
  reason: string | null;
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
  onImport(dataB64: string): void;
  /// K-41: stress-mark visibility (display setting; null until loaded).
  display: DisplaySettingsView | null;
  onSelectStressMode(mode: "auto" | "on" | "off"): void;
  /// K-43: per-pack content claims (null until loaded).
  claims: PackClaims[] | null;
  /// K-62: the stage a long install reported, or null when nothing is running.
  progress?: EngineProgress | null;
}

const STATUS_LABELS: Record<string, string> = {
  live: "Community catalog is live.",
  cached: "Showing the last saved community catalog.",
  "no-catalog-url":
    "Community packs are coming soon — this build has no catalog configured yet. Meanwhile you can import a pack file you received from someone below.",
  "offline-no-cache": "Offline, and no catalog has been fetched on this device yet.",
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

export function megabytes(bytes: number): string {
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
    <section aria-label="Language packs">
      <h1>Language packs</h1>
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
      {p.progress && (
        // K-62: the learner watches the operation instead of wondering whether
        // the button did anything. Only a stage the engine entered is named.
        <p role="status" aria-live="polite" className="notice">
          {progressLine(p.progress)}
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
    </section>
  );
}
