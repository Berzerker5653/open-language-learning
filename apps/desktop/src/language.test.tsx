import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguagePanel, type CatalogEntry, type InstalledPack } from "./language";

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
});
