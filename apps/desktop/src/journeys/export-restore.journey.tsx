/**
 * Journey (d) — export, then restore: the learner's plan reads the same.
 *
 * The promise a backup makes is that the plan statement — how many activities,
 * how long, which words, what is next — survives the trip through the file.
 * This journey exports the live profile, reads the backup back through the
 * app's own "check this backup" control, restores it as a separate profile,
 * switches to it, and compares the sentences the learner is shown. Nothing is
 * compared against the fake's internals: the comparison is the text on screen.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";
import { counted } from "../settings";

/** The learner-facing plan statement, exactly as Home renders it. */
function planStatement(): string[] {
  return [
    document.querySelector(".plan-summary")?.textContent ?? "(no plan statement)",
    ...[...document.querySelectorAll(".plan-item")].map((b) => b.textContent ?? ""),
    document.querySelector(".next-goal")?.textContent ?? "(no next goal)",
  ];
}

describe("export then restore (journey d)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("restores a backup as a new profile whose plan says the same thing", async () => {
    // A profile with a bit of history, so the backup has something to carry.
    const history = { events: 4, savedWords: 2, goals: 3 };
    app = await mountApp(
      new LearnerEngine({
        profiles: [
          {
            id: "dana",
            display_name: "Dana",
            active: JA,
            events: history.events,
            savedWords: history.savedWords,
            goals: history.goals,
          },
        ],
        installed: [JA],
      }),
    );
    await app.click(app.button(app.section("Profiles"), "Dana"));

    const before = planStatement();
    expect(before[0]).toBe("2 activities · about 3 minutes");
    expect(before.join("\n")).toContain("how do you do (first meeting)");
    expect(before.join("\n")).toContain("Next up: Greet someone and say who you are");

    // Export from Settings; the app shows where the backup landed.
    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.click(app.button(app.section("Settings"), "Export profile data"));
    expect(app.engine.argsFor("profile_export")).toEqual({ profileId: "dana" });
    const shown = app.text('[data-testid="settings-export-path"]');
    expect(shown).toContain("Export written to: /home/learner/.local/share/openlang/exports/");
    const backupPath = shown.replace("Export written to: ", "").trim();

    // Checking the backup is a separate act from restoring it, and what it
    // reports are the counts that came out of the file.
    const pathField = document.querySelector<HTMLInputElement>(
      '[data-testid="settings-restore-path"]',
    );
    if (!pathField) throw new Error("Settings rendered no restore-path field");
    await app.type(pathField, backupPath);
    await app.click(document.querySelector('[data-testid="settings-restore-check"]')!);
    const preview = document.querySelector('[data-testid="settings-restore-preview"]');
    if (!preview) throw new Error("checking the backup showed no preview");
    expect(preview.textContent).toContain("Dana");
    expect(preview.textContent).toContain("backup format version 2");
    // Each count is spelled once, via the UI's own agreement rule. The
    // harness derives two of them: one scheduled review per saved word,
    // and the one JA pack installed above.
    const counts = [
      counted(history.savedWords, "saved word"),
      counted(history.events, "recorded attempt"),
      counted(history.goals, "goal"),
      counted(history.savedWords, "scheduled review"),
      counted(1, "language pack"),
    ];
    for (const c of counts) expect(preview.textContent).toContain(c);

    // Restore: always a new profile, never a replacement of the one in use.
    await app.click(document.querySelector('[data-testid="settings-restore-confirm"]')!);
    expect(app.engine.lastArgsFor("profile_import")).toEqual({ path: backupPath, mode: "new" });
    expect(
      app.engine.appCalls().filter((c) => c.cmd === "profile_import" && c.args.mode !== "new"),
    ).toEqual([]);
    const restored = counts.slice(0, 4);
    expect(app.text('[data-testid="settings-restore-result"]')).toContain(
      `Restored as Dana. On this device now: ${restored.slice(0, -1).join(", ")}, and ${restored.at(-1)}.`,
    );

    // Switch to what was restored — same name, different profile.
    await app.click(app.button(app.section("Settings"), "Switch profile…"));
    await app.click(app.button(app.section("Switch profile confirmation"), "Yes, switch profile"));
    const rows = [...document.querySelectorAll('[aria-label="Profiles"] button')];
    expect(rows.map((r) => r.textContent)).toEqual(["Dana", "Dana"]);
    await app.click(rows[1]!);

    // The learner lands on a plan that reads exactly as the old one did.
    expect(app.engine.lastArgsFor("home_state")).toEqual({ profileId: "profile-2" });
    expect(planStatement()).toEqual(before);

    // And the restored plan is live, not a transcript: the first activity
    // opens the pack's own encounter for the same content.
    await app.click(app.button(app.section("First look"), "how do you do (first meeting)"));
    expect(app.section("Lesson").textContent).toContain("はじめまして");
    expect(app.engine.lastArgsFor("lesson_plan")).toEqual({
      profileId: "profile-2",
      contentId: "ja.lex.demo.hajimemashite",
    });
  });
});
