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
import type { LessonPlan } from "../lesson";
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
        schedule: pack ? pack.schedule.map((s) => ({ ...s })) : [],
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
        pack.drills.filter((c) => c.id !== card.id).map(label).slice(0, 3),
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
      return {
        item_id: `${s.content_id}#${s.modality}`,
        content_id: s.content_id,
        modality: s.modality,
        reason: s.reason,
        kind: s.kind,
        est_seconds: s.est_seconds,
        surface: w?.surface ?? null,
        gloss: w?.gloss ?? null,
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
        const w = this.word(pack, String(args.contentId));
        if (!w) throw new Error(`no such content: ${String(args.contentId)}`);
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
