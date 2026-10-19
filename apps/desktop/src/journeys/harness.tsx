/**
 * JOURNEY-SUITE-001: the harness the mounted learner journeys run on.
 *
 * App.tsx reaches the engine through one seam: `detectInvoke()` probes
 * `window.__TAURI_INTERNALS__`, and when it is present every command goes
 * through `@tauri-apps/api/core`'s `invoke`, which calls that object's own
 * `invoke(cmd, args, options)`. Installing that object is the whole contract,
 * so the shipped `<App/>` mounts under React 19 against a real DOM with no
 * production-side test hook: the journeys below click the same controls a
 * learner clicks and read the same text a learner reads.
 *
 * `LearnerEngine` is a state machine over the commands App.tsx actually
 * issues (names and payload shapes taken from its call sites), not an echo
 * chamber: installing a pack moves it into `installed_packs`, a switch changes
 * what `active_pack` answers, an attempt counts as a recorded event, and a
 * restore reads back the JSON bundle the export wrote. A command nobody
 * implements fails loudly instead of answering `null`.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "../App";
import type { PackCandidate, ProfileSummary } from "../onboarding";
import type {
  NextGoalView,
  PlannedItem,
  SessionPlan,
  WorldEnvironment,
  FirstRunStep,
} from "../home";
import type {
  AlignerStatus,
  CatalogEntry,
  DeviceTier,
  InstalledPack,
  PackClaims,
} from "../language";
import type { DictationResult, DictationSentence } from "../dictation";
import type { PracticeTaskView } from "../practice";
import type { LessonContent, LessonPlan } from "../lesson";
import type { DisplaySettingsView } from "../stress";
import type { BuildIdentity, ImportOutcome, ImportPreview } from "../settings";
import type { RomajiMode } from "../settings";

/** React 19 refuses `act` unless the host says the environment supports it. */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The engine's fixed "this profile has no language chosen" token (App.tsx
 * PACK_ABSENCE_TOKENS); the app translates it into the sentence it shows. */
const NO_PACK_TOKEN = "no active language pack";

export const JA = "org.openlanguage.ja-jp.reference";
const EO = "org.openlanguage.eo-demo";
/** RU-MODALITY-PRACTICE-001: the RU pack the modality journeys run on.
 * The catalog entry mirrors the shipped pack verbatim: id, display name,
 * version, and maturity are `languages/ru-RU/manifest.yaml`'s own values
 * (`org.openlanguage.ru-ru.reference`, "Russian Reference Pack", 0.4.2,
 * experimental), and the content ids are the real ones from
 * languages/ru-RU/curriculum/units/818-b2j-style-revision.yaml (unit
 * `ru.unit.b2.jstyle-03`, goal `ru.goal.b2.style-register`, sentences
 * `ru.sent.b2.j1`..`j4`). For UPPERBAND-TASK-JOURNEYS-001 the fixture
 * also mirrors the a2 past-events sentences, lexicon rows, grammar
 * concepts and unit lessons from curriculum/units/810-a2j-past-day.yaml,
 * 811-a2j-past-workday.yaml, sentences/journeys-2026-10-14.jsonl,
 * lexicon/pastevents.jsonl and grammar/concepts.jsonl. */
export const RU = "org.openlanguage.ru-ru.reference";

/** The RU sentences the fixture declares: shared by the pack's sentence
 * list, the lesson fixture, and the `practice_task` answer spaces — one
 * source for the declared data, as one file is for a real pack. */
const RU_SENTENCES: DictationSentence[] = [
  {
    id: "ru.sent.b2.j1",
    text: "Посмотрите, пожалуйста, третий абзац и исправьте ошибку.",
    reading: "Посмотрите, пожалуйста, третий абзац и исправьте ошибку.",
    gloss: "Please look at the third paragraph and correct the mistake.",
  },
  {
    id: "ru.sent.b2.j2",
    text: "Подпишите, пожалуйста, последнюю страницу и сверьте надписи.",
    reading: "Подпишите, пожалуйста, последнюю страницу и сверьте надписи.",
    gloss: "Please sign the last page and check the annotations.",
  },
  {
    id: "ru.sent.b2.j3",
    text: "Перед отправкой письма сверьте цифры: опечатка меняет смысл.",
    reading: "Перед отправкой письма сверьте цифры: опечатка меняет смысл.",
    gloss: "Before sending the letter, check the figures: a typo changes the meaning.",
  },
  {
    id: "ru.sent.b2.j4",
    text: "Прежде чем отвечать на письмо, уточните форму обращения.",
    reading: "Прежде чем отвечать на письмо, уточните форму обращения.",
    gloss: "Before replying to the letter, check the form of address.",
  },
  {
    id: "ru.sent.a2.j1",
    text: "Вчера вечером мы были в театре, а потом ужинали дома.",
    reading: "Вчера вечером мы были в театре, а потом ужинали дома.",
    gloss: "Yesterday evening we were at the theatre, and then we had dinner at home.",
  },
  {
    id: "ru.sent.a2.j2",
    text: "В прошлом году я ездил в Москву и много гулял.",
    reading: "В прошлом году я ездил в Москву и много гулял.",
    gloss: "Last year I went to Moscow (and came back) and walked a lot.",
  },
  {
    id: "ru.sent.a2.j3",
    text: "Утром она была на работе, а вечером писала письма.",
    reading: "Утром она была на работе, а вечером писала письма.",
    gloss: "In the morning she was at work, and in the evening she wrote letters.",
  },
];

/** The resolved content `lesson_plan_at` hands back for the ids one
 * activity declares (lib.rs: every content ref becomes a LessonContent). */
const ruLessonContent = (...ids: string[]): LessonContent[] =>
  ids.map((id) => {
    const s = RU_SENTENCES.find((x) => x.id === id)!;
    return {
      content_id: s.id,
      kind: "sentence",
      display: s.text,
      reading: s.reading,
      gloss: s.gloss,
    };
  });

/** The two lexicon rows unit 818 declares, verbatim from
 * `languages/ru-RU/lexicon/style4.jsonl` (`ru.lex.style.nadpiska`,
 * `ru.lex.style.sveryat`). */
const RU_LEXICON = [
  {
    id: "ru.lex.style.nadpiska",
    surface: "надписка",
    reading: "надпи́ска",
    gloss: "inscription, overwriting",
  },
  {
    id: "ru.lex.style.sveryat",
    surface: "сверять",
    reading: "сверя́ть",
    gloss: "to check against, collate",
  },
];

/** The three past-events lexicon rows the upper-band fixture mirrors,
 * verbatim from `languages/ru-RU/lexicon/pastevents.jsonl`
 * (`ru.lex.pastevents.vchera`, `ru.lex.pastevents.byli`,
 * `ru.lex.pastevents.gulyat`). A sibling of `RU_LEXICON`, never merged
 * into it: `RU_LEXICON`'s glosses are unit 818's choice pool, and this
 * family pools only its own three glosses, each row answering itself. */
const RU_PASTEVENTS_LEXICON = [
  {
    id: "ru.lex.pastevents.vchera",
    surface: "вчера",
    reading: "вчера́",
    gloss: "yesterday",
  },
  {
    id: "ru.lex.pastevents.byli",
    surface: "были",
    reading: "бы́ли",
    gloss: "were",
  },
  {
    id: "ru.lex.pastevents.gulyat",
    surface: "гулять",
    reading: "гуля́ть",
    gloss: "to walk",
  },
  {
    id: "ru.lex.pastevents.byla",
    surface: "была",
    reading: "была́",
    gloss: "was (f)",
  },
  {
    id: "ru.lex.pastevents.rabotal",
    surface: "работать",
    reading: "рабо́тать",
    gloss: "to work",
  },
];

/** The RU lexicon family the placement journey runs against, verbatim from
 * `languages/ru-RU/lexicon/greetings.jsonl` (first four rows). A third
 * sibling family: its glosses pool only among themselves. */
const RU_GREETINGS_LEXICON = [
  {
    id: "ru.lex.greetings.zdravstvuyte",
    surface: "здравствуйте",
    reading: "здра́вствуйте",
    gloss: "hello (polite greeting)",
  },
  {
    id: "ru.lex.greetings.dobroe-utro",
    surface: "доброе утро",
    reading: "до́брое у́тро",
    gloss: "good morning",
  },
  {
    id: "ru.lex.greetings.dobryy-den",
    surface: "добрый день",
    reading: "до́брый день",
    gloss: "good afternoon; good day",
  },
  {
    id: "ru.lex.greetings.dobryy-vecher",
    surface: "добрый вечер",
    reading: "до́брый ве́чер",
    gloss: "good evening",
  },
];

/** Placement for the RU pack, mirrored from the engine's measured answers on
 * the pinned reference pack — lib.rs
 * `the_russian_reference_packs_first_placement_question_builds` pins the
 * eight-pair plan and the abstention reasons there. This fixture mirrors
 * only the pairs it carries content for: the FIRST planned pair, plus the
 * two abstentions that test renders must show, with the engine's own
 * machine-readable reason strings. */
