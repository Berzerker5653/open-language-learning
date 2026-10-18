/**
 * RU-MODALITY-PRACTICE-001 — every declared RU modality is served by its
 * named runner, and speaking stays formative end to end.
 *
 * The learner works the RU style-register unit the way Home offers it: the
 * lesson names the runner behind each of unit 818's five declared stages —
 * the real set from languages/ru-RU/curriculum/units/
 * 818-b2j-style-revision.yaml, every one runnable — listening plays the
 * pack's own reference audio (media/manifest.jsonl, model-output) and
 * answers with the pack's glosses, writing types a cloze, and speaking
 * opens a guided card with no submit, no verdict, and no score. The spoken
 * check answers with the engine's own abstention — this machine has no
 * speech aligner — never a match verdict, and the recording never reaches
 * `practice_submit`: the call log and the plan text prove nothing was
 * scored. The only thing replaced is the engine under the IPC boundary;
 * the harness answers mirror lib.rs.
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

/** The sentence the speaking stage shows (ru.sent.b2.j3, unit 818). */
const RU_SENTENCE = "Перед отправкой письма сверьте цифры: опечатка меняет смысл.";

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

/** Open the plan row's activity through the authored lesson. */
async function startActivity(app: Mounted, verb: string): Promise<HTMLElement> {
  await app.click(planRow(app, verb));
  const lesson = app.section("Lesson");
  await app.click(app.button(lesson, "Start practising"));
  return app.section("Practice");
}

describe("RU modalities are served by their named runners (RU-MODALITY-PRACTICE-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("runs encounter, listening, writing, and guided-speaking honestly", async () => {
    grantMicrophone();
    const engine = new LearnerEngine({
      profiles: [{ id: "katya", display_name: "Katya", active: RU, micEnabled: true }],
      installed: [RU],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Katya"));

    // Home: every RU plan row is startable, and each row's verb names the
    // runner that will serve it — including the review rows, which carry
    // the only dimensions the scheduler can hold RU evidence for
    // (production-writing, recall-meaning). RU declares no
    // comprehension-reading evidence, so nothing here pretends otherwise:
    // the inert "no practice runner" row stays a measured ja-JP fact.
    expect(app.text('[aria-label="Practice"] h1')).toBe("Hi Katya");
    expect(planRow(app, "Say it aloud")).toBeTruthy();
    expect(planRow(app, "Listen")).toBeTruthy();
    expect(planRow(app, "Write it")).toBeTruthy();
    const review = app.section("Keep it sticking");
    expect(planRow(app, "Write it", "Keep it sticking")).toBeTruthy();
    expect(planRow(app, "Recall", "Keep it sticking")).toBeTruthy();
    expect(review.textContent).not.toContain("no practice runner for this yet");

    // The authored lesson names the runner that serves each of unit 818's
    // five declared stages — the pair-level coverage the lesson view reads
    // straight off the engine's `activity_runner` table.
    await app.click(planRow(app, "Listen"));
    const lesson = app.section("Lesson");
    expect(lesson.querySelector("h1")?.textContent).toBe("Повтор: правка и отправка");
    expect(lesson.textContent).toContain(
      "Посмотрите, пожалуйста, третий абзац и исправьте ошибку.",
    );
    for (const [stage, runner] of [
      ["ru.activity.b2.u818-grammar", "encounter"],
      ["ru.activity.b2.u818-cloze", "cloze"],
      ["ru.activity.b2.u818-write", "typed"],
      ["ru.activity.b2.u818-listen", "comprehension-listening"],
      ["ru.activity.b2.u818-speak", "guided-speaking"],
    ]) {
      const el = lesson.querySelector(`[data-stage="${stage}"]`);
      if (!el) throw new Error(`the lesson rendered no stage "${stage}"`);
      expect(el.getAttribute("data-runner")).toBe(runner);
      expect(el.textContent).toContain(`Served by the ${runner} runner.`);
    }
    // The grammar encounter teaches with the pack's own concept rows, not
    // an explanation the app invents.
    expect(lesson.textContent).toContain("Вы-form commands: -ите imperatives");
    expect(lesson.textContent).toContain("Prefixed result nouns:");

    // The listening stage: the comprehension-listening runner offers the
    // pack's glosses as choices, with the transcript hidden, and plays the
    // reference recording the pack's media manifest declares for the item.
    const plays = trackAudioPlayback();
    await app.click(app.button(lesson, "Start practising"));
    const listening = app.section("Practice");
    expect(listening.querySelector("h2")?.textContent).toBe("What did you hear?");
    expect(listening.textContent).toContain("synthesized voice (model output)");
    await app.click(app.button(listening, "Play"));
    expect(plays()).toBeGreaterThan(0);
    expect(listening.textContent).not.toContain("сверьте цифры");
    await app.click(
      app.button(app.section("Choices"), "Please sign the last page and check the annotations."),
    );
    expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
    const listeningSubmit = engine.lastArgsFor("practice_submit");
    expect(listeningSubmit).toMatchObject({
      contentId: "ru.sent.b2.j2",
      modality: "comprehension-listening",
    });
    await app.click(app.button(listening, "Back to plan"));

    // The writing stage: the typed cloze, target blanked, choices absent.
    const writing = await startActivity(app, "Write it");
    expect(writing.querySelector("h2")?.textContent).toBe("Fill in the blank");
    expect(writing.textContent).toContain("______, пожалуйста, последнюю страницу");
    expect(writing.querySelector('[aria-label="Choices"]')).toBeNull();
    const answer = document.querySelector<HTMLInputElement>("#practice-answer");
    if (!answer) throw new Error("the writing stage rendered no typed input");
    await app.type(answer, "Подпишите");
    await app.click(app.button(writing, "Check"));
    expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
    expect(engine.lastArgsFor("practice_submit")).toMatchObject({
      contentId: "ru.sent.b2.j2",
      modality: "production-writing",
    });
    await app.click(app.button(app.section("Practice"), "Back to plan"));

    // The speaking stage: the guided-speaking card. Baseline the home text
    // so the end of the stage can prove nothing about mastery moved.
    const homeBefore = app.text('[aria-label="Practice"]');
    const speaking = await startActivity(app, "Say it aloud");

    // The declared sentence, with the pack's own reference audio offered —
    // and no submit, no verdict, no score.
    expect(speaking.querySelector("h2")?.textContent).toBe("Say the sentence aloud");
    expect(speaking.textContent).toContain(RU_SENTENCE);
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
    expect(attempt.target_text).toBe(RU_SENTENCE);
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
  });
});
