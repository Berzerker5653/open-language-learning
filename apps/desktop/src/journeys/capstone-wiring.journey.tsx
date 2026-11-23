/**
 * CAPSTONE-WIRING-TEST-001 — the App↔Home capstone wiring journey.
 *
 * UNIT-CAPSTONE-001 shipped the capstone review UI, but App.tsx never passed
 * `onStartCapstone`/`capstoneResult` down to Home — the feature was dead on
 * main until chore 6db2c26b wired it. Nothing in the suite caught that: the
 * unit tests mount Home with the props hand-supplied, so only a journey that
 * mounts the shipped <App/> can pin the wiring. This journey walks the whole
 * chain a learner walks: the checkpoint node's own start button (which exists
 * ONLY when App passes `onStartCapstone`), the engine-built review session,
 * the attempt-grouped submits, and the honest result back on the path (which
 * renders ONLY when App passes `capstoneResult`). If either prop stops
 * travelling, a click or an assertion here fails — that is the regression
 * shape of 6db2c26b.
 */
import { afterEach, describe, expect, it } from "vitest";
import { LearnerEngine, RU, mountApp, type Mounted } from "./harness";

/** The fixture's checkpoint node id — the engine's reserved shape:
 * `capstone.<pack>.<band key>`. */
const NODE = `capstone.${RU}.on-ramp`;
const START_TESTID = `capstone-start-${NODE}`;
const RECORDED_TESTID = `capstone-recorded-${NODE}`;

/** The section's four words: the greetings family from the RU fixture
 * (verbatim lexicon rows), scheduled as one finished unit. The glosses are
 * the choice pool the recall-meaning runner serves. */
const WORDS = [
  { id: "ru.lex.greetings.zdravstvuyte", gloss: "hello (polite greeting)" },
  { id: "ru.lex.greetings.dobroe-utro", gloss: "good morning" },
  { id: "ru.lex.greetings.dobryy-den", gloss: "good afternoon; good day" },
  { id: "ru.lex.greetings.dobryy-vecher", gloss: "good evening" },
];

/** Mount a learner whose one section is finished — the state that unlocks
 * the capstone node — through the real profile-chooser entry. */
async function mountFinishedSection(): Promise<Mounted> {
  const app = await mountApp(
    new LearnerEngine({
      profiles: [
        {
          id: "eva",
          display_name: "Eva",
          active: RU,
          schedule: WORDS.map((w) => ({
            content_id: w.id,
            modality: "recall-meaning",
            reason: "progression",
            kind: "review",
            est_seconds: 30,
            goal: "greetings",
          })),
          capstone: { doneGoals: ["greetings"] },
        },
      ],
      installed: [RU],
    }),
  );
  await app.click(app.button(app.section("Profiles"), "Eva"));
  return app;
}

/** Answer the choice currently on screen with `gloss`, and check the runner
 * graded it the way the learner reads it. */
async function answer(app: Mounted, gloss: string, correct = true): Promise<void> {
  await app.click(app.button(app.section("Choices"), gloss));
  const verdict = app.text('[aria-label="Practice"] [aria-live="polite"]');
  if (correct) expect(verdict).toBe("Correct");
  else expect(verdict).toContain("Not quite");
}

/** Advance past the graded item: either the bridge to the next activity
 * (which opens the next runner on its own) or the session's own ending. */
async function advance(app: Mounted, last: boolean): Promise<void> {
  const label = last ? "Finish session" : "Continue to next activity";
  await app.click(app.button(app.section("Practice"), label));
  if (last) return;
  // SESSION-FLOW-COPY-001: a bridge names what comes next and opens it
  // itself after its timer (SESSION_BRIDGE_MS = 1200 in App.tsx).
  const bridge = document.querySelector('[aria-label="Session bridge"]');
  if (!bridge) throw new Error("the capstone session advanced without a bridge");
  expect(bridge.textContent).toContain("Next: Recall");
  await new Promise((r) => setTimeout(r, 1300));
  await app.settle();
  expect(document.querySelector('[aria-label="Session bridge"]')).toBeNull();
}

async function dismissSummary(app: Mounted): Promise<void> {
  const summary = app.section("Session summary");
  await app.click(app.button(summary, "Back to the plan"));
  await app.settle();
}