const RU_PLACEMENT_PLAN = [
  {
    assessment_id: "ru.assess.on-ramp.greetings-recognition",
    goal_id: "ru.goal.on-ramp.greetings",
    content_id: "ru.lex.greetings.zdravstvuyte",
    modality: "recall-meaning",
  },
];
const RU_PLACEMENT_COVERAGE = [
  {
    assessment_id: "ru.assess.on-ramp.greetings-recognition",
    goal_id: "ru.goal.on-ramp.greetings",
    status: "planned",
  },
  {
    assessment_id: "ru.assess.on-ramp.cyrillic-recognition",
    goal_id: "ru.goal.on-ramp.cyrillic",
    status: "modality-unsupported",
    reason: "builder-refused:recall-meaning:ru.orth.cyrillic.a-upper:unknown practice target",
  },
  {
    assessment_id: "ru.assess.on-ramp.greetings-writing",
    goal_id: "ru.goal.on-ramp.greetings",
    status: "no-runner",
    reason: "no-auto-runner-for-assessment-modality:writing",
  },
];
/** The grammar concepts the fixtures mirror, verbatim (name and
 * definition) from `languages/ru-RU/grammar/concepts.jsonl`: unit 818's
 * two, then the past-events unit's three (rows 26, 27 and 166). */
const RU_GRAMMAR = [
  {
    id: "ru.grammar.b2.imperative-vy-forms",
    name: "Вы-form commands: -ите imperatives",
    definition:
      "Polite requests to one person addressed as Вы use the -ите imperative: посмотрите, подпишите, сверьте, уточните, and with a prefix such as по-: посмотрите. The same verb in the informal ты form ends in -и/-ь (посмотри), which is appropriate only where ты address fits; mixing the forms is a register error, not a grammar error. Add пожалуйста for courtesy; перед отправкой/сверьте belong to written workflow phrasing.",
  },
  {
    id: "ru.grammar.b2.prefixed-noun-forms",
    name: "Prefixed result nouns: запись, надписка, переписка",
    definition:
      "Russian forms result/action nouns from prefixed verbs with the -к suffix: записать → запись (an entry, a record), надписать → надписка (an overwriting, an inscription), переписать → переписка (correspondence). The prefix changes meaning in ways a learner cannot always predict, so each noun needs its own dictionary check; glosses here are working labels.",
  },
  {
    id: "ru.grammar.a2.past-tense",
    name: "Past tense",
    definition:
      "Past tense uses the -л ending agreeing in gender: я читал, она читала, оно было, они были. Learn the supplied past forms as given; do not invent new stems.",
  },
  {
    id: "ru.grammar.a2.time-connectors",
    name: "Time sequence connectors",
    definition:
      "Sequence events with сначала (first), потом (then) and потом again; place vchera or segodnya at the start: Сначала работа, потом встреча. Do not decline these connectors.",
  },
  {
    id: "ru.grammar.a2.past-motion-hodil",
    name: "ходил / ездил for past 'went (and came back)'",
    definition:
      "For a completed visit one usually uses был/была + place, or the past of the indeterminate motion verbs ходить/ездить: вчера я ходил в театр, в прошлом году я ездил в Москву. These forms imply the round trip is over; the direction-specific пошёл/поехал describe the departure and need their own lesson. Learn the supplied forms as given.",
  },
];

/** How lib.rs's grammar resolve shapes a grammar content ref: the concept's
 * name as display, its definition as explanation, no reading and no gloss. */
const ruGrammarContent = (...ids: string[]): LessonContent[] =>
  RU_GRAMMAR.filter((g) => ids.includes(g.id)).map((g) => ({
    content_id: g.id,
    kind: "grammar",
    display: g.name,
    explanation: g.definition,
  }));

/** How it shapes a lexicon ref: surface, reading, and gloss together. */
const ruLexiconContent = (...ids: string[]): LessonContent[] =>
  [...RU_LEXICON, ...RU_PASTEVENTS_LEXICON]
    .filter((w) => ids.includes(w.id))
    .map((w) => ({
      content_id: w.id,
      kind: "lexicon",
      display: w.surface,
      reading: w.reading,
      gloss: w.gloss,
    }));

/** The bytes the RU media answers stand in for. The shipped pack declares
 * these four assets in `languages/ru-RU/media/manifest.jsonl` (one of 4856
 * rows, every one of them `provenance: model-output`, synthesizer
 * `qwen3-tts`), but the generated `.wav` files are gitignored — the fixture
 * answers the row's shape (24 kHz mono PCM WAV base64), not 5.9 seconds of
 * qwen3-tts output. */
