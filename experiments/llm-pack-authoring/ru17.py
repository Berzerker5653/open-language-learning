#!/usr/bin/env python3
"""ru-RU batch 17: A2 units 190-199 (problems, requests, and remedies)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("problema","проблема","пробле́ма","problem"),
 ("beda","беда","беда́","trouble, misfortune"),
 ("trudnost","трудность","тру́дность","difficulty"),
 ("nepoladka","неполадка","непола́дка","malfunction, glitch"),
 ("avariya","авария","ава́рия","accident, breakdown"),
 ("prosba","просьба","просьба́","request, favor"),
 ("poprosit","попросить","попроси́ть","to ask (a favor)"),
 ("obratitsya","обратиться","обрати́ться","to turn to, contact"),
 ("obrashchenie","обращение","обраще́ние","address, appeal"),
 ("namyok","намёк","намёк","hint"),
 ("sposob","способ","спосо́б","method, way"),
 ("variant","вариант","вариа́нт","option, variant"),
 ("put","путь","путь","way, path"),
 ("metod","метод","ме́тод","method"),
 ("rashchyot","расчёт","расчёт","calculation, plan"),
 ("pochinka","починка","починка́","mending, fix"),
 ("master","мастер","ма́стер","repairman, master"),
 ("zapchast","запчасть","запча́сть","spare part"),
 ("ustanovit","установить","установи́ть","to install, set"),
 ("nastroit","настроить","настро́ить","to adjust, configure"),
 ("vernut","вернуть","верну́ть","to return, give back"),
 ("obmenyat","обменять","обменя́ть","to exchange"),
 ("summa","сумма","су́мма","sum, amount"),
 ("kvitantsiya","квитанция","квитан́ция","receipt, slip"),
 ("kompensatsiya","компенсация","компенса́ция","compensation"),
 ("izvinitsya","извиниться","извини́ться","to apologize"),
 ("oshibka","ошибка","оши́бка","mistake, error"),
 ("ispravit","исправить","исправи́ть","to correct, fix"),
 ("opozdat","опоздать","опозда́ть","to be late"),
 ("vinovaty","виноватый","вино́ватый","guilty, to blame"),
 ("ne-hvatat","не хватать","не хвата́ть","to be lacking"),
 ("nedostatochno","недостаточно","недоста́точно","not enough"),
 ("konchitsya","кончиться","ко́нчиться","to run out, end"),
 ("zapad2","запас","запа́с","supply, reserve"),
 ("izlishok","излишек","изли́шек","excess, surplus"),
 ("dostatochno","достаточно","дово́статочно","enough"),
 ("polnyi","полный","по́лный","full"),
 ("pustoi","пустой","пусто́й","empty"),
 ("tsely","целый","це́лый","whole, intact"),
 ("polovina","половина","полови́на","half"),
 ("bezopasno","безопасно","безопа́сно","safely"),
 ("opasno","опасно","опа́сно","dangerously"),
 ("preduprezhdenie","предупреждение","предупрежде́ние","warning"),
 ("zashchita","защита","защи́та","protection"),
 ("signal","сигнал","сигна́л","signal, alert"),
 ("uladit","уладить","улади́ть","to settle, sort out"),
 ("naladit","наладить","налади́ть","to fix, get going"),
 ("popravit","поправить","поправи́ть","to amend, fix up"),
 ("lad","лад","лад","order, harmony (на лад)",),
 ("uregulirovat","урегулировать","урегули́ровать","to regulate, resolve"),
]

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.problems.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "problems.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.prosba-requests", "name": "Requests with пожалуйста", "category": "syntax",
  "definition": "Polite requests pair an imperative with пожалуйста: помогите, пожалуйста. Learn the supplied chunks; do not add new verbs."},
 {"id": "ru.grammar.a2.genitive-shortage", "name": "Не хватает + genitive", "category": "syntax",
  "definition": "Shortage uses не хватает with a genitive: не хватает времени. Learn the supplied forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u190","Это проблема.","This is a problem.",["проблема"]),
 ("u191","Это просьба.","This is a request.",["просьба"]),
 ("u192","Это способ.","This is a method.",["способ"]),
 ("u193","Это мастер.","This is the repairman.",["мастер"]),
 ("u194","Это сумма.","This is the amount.",["сумма"]),
 ("u195","Это ошибка.","This is a mistake.",["ошибка"]),
 ("u196","Это запас.","This is a reserve.",["запас"]),
 ("u197","Это половина.","This is half.",["половина"]),
 ("u198","Это сигнал.","This is a signal.",["сигнал"]),
 ("u199","Это решение.","This is a solution.",["решение"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.problems-solutions-reading", "goal_id": "ru.goal.a2.problems-solutions",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify problem words (проблема, ошибка, неполадка) in a supplied note.",
      "Match a request chunk with пожалуйста to its meaning.",
      "Distinguish вернуть (return) from обменять (exchange)."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.problems-solutions-writing", "goal_id": "ru.goal.a2.problems-solutions",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a problem statement with это and a taught noun.",
      "Make a polite request with the supplied пожалуйста chunk.",
      "State a shortage with the supplied не хватает chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.problems-solutions"
    description: "Describe problems, make requests, and agree on remedies."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.instructions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.time-plans", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.prosba-requests", "ru.grammar.a2.genitive-shortage", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.problems-solutions-reading", "ru.assess.a2.problems-solutions-writing"]
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
 ("190-problems-solutions-01","Problems","проблема, беда, трудность, неполадка and авария.",
  ["problema","beda","trudnost","nepoladka","avariya"], "s:u190",
  "Do not confuse проблема (problem) with авария (breakdown)."),
 ("191-problems-solutions-02","Requests","просьба, попросить, обратиться, обращение and намёк.",
  ["prosba","poprosit","obratitsya","obrashchenie","namyok"], "s:u191",
  "Do not confuse просьба (request) with намёк (hint)."),
 ("192-problems-solutions-03","Ways to solve","способ, вариант, путь, метод and расчёт.",
  ["sposob","variant","put","metod","rashchyot"], "s:u192",
  "Do not confuse способ (method) with вариант (option)."),
 ("193-problems-solutions-04","At the repair shop","починка, мастер, запчасть, установить and настроить.",
  ["pochinka","master","zapchast","ustanovit","nastroit"], "s:u193",
  "Do not confuse установить (install) with настроить (adjust)."),
 ("194-problems-solutions-05","Returns","вернуть, обменять, сумма, квитанция and компенсация.",
  ["vernut","obmenyat","summa","kvitantsiya","kompensatsiya"], "s:u194",
  "Do not confuse вернуть (return) with обменять (exchange)."),
 ("195-problems-solutions-06","Saying sorry","извиниться, ошибка, исправить, опоздать and виноватый.",
  ["izvinitsya","oshibka","ispravit","opozdat","vinovaty"], "s:u195",
  "Do not confuse ошибка (mistake) with опоздать (be late)."),
 ("196-problems-solutions-07","Running short","не хватать, недостаточно, кончиться, запас and излишек.",
  ["ne-hvatat","nedostatochno","konchitsya","zapad2","izlishok"], "s:u196",
  "Do not confuse запас (reserve) with излишек (excess)."),
 ("197-problems-solutions-08","Enough or not","достаточно, полный, пустой, целый and половина.",
  ["dostatochno","polnyi","pustoi","tsely","polovina"], "s:u197",
  "Do not confuse полный (full) with пустой (empty)."),
 ("198-problems-solutions-09","Safety","безопасно, опасно, предупреждение, защита and сигнал.",
  ["bezopasno","opasno","preduprezhdenie","zashchita","signal"], "s:u198",
  "Do not confuse безопасно (safely) with опасно (dangerously)."),
 ("199-problems-solutions-10","Sorting it out","уладить, наладить, поправить, лад and урегулировать.",
  ["uladit","naladit","popravit","lad","uregulirovat"], "s:u199",
  "Do not confuse уладить (settle) with поправить (amend)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.problems.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a2.problems-solutions"')
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
    L.append(f'  expected_interpretations: ["{title}: problems with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 17 written")
