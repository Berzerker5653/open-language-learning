#!/usr/bin/env python3
"""ru-RU batch 37: B1 units 390-399 (organized personal and practical letters)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("adresat","адресат","адресáт","addressee"),
 ("zapros","запрос","запрóс","request (formal)"),
 ("ekzemplyar","экземпляр","экземплýр","copy (of a document)"),
 ("chernovik","черновик","черновúк","draft"),
 ("chistovik","чистовик","чистовúк","final copy"),
 ("zapyataya","запятая","запятáя","comma"),
 ("probel","пробел","прóбел","space"),
 ("registr","регистр","регúстр","case (letters)"),
 ("shrift","шрифт","шрúфт","font"),
 ("format","формат","фóрмат","format"),
 ("pole","поле","пóле","field"),
 ("grafa","графа","грáфа","column (form)"),
 ("knopka","кнопка","кнóпка","button"),
 ("sohranit","сохранить","сохранúть","to save"),
 ("udalit","удалить","удалúть","to delete"),
 ("perechitat","перечитать","перечитáть","to reread"),
 ("podcherknut","подчеркнуть","подчéркнуть","to underline"),
 ("vydelit","выделить","выдéлить","to highlight"),
 ("sokratit","сократить","сократúть","to shorten"),
 ("dobavit","добавить","добáвить","to add"),
 ("vstavit","вставить","встáвить","to insert"),
 ("prilozhit","приложить","прилóжить","to attach"),
 ("prilozhenie","приложение","приложéние","attachment"),
 ("uvedomlenie","уведомление","уведомлéние","notification"),
 ("rassylka","рассылка","рассýлка","mailing"),
 ("indeks","индекс","úндекс","postal code"),
 ("oblast","область","óбласть","region"),
 ("shtamp","штамп","штамп","stamp (mark)"),
 ("otkrytka","открытка","óткрытка","postcard"),
 ("ramka","рамка","рáмка","frame, box"),
 ("otstup","отступ","óтступ","indent"),
 ("interval","интервал","интéрвал","interval, spacing"),
 ("klavisha","клавиша","клáвиша","key"),
 ("ekran","экран","экран","screen"),
 ("kursore","курсор","кýрсор","cursor"),
 ("kopirovat","копировать","кóпировать","to copy"),
 ("nabrat","набрать","набрáть","to type"),
 ("pechatat","печатать","пéчатать","to print, type"),
 ("rukopis","рукопись","руко́пись","manuscript"),
 ("pocherk","почерк","пóчерк","handwriting"),
 ("stil","стиль","стиль","style"),
 ("manera","манера","манéра","manner"),
 ("oborot","оборот","обóрот","expression"),
 ("shablon","шаблон","шаблóн","template"),
 ("doverennost","доверенность","довéренность","power of attorney"),
 ("raspiska","расписка","рáписка","receipt (written)"),
 ("nakladnaya","накладная","наклáдная","invoice, waybill"),
 ("komissiya","комиссия","комúссия","fee, commission"),
 ("ostatok","остаток","óстаток","balance, remainder"),
 ("talon","талон","талóн","coupon, ticket"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.writing.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "writing.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.uvazhaemyy", "name": "Уважаемый … letter opening", "category": "syntax",
  "definition": "Letters open with уважаемый: уважаемый друг, здравствуйте. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.s-uvazheniem", "name": "С уважением letter closing", "category": "syntax",
  "definition": "Letters close with с уважением: с уважением, Анна. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u390","Это запрос.","This is a request.",["запрос"]),
 ("u391","Это черновик.","This is a draft.",["черновик"]),
 ("u392","Это приложение.","This is an attachment.",["приложение"]),
 ("u393","Это уведомление.","This is a notification.",["уведомление"]),
 ("u394","Это открытка.","This is a postcard.",["открытка"]),
 ("u395","Это шаблон.","This is a template.",["шаблон"]),
 ("u396","Это стиль.","This is a style.",["стиль"]),
 ("u397","Это почерк.","This is handwriting.",["почерк"]),
 ("u398","Это расписка.","This is a receipt.",["расписка"]),
 ("u399","Это талон.","This is a coupon.",["талон"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.extended-writing-reading", "goal_id": "ru.goal.b1.extended-writing",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify letter parts (обращение, подпись) in a supplied letter.",
      "Match уважаемый chunks to their opening.",
      "Distinguish черновик (draft) from чистовик (final copy)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.extended-writing-writing", "goal_id": "ru.goal.b1.extended-writing",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Open a letter with the supplied уважаемый chunk.",
      "Close with the supplied с уважением chunk.",
      "Organize a letter with a supplied абзац or шаблон chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.extended-writing"
    description: "Write organized personal and practical letters."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.connected-messages", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.information-summary", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.uvazhaemyy", "ru.grammar.b1.s-uvazheniem", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.extended-writing-reading", "ru.assess.b1.extended-writing-writing"]
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
 ("390-writing-01","Request","запрос, адресат, экземпляр, черновик and чистовик.",
  ["zapros","adresat","ekzemplyar","chernovik","chistovik"], "s:u390",
  "Do not confuse черновик (draft) with чистовик (final copy)."),
 ("391-writing-02","Comma","запятая, пробел, регистр, шрифт and формат.",
  ["zapyataya","probel","registr","shrift","format"], "s:u391",
  "Do not confuse пробел (space) with запятая (comma)."),
 ("392-writing-03","Field","поле, графа, кнопка, сохранить and удалить.",
  ["pole","grafa","knopka","sohranit","udalit"], "s:u392",
  "Do not confuse сохранить (to save) with удалить (to delete)."),
 ("393-writing-04","Reread","перечитать, подчеркнуть, выделить, сократить and добавить.",
  ["perechitat","podcherknut","vydelit","sokratit","dobavit"], "s:u393",
  "Do not confuse подчеркнуть (to underline) with выделить (to highlight)."),
 ("394-writing-05","Attach","приложить, вставить, приложение, уведомление and рассылка.",
  ["prilozhit","vstavit","prilozhenie","uvedomlenie","rassylka"], "s:u394",
  "Do not confuse приложение (attachment) with уведомление (notification)."),
 ("395-writing-06","Region","индекс, область, штамп, открытка and рамка.",
  ["indeks","oblast","shtamp","otkrytka","ramka"], "s:u395",
  "Do not confuse штамп (stamp) with марка (postage stamp)."),
 ("396-writing-07","Spacing","отступ, интервал, клавиша, экран and курсор.",
  ["otstup","interval","klavisha","ekran","kursore"], "s:u396",
  "Do not confuse отступ (indent) with интервал (spacing)."),
 ("397-writing-08","Type","набрать, печатать, копировать, рукопись and почерк.",
  ["nabrat","pechatat","kopirovat","rukopis","pocherk"], "s:u397",
  "Do not confuse рукопись (manuscript) with почерк (handwriting)."),
 ("398-writing-09","Style","стиль, манера, оборот, шаблон and экземпляр.",
  ["stil","manera","oborot","shablon","ekzemplyar"], "s:u398",
  "Do not confuse манера (manner) with стиль (style)."),
 ("399-writing-10","Receipt","расписка, накладная, комиссия, остаток and доверенность.",
  ["raspiska","nakladnaya","komissiya","ostatok","doverennost"], "s:u399",
  "Do not confuse расписка (receipt) with накладная (invoice)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.writing.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.extended-writing"')
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
    L.append(f'  expected_interpretations: ["{title}: letter with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 37 written")
assert len(WORDS) == 50, len(WORDS)
