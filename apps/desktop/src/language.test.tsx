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
  },
  {
    pack_id: "community.example.esperanto",
    version: "2.1.0",
    display_name: "Esperanto Community Pack",
    locale: "eo",
    trust_state: "community",
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
      tts={null}
      onInstallModel={() => {}}
      onDeleteModel={() => {}}
      speechModels={[]}
      speechModel="off"
      onSelectSpeechModel={() => {}}
      display={{ stress_mode: "auto", pack_has_stress: false }}
      onSelectStressMode={() => {}}
      claims={null}
      deviceTier={null}
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

  it("shows required attribution whenever a TTS payload is active", () => {
    const html = render({
      tts: {
        source: "bundled",
        components: [
          { name: "espeak-ng", license: "GPL-3.0", role: "pronunciation data for synthesis" },
          { name: "sherpa-onnx", license: "Apache-2.0", role: "speech runtime" },
          { name: "ONNX Runtime", license: "MIT", role: "model inference engine" },
          { name: "Kokoro", license: "Apache-2.0", role: "Japanese voice model" },
        ],
        models: [
          {
            id: "org.openlanguage.speech.kokoro-multi-lang",
            version: "1.0.0",
            license_code: "Apache-2.0",
            installed: true,
          },
        ],
      },
    });
    expect(html).toContain("included in this download");
    expect(html).toContain("espeak-ng");
    expect(html).toContain("GPL-3.0");
    expect(html).toContain("ONNX Runtime");
    expect(html).toContain("Japanese voice model (Kokoro)");
    expect(html).toContain("Remove");
  });

  it("degrades honestly when no TTS payload is present", () => {
    const html = render({
      tts: {
        source: "none",
        components: [],
        models: [
          {
            id: "org.openlanguage.speech.sherpa-onnx-runtime",
            version: "1.13.8",
            license_code: "Apache-2.0",
            installed: false,
          },
        ],
      },
    });
    expect(html).toContain("No speech synthesis is installed");
    expect(html).toContain("Audio activities are disabled");
    expect(html).toContain("Download");
    expect(html).not.toContain("GPL-3.0");
  });

  it("offers a speech-model selector that defaults to off and lists whisper models", () => {
    const html = render({
      speechModels: [
        {
          id: "org.openlanguage.speech.whisper-ggml-tiny",
          version: "1.0.0",
          license_code: "MIT",
          installed: false,
          size_bytes: 77691713,
        },
        {
          id: "org.openlanguage.speech.whisper-ggml-base",
          version: "1.0.0",
          license_code: "MIT",
          installed: false,
          size_bytes: 147951465,
        },
      ],
      speechModel: "off",
      deviceTier: {
        cores: 8,
        total_ram_mb: 16000,
        tier: "typical",
        recommended_model: "org.openlanguage.speech.whisper-ggml-base",
      },
    });
    // Off is the privacy default and is the checked option.
    expect(html).toContain("Off — no speech model");
    expect(html).toContain('checked="" value="off"');
    // A selectable whisper model with its size and a download action.
    expect(html).toContain("Whisper Base");
    expect(html).toContain("Download");
    // Honest framing: size does not change pronunciation accuracy; the
    // recommendation comes from the detected device tier (K-46), not a
    // static constant.
    expect(html).toContain("the model sizes give the same result");
    expect(html).toContain("recommended for this device");
    expect(html).toContain("detected as the typical tier (8 cores, 16000 MB RAM)");
    // The badge lands on the detected model only.
    expect((html.match(/recommended for this device/g) ?? []).length).toBe(1);
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
});
