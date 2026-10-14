import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguagePanel, type CatalogEntry, type InstalledPack, type PackClaims } from "./language";

const installed: InstalledPack[] = [
  {
    pack_id: "org.openlanguage.ja-demo",
    version: "0.1.0",
    display_name: "Japanese (demo lexicon)",
    locale: "ja-JP",
    trust_state: "community",
    rtl: false,
  },
  {
    pack_id: "community.example.esperanto",
    version: "2.1.0",
    display_name: "Esperanto Community Pack",
    locale: "eo",
    trust_state: "community",
    rtl: false,
  },
];

const catalog: CatalogEntry[] = [
  {
    pack_id: "community.example.esperanto",
    version: "2.2.0",
    display_name: "Esperanto Community Pack",
    locale: "eo",
    author: "Esperanto Volunteers",
    license: "CC-BY-4.0",
    review_status: "community",
    min_sdk_version: "0.1.0",
    size_bytes: 3_200_000,
    installed_version: "2.1.0",
  },
];

// An all-unreviewed pack: the honest pack-level posture is the owner's
// exact statement, and no reviewed/verified claim may appear.
const allUnreviewedClaims: PackClaims[] = [
  {
    pack_id: "org.openlanguage.ja-demo",
    version: "0.1.0",
    trust_state: "community",
    counts: {
      units: 30,
      goals: 75,
      assessments: 12,
      lexicon: 3920,
      sentences: 40,
      grammar: 18,
      orthography: 46,
      kanji: 12,
      phonological_contrasts: 6,
      stories: 3,
    },
    postures: [
      { kind: "lexicon", posture: "draft", count: 3918 },
      { kind: "lexicon", posture: "review-needed", count: 2 },
    ],
    provenance: [
      {
        id: "jf-standard",
        title: "JF Standard for Japanese-Language Education (framework reference)",
        url: "https://www.jpf.go.jp/e/jlpt/index.html",
        license: "CC-BY-NC-ND-4.0",
        access: "reference-only",
      },
    ],
  },
];

function render(over: Partial<Parameters<typeof LanguagePanel>[0]> = {}) {
  return renderToStaticMarkup(
    <LanguagePanel
      installed={installed}
      activeIds={["org.openlanguage.ja-demo"]}
      catalog={catalog}
      catalogStatus="offline-cached"
      error={null}
      onSwitch={() => {}}
      onInstallCatalog={() => {}}
      onImport={() => {}}
      display={{ stress_mode: "auto", pack_has_stress: false }}
      onSelectStressMode={() => {}}
      claims={null}
      {...over}
    />,
  );
}

