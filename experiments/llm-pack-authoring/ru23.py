#!/usr/bin/env python3
"""ru-RU batch 23: B1 units 250-259 (service failures and explanatory correspondence)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("servis","сервис","се́рвис","service"),
 ("reklamacija","рекламация","реклама́ция","formal complaint"),
 ("dostavka","доставка","доста́вка","delivery"),
 ("akt","акт","а́кт","act, official record"),
 ("zayavlenie","заявление","заявле́ние","formal statement, application"),
 ("osnovanie","основание","основа́ние","grounds, basis"),
 ("podtverzhdenie","подтверждение","подтвержде́ние","confirmation"),
 ("dokazatelstvo","доказательство","дока́зательство","evidence, proof"),
 ("svidetel","свидетель","сви́детель","witness"),
 ("shtraf","штраф","штраф","fine, penalty"),
 ("narushenie","нарушение","наруше́ние","violation, breach"),
 ("vinovnik","виновник","вино́вник","party at fault"),
 ("sluzhba","служба","слу́жба","service (org)"),
 ("telefon","телефон","телефо́н","telephone"),
 ("grafik","график","гра́фик","schedule"),
 ("sayt","сайт","сайт","website"),
 ("forma","форма","фо́рма","form (document)"),
 ("podat","подать","пода́ть","to submit, hand in"),
 ("rassmotret","рассмотреть","рассмотре́ть","to consider (request)"),
 ("dovod","довод","дово́д","argument, reason"),
 ("argument","аргумент","аргу́мент","argument"),
 ("punkt","пункт","пункт","clause, point"),
 ("procedura","процедура","процеду́ра","procedure"),
 ("perenesti","перенести","перенести́","to reschedule"),
 ("ozhidanie","ожидание","ожида́ние","waiting"),
 ("zaderzhka","задержка","заде́ржка","delay"),
 ("obyasnenie","объяснение","объясне́ние","explanation"),
 ("objasnit","объяснить","объясни́ть","to explain"),
 ("posylka","посылка","по́сылка","parcel"),
 ("kurier","курьер","курье́р","courier"),
 ("vlozhenie","вложение","вложе́ние","attachment"),
 ("adres","адрес","адре́с","address"),
 ("povrezhdenie","повреждение","поврежде́ние","damage"),
 ("vezhlivyj","вежливый","ве́жливый","polite"),
 ("ton","тон","тон","tone"),
 ("ofitsialno","официально","официа́льно","officially"),
 ("razbityj","разбитый","разби́тый","broken (glass)"),
 ("zamena","замена","заме́на","replacement"),
 ("obrazets","образец","о́бразец","sample, model"),
 ("blank","бланк","бланк","form (paper)"),
 ("vozmeshchenie","возмещение","возмеще́ние","compensation"),
 ("zapolnit","заполнить","запо́лнить","to fill in"),
 ("oplata","оплата","опа́та","payment"),
 ("spisanie","списание","списа́ние","debit, write-off"),
 ("povtornyj","повторный","по́вторный","repeat (adj)"),
 ("otmenit","отменить","отмени́ть","to cancel"),
 ("poluchatel","получатель","получа́тель","recipient"),
 ("otpravitel","отправитель","отправите́ль","sender"),
 ("korrespondentsiya","корреспонденция","корреспонде́нция","correspondence"),
 ("poyasnenie","пояснение","поясне́ние","clarification"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.problems2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "problems2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.proshu-requests", "name": "Прошу + infinitive requests", "category": "syntax",
  "definition": "Formal requests use прошу + perfective infinitive: прошу заменить, прошу рассмотреть. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.v-svyazi-s", "name": "В связи с + instrumental", "category": "syntax",
  "definition": "Explanatory correspondence uses в связи с + instrumental: в связи с задержкой. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u250","Это жалоба.","This is a complaint.",["жалоба"]),
 ("u251","Это доставка.","This is delivery.",["доставка"]),
 ("u252","Это задержка.","This is a delay.",["задержка"]),
 ("u253","Это объяснение.","This is an explanation.",["объяснение"]),
 ("u254","Это заявление.","This is a formal statement.",["заявление"]),
 ("u255","Это бланк.","This is a form.",["бланк"]),
 ("u256","Это проверка.","This is a check.",["проверка"]),
 ("u257","Это штраф.","This is a fine.",["штраф"]),
 ("u258","Это график.","This is the schedule.",["график"]),
 ("u259","Это отказ.","This is a refusal.",["отказ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.practical-problems-reading", "goal_id": "ru.goal.b1.practical-problems",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify the complaint word (жалоба, рекламация) in a supplied note.",
      "Match в связи с chunks to their cause.",
      "Distinguish возврат (refund) from замена (replacement)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.practical-problems-writing", "goal_id": "ru.goal.b1.practical-problems",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a request with the supplied прошу chunk.",
      "Give a cause with the supplied в связи с chunk.",
      "Close a note with a supplied apology or deadline chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.practical-problems"
    description: "Report a service failure and explain it in writing."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.experiences", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.narration", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.proshu-requests", "ru.grammar.b1.v-svyazi-s", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.practical-problems-reading", "ru.assess.b1.practical-problems-writing"]
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

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("250-service-problems-01","Complaints","довод, рекламация, сервис, служба and тон.",
  ["dovod","reklamacija","servis","sluzhba","ton"], "s:u250",
  "Do not confuse рекламация (formal complaint) with объяснение (explanation)."),
 ("251-service-problems-02","Delivery","доставка, посылка, курьер, адрес and график.",
  ["dostavka","posylka","kurier","adres","grafik"], "s:u251",
  "Do not confuse курьер (courier) with получатель (recipient)."),
 ("252-service-problems-03","Delays","задержка, ожидание, повторный, отменить and перенести.",
  ["zaderzhka","ozhidanie","povtornyj","otmenit","perenesti"], "s:u252",
  "Do not confuse отменить (cancel) with перенести (reschedule)."),
 ("253-service-problems-04","Damage","повреждение, разбитый, замена, возмещение and акт.",
  ["povrezhdenie","razbityj","zamena","vozmeshchenie","akt"],
  "s:u253",
  "Do not confuse замена (replacement) with возврат (refund)."),
 ("254-service-problems-05","Applications","заявление, бланк, форма, заполнить and подать.",
  ["zayavlenie","blank","forma","zapolnit","podat"], "s:u254",
  "Do not confuse бланк (form) with образец (sample)."),
 ("255-service-problems-06","Online forms","образец, вложение, сайт, телефон and официально.",
  ["obrazets","vlozhenie","sayt","telefon","ofitsialno"], "s:u255",
  "Do not confuse вложение (attachment) with образец (sample)."),
 ("256-service-problems-07","Checks","аргумент, рассмотреть, основание, пункт and процедура.",
  ["argument","rassmotret","osnovanie","punkt","procedura"], "s:u256",
  "Do not confuse основание (grounds) with аргумент (argument)."),
 ("257-service-problems-08","Fines","штраф, нарушение, виновник, доказательство and свидетель.",
  ["shtraf","narushenie","vinovnik","dokazatelstvo","svidetel"], "s:u257",
  "Do not confuse нарушение (violation) with штраф (fine)."),
 ("258-service-problems-09","Payments","оплата, списание, подтверждение, вежливый and объяснить.",
  ["oplata","spisanie","podtverzhdenie","vezhlivyj","objasnit"], "s:u258",
  "Do not confuse оплата (payment) with списание (debit)."),
 ("259-service-problems-10","Correspondence","корреспонденция, отправитель, получатель, пояснение and объяснение.",
  ["korrespondentsiya","otpravitel","poluchatel","poyasnenie","obyasnenie"], "s:u259",
  "Do not confuse отправитель (sender) with получатель (recipient)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.problems2.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.b1.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.b1.' + uid + '"')
    L.append('goal_id: "ru.goal.b1.practical-problems"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.b1.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.b1.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.b1.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.b1.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: service problems with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 23 written")
assert len(WORDS) == 50, len(WORDS)