const RU_MEDIA_WAV_B64 = (() => {
  const sampleRate = 24000;
  const samples = 2400;
  const bytes = 44 + samples * 2;
  const buf = new ArrayBuffer(bytes);
  const view = new DataView(buf);
  const tag = (at: number, text: string) => {
    for (let i = 0; i < 4; i++) view.setUint8(at + i, text.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    view.setInt16(44 + i * 2, Math.round(Math.sin(i / 10) * 8000), true);
  }
  const bytes8 = new Uint8Array(buf);
  return btoa(String.fromCharCode(...Array.from(bytes8)));
})();

type Call = { cmd: string; args: Record<string, unknown> };

interface Word {
  id: string;
  surface: string;
  reading: string;
  gloss: string;
  choices: string[];
  answer: number;
}

interface Scheduled {
  content_id: string;
  modality: string;
  reason: PlannedItem["reason"];
  kind: PlannedItem["kind"];
  est_seconds: number;
  goal: string;
}

interface Pack {
  id: string;
  version: string;
  display_name: string;
  locale: string;
  maturity: string;
  trust_state: string;
  rtl: boolean;
  /** Whether the pack carries character data — the engine's `kanji_available`
   * answer, and the only thing that decides if the hub shows the Kanji card. */
  kanji: boolean;
  /** The cards `kanji_list` hands the drill: empty when the pack teaches no
   * characters — the same fact `kanji_available` reports. */
  drills: {
    id: string;
    character: string;
    radicals: string[];
    /** The choice pool lib.rs `kanji_task_build` draws on: meanings for a
     * meaning drill, readings for a reading drill. */
    meanings: string[];
    readings: string[];
    mnemonic: string | null;
    status: string;
  }[];
  words: Word[];
  schedule: Scheduled[];
  sentences: DictationSentence[];
  writing: { item_id: string; prompt_text: string; answer_reading: string; answer_romaji: string };
  contrast: {
    short_unit: string;
    long_unit: string;
    short_text: string;
    long_text: string;
    contrast_id: string;
    feature_id: string;
    description: string;
    measure: string | null;
  } | null;
  /** The authored unit lessons this pack hands `lesson_plan`, in pack
   * order: `lesson_plan` answers a content id with the FIRST lesson whose
   * stage content declares it — mirroring `lesson_plan_at` in lib.rs,
   * which resolves a content id to the first unit declaring it — and only
   * when none of them does does the word-shaped fallback answer run.
   * Empty when the pack's fixture carries no authored unit. */
  lessons: LessonPlan[];
  /** Pack-declared cloze targets per sentence id, mirrored from the real
   * pack's `cloze_targets`; the first is the target the typed cloze blanks. */
  clozeTargets: Record<string, string[]>;
}

const PACKS: Record<string, Pack> = {
  [JA]: {
    id: JA,
    version: "0.4.0",
    display_name: "Japanese — reference lexicon (EDRDG-derived)",
    locale: "ja-JP",
    maturity: "community",
    trust_state: "community",
    rtl: false,
    kanji: true,
    drills: [
      // The three shapes the shipped ja-JP pack actually contains: a list of
      // parts (祖母), a character listed as its own only element (一), and a
      // list of writing strokes (八 -> ハ). See docs/03 on the drill's rule.
      {
        id: "ja.kan.demo.obaasan",
        character: "祖母",
        radicals: ["女", "亻", "木"],
        meanings: ["grandmother"],
        readings: ["そぼ"],
        mnemonic: null,
        status: "new",
      },
      {
        id: "ja.kan.demo.ichi",
        character: "一",
        radicals: ["一"],
        meanings: ["one"],
        readings: ["いち"],
        mnemonic: null,
        status: "new",
      },
      {
        id: "ja.kan.demo.hachi",
        character: "八",
        radicals: ["ハ"],
        meanings: ["eight"],
        readings: ["はち"],
        mnemonic: null,
        status: "new",
      },
    ],
    words: [
      {
        id: "ja.lex.demo.hajimemashite",
        surface: "はじめまして",
        reading: "はじめまして",
        gloss: "how do you do (first meeting)",
        choices: ["how do you do (first meeting)", "aunt", "goodbye", "grandmother"],
        answer: 0,
      },
      {
        id: "ja.lex.demo.obaasan",
        surface: "おばあさん",
        reading: "おばあさん",
        gloss: "grandmother",
        choices: ["grandmother", "aunt", "hello", "I (neutral polite first person)"],
        answer: 0,
      },
    ],
    schedule: [
      {
        content_id: "ja.lex.demo.hajimemashite",
        modality: "recall-meaning",
        reason: "progression",
        kind: "introduction",
        est_seconds: 90,
        goal: "greetings",
      },
      {
        content_id: "ja.lex.demo.obaasan",
        modality: "recall-meaning",
        reason: "due-review",
        kind: "review",
        est_seconds: 60,
        goal: "family",
      },
    ],
    sentences: [
      {
        id: "ja.sent.demo.obaasan",
        text: "おばあさん",
        reading: "おばあさん",
        gloss: "grandmother",
      },
      {
        id: "ja.sent.demo.hajimemashite",
        text: "はじめまして",
        reading: "はじめまして",
        gloss: "how do you do (first meeting)",
      },
    ],
    writing: {
      item_id: "ja.lex.demo.obaasan",
      prompt_text: "Write the word for: grandmother",
      answer_reading: "おばあさん",
      answer_romaji: "obaasan",
    },
    contrast: {
      short_unit: "ja.lex.demo.obasan",
      long_unit: "ja.lex.demo.obaasan",
      short_text: "おばさん",
      long_text: "おばあさん",
      contrast_id: "ja.phon.vowel-length",
      feature_id: "ja.phon.vowel-length.ratio",
      description: "Contrastive long vowel: おばさん (aunt) vs おばあさん (grandmother)",
      measure: "voiced-duration-ratio",
    },
    lessons: [],
    clozeTargets: {},
  },
  [EO]: {
    id: EO,
    version: "0.3.0",
    display_name: "Esperanto — demo lexicon",
    locale: "eo",
    maturity: "community",
    trust_state: "community",
    rtl: false,
    kanji: false,
    drills: [],
    words: [
      {
        id: "eo.lex.demo.saluton",
        surface: "saluton",
        reading: "saluton",
        gloss: "hello",
        choices: ["hello", "thank you", "goodbye", "water"],
        answer: 0,
      },
    ],
    schedule: [
      {
        content_id: "eo.lex.demo.saluton",
        modality: "recall-meaning",
        reason: "progression",
        kind: "introduction",
        est_seconds: 30,
        goal: "greetings",
      },
    ],
    sentences: [
      { id: "eo.sent.demo.saluton", text: "Saluton!", reading: "saluton", gloss: "hello" },
      { id: "eo.sent.demo.dankon", text: "Dankon!", reading: "dankon", gloss: "thank you" },
    ],
    writing: {
      item_id: "eo.lex.demo.saluton",
      prompt_text: "Write the greeting: hello",
      answer_reading: "saluton",
      answer_romaji: "saluton",
    },
    contrast: null,
    lessons: [],
    clozeTargets: {},
  },
  [RU]: {
    id: RU,
    version: "0.4.2",
    display_name: "Russian Reference Pack",
    locale: "ru-RU",
    maturity: "experimental",
    trust_state: "community",
    rtl: false,
    kanji: false,
    drills: [],
    words: [
      ...RU_LEXICON.map((entry) => ({
        ...entry,
        // The choice pool lib.rs draws on is the pack's own glosses, never
        // invented filler; the two unit-818 rows answer for each other.
        choices: RU_LEXICON.map((x) => x.gloss),
        answer: RU_LEXICON.indexOf(entry),
      })),
      ...RU_PASTEVENTS_LEXICON.map((entry) => ({
        ...entry,
        // The past-events family pools only its own three glosses; each
        // row answers for itself.
        choices: RU_PASTEVENTS_LEXICON.map((x) => x.gloss),
        answer: RU_PASTEVENTS_LEXICON.indexOf(entry),
      })),
      ...RU_GREETINGS_LEXICON.map((entry) => ({
        ...entry,
        // Placement questions pool over the greetings family's own glosses.
        choices: RU_GREETINGS_LEXICON.map((x) => x.gloss),
        answer: RU_GREETINGS_LEXICON.indexOf(entry),
      })),
    ],
    schedule: [
      {
        content_id: "ru.sent.b2.j2",
        modality: "comprehension-listening",
        reason: "progression",
        kind: "introduction",
        est_seconds: 60,
        goal: "style-register",
      },
      {
        content_id: "ru.sent.b2.j2",
        modality: "production-writing",
        reason: "progression",
        kind: "introduction",
        est_seconds: 90,
        goal: "style-register",
      },
      {
        content_id: "ru.sent.b2.j3",
        modality: "production-speaking",
        reason: "progression",
        kind: "introduction",
        est_seconds: 45,
        goal: "style-register",
      },
      // The review rows carry dimensions the scheduler can actually hold
      // RU evidence for: production-writing (the pack scores 1,601 writing
      // stages) and recall-meaning (the 20 recall/reading stages RU
      // declares). Both have a runner, so both are startable. RU has no
      // comprehension-reading evidence at all, so that dimension — and the
      // inert "no practice runner" row it would produce — is a ja-JP fact
      // (1,560 unrunnable declared activities), not a Russian prop.
      {
        content_id: "ru.lex.style.nadpiska",
        modality: "production-writing",
        reason: "due-review",
        kind: "review",
        est_seconds: 40,
        goal: "style-register",
      },
      {
        content_id: "ru.lex.style.sveryat",
        modality: "recall-meaning",
        reason: "due-review",
        kind: "review",
        est_seconds: 30,
        goal: "style-register",
      },
    ],
    sentences: RU_SENTENCES,
    writing: {
      item_id: "ru.lex.style.nadpiska",
      prompt_text: "Write the word for: inscription, overwriting",
      answer_reading: "надписка",
      answer_romaji: "nadpiska",
    },
    contrast: null,
    // The stage sets the engine answers for this pack's authored units.
    // First unit 818's REAL five
    // (languages/ru-RU/curriculum/units/818-b2j-style-revision.yaml, ids,
    // types, modalities, and support levels verbatim), each labelled by the
    // engine's own `stage_kind` and named by its `activity_runner` table
    // (lib.rs). Every pair this unit declares has a runner — encounter-read
    // is the presentation pair the shipped RU pack declares 1609 times, and
    // the engine runs it — so, unlike the earlier fixture, there is no
    // declared-but-unrunnable stage here to fake. Then the A2 past-events
    // pair the UPPERBAND-TASK-JOURNEYS-001 journey runs: units
    // 810-a2j-past-day.yaml and 811-a2j-past-workday.yaml, every stage's
    // id, type, modality and support level verbatim from the YAML, the
    // `stage_kind` and `runner` the engine's tables (lib.rs) compute for
    // those pairs, and the content refs each activity declares resolved by
    // the fixture's own resolvers — including unit 811's two extra lexicon
    // refs (`ru.lex.pastevents.byla`, `ru.lex.pastevents.rabotal`), mirrored
    // verbatim from `languages/ru-RU/lexicon/pastevents.jsonl`, so the
    // changed-context unit resolves every ref it declares. The delayed-reuse
    // unit 812 is phase-gated
    // (`requires_unit: jpast-01 at supported`) and is NOT mirrored: no
    // frontend request may be planned from it at this surface.
    lessons: [
      {
        unit_id: "ru.unit.b2.jstyle-03",
        goal_id: "ru.goal.b2.style-register",
        title: "Повтор: правка и отправка",
        summary:
          "посмотрите, сверьте, уточните — отсроченное повторное использование регистровой правки.",
        stages: [
          {
            activity_id: "ru.activity.b2.u818-grammar",
            activity_type: "encounter-read",
            stage_kind: "encounter",
            runner: "encounter",
            modality: "reading",
            support_level: 1,
            content: ruGrammarContent(
              "ru.grammar.b2.imperative-vy-forms",
              "ru.grammar.b2.prefixed-noun-forms",
            ),
          },
          {
            activity_id: "ru.activity.b2.u818-cloze",
            activity_type: "cloze",
            stage_kind: "scaffolded",
            runner: "cloze",
            modality: "writing",
            support_level: 1,
            content: ruLessonContent("ru.sent.b2.j2", "ru.sent.b2.j4"),
          },
          {
            activity_id: "ru.activity.b2.u818-write",
            activity_type: "recall",
            stage_kind: "independent",
            runner: "typed",
            modality: "writing",
            support_level: 0,
            content: [
              ...ruLessonContent(
                "ru.sent.b2.j1",
                "ru.sent.b2.j2",
                "ru.sent.b2.j3",
                "ru.sent.b2.j4",
              ),
              ...ruLexiconContent("ru.lex.style.nadpiska", "ru.lex.style.sveryat"),
            ],
          },
          {
            activity_id: "ru.activity.b2.u818-listen",
            activity_type: "listen-and-choose",
            stage_kind: "scaffolded",
            runner: "comprehension-listening",
            modality: "listening",
            support_level: 1,
            content: ruLessonContent(
              "ru.sent.b2.j2",
              "ru.sent.b2.j4",
              "ru.sent.b2.j1",
              "ru.sent.b2.j3",
            ),
          },
          {
            activity_id: "ru.activity.b2.u818-speak",
            activity_type: "retrieval",
            stage_kind: "independent",
            runner: "guided-speaking",
            modality: "speaking",
            support_level: 0,
            content: ruLessonContent(
              "ru.sent.b2.j2",
              "ru.sent.b2.j4",
              "ru.sent.b2.j1",
              "ru.sent.b2.j3",
            ),
          },
        ],
      },
      // Unit 810 — the sequence's input, scaffolded response and
      // independent response, in the pack's declared order (read, grammar,
      // cloze, write, listen, speak).
      {
        unit_id: "ru.unit.a2.jpast-01",
        goal_id: "ru.goal.a2.past-events",
        title: "Вчера и в прошлом году",
        summary: "были, ужинали, ездил, гулял и ходил — рассказ о завершённом вчерашнем дне.",
        stages: [
          {
            activity_id: "ru.activity.a2.u810-read",
            activity_type: "encounter-read",
            stage_kind: "encounter",
            runner: "encounter",
            modality: "reading",
            support_level: 1,
            content: [
              ...ruLessonContent("ru.sent.a2.j1", "ru.sent.a2.j2"),
              ...ruLexiconContent(
                "ru.lex.pastevents.vchera",
                "ru.lex.pastevents.byli",
                "ru.lex.pastevents.gulyat",
              ),
            ],
          },
          {
            activity_id: "ru.activity.a2.u810-grammar",
            activity_type: "encounter-read",
            stage_kind: "encounter",
            runner: "encounter",
            modality: "reading",
            support_level: 1,
            content: ruGrammarContent(
              "ru.grammar.a2.past-tense",
              "ru.grammar.a2.past-motion-hodil",
              "ru.grammar.a2.time-connectors",
            ),
          },
          {
            activity_id: "ru.activity.a2.u810-cloze",
            activity_type: "cloze",
            stage_kind: "scaffolded",
            runner: "cloze",
            modality: "writing",
            support_level: 1,
            content: ruLessonContent("ru.sent.a2.j1", "ru.sent.a2.j2"),
          },
          {
            activity_id: "ru.activity.a2.u810-write",
            activity_type: "recall",
            stage_kind: "independent",
            runner: "typed",
            modality: "writing",
            support_level: 0,
            content: [
              ...ruLessonContent("ru.sent.a2.j1", "ru.sent.a2.j2"),
              ...ruLexiconContent(
                "ru.lex.pastevents.vchera",
                "ru.lex.pastevents.byli",
                "ru.lex.pastevents.gulyat",
              ),
            ],
          },
          {
            activity_id: "ru.activity.a2.u810-listen",
            activity_type: "listen-and-choose",
            stage_kind: "scaffolded",
            runner: "comprehension-listening",
            modality: "listening",
            support_level: 1,
            content: ruLessonContent("ru.sent.a2.j1", "ru.sent.a2.j2"),
          },
          {
            activity_id: "ru.activity.a2.u810-speak",
            activity_type: "retrieval",
            stage_kind: "independent",
            runner: "guided-speaking",
            modality: "speaking",
            support_level: 0,
            content: ruLessonContent("ru.sent.a2.j1", "ru.sent.a2.j2"),
          },
        ],
      },
      // Unit 811 — the changed context, same declared shape with its own
      // ids and refs.
      {
        unit_id: "ru.unit.a2.jpast-02",
        goal_id: "ru.goal.a2.past-events",
        title: "Вчерашний рабочий день",
        summary: "была на работе, писала письма — тот же вчерашний рассказ в рабочем окружении.",
        stages: [
          {
            activity_id: "ru.activity.a2.u811-read",
            activity_type: "encounter-read",
            stage_kind: "encounter",
            runner: "encounter",
            modality: "reading",
            support_level: 1,
            content: [
              ...ruLessonContent("ru.sent.a2.j3", "ru.sent.a2.j1"),
              ...ruLexiconContent("ru.lex.pastevents.byla", "ru.lex.pastevents.rabotal"),
            ],
          },
          {
            activity_id: "ru.activity.a2.u811-grammar",
            activity_type: "encounter-read",
            stage_kind: "encounter",
            runner: "encounter",
            modality: "reading",
            support_level: 1,
            content: ruGrammarContent(
              "ru.grammar.a2.past-tense",
              "ru.grammar.a2.past-motion-hodil",
            ),
          },
          {
            activity_id: "ru.activity.a2.u811-cloze",
            activity_type: "cloze",
            stage_kind: "scaffolded",
            runner: "cloze",
            modality: "writing",
            support_level: 1,
            content: ruLessonContent("ru.sent.a2.j3"),
          },
          {
            activity_id: "ru.activity.a2.u811-write",
            activity_type: "recall",
            stage_kind: "independent",
            runner: "typed",
            modality: "writing",
            support_level: 0,
            content: [
              ...ruLessonContent("ru.sent.a2.j3"),
              ...ruLexiconContent("ru.lex.pastevents.byla", "ru.lex.pastevents.rabotal"),
            ],
          },
          {
            activity_id: "ru.activity.a2.u811-listen",
            activity_type: "listen-and-choose",
            stage_kind: "scaffolded",
            runner: "comprehension-listening",
            modality: "listening",
            support_level: 1,
            content: ruLessonContent("ru.sent.a2.j3", "ru.sent.a2.j1"),
          },
          {
            activity_id: "ru.activity.a2.u811-speak",
            activity_type: "retrieval",
            stage_kind: "independent",
            runner: "guided-speaking",
            modality: "speaking",
            support_level: 0,
            content: ruLessonContent("ru.sent.a2.j3", "ru.sent.a2.j1"),
          },
        ],
      },
    ],
    // The real `cloze_targets` of the real `ru.sent` rows this fixture
    // mirrors; the typed cloze blanks the first, as the pack declares it.
    clozeTargets: {
      "ru.sent.b2.j2": ["Подпишите", "сверьте"],
      "ru.sent.a2.j1": ["были", "ужинали"],
      "ru.sent.a2.j3": ["работе", "писала"],
    },
  },
};

interface Profile {
  id: string;
  display_name: string;
  active: string | null;
  /** Pack installs attributed to this profile (the bundle's `pack_installations`). */
  installs: string[];
  schedule: Scheduled[];
  budget: number;
  micEnabled: boolean;
  romaji: RomajiMode;
  events: number;
  goals: number;
  savedWords: number;
}

/** What the caller asks the fake world to look like before the app mounts. */
type Scenario = {
  profiles?: {
    id: string;
    display_name: string;
    active?: string | null;
    micEnabled?: boolean;
    events?: number;
    savedWords?: number;
    goals?: number;
    /** The rows this profile's plan is built from, used in place of the
     * pack's fixture schedule (the constructor falls back to it). */
    schedule?: Scheduled[];
  }[];
  installed?: string[];
  /** Each listed command fails loudly on its FIRST call and answers
   * normally after: for journeys that exercise degraded-read paths. */
  failOnce?: string[];
};

export class LearnerEngine {
  /** Every command the app issued, with the payload it sent. */
  readonly calls: Call[] = [];
  /** One frozen identity: `build_identity` is a property of the binary, so
   * every read answers the same value — as it does in the real shell. */
  private readonly identity: BuildIdentity = Object.freeze({
    version: "0.4.0-alpha.1",
    commit: "snapshot",
    dirty: false,
  });
  private readonly profiles = new Map<string, Profile>();
  private readonly installed = new Map<string, InstalledPack>();
  /** The engine's export directory, as a path → bundle-JSON map. */
  private readonly files = new Map<string, string>();
  /** callbackId kept per event-listener id, so unlisten really removes it. */
  private readonly listeners = new Map<number, number>();
  private nextProfile = 1;
  /** U03: the mined partition, mirroring lib.rs — rows carry the exact view
   * fields, and `mine_grade` writes the schedule's due stamp. */
  private mineRows = new Map<
    string,
    {
      id: string;
      surface: string;
      reading: string | null;
      gloss: string | null;
      source_citation: string;
      created_at: string;
      due_at: string | null;
    }[]
  >();
  private nextMine = 1;
  private nextCallback = 1;
  private nextListener = 1;
  private readonly failOnceList: string[] = [];
  private readonly failedOnce = new Set<string>();
  speechModel = "off";
  models: {
    id: string;
    version: string;
    runtime: string;
    license_code: string;
    installed: boolean;
    installable: boolean;
    size_bytes: number;
    role: "recognition" | "synthesis";
  }[] = [
    {
      id: "org.openlanguage.speech.whisper-ggml-tiny",
      version: "1.0.0",
      runtime: "whisper.cpp",
      license_code: "MIT",
      installed: false,
      installable: true,
      size_bytes: 75693226,
      role: "recognition",
    },
  ];

  constructor(scenario: Scenario = {}) {
    this.failOnceList = scenario.failOnce ?? [];
    for (const id of scenario.installed ?? []) this.install(id);
    for (const seed of scenario.profiles ?? []) {
      const active = seed.active ?? null;
      const pack = active ? PACKS[active] : undefined;
      this.profiles.set(seed.id, {
        id: seed.id,
        display_name: seed.display_name,
        active,
        installs: active ? [active] : [],
        schedule: seed.schedule
          ? seed.schedule.map((s) => ({ ...s }))
          : pack
            ? pack.schedule.map((s) => ({ ...s }))
            : [],
        budget: 5,
        micEnabled: seed.micEnabled ?? false,
        romaji: "auto",
        events: seed.events ?? 0,
        goals: seed.goals ?? 2,
        savedWords: seed.savedWords ?? 0,
      });
      this.nextProfile = Math.max(this.nextProfile, this.profiles.size + 1);
    }
  }

  /** The bridge hands this to `@tauri-apps/api/core`; it records and routes. */
  run(cmd: string, args: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ cmd, args });
    if (this.failOnceList.includes(cmd) && !this.failedOnce.has(cmd)) {
      this.failedOnce.add(cmd);
      throw new Error(`injected failure: ${cmd}`);
    }
    return Promise.resolve(this.answer(cmd, args));
  }

  addCallback(callback: (value: unknown) => void, _once = false): number {
    const id = this.nextCallback++;
    this.callbacks.set(id, callback);
    return id;
  }

  private readonly callbacks = new Map<number, (value: unknown) => void>();

  /** Commands the app issued for a learner-facing command (Tauri's own
   * `plugin:*` bookkeeping is in `calls` too, but assertions read this). */
  appCalls(): Call[] {
    return this.calls.filter((c) => !c.cmd.startsWith("plugin:"));
  }

  argsFor(cmd: string): Record<string, unknown> | undefined {
    return this.appCalls().find((c) => c.cmd === cmd)?.args;
  }

  /** The most recent call for a command: a journey that acts twice cares
   * about the second answer. */
  lastArgsFor(cmd: string): Record<string, unknown> | undefined {
    return this.appCalls()
      .filter((c) => c.cmd === cmd)
      .at(-1)?.args;
  }

  private install(packId: string): void {
    const pack = PACKS[packId];
    if (!pack) throw new Error(`no such pack: ${packId}`);
    this.installed.set(packId, {
      pack_id: pack.id,
      version: pack.version,
      display_name: pack.display_name,
      locale: pack.locale,
      trust_state: pack.trust_state,
      rtl: pack.rtl,
    });
  }

  private profile(id: unknown): Profile {
    const p = this.profiles.get(String(id));
    if (!p) throw new Error(`no such profile: ${String(id)}`);
    return p;
  }

  /** The active pack, or the engine's own absence token — never a guessed id. */
  private activePack(p: Profile): Pack {
    if (!p.active) throw new Error(NO_PACK_TOKEN);
    const pack = PACKS[p.active];
    if (!pack) throw new Error("pack not installed");
    return pack;
  }

  /** A pack by id, with the same loud failure as every other lookup. */
  private packById(packId: string): Pack {
    const pack = PACKS[packId];
    if (!pack) throw new Error(`no such pack: ${packId}`);
    return pack;
  }

  private word(pack: Pack, contentId: string): Word | undefined {
    return pack.words.find((w) => w.id === contentId);
  }

  /** `practice_task`/`practice_submit` for a kanji content id, mirroring lib.rs
   * `kanji_task_build`: the distractors are the other characters' meanings (or
   * readings), never invented filler. */
  private drillTask(
    pack: Pack,
    card: Pack["drills"][number],
    modality: string,
  ): { view: PracticeTaskView; answer: string; choices: string[] } {
    const reading = modality === "orthography-recognition";
    const label = (c: Pack["drills"][number]): string =>
      (reading ? c.readings[0] : c.meanings[0]) ?? c.character;
    const answer = label(card);
    const choices = [
      ...new Set(
        pack.drills
          .filter((c) => c.id !== card.id)
          .map(label)
          .slice(0, 3),
      ),
      answer,
    ];
    return {
      view: {
        item_id: `${card.id}#${modality}`,
        surface: card.character,
        reading: null,
        furigana: null,
        romaji: null,
        faded_by_mastery: false,
        choices,
      },
      answer,
      choices,
    };
  }

  private plan(p: Profile, minutes = p.budget): SessionPlan {
    const pack = p.active ? PACKS[p.active] : undefined;
    const items: PlannedItem[] = p.schedule.map((s) => {
      const w = pack ? this.word(pack, s.content_id) : undefined;
      // lib.rs `build_plan_view` fills display info from lexicon AND pack
      // sentences; the RU fixture's rows are sentences.
      const sentence = pack && !w ? pack.sentences.find((x) => x.id === s.content_id) : undefined;
      return {
        item_id: `${s.content_id}#${s.modality}`,
        content_id: s.content_id,
        modality: s.modality,
        reason: s.reason,
        kind: s.kind,
        est_seconds: s.est_seconds,
        surface: w?.surface ?? sentence?.text ?? null,
        gloss: w?.gloss ?? sentence?.gloss ?? null,
      };
    });
    return {
      items,
      total_seconds: items.reduce((n, i) => n + (i.est_seconds ?? 0), 0),
      budget_minutes: minutes,
      seed: 20261014,
      planner_version: "session-planner-0.1.0",
    };
  }

  private nextGoal(p: Profile): NextGoalView | null {
    const pack = p.active ? PACKS[p.active] : undefined;
    if (!pack) return null;
    return {
      pack_id: pack.id,
      goal_id: `${pack.id}.goal.greetings`,
      description: "Greet someone and say who you are",
      band: "on-ramp",
    };
  }

  private claims(): PackClaims[] {
    return [...this.installed.values()].map((i) => {
      const pack = PACKS[i.pack_id]!;
      return {
        pack_id: pack.id,
        version: pack.version,
        trust_state: pack.trust_state,
        counts: {
          units: pack.words.length,
          goals: 2,
          assessments: 1,
          lexicon: pack.words.length,
          sentences: pack.sentences.length,
          grammar: 0,
          orthography: pack.kanji ? 4 : 0,
          kanji: pack.kanji ? 12 : 0,
          phonological_contrasts: pack.contrast ? 1 : 0,
          stories: 0,
        },
        postures: [{ kind: "lexicon", posture: "draft", count: pack.words.length }],
        provenance: [
          {
            id: "edrdg",
            title: "EDRDG word list",
            url: "https://example.invalid/edrdg",
            license: "CC-BY-SA-4.0",
            access: "2026-10-01",
          },
        ],
      };
    });
  }

  private answer(cmd: string, args: Record<string, unknown>): unknown {
    switch (cmd) {
      case "app_mode":
        return { smoke: false };
      case "build_identity":
        return this.identity;
      case "privacy_notice":
        return {
          title: "Your data stays on this device",
          points: [
            "Everything runs locally unless you enable an online provider.",
            "No account is required; profiles live on this device.",
          ],
        };
      case "list_profiles":
        return [...this.profiles.values()].map((p) => ({
          id: p.id,
          display_name: p.display_name,
        })) satisfies ProfileSummary[];
      case "create_profile": {
        const id = `profile-${this.nextProfile++}`;
        this.profiles.set(id, {
          id,
          display_name: String(args.displayName ?? ""),
          active: null,
          installs: [],
          schedule: [],
          budget: 5,
          micEnabled: false,
          romaji: "auto",
          events: 0,
          goals: 2,
          savedWords: 0,
        });
        const p = this.profiles.get(id)!;
        return { id: p.id, display_name: p.display_name };
      }
      case "resume_profile": {
        const p = this.profile(args.profileId);
        return { id: p.id, display_name: p.display_name };
      }
      case "available_packs":
        return Object.values(PACKS).map((pack): PackCandidate => ({
          pack_id: pack.id,
          display_name: pack.display_name,
          locale: pack.locale,
          maturity: pack.maturity,
          rtl: pack.rtl,
        }));
      case "installed_packs":
        return [...this.installed.values()];
      case "install_pack":
      case "install_catalog_pack":
        this.install(String(args.packId));
        return null;
      case "pack_claims":
        return this.claims();
      case "catalog_packs":
        return {
          status: "live",
          entries: Object.values(PACKS).map((pack): CatalogEntry => ({
            pack_id: pack.id,
            version: pack.version,
            display_name: pack.display_name,
            locale: pack.locale,
            author: "community",
            license: "CC-BY-SA-4.0",
            review_status: "community",
            min_sdk_version: "0.1.0",
            size_bytes: 4_000_000,
            installed_version: this.installed.get(pack.id)?.version ?? null,
          })),
        };
      case "complete_onboarding": {
        const p = this.profile(args.profileId);
        const packId = args.packId ? String(args.packId) : null;
        p.active = packId;
        p.installs = packId ? [packId] : [];
        p.schedule = packId && PACKS[packId] ? PACKS[packId].schedule.map((s) => ({ ...s })) : [];
        p.micEnabled = Boolean(args.micEnabled);
        return null;
      }
      case "home_state": {
        const p = this.profile(args.profileId);
        return { display_name: p.display_name, plan: this.plan(p), next_goal: this.nextGoal(p) };
      }
      case "first_run_steps": {
        const p = this.profile(args.profileId);
        const pack = p.active ? PACKS[p.active] : undefined;
        if (!pack) return [];
        return pack.schedule.slice(0, 3).map((s): FirstRunStep => ({
          kind: s.kind,
          label: this.word(pack, s.content_id)?.gloss ?? s.content_id,
          content_id: s.content_id,
          goal_id: `${pack.id}.goal.${s.goal}`,
        }));
      }
      case "world_state":
        return [
          { id: "cafe", display_name: "Café", unlocked: false, missing: ["speaking"] },
        ] satisfies WorldEnvironment[];
      case "display_settings": {
        this.profile(args.profileId); // unknown profile fails loudly
        // No fixture reading carries U+0301, so the answer is honest for the
        // content this pack ships: `auto` renders readings plainly.
        return { stress_mode: "auto", pack_has_stress: false } satisfies DisplaySettingsView;
      }
      case "get_microphone_enabled":
        return this.profile(args.profileId).micEnabled;
      case "set_microphone_enabled": {
        const p = this.profile(args.profileId);
        p.micEnabled = Boolean(args.enabled);
        return p.micEnabled;
      }
      case "get_microphone_device":
      case "get_playback_device":
        return null;
      case "get_romaji_mode":
        return this.profile(args.profileId).romaji;
      case "active_pack": {
        const p = this.profile(args.profileId);
        return p.active ? [p.active] : [];
      }
      case "switch_pack": {
        const p = this.profile(args.profileId);
        const packId = String(args.packId);
        if (!this.installed.has(packId)) throw new Error("pack not installed");
        p.active = packId;
        if (!p.installs.includes(packId)) p.installs.push(packId);
        p.schedule = this.packById(packId).schedule.map((s) => ({ ...s }));
        return null;
      }
      case "mine_add": {
        const p = this.profile(args.profileId);
        const rows = this.mineRows.get(p.id) ?? [];
        const surface = String(args.surface).trim();
        const kept = rows.find((r) => r.surface === surface);
        if (kept) {
          // K-61: a repeat mine keeps the original row and its history.
          return { id: kept.id, was_new: false };
        }
        const row = {
          id: `mine-${this.nextMine++}`,
          surface,
          reading: (args.reading as string | null) ?? null,
          gloss: (args.gloss as string | null) ?? null,
          source_citation: String(args.sourceCitation),
          created_at: new Date().toISOString(),
          due_at: null,
        };
        this.mineRows.set(p.id, [...rows, row]);
        return { id: row.id, was_new: true };
      }
      case "mine_list": {
        const p = this.profile(args.profileId);
        return (this.mineRows.get(p.id) ?? []).map((r) => ({ ...r }));
      }
      case "mine_new": {
        const p = this.profile(args.profileId);
        return (this.mineRows.get(p.id) ?? [])
          .filter((r) => r.due_at === null)
          .map((r) => ({ ...r }));
      }
      case "mine_due": {
        const p = this.profile(args.profileId);
        const now = new Date().toISOString();
        return (this.mineRows.get(p.id) ?? [])
          .filter((r) => r.due_at !== null && r.due_at <= now)
          .map((r) => ({ ...r }));
      }
      case "mine_grade": {
        const p = this.profile(args.profileId);
        const row = (this.mineRows.get(p.id) ?? []).find((r) => r.id === String(args.itemId));
        if (!row) throw new Error("not a mined item id");
        // lib.rs seeds the first schedule on the very first grade and
        // returns the new due stamp. The fake schedules within the
        // journey's reach (~150 ms) instead of days ahead — the UI must
        // still never read due-ness from anything but `mine_due`.
        row.due_at = new Date(Date.now() + (args.again ? 60 : 150)).toISOString();
        return row.due_at;
      }
      case "mine_remove": {
        const p = this.profile(args.profileId);
        const rows = this.mineRows.get(p.id) ?? [];
        this.mineRows.set(
          p.id,
          rows.filter((r) => r.id !== String(args.itemId)),
        );
        return true;
      }
      case "kanji_available":
        return this.activePack(this.profile(args.profileId)).kanji;
      case "kanji_list":
        // Exactly the card the engine sends (lib.rs `KanjiCard`), so a fixture
        // field the engine withholds cannot leak into what the drill reads.
        return this.activePack(this.profile(args.profileId)).drills.map((c) => ({
          id: c.id,
          character: c.character,
          radicals: c.radicals,
          mnemonic: c.mnemonic,
          status: c.status,
          meaning_due: null,
          reading_due: null,
        }));
      case "pronunciation_demo":
        return PACKS[String(args.packId)]?.contrast ?? this.demofail();
      case "available_models":
        return this.models;
      case "get_speech_model":
        return this.speechModel;
      case "recommended_speech_model":
        return {
          cores: 8,
          total_ram_mb: 16384,
          tier: "typical",
          recommended_model: "org.openlanguage.speech.whisper-ggml-base",
        } satisfies DeviceTier;
      case "aligner_status":
        return {
          available: false,
          source: null,
          runtime_version: null,
          requires_cpu: null,
          reason: "no-recognition-runtime",
        } satisfies AlignerStatus;
      case "lesson_plan": {
        const pack = this.activePack(this.profile(args.profileId));
        // RU-MODALITY-PRACTICE-001 / UPPERBAND-TASK-JOURNEYS-001: a pack
        // that authored units hands back the FIRST unit whose stage
        // content declares the asked content id — the same
        // first-declaring resolution `lesson_plan_at` performs over the
        // pack's units in lib.rs — every stage carrying the runner key the
        // engine's `activity_runner` computes for its declared pair, and
        // no runner key (absent, as `skip_serializing_if` drops the
        // engine's None) only for a pair nothing executes. Only when no
        // authored unit declares the content does the word-shaped answer
        // run.
        const lesson = pack.lessons.find((l) =>
          l.stages.some((stage) =>
            stage.content.some((c) => c.content_id === String(args.contentId)),
          ),
        );
        if (lesson) return lesson;
        const w = this.word(pack, String(args.contentId));
        if (!w) return null;
        return {
          unit_id: `${pack.id}.unit.greetings`,
          goal_id: `${pack.id}.goal.greetings`,
          title: "First meeting",
          summary: "Greet someone and say who you are.",
          stages: [
            {
              activity_id: `${pack.id}.act.encounter`,
              activity_type: "present",
              stage_kind: "encounter",
              modality: w.id,
              support_level: 3,
              scenario_id: null,
              content: [
                {
                  content_id: w.id,
                  kind: "lexicon",
                  display: w.surface,
                  reading: w.reading,
                  gloss: w.gloss,
                  explanation: null,
                },
              ],
            },
          ],
        } satisfies LessonPlan;
      }
      case "practice_task": {
        const pack = this.activePack(this.profile(args.profileId));
        const drill = pack.drills.find((c) => c.id === String(args.contentId));
        if (drill) return this.drillTask(pack, drill, String(args.modality)).view;
        const modality = String(args.modality);
        // RU-MODALITY-PRACTICE-001: the sentence runners, mirroring
        // `practice_build` — production-speaking is the guided sentence card
        // (`mode: "guided"`, nothing to submit), production-writing types a
        // cloze with the pack-declared target blanked, comprehension-
        // listening hides the transcript and answers in the pack's glosses.
        // A scored task carries no `mode` key at all, exactly as
        // `skip_serializing_if` drops the engine's None.
        const sentence = pack.sentences.find((s) => s.id === String(args.contentId));
        if (sentence) {
          if (modality === "production-speaking")
            return {
              item_id: `${sentence.id}#production-speaking`,
              surface: sentence.text,
              reading: sentence.reading,
              furigana: null,
              romaji: null,
              faded_by_mastery: false,
              choices: [],
              typed: false,
              mode: "guided",
            } satisfies PracticeTaskView;
          if (modality === "production-writing") {
            const target = pack.clozeTargets[sentence.id]?.[0];
            if (!target) throw "no practice runner for this activity yet";
            return {
              item_id: `${sentence.id}#production-writing`,
              surface: sentence.text.replace(target, "______"),
              reading: null,
              furigana: null,
              romaji: null,
              faded_by_mastery: false,
              choices: [],
              typed: true,
            } satisfies PracticeTaskView;
          }
          if (modality === "comprehension-listening")
            return {
              item_id: `${sentence.id}#comprehension-listening`,
              surface: null,
              reading: null,
              furigana: null,
              romaji: null,
              faded_by_mastery: false,
              choices: pack.sentences.map((s) => s.gloss),
              typed: false,
            } satisfies PracticeTaskView;
          // A whitelisted dimension over content it cannot serve stays the
          // engine's honest refusal, not a stand-in task.
          throw "no practice runner for this activity yet";
        }
        const w = this.word(pack, String(args.contentId));
        if (!w) throw new Error(`no such content: ${String(args.contentId)}`);
        // Speaking over a lexicon word keeps lib.rs `speaking_sentence_task_build`'s
        // refusal: only a pack sentence is servable.
        if (modality === "production-speaking") throw "no practice runner for this activity yet";
        return {
          item_id: `${w.id}#${String(args.modality)}`,
          surface: w.surface,
          reading: w.reading,
          furigana: null,
          romaji: null,
          faded_by_mastery: false,
          choices: w.choices,
        } satisfies PracticeTaskView;
      }
      case "practice_submit": {
        const p = this.profile(args.profileId);
        const pack = this.activePack(p);
        const modality = String(args.modality);
        // RU-MODALITY-PRACTICE-001 / ADR-0017 decision 1: mirrors
        // `practice_submit_inner` — a speaking attempt is refused before any
        // task is built, so no evidence or scheduler row can exist, whatever
        // the caller's modality string claims.
        if (modality === "production-speaking") throw "speaking attempts are never scored";
        const contentId = String(args.contentId);
        const sentence = pack.sentences.find((s) => s.id === contentId);
        if (sentence && modality === "comprehension-listening") {
          const choices = pack.sentences.map((s) => s.gloss);
          const index = Number(args.choiceIndex ?? 0);
          p.events += 1;
          return { correct: choices[index] === sentence.gloss, correct_choice: sentence.gloss };
        }
        if (sentence && modality === "production-writing") {
          // Typed grading is exact-match on the trimmed target; the expected
          // string never travels with the task.
          const target = pack.clozeTargets[contentId]?.[0] ?? "";
          p.events += 1;
          return {
            correct: String(args.answer ?? "").trim() === target,
            correct_choice: target,
          };
        }
        // A kanji id grades against the other characters' meanings/readings,
        // the same choice pool `kanji_task_build` builds.
        const drill = pack.drills.find((c) => c.id === String(args.contentId));
        if (drill) {
          const task = this.drillTask(pack, drill, String(args.modality));
          const index = Number(args.choiceIndex ?? 0);
          p.events += 1;
          return {
            correct: task.choices[index] === task.answer,
            correct_choice: task.answer,
          };
        }
        const w = this.word(pack, String(args.contentId));
        const index = Number(args.choiceIndex ?? 0);
        const correct = w?.answer === index;
        p.events += 1;
        return { correct, correct_choice: w ? w.choices[w.answer] : "" };
      }
      case "placement_plan": {
        const pack = this.activePack(this.profile(args.profileId));
        return pack.id === RU ? RU_PLACEMENT_PLAN : [];
      }
      case "placement_coverage": {
        // U05: every declared rubric, planned or not, with the engine's own
        // reason strings — the frontend renders these, never a paraphrase.
        const pack = this.activePack(this.profile(args.profileId));
        return pack.id === RU ? RU_PLACEMENT_COVERAGE : [];
      }
      case "placement_submit": {
        const p = this.profile(args.profileId);
        const pack = this.activePack(p);
        // lib.rs `placement_submit`: diagnostic evidence tagged Diagnostic
        // natively; the verdict shape matches `practice_submit`.
        const w = this.word(pack, String(args.contentId));
        const index = Number(args.choiceIndex ?? 0);
        p.events += 1;
        return { correct: w?.answer === index, correct_choice: w ? w.choices[w.answer] : "" };
      }
      case "progress_summary": {
        const p = this.profile(args.profileId);
        const pack = this.activePack(p);
        // The same row shape the engine sends (lib.rs `progress_summary`): one
        // row per scheduled item's dimension, with the scheduler's own
        // `needs_refresh` flag. The due review row is flagged as fading so the
        // Progress page has a real change signal to report, not a made-up one.
        return pack.schedule.map((s, i) => ({
          content_id: s.content_id,
          dimension: s.modality,
          state: s.kind === "introduction" ? "unseen" : "independent",
          confidence: s.kind === "introduction" ? 0 : 0.8,
          needs_refresh: s.reason === "due-review" && i === 1,
        }));
      }
      case "goal_map": {
        const p = this.profile(args.profileId);
        const pack = this.activePack(p);
        // One card per goal the pack's own schedule names, in the engine's
        // `GoalMapView` shape. Descriptions are pack display strings; the
        // per-modality state is the fake's capability answer for that goal.
        const text: Record<string, string> = {
          greetings: "Greet someone and say who you are",
          family: "Talk about family",
        };
        const names = [...new Set(pack.schedule.map((s) => s.goal))];
        return names.map((goal) => {
          const dims = pack.schedule.filter((s) => s.goal === goal);
          const reached = dims.some((s) => s.kind !== "introduction");
          return {
            pack_id: pack.id,
            id: `${pack.id}.goal.${goal}`,
            description: text[goal] ?? goal,
            band: "on-ramp",
            review_status: "draft",
            modalities: dims.map((s) => s.modality),
            assessed: reached,
            locked: false,
            prerequisites: [],
            dimensions: dims.map((s) => ({
              modality: s.modality,
              state: reached ? "independent" : "unseen",
              concepts_total: dims.length,
              concepts_seen: reached ? dims.length : 0,
              exemplar: reached ? (s.content_id ?? null) : null,
              best_state: reached ? "independent" : "unseen",
            })),
          };
        });
      }
      case "writing_task": {
        const pack = this.activePack(this.profile(args.profileId));
        return pack.writing;
      }
      case "writing_submit": {
        const p = this.profile(args.profileId);
        const pack = this.activePack(p);
        const expected = pack.writing.answer_reading;
        const correct = String(args.answer ?? "").trim() === expected;
        p.events += 1;
        // crates/activity/src/writing.rs WritingGrade: the expected form
        // travels with the verdict, never with the task.
        return { correct, matched_variant: false, expected };
      }
      case "dictation_target": {
        const pack = PACKS[String(args.packId)] ?? this.demofail();
        return pack.sentences[Number(args.offset) % pack.sentences.length];
      }
      case "dictation_check": {
        const attempt = (args.attempt ?? {}) as Record<string, unknown>;
        const target = String(attempt.target_text ?? "");
        // RU-MODALITY-PRACTICE-001: mirrors `dictation_check_at` for the
        // shipped pack — the ASR language now comes from the pack manifest
        // (`pack_asr_language`, lib.rs), and this manifest's `target_locale:
        // ru-RU` resolves to "ru", so the check proceeds to the aligner
        // probe. This machine has no speech aligner, so it abstains BEFORE
        // any model runs. Russian audio never receives a `matched: false`
        // verdict (ADR-0017 forbids manufacturing one).
        if (String(attempt.pack_id ?? "") === RU) {
          return {
            matched: null,
            heard: "",
            target,
            abstain_reason: "aligner-unavailable",
            mode: "guided",
          } satisfies DictationResult;
        }
        // Grounded in lib.rs `aligner_probe` + `dictation_check_at`: with the
        // model preference off the check abstains and never answers a verdict.
        if (this.speechModel === "off") {
          const result: DictationResult = {
            matched: null,
            heard: "",
            target,
            abstain_reason: "speech-model-off",
            mode: "guided",
          };
          return result;
        }
        return {
          matched: true,
          heard: target,
          target,
          abstain_reason: null,
          mode: "guided",
        } satisfies DictationResult;
      }
      case "listening_audio": {
        // The RU fixture answers exactly as lib.rs `listening_audio_at`
        // answers for a pack whose media manifest declares the asset: the
        // shipped pack's media/manifest.jsonl has 4856 rows, including one
        // for each of `ru.sent.b2.j1`..`j4` — every one `provenance:
        // model-output`, synthesizer `qwen3-tts` — so the answer is playable
        // bytes labelled with that provenance. A checkout without the
        // generated `.wav` bytes (they are gitignored) takes the engine's
        // miss path instead, which other tests already exercise.
        const pack = this.activePack(this.profile(args.profileId));
        if (pack.id === RU && RU_SENTENCES.some((s) => s.id === String(args.contentId))) {
          return { wav_b64: RU_MEDIA_WAV_B64, source: "model-output" };
        }
        // A fixture pack that ships no media keeps the honest answer: the
        // engine's own miss (lib.rs `MEDIA_MISSING_CODE`). It is thrown as
        // the bare string Tauri rejects command errors with, so the app's
        // K-78 idiom parses the token and quotes the engine's sentence.
        throw "media-asset-missing: This pack does not ship audio for this item, and the app never synthesizes speech, so there is nothing to play.";
      }
      case "profile_export": {
        const p = this.profile(args.profileId);
        const bundle = {
          format_version: 2,
          exported_at: "2026-10-14T09:00:00Z",
          profile: { id: p.id, display_name: p.display_name },
          settings: [
            { key: "microphone-enabled", value: p.micEnabled },
            { key: "romaji-mode", value: p.romaji },
            { key: "study-budget", value: p.budget },
          ],
          goals: Array.from({ length: p.goals }, (_, i) => `${p.id}.goal.${i}`),
          pack_installations: p.installs.map((id) => ({
            pack_id: id,
            version: PACKS[id]?.version ?? "0.0.0",
          })),
          selected_packs: p.active ? [[p.active, PACKS[p.active]?.version ?? "0.0.0"]] : [],
          content_versions: [],
          evidence: Array.from({ length: p.events }, (_, i) => ({ id: `ev-${i}` })),
          corrections: [],
          mastery_snapshots: [],
          scheduler_state: p.schedule.map((s) => ({ ...s })),
          mined_items: Array.from({ length: p.savedWords }, (_, i) => ({ id: `mine-${i}` })),
        };
        const path = `/home/learner/.local/share/openlang/exports/${p.id}-20261014T090000Z.json`;
        this.files.set(path, JSON.stringify(bundle));
        return path;
      }
      case "profile_import_preview": {
        const bundle = this.readBundle(String(args.path));
        return {
          format_version: bundle.format_version,
          supported: bundle.format_version >= 1 && bundle.format_version <= 2,
          source_profile_name: String(bundle.profile.display_name),
          exported_at: String(bundle.exported_at),
          events: bundle.evidence.length,
          corrections: bundle.corrections.length,
          goals: bundle.goals.length,
          mastery: bundle.mastery_snapshots.length,
          saved_words: bundle.mined_items.length,
          scheduled_items: bundle.scheduler_state.length,
          pack_installs: bundle.pack_installations.length,
          selected_packs: bundle.selected_packs.length,
          recordings: 0,
          warnings: [],
        } satisfies ImportPreview;
      }
      case "profile_import": {
        if (String(args.mode) !== "new") {
          throw new Error("this build restores a backup as a new profile");
        }
        const bundle = this.readBundle(String(args.path));
        const id = `profile-${this.nextProfile++}`;
        const settings = new Map(
          (bundle.settings as { key: string; value: unknown }[]).map((s) => [s.key, s.value]),
        );
        const selected = (bundle.selected_packs as [string, string][])[0]?.[0] ?? null;
        if (selected && !this.installed.has(selected)) this.install(selected);
        this.profiles.set(id, {
          id,
          display_name: String(bundle.profile.display_name),
          active: selected,
          installs: (bundle.pack_installations as { pack_id: string }[]).map((i) => i.pack_id),
          schedule: (bundle.scheduler_state as Scheduled[]).map((s) => ({ ...s })),
          budget: Number(settings.get("study-budget") ?? 5),
          micEnabled: Boolean(settings.get("microphone-enabled")),
          romaji: String(settings.get("romaji-mode") ?? "auto") as RomajiMode,
          events: (bundle.evidence as unknown[]).length,
          goals: (bundle.goals as unknown[]).length,
          savedWords: (bundle.mined_items as unknown[]).length,
        });
        const p = this.profiles.get(id)!;
        return {
          profile_id: p.id,
          display_name: p.display_name,
          events: p.events,
          goals: p.goals,
          saved_words: p.savedWords,
          scheduled_items: p.schedule.length,
          warnings: [],
        } satisfies ImportOutcome;
      }
      case "plugin:event|listen": {
        const eventId = this.nextListener++;
        this.listeners.set(eventId, Number(args.handler));
        return eventId;
      }
      case "plugin:event|unlisten": {
        const handler = this.listeners.get(Number(args.eventId));
        if (handler !== undefined) {
          this.listeners.delete(Number(args.eventId));
          this.callbacks.delete(handler);
        }
        return null;
      }
      default:
        throw new Error(`unimplemented command: ${cmd}`);
    }
  }

  private demofail(): never {
    throw new Error("this pack declares no pronunciation contrasts");
  }

  private readBundle(path: string): {
    format_version: number;
    exported_at: string;
    profile: { id: string; display_name: string };
    settings: { key: string; value: unknown }[];
    goals: unknown[];
    pack_installations: { pack_id: string }[];
    selected_packs: [string, string][];
    evidence: unknown[];
    corrections: unknown[];
    mastery_snapshots: unknown[];
    scheduler_state: Scheduled[];
    mined_items: unknown[];
  } {
    const json = this.files.get(path);
    if (!json) throw new Error(`backup not found: ${path}`);
    return JSON.parse(json);
  }

  /** The Tauri event plugin's own registry, which `listen`'s cleanup needs. */
  unregisterListener(_event: string, eventId: number): void {
    const handler = this.listeners.get(eventId);
    if (handler !== undefined) {
      this.listeners.delete(eventId);
      this.callbacks.delete(handler);
    }
  }
}

