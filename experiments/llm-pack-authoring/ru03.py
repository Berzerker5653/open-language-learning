#!/usr/bin/env python3
"""ru-RU batch 3: A1 units 050-059 (routines)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("prosypatsya","просыпаться","просы́паться","to wake up"),
 ("vstavat","вставать","встава́ть","to get up"),
 ("umyvat-sya","умываться","умы́ваться","to wash up"),
 ("chistit","чистить","чи́стить","to clean, to brush"),
 ("zavtrakat","завтракать","за́втракать","to have breakfast"),
 ("obedat","обедать","обе́дать","to have lunch"),
 ("uzhinat","ужинать","у́жинать","to have dinner"),
 ("rabotat","работать","рабо́тать","to work"),
 ("uchitsya","учиться","у́читься","to study"),
 ("otdykhat","отдыхать","отды́хать","to rest"),
 ("spat","спать","спа́ть","to sleep"),
 ("gulyat","гулять","гуля́ть","to walk, to stroll"),
 ("chitat","читать","чита́ть","to read"),
 ("pisat","писать","писа́ть","to write"),
 ("smotret","смотреть","смотре́ть","to watch, to look"),
 ("gotovit","готовить","го́товить","to cook"),
 ("ubirat","убирать","убира́ть","to tidy"),
 ("myt","мыть","мы́ть","to wash"),
 ("zvonit","звонить","звони́ть","to call"),
 ("vstrechat","встречать","встре́чать","to meet"),
 ("zhit","жить","жить","to live"),
 ("utro","утро","у́тро","morning"),
 ("den","день","день","day"),
 ("vecher","вечер","ве́чер","evening"),
 ("noch","ночь","ночь","night"),
 ("chas","час","час","hour"),
 ("minut","минута","минута́","minute"),
 ("segodnya","сегодня","сего́дня","today"),
 ("zavtra","завтра","за́втра","tomorrow"),
 ("vchera","вчера","вчера́","yesterday"),
 ("vsegda","всегда","всегда́","always"),
 ("chasto","часто","ча́сто","often"),
 ("redko","редко","ре́дко","rarely"),
 ("nikogda","никогда","никогда́","never"),
 ("inogda","иногда","иногда́","sometimes"),
 ("utrom","утром","у́тром","in the morning"),
 ("vecherom","вечером","ве́чером","in the evening"),
 ("nedelya","неделя","неделя́","week"),
 ("mesyats","месяц","ме́сяц","month"),
 ("god","год","год","year"),
 ("vykhodnye","выходные","выхо́дные","weekend"),
 ("budilnik","будильник","буди́льник","alarm clock"),
 ("raspisanie","расписание","расписа́ние","schedule"),
 ("kofe","кофе","ко́фе","coffee"),
 ("chay","чай","чай","tea"),
 ("dus","душ","душ","shower"),
 ("domoy","домой","домо́й","homeward"),
 ("otdykh","отдых","о́тдых","rest"),
 ("zavtrak","завтрак","за́втрак","breakfast"),
 ("obed","обед","обе́д","lunch"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.routines.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "routines.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.telling-time", "name": "Telling the time", "category": "syntax",
  "definition": "The time is asked with Сколько времени? and answered with Сейчас plus a number: Сейчас три часа. The noun changes with the number in the supplied forms (один час, два часа, пять часов); learn each supplied pairing and do not build new ones. Day parts appear as utrom and vecherom in the taught forms."},
 {"id": "ru.grammar.a1.frequency-adverbs", "name": "Frequency adverbs before the verb", "category": "syntax",
  "definition": "всегда, часто, иногда, редко and никогда normally stand before the verb: Я всегда читаю. Она часто гуляет. Learn the word order as a chunk; the adverb itself never changes form."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u050","Я всегда читаю.","I always read.",["всегда"]),
 ("u051","Это утро.","This is the morning.",["утро"]),
 ("u052","Это будильник.","This is an alarm clock.",["будильник"]),
 ("u053","Это расписание.","This is a schedule.",["расписание"]),
 ("u054","Это кофе.","This is coffee.",["кофе"]),
 ("u055","Это чай.","This is tea.",["чай"]),
 ("u056","Это неделя.","This is a week.",["неделя"]),
 ("u057","Это обед.","This is lunch.",["обед"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.routines-reading", "goal_id": "ru.goal.a1.routines",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify routine verbs and time words in a supplied daily-schedule note.",
      "Distinguish the frequency adverb from the verb it modifies.",
      "Match a time expression to the supplied час/часа/часов form."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.routines-writing", "goal_id": "ru.goal.a1.routines",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a routine statement with a supplied verb form and a time word.",
      "Place a frequency adverb before the verb as taught.",
      "Complete a time model with the supplied hour form without inventing endings."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.routines"
    description: "Read and write simple statements about daily routines and basic time reference."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.personal-details", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.home", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.numbers", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.telling-time", "ru.grammar.a1.frequency-adverbs", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a1.routines-reading", "ru.assess.a1.routines-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

OLD_VOCAB = ["ru.lex.everyday.eto", "ru.lex.everyday.mama", "ru.lex.everyday.papa",
             "ru.lex.personal.anna", "ru.lex.personal.ivan", "ru.lex.everyday.kniga",
             "ru.lex.everyday.dom", "ru.lex.personal.ya"]
OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("050-routines-01","Morning routine","просыпаться, вставать, умываться, чистить and будильник.",
  ["prosypatsya","vstavat","umyvat-sya","chistit","budilnik"], "s:u052",
  "Do not form past tenses of the taught verbs; only the infinitive and supplied forms are taught."),
 ("051-routines-02","Meals","завтракать, обедать, ужинать, готовить and обед.",
  ["zavtrakat","obedat","uzhinat","gotovit","obed"], "s:u057",
  "Do not confuse обедать (to have lunch) with обед (the lunch meal); both are taught separately."),
 ("052-routines-03","Reading and drinks","читать, писать, смотреть with кофе and чай.",
  ["chitat","pisat","smotret","kofe","chay"], "s:u054",
  "Do not decline кофе; it never changes form."),
 ("053-routines-04","Day and night","утро, день, вечер, ночь and час.",
  ["utro","den","vecher","noch","chas"], "s:u051",
  "Do not guess the gender of ночь; it is feminine."),
 ("054-routines-05","Work and study","работать, учиться, отдыхать, жить and расписание.",
  ["rabotat","uchitsya","otdykhat","zhit","raspisanie"], "s:u053",
  "Do not confuse работать (to work) with the already-taught noun работа."),
 ("055-routines-06","Calendar words","минута, неделя, месяц, год and выходные.",
  ["minut","nedelya","mesyats","god","vykhodnye"], "s:u056",
  "Do not confuse неделя (week) with выходные (the weekend)."),
 ("056-routines-07","Today and tomorrow","сегодня, завтра, вчера, утром, вечером.",
  ["segodnya","zavtra","vchera","utrom","vecherom"], "s:u055",
  "Do not confuse вчера (yesterday) with завтра (tomorrow)."),
 ("057-routines-08","How often","всегда, часто, редко, никогда, иногда before the verb.",
  ["vsegda","chasto","redko","nikogda","inogda"], "s:u050",
  "Do not place the frequency adverb after the object; it stands before the verb."),
 ("058-routines-09","Home errands","убирать, мыть, звонить, встречать and домой.",
  ["ubirat","myt","zvonit","vstrechat","domoy"], "g:ru.grammar.a1.telling-time",
  "Do not use one hour form for every number; use the supplied час, часа and часов pairings."),
 ("059-routines-10","Rest and walks","спать, гулять, отдых, душ and завтрак.",
  ["spat","gulyat","otdykh","dus","zavtrak"], "g:ru.grammar.a1.frequency-adverbs",
  "Do not confuse отдыхать (to rest) with отдых (the noun rest)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.routines.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a1.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.mama"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a1.' + uid + '"')
    L.append('goal_id: "ru.goal.a1.routines"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a1.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a1.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a1.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a1.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: routines and time with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 3 written")
