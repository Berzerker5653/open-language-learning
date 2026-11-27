/**
 * SPEAK-PRACTICE-001 journey: the free-speaking mode in the practice hub.
 *
 * Two legs, mirroring the card's acceptance:
 * (a) the base (no-sidecar) path is honest — the card names the whisper.cpp
 *     aligner as the requirement and the screen renders ZERO word coloring
 *     and no number that could read as a score;
 * (b) the scoring path colors the prompt word-by-word AND performs zero
 *     scheduler/mastery/plan writes — the guided-only invariant, pinned by
 *     denylisting every state-changing practice verb in the call log.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, RU, LearnerEngine, grantMicrophone, mountApp, type Mounted } from "./harness";

// Commands that would move scheduler, mastery, plan, mined, or error-ledger
// state. The free-speaking flow may not invoke ANY of them.
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

async function openFreeSpeaking(app: Mounted): Promise<HTMLElement> {
  await app.click(app.button(app.section("Routes"), "Practice"));
  await app.click(app.button(app.section("Practice modes"), "Free speaking"));
  return app.section("Free speaking");
}

describe("free speaking (SPEAK-PRACTICE-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("offers the mode and abstains honestly without the aligner — no coloring, no number", async () => {
    grantMicrophone();
    const engine = new LearnerEngine({
      profiles: [{ id: "lee", display_name: "Lee", active: RU, micEnabled: true }],
      installed: [RU],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Lee"));

    const panel = await openFreeSpeaking(app);
    // The prompt arrives from the ACTIVE pack's met-sentence pool, exactly
    // like the dictation cue (same engine-side encounter gate).
    expect(panel.textContent).toContain("Посмотрите");
    expect(app.engine.argsFor("dictation_target")).toEqual({
      profileId: "lee",
      packId: RU,
      offset: 0,
    });

    await app.click(app.button(panel, "Record attempt"));
    const recording = app.section("Recording");
    await app.click(app.button(recording, "Stop and check"));

    const check = app.engine.argsFor("free_speaking_check");
    const attempt = (check?.attempt ?? {}) as Record<string, unknown>;
    expect(attempt.pack_id).toBe(RU);
    expect(attempt.target_text).toContain("Посмотрите");
    expect(typeof attempt.wav_b64).toBe("string");

    // The unavailable card names the aligner variant as the requirement.
    const unavailable = document.querySelector('[data-testid="fs-abstain"]');
    if (!unavailable) throw new Error("the free-speaking result card showed no abstention");
    expect(unavailable.textContent).toContain("whisper.cpp aligner");

    // Zero fabricated coloring, zero numbers that could read as a score.
    expect(document.querySelectorAll('[data-testid="fs-word"]')).toHaveLength(0);
    const card = unavailable.closest(".card");
    expect(card?.textContent).not.toMatch(/\d+\s*%|\bpoints\b|\d+\s*\/\s*\d+/i);

    // Guided-only invariant: nothing in this flow touched learner state.
    const writes = app.engine.appCalls().filter((c) => WRITE_COMMANDS.includes(c.cmd));
    expect(writes.map((c) => c.cmd)).toEqual([]);
  });

  it("colors the prompt word-by-word on a scored attempt and writes zero learner state", async () => {
    grantMicrophone();
    const engine = new LearnerEngine({
      profiles: [{ id: "sam", display_name: "Sam", active: JA, micEnabled: true }],
      installed: [JA],
    });
    // This device has the aligner runtime; the scoring leg is the whole point.
    engine.speechModel = "org.openlanguage.speech.whisper-ggml-tiny";
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Sam"));

    const panel = await openFreeSpeaking(app);
    await app.click(app.button(panel, "Record attempt"));
    const recording = app.section("Recording");
    await app.click(app.button(recording, "Stop and check"));

    const words = [...document.querySelectorAll<HTMLElement>('[data-testid="fs-word"]')];
    expect(words.length).toBeGreaterThan(0);
    expect(words.every((w) => w.dataset.status === "matched")).toBe(true);
    const score = document.querySelector('[data-testid="fs-score"]');
    if (!score) throw new Error("a scored attempt rendered no coaching percentage");
    expect(score.textContent).toContain("100%");

    // The promise the mode card makes and the engine keeps: guided only.
    expect(document.querySelector('[data-testid="fs-mode"]')?.textContent).toContain(
      "never enters",
    );
    const writes = app.engine.appCalls().filter((c) => WRITE_COMMANDS.includes(c.cmd));
    expect(writes.map((c) => c.cmd)).toEqual([]);
  });
});
