/**
 * WRITE-PRACTICE-001 journey: free writing in the practice hub.
 *
 * Legs, mirroring the card's acceptance:
 * (a) the mode is reachable from the hub and unlocked by default, the
 *     usage chips count the targets the engine's form matcher accepted,
 *     and the Progress meters read the accumulation it produced;
 * (b) the private journal survives a profile switch — Kim sees no rows,
 *     Lee still sees theirs — and the whole flow invokes ZERO
 *     mastery/scheduler/plan/ledger verbs. The journal verbs
 *     (writing_check/writing_journal/writing_prompt/writing_meters) are
 *     the only writes this route may perform, and they only ever touch
 *     the journal.
 */
import { afterEach, describe, expect, it } from "vitest";
import { RU, LearnerEngine, mountApp, type Mounted } from "./harness";

// Commands that would move scheduler, mastery, plan, mined, or error-ledger
// state. The free-writing flow may not invoke ANY of them.
const WRITE_COMMANDS = [
  "practice_submit",
  "writing_submit",
  "encounter_complete",
  "placement_submit",
  "capstone_complete",
  "mine_add",
  "mine_grade",
  "mine_new",
  "mine_remove",
  "error_review_accept",
  "error_review_grade",
  "scenario_attempt",
  "scenario_finish",
  "scenario_transfer_answer",
];

async function openFreeWriting(app: Mounted): Promise<HTMLElement> {
  await app.click(app.button(app.section("Routes"), "Practice"));
  await app.click(app.button(app.section("Practice modes"), "Free writing"));
  return app.section("Free writing");
}

function textArea(panel: HTMLElement): HTMLTextAreaElement {
  const field = panel.querySelector<HTMLTextAreaElement>('[data-testid="fw-text"]');
  if (!field) throw new Error("the free-writing screen rendered no writing field");
  return field;
}

function journalCount(root: ParentNode = document): number {
  return root.querySelectorAll('[data-testid="fw-journal-entry"]').length;
}

describe("free writing (WRITE-PRACTICE-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("is reachable from the hub, chips the used targets, and feeds the Progress meters", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "lee", display_name: "Lee", active: RU }],
      installed: [RU],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Lee"));

    const panel = await openFreeWriting(app);
    // The prompt is today's words plus one L1 situational cue, from the
    // encounter-gated pool (same wire gate as the dictation cue).
    expect(panel.textContent).toContain("Write about your morning today.");
    const targetSurfaces = [...panel.querySelectorAll('[data-testid="fw-target"]')].map(
      (el) => el.textContent ?? "",
    );
    expect(targetSurfaces.join(" ")).toContain("кофе");
    expect(app.engine.argsFor("writing_prompt")).toEqual({
      profileId: "lee",
      packId: RU,
      offset: 0,
    });

    // A short free text; both fixture targets appear in a dictionary form.
    await app.type(textArea(panel), "кофе и утро");
    await app.click(app.button(panel, "Check"));
    await app.settle();

    const check = app.engine.argsFor("writing_check");
    const attempt = (check?.attempt ?? {}) as Record<string, unknown>;
    expect(attempt.pack_id).toBe(RU);
    expect(attempt.profile_id).toBe("lee");
    expect(attempt.text).toBe("кофе и утро");
    expect(attempt.targets).toEqual(["ru.lex.routines.kofe", "ru.lex.routines.utro"]);

    // Usage chips on every target the engine counted, and the honest
    // summary lines: word count, and "not in dictionary", never "wrong".
    expect(document.querySelectorAll('[data-testid="fw-used-chip"]')).toHaveLength(2);
    expect(document.querySelector('[data-testid="fw-usage"]')?.textContent).toContain(
      "You used 2 of 2",
    );
    expect(document.querySelector('[data-testid="fw-count"]')?.textContent).toContain("3 words");
    expect(document.querySelector('[data-testid="fw-mode"]')?.textContent).toContain(
      "completion signal",
    );

    // The attempt is journaled on the spot, newest-first.
    expect(journalCount()).toBe(1);
    expect(document.querySelector('[data-testid="fw-journal-entry"]')?.textContent).toContain(
      "кофе и утро",
    );

    // The meters ride the Progress surface (settle-gated: the read lands
    // when the screen opens): accumulation, not debt.
    await app.click(app.button(app.section("Routes"), "Progress"));
    await app.settle();
    const meters = app.section("Free writing progress");
    expect(meters.textContent).toContain("1 writing attempts this week");
    expect(meters.textContent).toContain("2 unique dictionary words");

    // The invariant: nothing in this flow touched learner state.
    const writes = app.engine.appCalls().filter((c) => WRITE_COMMANDS.includes(c.cmd));
    expect(writes.map((c) => c.cmd)).toEqual([]);
  });

  it("keeps the journal private per profile and alive across a profile switch", async () => {
    const engine = new LearnerEngine({
      profiles: [
        { id: "lee", display_name: "Lee", active: RU },
        { id: "kim", display_name: "Kim", active: RU },
      ],
      installed: [RU],
    });

    // Lee writes an attempt.
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Lee"));
    let panel = await openFreeWriting(app);
    await app.type(textArea(panel), "кофе");
    await app.click(app.button(panel, "Check"));
    await app.settle();
    expect(journalCount()).toBe(1);
    await app.unmount();

    // Kim reopens the mode: the SAME store, none of Lee's rows.
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Kim"));
    panel = await openFreeWriting(app);
    expect(journalCount(panel)).toBe(0);
    expect(panel.textContent).toContain("saved here");
    await app.unmount();

    // Lee returns: the journal survived the switch, untouched.
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Lee"));
    panel = await openFreeWriting(app);
    expect(journalCount(panel)).toBe(1);
    expect(panel.textContent).toContain("кофе");

    // Across every launch, the flow never touched learner state.
    const writes = app.engine.appCalls().filter((c) => WRITE_COMMANDS.includes(c.cmd));
    expect(writes.map((c) => c.cmd)).toEqual([]);
  });
});