describe("language panel", () => {
  it("marks the active learning language and offers switching", () => {
    const html = render();
    expect(html).toContain("learning this language");
    expect(html).toContain("Learn this");
    expect(html).toContain("Esperanto Community Pack");
    expect(html).toContain("language you are");
    // K-77: the panel is now the "Language packs" section inside Settings;
    // its landmark must be named, and there is no Languages route to pin.
    expect(html).toContain('aria-label="Language packs"');
    expect(html).not.toMatch(/Speech model|Speech &amp; attribution/);
  });

  it("shows full catalog metadata and labels packs as community content", () => {
    const html = render();
    expect(html).toContain("community content by Esperanto Volunteers");
    expect(html).toContain("version 2.2.0");
    expect(html).toContain("CC-BY-4.0");
    expect(html).toContain("3.1 MB");
    expect(html).toContain("needs app SDK 0.1.0");
    expect(html).toContain("author&#x27;s claim");
    expect(html).toContain("unreviewed");
    expect(html).toContain("Update to v2.2.0");
    expect(html).toContain("never run code");
  });

  it("reports catalog status honestly and never claims review", () => {
    const offline = render({ catalogStatus: "offline-no-cache", catalog: [] });
    expect(offline).toContain("Offline, and no catalog has been fetched");
    const reviewed = render({
      catalog: [{ ...catalog[0]!, review_status: "reviewed" }],
    });
    // A catalog claim is displayed as a claim, never as our endorsement.
    expect(reviewed).toContain("author claims reviewed");
    expect(reviewed).not.toContain("verified by us");
  });

  it("explains the empty catalog and offers local import", () => {
    const html = render({ catalogStatus: "no-catalog-url", catalog: [] });
    expect(html).toContain("Community packs are coming soon");
    expect(html).toContain("import a pack file");
    expect(html).toContain('accept=".lpk"');
  });

  it("surfaces install errors", () => {
    const html = render({ error: "install rejected: bad archive" });
    expect(html).toContain("install rejected");
  });

  it("renders per-pack content claims without touching install posture (K-43)", () => {
    const html = render({
      claims: [
        {
          pack_id: "org.openlanguage.ja-demo",
          version: "0.1.0",
          trust_state: "community",
          counts: {
            units: 30,
            goals: 75,
            assessments: 12,
            lexicon: 3920,
            sentences: 40,
            grammar: 18,
            orthography: 46,
            kanji: 12,
            phonological_contrasts: 6,
            stories: 3,
          },
          postures: [
            { kind: "lexicon", posture: "draft", count: 3918 },
            { kind: "lexicon", posture: "review-needed", count: 2 },
          ],
          provenance: [
            {
              id: "jf-standard",
              title: "JF Standard for Japanese-Language Education (framework reference)",
              url: "https://www.jpf.go.jp/e/jlpt/index.html",
              license: "CC-BY-NC-ND-4.0",
              access: "reference-only",
            },
          ],
        },
      ],
    });
    // Counts and posture distribution surface as the pack's own claims.
    expect(html).toContain("What this pack claims");
    expect(html).toContain("75 communicative goals");
    expect(html).toContain("lexicon: 3918 AI-generated, unreviewed");
    expect(html).toContain("JF Standard");
    // Honesty: claims never promote the install posture.
    expect(html).toContain("not our verification");
    expect(html).toContain("community");
    // A pack with no claims data renders no panel.
    expect(render({ claims: null })).not.toContain("What this pack claims");
  });

  it("states one pack-level posture line for an all-unreviewed pack (owner 2026-10-07)", () => {
    const html = render({ claims: allUnreviewedClaims });
    // Exactly once per named pack, using the owner's exact wording.
    const statements = html.match(/AI-generated content · not human-reviewed/g);
    expect(statements).toHaveLength(1);
    // The claim tallies keep their numbers with the relabeled posture words.
    expect(html).toContain("lexicon: 3918 AI-generated, unreviewed");
    expect(html).toContain("lexicon: 2 awaiting review");
  });

  it("makes no reviewed/verified claim when every tally is unreviewed", () => {
    const html = render({ claims: allUnreviewedClaims });
    // Scope: the pack list and its claims block. (The catalog section's
    // install pipeline says "checksum-verified and validated" — that
    // is about install integrity, never content review.)
    const region = html.slice(html.indexOf("Installed packs"), html.indexOf("Community catalog"));
    expect(region).not.toMatch(/\b(validated|verified)\b/);
    // The only permitted review mention is the negated posture statement.
    expect(region).not.toMatch(/(?<!not )human-reviewed/);
  });

  it("reports the stage a catalog install is in", () => {
    // K-62: downloading and unpacking a pack takes long enough that silence
    // reads as a dead button. The panel shows the reported stage, and shows
    // nothing when no operation is running.
    const running = render({
      progress: {
        operation: "install-pack",
        subject: "community.example.japanese",
        stage: "fetch",
        percent: null,
      },
    });
    expect(running).toContain('aria-live="polite"');
    expect(running).not.toMatch(/\d+\s*%/);
    expect(render()).not.toContain('aria-live="polite"');
    // A real percentage (model files report completed bytes) is shown as-is.
    const withPercent = render({
      progress: {
        operation: "install-model",
        subject: "org.openlanguage.speech.whisper-ggml-tiny",
        stage: "fetch",
        percent: 40,
      },
    });
    expect(withPercent).toContain("40%");
  });

  it("names each installed pack in that pack's own direction (ADR-0029)", () => {
    // The panel lists several packs at once, so the active pack's direction
    // must not decide the name of any other pack: direction is per element,
    // taken from each pack's own `capabilities.rtl`.
    const html = render({
      installed: [
        ...installed,
        {
          pack_id: "org.openlanguage.ar.scaffold",
          version: "0.1.0",
          display_name: "السلام عليكم",
          locale: "ar-MA",
          trust_state: "experimental",
          rtl: true,
        },
      ],
    });
    expect(html).toContain('<span dir="rtl" lang="ar-MA">السلام عليكم</span>');
    // An LTR pack in the same list gains a language tag and no direction.
    expect(html).toContain('<span lang="eo">Esperanto Community Pack</span>');
  });
});
