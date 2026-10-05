#!/usr/bin/env python3
"""ru-RU batch 18: A2 units 200-209 (connected personal correspondence)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("odnako","однако","одна́ко","however"),
 ("krome-togo","кроме того","кро́ме того","besides, moreover"),
 ("vo-pervyh","во-первых","во-пе́рвых","firstly"),
 ("vo-vtoryh","во-вторых","во-втиры́х","secondly"),
 ("znachit","значит","зна́чит","that means, so"),
 ("mnenie","мнение","мне́ние","opinion"),
 ("navernoe","наверное","наве́рное","probably"),
 ("po-moemu","по-моему","по-мо́ему","in my opinion"),
 ("kazhetsya","кажется","ка́жется","it seems"),
 ("navernyaka","наверняка","наверняка́","for sure"),
 ("abzac","абзац","абза́ц","paragraph"),
 ("nachalo","начало","нача́ло","beginning"),
 ("zagolovok","заголовок","за́головок","headline, title"),
 ("vyvod","вывод","вы́вод","conclusion"),
 ("primer","пример","приме́р","example"),
 ("otpravit","отправить","отправи́ть","to send"),
 ("poluchit","получить","получи́ть","to receive, get"),
 ("prochitat","прочитать","прочита́ть","to read (through)"),
 ("pereslat","переслать","пересла́ть","to forward"),
 ("napisat","написать","написа́ть","to write"),
 ("sejchas","сейчас","сейча́с","now"),
 ("skoro","скоро","ско́ро","soon"),
 ("pozdno","поздно","по́здно","late"),
 ("rano","рано","ра́но","early"),
 ("ves","весь","весь","all, whole"),
 ("vspomnit","вспомнить","вспомни́ть","to recall"),
 ("zapomnit","запомнить","запомни́ть","to memorize"),
 ("pamyat","память","па́мять","memory"),
 ("naizust","наизусть","наизу́сть","by heart"),
 ("moment","момент","моме́нт","moment"),
 ("obeshchanie","обещание","обеща́ние","promise"),
 ("sderzhat","сдержать","сдержа́ть","to keep (a promise)"),
 ("verno","верно","ве́рно","correctly, true"),
 ("tochno","точно","то́чно","exactly"),
 ("obyazatelno","обязательно","обяза́тельно","definitely, must"),
 ("nadejatsya","надеяться","наде́яться","to hope"),
 ("zhelat","желать","жела́ть","to wish"),
 ("mechtat","мечтать","мечта́ть","to dream"),
 ("radovatsya","радоваться","ра́доваться","to rejoice"),
 ("udivlyatsya","удивляться","удивля́ться","to be surprised"),
 ("utochit","уточнить","уточни́ть","to clarify"),
 ("interesovatsya","интересоваться","интересова́ться","to take an interest"),
 ("otvetit","ответить","ответи́ть","to answer"),
 ("spros","спрос","спрос","a question, ask"),
 ("dogadatsya","догадаться","догада́ться","to guess, figure out"),
 ("rasskaz","рассказ","расска́з","story, account"),
 ("priklyuchenie","приключение","приключе́ние","adventure"),
 ("podrobnost","подробность","подро́бность","detail"),
 ("epizod","эпизод","эпи́зод","episode"),
 ("smeshnoi","смешной","смешно́й","funny"),
]

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.messages2.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "messages2.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.connectors", "name": "Message connectors", "category": "syntax",
  "definition": "Messages link with однако, значит, and кроме того at clause starts: я занят, однако приду. Learn the supplied chunks."},
 {"id": "ru.grammar.a2.reflexive-feelings", "name": "Feelings with -ся + dative", "category": "syntax",
  "definition": "Feeling verbs like радоваться and удивляться take a dative experiencer: я радуюсь, ты удивляешься. Learn the supplied forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u200","Это значит да.","This means yes.",["значит"]),
 ("u201","Это мнение.","This is an opinion.",["мнение"]),
 ("u202","Это абзац.","This is a paragraph.",["абзац"]),
 ("u203","Это пример.","This is an example.",["пример"]),
 ("u204","Это начало.","This is the beginning.",["начало"]),
 ("u205","Это память.","This is memory.",["память"]),
 ("u206","Это обещание.","This is a promise.",["обещание"]),
 ("u207","Это рассказ.","This is a story.",["рассказ"]),
 ("u208","Это момент.","This is a moment.",["момент"]),
 ("u209","Это вывод.","This is the conclusion.",["вывод"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.connected-messages-reading", "goal_id": "ru.goal.a2.connected-messages",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify connectors (однако, значит, кроме того) in a supplied message.",
      "Match an opinion marker (по-моему, кажется) to its meaning.",
      "Order абзац and вывод in a supplied text."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.connected-messages-writing", "goal_id": "ru.goal.a2.connected-messages",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Link two clauses with the supplied значит chunk.",
      "State an opinion with the supplied по-моему chunk.",
      "Write a two-абзац message using taught nouns only."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.connected-messages"
    description: "Write connected personal messages with connectors and opinions."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.problems-solutions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.basic-messages", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.connectors", "ru.grammar.a2.reflexive-feelings", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.connected-messages-reading", "ru.assess.a2.connected-messages-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-05"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)
assert len(WORDS) == 50, len(WORDS)

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("200-connected-messages-01","Connectors","однако, кроме того, во-первых, во-вторых and значит.",
  ["odnako","krome-togo","vo-pervyh","vo-vtoryh","znachit"], "s:u200",
  "Do not confuse однако (however) with значит (so)."),
 ("201-connected-messages-02","Opinions","мнение, наверное, по-моему, кажется and наверняка.",
  ["mnenie","navernoe","po-moemu","kazhetsya","navernyaka"], "s:u201",
  "Do not confuse наверное (probably) with наверняка (for sure)."),
 ("202-connected-messages-03","Text parts","абзац, начало, заголовок, вывод and пример.",
  ["abzac","nachalo","zagolovok","vyvod","primer"], "s:u202",
  "Do not confuse заголовок (title) with начало (beginning)."),
 ("203-connected-messages-04","Message verbs","отправить, получить, прочитать, переслать and написать.",
  ["otpravit","poluchit","prochitat","pereslat","napisat"], "s:u203",
  "Do not confuse отправить (send) with переслать (forward)."),
 ("204-connected-messages-05","Timing","сейчас, скоро, поздно, рано and весь.",
  ["sejchas","skoro","pozdno","rano","ves"], "s:u204",
  "Do not confuse поздно (late) with рано (early)."),
 ("205-connected-messages-06","Memory","вспомнить, запомнить, память, наизусть and момент.",
  ["vspomnit","zapomnit","pamyat","naizust","moment"], "s:u205",
  "Do not confuse вспомнить (recall) with запомнить (memorize)."),
 ("206-connected-messages-07","Promises","обещание, сдержать, верно, точно and обязательно.",
  ["obeshchanie","sderzhat","verno","tochno","obyazatelno"], "s:u206",
  "Do not confuse верно (true) with точно (exactly)."),
 ("207-connected-messages-08","Hopes","надеяться, желать, мечтать, радоваться and удивляться.",
  ["nadejatsya","zhelat","mechtat","radovatsya","udivlyatsya"], "s:u207",
  "Do not confuse надеяться (hope) with мечтать (dream)."),
 ("208-connected-messages-09","Asking back","уточнить, интересоваться, ответить, спрос and догадаться.",
  ["utochit","interesovatsya","otvetit","spros","dogadatsya"], "s:u208",
  "Do not confuse уточнить (clarify) with догадаться (guess)."),
 ("209-connected-messages-10","Stories","рассказ, приключение, подробность, эпизод and смешной.",
  ["rasskaz","priklyuchenie","podrobnost","epizod","smeshnoi"], "s:u209",
  "Do not confuse рассказ (story) with подробность (detail)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.messages2.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a2.' + uid + '"')
    L.append('goal_id: "ru.goal.a2.connected-messages"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: messages with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 18 written")