describe("capstone wiring App -> Home (journey)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("the path's start action opens the review and the engine's verdict flows back to Home", async () => {
    app = await mountFinishedSection();
    const path = app.section("Your path");

    // The checkpoint node exists and carries its OWN action — the button
    // Home renders only when App passes onStartCapstone. No prop, no
    // button: the 6db2c26b regression goes RED right here.
    const start = app.button(path, "Start section review");
    expect(start.getAttribute("data-testid")).toBe(START_TESTID);

    await app.click(start);
    await app.settle();

    // App asked the engine to build the review for THIS section, and the
    // session runner opened on the first item directly — a review rides
    // the session runner, not a lesson card.
    expect(app.engine.argsFor("capstone_plan")).toMatchObject({
      profileId: "eva",
      packId: RU,
      band: "on-ramp",
    });
    expect(document.querySelector('[aria-label="Lesson"]')).toBeNull();
    expect(app.section("Practice")).toBeTruthy();
    // And the session can be exited — it is a real running session.
    expect(document.querySelector("[data-session-pause]")).toBeTruthy();

    // Walk the whole review; every answer rides the normal submit path.
    for (const [i, w] of WORDS.entries()) {
      await answer(app, w.gloss);
      await advance(app, i === WORDS.length - 1);
    }
    await app.settle();

    // One attempt group for the whole review: every graded submit carried
    // the SAME session id, and closing passed exactly that id to the
    // engine — the group capstone_complete recounts is the App's, never
    // a UI tally.
    const submits = app.engine
      .appCalls()
      .filter((c) => c.cmd === "practice_submit")
      .map((c) => c.args.sessionId);
    expect(submits).toHaveLength(WORDS.length);
    const sid = submits[0] ?? null;
    expect(typeof sid).toBe("string");
    expect(submits.every((s) => s === sid)).toBe(true);
    const close = app.engine.lastArgsFor("capstone_complete");
    expect(close).toMatchObject({ profileId: "eva", packId: RU, band: "on-ramp" });
    expect(close?.sessionId ?? null).toBe(sid);

    // The session ends with its honest summary; dismiss it back to the
    // path, where the RESULT must land — Home renders the finish card
    // only from the capstoneResult prop App passes. No prop, no card:
    // the second half of the 6db2c26b shape goes RED here.
    await dismissSummary(app);
    const finish = document.querySelector('[data-testid="unit-finish-moment"]');
    if (!finish) throw new Error("a passed review reached Home without its finish card");
    expect(finish.textContent).toContain("Section complete");
    expect(finish.textContent).toContain("4 of 4 recalled");

    // The node itself flipped: the recorded caption replaces the action,
    // because the refreshed unit_path answers the PASSED attempt.
    expect(document.querySelector(`[data-testid="${START_TESTID}"]`)).toBeNull();
    const record = document.querySelector(`[data-testid="${RECORDED_TESTID}"]`);
    if (!record) throw new Error("a passed capstone shows no recorded caption on its node");
    expect(record.textContent).toContain("Section review recorded");
  }, 30_000);

  it("a not-yet-passed review states one plain fact and offers the review again", async () => {
    app = await mountFinishedSection();
    await app.click(app.button(app.section("Your path"), "Start section review"));
    await app.settle();

    // Miss ONE item: four pools need the 80% bar, so 3 of 4 has not
    // passed — and the app says so without scolding. The wrong pick is
    // a sibling word's gloss — the pool is the family's own glosses,
    // so "good morning" is a real distractor for the first word.
    await answer(app, WORDS[1]?.gloss ?? "", false);
    await advance(app, false);
    // Wrong pick: the runner reveals the right answer; answering the
    // same content again in the SAME group is what retries collapse —
    // this journey does not retry, the miss stands.
    for (const [i, w] of WORDS.entries()) {
      if (i === 0) continue; // the miss was already taken above
      await answer(app, w.gloss);
      await advance(app, i === WORDS.length - 1);
    }
    await app.settle();
    await dismissSummary(app);

    const line = document.querySelector('[data-testid="path-capstone-result"]');
    if (!line) throw new Error("a recorded-but-failed review reached Home without its fact line");
    expect(line.textContent).toContain("Section review recorded — 3 of 4 recalled");
    expect(line.textContent).toContain("Not passed yet");
    expect(line.textContent).not.toMatch(/bad luck|so close|keep it up|😊/i);

    // The node now says in-progress: the action comes back renamed —
    // the path shows the ATTEMPT, never a fake completion.
    const again = app.button(app.section("Your path"), "Run the section review again");
    expect(again.getAttribute("data-testid")).toBe(START_TESTID);
    expect(document.querySelector(`[data-testid="${RECORDED_TESTID}"]`)).toBeNull();
  }, 30_000);
});
