/**
 * UPPERBAND-TASK-JOURNEYS-001 — one RU upper-band task_sequence really
 * runs end to end at the learner surface.
 *
 * The learner works the a2 past-events sequence the A2 goal
 * `ru.goal.a2.past-events` claims through ADR-0037's pack-declared
 * task_sequence — input, scaffolded response, independent response,
 * changed context — the way Home offers it: unit 810's lesson names the
 * runner behind each of its six declared stages (the real set from
 * languages/ru-RU/curriculum/units/810-a2j-past-day.yaml), the scaffolded
 * cloze blanks the pack's first declared cloze target and the independent
 * writing stage is a typed card the app scores, while the independent
 * speaking stage opens a guided card with no submit, no verdict and no
 * score (ADR-0017): the recording answers with the engine's own
 * abstention — this machine has no speech aligner — and never reaches
 * `practice_submit`. The changed-context unit 811 (811-a2j-past-workday.
 * yaml) is the plan the new sentence receives, and its guided-speaking
 * stage carries both the new sentence and the one already met. The
 * delayed-reuse unit 812 is phase-gated (`requires_unit: jpast-01` at
 * `supported`) and is never asked to be planned here. The fixture mirrors
 * the shipped pack: sentences/journeys-2026-10-14.jsonl rows 1-3,
 * lexicon/pastevents.jsonl, and grammar/concepts.jsonl rows 26, 27 and
 * 166. The only thing replaced is the engine under the IPC boundary; the
 * harness answers mirror lib.rs.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  RU,
  LearnerEngine,
  grantMicrophone,
  mountApp,
  trackAudioPlayback,
  type Mounted,
} from "./harness";

/** The sentence unit 810 opens the sequence with (`ru.sent.a2.j1`). */
const J1 = "Вчера вечером мы были в театре, а потом ужинали дома.";

/** The changed-context sentence of unit 811 (`ru.sent.a2.j3`). */
const J3 = "Утром она была на работе, а вечером писала письма.";

/** The startable plan row in `group` whose verb (the RUNNABLE_MODALITIES
 * label) names the runner that will serve it. */
function planRow(app: Mounted, verb: string, group = "First look"): HTMLButtonElement {
  const scope = app.section(group);
  const found = [...scope.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(verb),
  );
  if (!found) throw new Error(`"${group}" offers no row whose action is "${verb}"`);
  return found as HTMLButtonElement;
}

/** The plan row presenting `text` — how the changed-context sentence's row
 * is picked when two rows share one verb. */
function planRowFor(app: Mounted, text: string, group = "First look"): HTMLButtonElement {
  const scope = app.section(group);
  const found = [...scope.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(text),
  );
  if (!found) throw new Error(`"${group}" offers no row presenting "${text}"`);
  return found as HTMLButtonElement;
}

/** Open the plan row's activity through the authored lesson. */
async function startActivity(app: Mounted, row: HTMLButtonElement): Promise<HTMLElement> {
  await app.click(row);
  const lesson = app.section("Lesson");
  await app.click(app.button(lesson, "Start practising"));
  return app.section("Practice");
}

/** Every rendered stage names the runner the engine's `activity_runner`
 * table answers for its declared pair — the pair-level coverage the
 * lesson view reads straight off the engine. */
function expectRunners(lesson: HTMLElement, runners: [string, string][]): void {
  for (const [stage, runner] of runners) {
    const el = lesson.querySelector(`[data-stage="${stage}"]`);
    if (!el) throw new Error(`the lesson rendered no stage "${stage}"`);
    expect(el.getAttribute("data-runner")).toBe(runner);
    expect(el.textContent).toContain(`Served by the ${runner} runner.`);
  }
}