export type Mounted = {
  engine: LearnerEngine;
  /** Flush the fake IPC promises and the React commits they trigger. */
  settle(rounds?: number): Promise<void>;
  /** Text a learner would read at `selector` ("" when nothing is there). */
  text(selector: string): string;
  section(label: string): HTMLElement;
  button(scope: string | HTMLElement, label: string): HTMLButtonElement;
  click(target: Element): Promise<void>;
  type(input: HTMLInputElement, value: string): Promise<void>;
  unmount(): Promise<void>;
};

/** Mount the shipped <App/> exactly as main.tsx does, behind the fake shell. */
export async function mountApp(engine: LearnerEngine): Promise<Mounted> {
  const w = window as unknown as Record<string, unknown>;
  w.__TAURI_INTERNALS__ = {
    invoke: (cmd: string, args?: Record<string, unknown>) => engine.run(cmd, args ?? {}),
    transformCallback: (callback: (value: unknown) => void, once?: boolean) =>
      engine.addCallback(callback, once),
  };
  w.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: (event: string, eventId: number) =>
      engine.unregisterListener(event, eventId),
  };

  const host = document.createElement("div");
  host.id = "root";
  document.body.append(host);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(host);
    root.render(<App />);
  });

  const settle = async (rounds = 8) => {
    for (let i = 0; i < rounds; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
  };

  const mounted: Mounted = {
    engine,
    settle,
    text: (selector) => (document.querySelector(selector)?.textContent ?? "").replace(/\s+/g, " "),
    section: (label) => {
      const el = document.querySelector(`[aria-label="${label}"]`);
      if (!el) throw new Error(`no section named "${label}" is on screen`);
      return el as HTMLElement;
    },
    button: (scope, label) => {
      const root = typeof scope === "string" ? mounted.section(scope) : scope;
      const buttons = [...root.querySelectorAll("button")];
      const labels = buttons.map((b) => (b.textContent ?? "").trim());
      // An exact label wins; failing that, the first control whose text
      // carries it — a plan row leads with its reason ("New material"), and
      // the word the learner will practise comes after it.
      let at = labels.indexOf(label);
      if (at === -1) at = labels.findIndex((t) => t.includes(label));
      const found = at === -1 ? undefined : buttons[at];
      if (!found) {
        throw new Error(
          `no button carrying "${label}" in "${root.getAttribute("aria-label") ?? "?"}` +
            `" (saw: ${labels.join(" | ")})`,
        );
      }
      return found as HTMLButtonElement;
    },
    click: async (target) => {
      await act(async () => {
        (target as HTMLElement).click();
      });
      await settle(2);
    },
    type: async (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      await act(async () => {
        setter?.call(input, value);
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
      });
      await settle(2);
    },
    unmount: async () => {
      await act(async () => {
        root?.unmount();
      });
      delete w.__TAURI_INTERNALS__;
      delete w.__TAURI_EVENT_PLUGIN_INTERNALS__;
      host.remove();
    },
  };
  await settle();
  return mounted;
}

