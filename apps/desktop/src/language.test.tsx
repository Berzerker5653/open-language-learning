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

// The ja-JP pack as it actually ships: two EDRDG sources, each with its
// own attribution line, a licence-text URL, and a pinned release/commit
// in access_notes that must surface verbatim.
const jaSourcedClaims: PackClaims[] = [
  {
    pack_id: "org.openlanguage.ja-demo",
    version: "0.2.0",
    trust_state: "community",
    counts: {
      units: 30,
      goals: 75,
      assessments: 12,
      lexicon: 3920,
      sentences: 40,
      grammar: 18,
      orthography: 46,
      kanji: 2136,
      phonological_contrasts: 6,
      stories: 3,
    },
    postures: [{ kind: "lexicon", posture: "draft", count: 3920 }],
    provenance: [
      {
        id: "edrdg-jmdict",
        title: "JMdict/JMnedict electronic dictionary project",
        url: "https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project",
        license: "CC-BY-SA-4.0",
        access: "public",
        license_text_url: "https://www.edrdg.org/edrdg/licence.html",
        attribution_text:
          "JMdict/JMnedict © Electronic Dictionary Research and Development Group, CC BY-SA 4.0",
        retrieved: "2026-09-30",
        access_notes:
          "jmdict-simplified release 3.6.2, commit 4f9c2a1e7b8d5e6c0a1b3f4d5e6c7a8b9c0d1e2f",
        content_hash: "9d2f4b6a1c8e0d3f5a7b9c1e3f5a7b9d1e3f5a7b9c1e3f5a7b9d1e3f5a7b9c1e",
        attribution_required: true,
        redistribution_allowed: true,
        use_notes: "",
      },
      {
        id: "kradfile",
        title:
          "KRADFILE - EDRDG kanji visible-component/decomposition file (consumed via the jmdict-simplified 3.6.2 conversion)",
        url: "https://www.edrdg.org/kradfile/kradfile.html",
        license: "CC-BY-SA-4.0",
        access: "public",
        license_text_url: "https://www.edrdg.org/edrdg/licence.html",
        attribution_text:
          "Radical/decomposition data: KRADFILE © Electronic Dictionary Research and Development Group, CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html)",
        retrieved: "2026-09-30",
        access_notes: "jmdict-simplified release 3.6.2, kanji directory 2024-03-19",
        content_hash: "1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c",
        attribution_required: true,
        redistribution_allowed: true,
        use_notes: "",
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
  it("shows measured download progress and never a number for an unmeasured phase", () => {
    // The percentage is bytes the engine actually read over the size the
    // catalog pinned; a phase the engine cannot measure names itself with
    // no number at all.
    const running = render({
      progress: {
        operation: "install-pack",
        subject: "community.example.esperanto",
        stage: "fetch",
        percent: 40,
      },
    });
    expect(running).toContain("Downloading the language pack — 40% done");
    const unpacking = render({
      progress: {
        operation: "install-pack",
        subject: "community.example.esperanto",
        stage: "install",
        percent: null,
      },
    });
    expect(unpacking).not.toMatch(/\d+\s*%/);
    expect(unpacking).toContain("Unpacking and checking the content");
  });

  it("offers cancel during fetch, verify and unpacking, and not after the store swap", () => {
    for (const stage of ["fetch", "verify", "install"]) {
      const html = render({
        progress: {
          operation: "install-pack",
          subject: "community.example.esperanto",
          stage,
          percent: stage === "fetch" ? 40 : null,
        },
      });
      expect(html).toContain("Cancel install");
    }
    // `record` runs after the store swap: there is nothing left to stop, so
    // the button is absent rather than pretending to work.
    const recording = render({
      progress: {
        operation: "install-pack",
        subject: "community.example.esperanto",
        stage: "record",
        percent: null,
      },
    });
    expect(recording).not.toContain("Cancel install");
  });

  it("renders the cancelled state honestly: nothing installed, retry continues the download", () => {
    const html = render({
      outcome: {
        kind: "cancelled",
        pack_id: "community.example.esperanto",
        message: "install cancelled",
      },
    });
    expect(html).toContain("Install of community.example.esperanto was cancelled.");
    expect(html).toContain("Nothing was installed");
    // The engine keeps the bytes it already downloaded, so the copy says the
    // retry continues — and no longer claims a resume that did not exist.
    expect(html).toContain("continues the download where it stopped");
    expect(html).not.toContain("downloads the whole pack again");
    expect(html).not.toContain("does not continue where it stopped");
    expect(html).toContain("Install again");
    expect(html).toContain('aria-live="polite"');
  });

  it("renders a failed install with the engine's reason and a retry affordance", () => {
    const html = render({
      outcome: {
        kind: "failed",
        pack_id: "community.example.esperanto",
        message: "archive checksum does not match catalog entry",
      },
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain("archive checksum does not match catalog entry");
    expect(html).toContain("Try again");
  });

  it("ends a successful install with a receipt naming version, source, sha and declared capabilities", () => {
    const html = render({
      receipt: {
        pack_id: "community.example.esperanto",
        version: "2.2.0",
        source_url: "https://github.com/example/eo/releases/download/v2.2.0/eo.lpk",
        source_host: "github.com",
        sha256: "a".repeat(64),
        size_bytes: 3_200_000,
        capabilities: ["reading", "writing"],
      },
    });
    expect(html).toContain("community.example.esperanto");
    expect(html).toContain("v2.2.0");
    expect(html).toContain("github.com");
    expect(html).toContain("https://github.com/example/eo/releases/download/v2.2.0/eo.lpk");
    expect(html).toContain("a".repeat(64));
    expect(html).toContain("3.1 MB");
    // Only declared capabilities appear — the receipt cannot promise what
    // the pack's manifest does not state.
    expect(html).toContain("reading, writing");
    expect(html).not.toContain("listening");
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

  it("renders each declared source's attribution, licence-text link and pinned release", () => {
    const html = render({ claims: jaSourcedClaims });
    // Both EDRDG sources show their OWN attribution lines, not titles or ids.
    expect(html).toContain(
      "JMdict/JMnedict © Electronic Dictionary Research and Development Group, CC BY-SA 4.0",
    );
    expect(html).toContain(
      "Radical/decomposition data: KRADFILE © Electronic Dictionary Research and Development Group, CC BY-SA 4.0",
    );
    expect(html).not.toContain("edrdg-jmdict");
    // The licence links to the licence TEXT, labelled as such.
    expect(html).toContain('href="https://www.edrdg.org/edrdg/licence.html"');
    expect(html).toContain("CC-BY-SA-4.0 license text");
    // The pinned release/commit lives in access_notes and renders verbatim.
    expect(html).toContain(
      "jmdict-simplified release 3.6.2, commit 4f9c2a1e7b8d5e6c0a1b3f4d5e6c7a8b9c0d1e2f",
    );
    expect(html).toContain("jmdict-simplified release 3.6.2, kanji directory 2024-03-19");
    // Retrieval dates surface; bare hashes never become prose.
    expect(html).toContain("retrieved 2026-09-30");
    expect(html).not.toContain("9d2f4b6a1c8e0d3f5a7b9c1e3f5a7b9d1e3f5a7b9c1e3f5a7b9d1e3f5a7b9c1e<");
    // The surface points at the complete notice list instead of posing as it.
    expect(html).toContain("third-party/notices/NOTICE.md");
  });

  it("says plainly when a pack declares no sources, and fabricates no source line", () => {
    const html = render({
      claims: jaSourcedClaims.map((c) => ({ ...c, provenance: [] })),
    });
    // The section stays, stating the unattributed state.
    expect(html).toContain("Stated sources");
    expect(html).toContain("This pack declares no sources");
    const region = html.slice(html.indexOf("Stated sources"), html.indexOf("Display settings"));
    expect(region).not.toMatch(/<li/);
    expect(region).not.toContain("http");
    // The pointer to the full notice list is unconditional.
    expect(region).toContain("third-party/notices/NOTICE.md");
  });
});