describe("one RU upper-band task_sequence runs end to end (UPPERBAND-TASK-JOURNEYS-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("runs the a2 past-events sequence with the speaking stage guided-only", async () => {
    grantMicrophone();
    const engine = new LearnerEngine({
      profiles: [
        {
          id: "lena",
          display_name: "Lena",
          active: RU,
          micEnabled: true,
          // The sequence as the pack's task_sequence puts it on the plan:
          // the unit-810 sentence through listening, writing and speaking,
          // plus the changed-context sentence's speaking row. Same row
          // shape as the pack's fixture schedule, goal `past-events`.
          schedule: [
            {
              content_id: "ru.sent.a2.j1",
              modality: "comprehension-listening",
              reason: "progression",
              kind: "introduction",
              est_seconds: 60,
              goal: "past-events",
            },
            {
              content_id: "ru.sent.a2.j1",
              modality: "production-writing",
              reason: "progression",
              kind: "introduction",
              est_seconds: 90,
              goal: "past-events",
            },
            {
              content_id: "ru.sent.a2.j1",
              modality: "production-speaking",
              reason: "progression",
              kind: "introduction",
              est_seconds: 45,
              goal: "past-events",
            },
            {
              content_id: "ru.sent.a2.j3",
              modality: "production-speaking",
              reason: "progression",
              kind: "introduction",
              est_seconds: 45,
              goal: "past-events",
            },
          ],
        },
      ],
      installed: [RU],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Lena"));

    // Home: every sequence row is startable, and each row's verb names the
    // runner that will serve it.
    expect(app.text('[aria-label="Practice"] h1')).toBe("Hi Lena");
    expect(planRow(app, "Listen")).toBeTruthy();
    expect(planRow(app, "Write it")).toBeTruthy();
    expect(planRow(app, "Say it aloud")).toBeTruthy();
    expect(planRowFor(app, J3)).toBeTruthy();

    // The plan the app receives for `ru.sent.a2.j1` is unit 810: the
    // lesson_plan call the engine answered asked for that content id, and
    // what rendered is the pack's own unit (`ru.unit.a2.jpast-01`, goal
    // `ru.goal.a2.past-events`) — title and summary are its declared
    // strings — naming the runner behind each of its six declared stages.
    await app.click(planRow(app, "Write it"));
    const lesson = app.section("Lesson");
    expect(engine.lastArgsFor("lesson_plan")).toMatchObject({ contentId: "ru.sent.a2.j1" });
    expect(lesson.querySelector("h1")?.textContent).toBe("Вчера и в прошлом году");
    expect(lesson.textContent).toContain(
      "были, ужинали, ездил, гулял и ходил — рассказ о завершённом вчерашнем дне.",
    );
    expectRunners(lesson, [
      ["ru.activity.a2.u810-read", "encounter"],
      ["ru.activity.a2.u810-grammar", "encounter"],
      ["ru.activity.a2.u810-cloze", "cloze"],
      ["ru.activity.a2.u810-write", "typed"],
      ["ru.activity.a2.u810-listen", "comprehension-listening"],
      ["ru.activity.a2.u810-speak", "guided-speaking"],
    ]);

    // The input stage presents the sentence the sequence runs on, and the
    // grammar stage teaches with the pack's own concept rows, not an
    // explanation the app invents.
    const input = lesson.querySelector('[data-stage="ru.activity.a2.u810-read"]');
    if (!input) throw new Error("unit 810 rendered no input stage");
    expect(input.textContent).toContain(J1);
    expect(lesson.textContent).toContain("Past tense");
    expect(lesson.textContent).toContain("ходил / ездил for past 'went (and came back)'");
    expect(lesson.textContent).toContain("Time sequence connectors");

    // The scaffolded cloze blanks the pack's first declared target of the
    // row (`были`), and the independent writing stage is a typed card the
    // app scores: choices absent, answer typed, verdict graded — the
    // contrast with the speaking stage below is this `Check` control.
    await app.click(app.button(lesson, "Start practising"));
    const writing = app.section("Practice");
    expect(writing.querySelector("h2")?.textContent).toBe("Fill in the blank");
    expect(writing.textContent).toContain(
      "Вчера вечером мы ______ в театре, а потом ужинали дома.",
    );
    expect(writing.querySelector('[aria-label="Choices"]')).toBeNull();
    const answer = document.querySelector<HTMLInputElement>("#practice-answer");
    if (!answer) throw new Error("the writing stage rendered no typed input");
    await app.type(answer, "были");
    await app.click(app.button(writing, "Check"));
    expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
    expect(engine.lastArgsFor("practice_submit")).toMatchObject({
      contentId: "ru.sent.a2.j1",
      modality: "production-writing",
    });
    await app.click(app.button(app.section("Practice"), "Back to plan"));

    // The listening stage of the same input: the pack's own reference
    // recording plays, the pack's glosses are the choices, and the
    // transcript stays hidden.
    const plays = trackAudioPlayback();
    const listening = await startActivity(app, planRow(app, "Listen"));
    expect(listening.querySelector("h2")?.textContent).toBe("What did you hear?");
    expect(listening.textContent).toContain("synthesized voice (model output)");
    await app.click(app.button(listening, "Play"));
    expect(plays()).toBeGreaterThan(0);
    expect(listening.textContent).not.toContain("Вчера вечером");
    await app.click(
      app.button(
        app.section("Choices"),
        "Yesterday evening we were at the theatre, and then we had dinner at home.",
      ),
    );
    expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
    expect(engine.lastArgsFor("practice_submit")).toMatchObject({
      contentId: "ru.sent.a2.j1",
      modality: "comprehension-listening",
    });
    await app.click(app.button(app.section("Practice"), "Back to plan"));

    // The independent speaking stage (`retrieval`/`speaking`, unit 810's
    // transfer ride). Baseline the home text so the end of the stage can
    // prove nothing about mastery moved.
    const homeBefore = app.text('[aria-label="Practice"]');
    const speaking = await startActivity(app, planRow(app, "Say it aloud"));

    // The declared sentence, with the pack's own reference audio offered —
    // and no submit, no verdict, no score.
    expect(speaking.querySelector("h2")?.textContent).toBe("Say the sentence aloud");
    expect(speaking.textContent).toContain(J1);
    expect(app.button(speaking, "Play the sentence")).toBeTruthy();
    expect(speaking.querySelector('[aria-label="Choices"]')).toBeNull();
    const labels = [...speaking.querySelectorAll("button")].map((b) =>
      (b.textContent ?? "").trim(),
    );
    expect(labels).not.toContain("Check");
    expect(speaking.querySelector(".verdict")).toBeNull();
    expect((speaking.querySelector('[aria-live="polite"]')?.textContent ?? "").trim()).toBe("");
    expect(speaking.textContent).not.toContain("Correct");
    expect(speaking.textContent).not.toMatch(/\d+\s*\/\s*\d+|\d+\s*%/);

    // Speak along for real: the shipped capture path records, and the clip
    // goes to dictation_check with the card's own surface as the target.
    await app.click(app.button(speaking, "Record yourself"));
    await app.settle();
    await app.click(app.button(speaking, "Stop"));

    const check = engine.lastArgsFor("dictation_check");
    const attempt = (check?.attempt ?? {}) as Record<string, unknown>;
    expect(attempt.pack_id).toBe(RU);
    expect(attempt.target_text).toBe(J1);
    expect(typeof attempt.wav_b64).toBe("string");
    expect((attempt.wav_b64 as string).length).toBeGreaterThan(0);

    // The card answers with the abstention, naming the missing capability —
    // this machine has no speech aligner — and never a match verdict.
    const notice = speaking.querySelector('[data-testid="speak-check"]');
    if (!notice) throw new Error("the guided card rendered no spoken-check notice");
    expect(notice.textContent).toContain("abstained");
    expect(notice.textContent).toContain("aligner-unavailable");
    expect(notice.textContent).not.toMatch(/matched|not quite|correct|wrong/i);
    expect(speaking.querySelector(".verdict")).toBeNull();
    expect(speaking.textContent).toContain(
      "Speaking practice is formative: it is not scored, and it never counts toward mastery.",
    );

    // Across the whole speaking stage the app never sent a practice_submit
    // for it, and the plan a learner reads back is word for word what it
    // was — no score, no mastery movement.
    expect(
      engine
        .appCalls()
        .filter((c) => c.cmd === "practice_submit" && c.args.modality === "production-speaking"),
    ).toHaveLength(0);
    await app.click(app.button(app.section("Routes"), "Today"));
    expect(app.text('[aria-label="Practice"]')).toBe(homeBefore);

    // Changed context: asking for the new sentence returns the
    // changed-context unit (`ru.unit.a2.jpast-02`), and its
    // guided-speaking stage carries BOTH the new sentence and the one
    // already met — the pack's changed-context claim at the learner
    // surface.
    await app.click(planRowFor(app, J3));
    const changed = app.section("Lesson");
    expect(engine.lastArgsFor("lesson_plan")).toMatchObject({ contentId: "ru.sent.a2.j3" });
    expect(changed.querySelector("h1")?.textContent).toBe("Вчерашний рабочий день");
    expectRunners(changed, [
      ["ru.activity.a2.u811-read", "encounter"],
      ["ru.activity.a2.u811-grammar", "encounter"],
      ["ru.activity.a2.u811-cloze", "cloze"],
      ["ru.activity.a2.u811-write", "typed"],
      ["ru.activity.a2.u811-listen", "comprehension-listening"],
      ["ru.activity.a2.u811-speak", "guided-speaking"],
    ]);
    const transfer = changed.querySelector('[data-stage="ru.activity.a2.u811-speak"]');
    if (!transfer) throw new Error("unit 811 rendered no speaking (transfer) stage");
    expect(transfer.textContent).toContain(J3);
    expect(transfer.textContent).toContain(J1);

    // The reuse unit is phase-gated, so the frontend was never asked to
    // plan it: the engine resolves a content id to the first unit
    // declaring it, and every lesson this journey received was asked for
    // by one of its own rows — only the two mirrored units could answer.
    const planned = engine
      .appCalls()
      .filter((c) => c.cmd === "lesson_plan")
      .map((c) => String(c.args.contentId));
    expect(new Set(planned)).toEqual(new Set(["ru.sent.a2.j1", "ru.sent.a2.j3"]));
  });
});
