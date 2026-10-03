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

export interface LanguagePanelProps {
  installed: InstalledPack[];
  activeIds: string[];
  catalog: CatalogEntry[];
  catalogStatus: string;
  error: string | null;
  onSwitch(packId: string): void;
  onInstallCatalog(packId: string): void;
  onImport(dataB64: string): void;
}

const STATUS_LABELS: Record<string, string> = {
  live: "Community catalog is live.",
  cached: "Showing the last saved community catalog.",
  "no-catalog-url":
    "Community packs are coming soon — this build has no catalog configured yet. Meanwhile you can import a pack file you received from someone below.",
  "offline-no-cache": "Offline, and no catalog has been fetched on this device yet.",
};

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
      {p.error && <p role="alert">{p.error}</p>}

      <h2>Installed packs</h2>
      {p.installed.length === 0 ? (
        <p>No packs installed yet.</p>
      ) : (
        <ul>
          {p.installed.map((i) => (
            <li key={i.pack_id} data-active={p.activeIds.includes(i.pack_id) ? "yes" : "no"}>
              {i.display_name} ({i.locale}) — v{i.version}, {i.trust_state}
              {p.activeIds.includes(i.pack_id) ? (
                <span> · learning this language</span>
              ) : (
                <button type="button" onClick={() => p.onSwitch(i.pack_id)}>
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
        <ul>
          {p.catalog.map((c) => (
            <li key={c.pack_id}>
              <strong>{c.display_name}</strong> ({c.locale}) — community content by {c.author}
              <ul>
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
                <span>installed (v{c.installed_version})</span>
              ) : (
                <button type="button" onClick={() => p.onInstallCatalog(c.pack_id)}>
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
