/**
 * Journey (b) — installing a pack is what makes a practice mode reachable.
 *
 * The profile starts with no language chosen, so the hub's Writing card leads
 * to an honest "no pack" answer instead of a drill. Installing the pack from
 * the community catalog and choosing it is the act that turns the same click
 * into a real target: the pack's own prompt, a grade that names the form the
 * pack expected, and the character cards the pack carries.
 *
 * The pack chosen here is the one that carries character data, which is what
 * the hub's Kanji card is gated on. The other half of that gate — a pack that
 * carries no characters at all — cannot be settled in a mounted tree; the job
 * report says what was observed when it was tried.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("pack install (journey b)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("turns an honest refusal into a graded writing target and character cards", async () => {
    // A profile with no language chosen, and nothing on the device.
    app = await mountApp(new LearnerEngine({ profiles: [{ id: "p1", display_name: "Sam" }] }));
    await app.click(app.button(app.section("Profiles"), "Sam"));

    // Home says plainly why there is nothing to practise, and names the one
    // control that can change it.
    expect(app.text('[aria-label="Practice"] h1')).toBe("Hi Sam");
    expect(app.text('[aria-label="Practice"]')).toContain("No language is set for this profile");

    // The hub still hands the learner the Writing card, and the app answers
    // honestly: no invented drill, and the way out named.
    const routes = app.section("Routes");
    await app.click(app.button(routes, "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Writing"));
    const refused = app.section("Writing practice");
    expect(refused.textContent).toContain(
      "No pack is active for this profile. Choose one under Settings → Language packs.",
    );
    expect(document.querySelector("#writing-answer")).toBeNull();
    // The mode screens are scoped to the profile's pack, never to whichever
    // pack the engine happens to have loaded.
    expect(app.engine.appCalls().filter((c) => c.cmd === "writing_task")).toEqual([
      { cmd: "writing_task", args: { profileId: "p1" } },
    ]);

    // Settings → the community catalog: the pack is installed, then chosen.
    await app.click(app.button(routes, "Settings"));
    const packs = app.section("Language packs");
    expect(packs.textContent).toContain("No packs installed yet.");
    const jaRow = [...packs.querySelectorAll("li")].find((li) =>
      (li.textContent ?? "").includes("Japanese"),
    );
    if (!jaRow) throw new Error("the catalog offered no Japanese pack");
    await app.click(app.button(jaRow, "Install v0.4.0"));
    expect(app.engine.lastArgsFor("install_catalog_pack")).toEqual({ packId: JA });
    expect(app.text('[aria-label="Language packs"]')).toContain("installed (v0.4.0)");

    const chosenRow = [...app.section("Language packs").querySelectorAll("li")].find((li) =>
      (li.textContent ?? "").includes("Japanese"),
    );
    if (!chosenRow) throw new Error("the installed list lost the Japanese pack");
    await app.click(app.button(chosenRow, "Learn this"));
    expect(app.engine.lastArgsFor("switch_pack")).toEqual({ profileId: "p1", packId: JA });

    // The same Writing click now reaches the pack's own target, and a miss is
    // answered with the form the pack asked for.
    await app.click(app.button(routes, "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Writing"));
    expect(app.text('[aria-label="Writing practice"]')).toContain(
      "Write the word for: grandmother",
    );
    const answer = document.querySelector<HTMLInputElement>("#writing-answer");
    if (!answer) throw new Error("the writing target rendered no answer field");
    await app.type(answer, "obaasan");
    await app.click(app.button(app.section("Writing practice"), "Check"));
    expect(app.text('[aria-label="Writing practice"] [aria-live="polite"]')).toBe("Try again");
    expect(app.text('[data-testid="writing-expected"]')).toContain("The form this task asked for:");
    expect(app.text('[data-testid="writing-expected"]')).toContain("おばあさん");

    await app.type(answer, "おばあさん");
    await app.click(app.button(app.section("Writing practice"), "Check"));
    expect(app.text('[aria-label="Writing practice"] [aria-live="polite"]')).toBe("Correct");
    expect(app.engine.lastArgsFor("writing_submit")).toMatchObject({
      profileId: "p1",
      itemId: "ja.lex.demo.obaasan",
      answer: "おばあさん",
    });

    // The Kanji card is reachable work now: the cards this pack carries show
    // up, read from the profile rather than assumed.
    await app.click(app.button(routes, "Practice"));
    const hub = app.section("Practice modes");
    expect(hub.textContent).toContain("Meaning and reading drills for kanji you have met.");
    await app.click(app.button(hub, "Kanji"));
    expect(app.text('[aria-label="Kanji"]')).toContain("祖母");
    expect(app.engine.lastArgsFor("kanji_list")).toEqual({ profileId: "p1" });
  });
});