/** Install the browser seams the mic-capture path needs: a granted
 * microphone and a Web Audio graph that hands the app real frames.
 * happy-dom ships neither, and the app's capture code is the real thing. */
export function grantMicrophone(): void {
  const stream = {
    getTracks: () => [{ stop: () => undefined }],
  } as unknown as MediaStream;
  Object.defineProperty(window.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => stream,
      enumerateDevices: async () => [
        { kind: "audioinput", deviceId: "mic-default", label: "Test microphone" },
      ],
    },
  });

  class FakeScriptProcessor {
    onaudioprocess:
      ((e: { inputBuffer: { getChannelData: (n: number) => Float32Array } }) => void) | null = null;
    connect(): void {
      // One real frame, delivered after the app has attached its handler.
      setTimeout(() => {
        const data = new Float32Array(4096);
        for (let i = 0; i < data.length; i++) data[i] = Math.sin(i / 24) * 0.2;
        this.onaudioprocess?.({ inputBuffer: { getChannelData: () => data } });
      }, 0);
    }
    disconnect(): void {
      this.onaudioprocess = null;
    }
  }

  class FakeAudioContext {
    readonly sampleRate = 48000;
    readonly destination = {};
    createMediaStreamSource() {
      return { connect: () => undefined, disconnect: () => undefined };
    }
    createScriptProcessor() {
      return new FakeScriptProcessor();
    }
    async close(): Promise<void> {
      /* nothing to release */
    }
  }

  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: FakeAudioContext,
  });
}

/** Count the playbacks the app actually starts: wraps the media element's
 * own `play()`, which happy-dom runs for real (it resolves and dispatches
 * `play`/`playing`). A Play button that never reaches `play()` is a dead
 * button, and this count says so — the alternative is a learner pressing it
 * on a broken card and no test noticing. */
export function trackAudioPlayback(): () => number {
  let plays = 0;
  const proto = window.HTMLMediaElement.prototype;
  const realPlay = proto.play;
  proto.play = async function play(this: HTMLMediaElement): Promise<void> {
    plays += 1;
    return realPlay.call(this);
  };
  return () => plays;
}
