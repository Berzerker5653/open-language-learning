/**
 * U02 — changing the learning language refreshes the whole learner context.
 *
 * The review walked it as: install Russian, press Learn this, return to
 * Today, and start an old task — the header said Russian while the queue,
 * the goal and the open card were still Japanese, and the old card died
 * with "unknown practice target". The fix treats the switch as one
 * coordinated transition: drop every pack-scoped display, then re-run the
 * profile-entry reads under a generation guard. This journey opens a real
 * Russian task, switches to the other installed pack mid-task, and shows
 * the old task is gone, Today answers from the new pack, and the capability
 * probe re-runs exactly once per pack change — then switches back. Along the
 * way it pins U04: dictation targets come from the active pack's pool, so
 * the Russian leg compares against Cyrillic and no kana default survives.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, RU, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("a language change refreshes the learner context (U02)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  const count = (cmd: string) => app.engine.appCalls().filter((c) => c.cmd === cmd).length;

  it("opens a Russian task, switches to Japanese mid-task, switches back", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "sam", display_name: "Sam", active: RU }],
      installed: [RU, JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Sam"));

    // Today answers from the Russian pack; open one of its plan rows so a
    // live old-pack card exists before the switch.
    const home = app.section("Practice");
    expect(home.textContent).toContain("ru.sent.b2");
    const writeRow = [...home.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Write it"),
    );
    if (!writeRow) throw new Error("Russian Today offers no writing row");
    await app.click(writeRow);
    expect(engine.lastArgsFor("practice_task")?.contentId).toMatch(/^ru\./);

    // U04 leg: the dictation pool speaks the ACTIVE language. Under Russian
    // the comparison target is a Cyrillic sentence, not a kana default.
    await app.click(app.button(app.section("Routes"), "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Speaking"));
    const ruDict = app.section("Dictation practice").querySelector("input") as HTMLInputElement;
    expect(ruDict.value).toContain("Посмотрите");

    // Settings → Language packs → Learn this (the other installed pack).
    await app.click(app.button(app.section("Routes"), "Settings"));
    const packs = app.section("Language packs");
    await app.click(app.button(packs, "Learn this"));

    // One coordinated transition: the native switch lands, then the
    // profile-entry reads re-run, so the plan, goal and probe all answer
    // for the NEW pack — and the open Russian card is gone, not submittable.
    expect(engine.lastArgsFor("switch_pack")).toEqual({ profileId: "sam", packId: JA });
    expect(count("home_state")).toBe(2);
    const today = app.section("Practice");
    expect(today.textContent).toContain("what to practice now");
    expect(app.text('[aria-label="Practice"] h1')).toBe("Hi Sam");
    expect(today.textContent).toContain("はじめまして");
    expect(today.textContent).not.toContain("ru.sent.b2");

    // U04: no stale other-language target survives the switch. Re-entering
    // Speaking refetches, and the answer is the Japanese pool's sentence.
    await app.click(app.button(app.section("Routes"), "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Speaking"));
    const jaDict = app.section("Dictation practice").querySelector("input") as HTMLInputElement;
    expect(jaDict.value).toBe("おばあさん");
    expect(jaDict.value).not.toContain("Посмотрите");
    expect(engine.appCalls().some((c) => c.cmd === "practice_submit")).toBe(false);

    // Capability probing is once per pack change, not per render: entry
    // answered once for Russian, the switch answered once for Japanese.
    expect(count("kanji_available")).toBe(2);
    expect(engine.lastArgsFor("kanji_available")).toEqual({ profileId: "sam" });

    // And back again without a restart: Russian answers Today once more.
    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.click(app.button(app.section("Language packs"), "Learn this"));
    expect(engine.lastArgsFor("switch_pack")).toEqual({ profileId: "sam", packId: RU });
    expect(app.section("Practice").textContent).toContain("ru.sent.b2");
    expect(count("kanji_available")).toBe(3);
    expect(count("home_state")).toBe(3);
  });
});
