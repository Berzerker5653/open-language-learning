#!/usr/bin/env python3
"""ru-RU batch 39: B2 units 410-419 (positions, claims, argument structure)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("utverzhdenie","утверждение","утверждéние","claim, statement"),
 ("otricanie","отрицание","отрицáние","negation"),
 ("kontrargument","контраргумент","контрáргумент","counterargument"),
 ("opponent","оппонент","оппóнент","opponent"),
 ("zashchitnik","защитник","защúтник","defender"),
 ("storonnik","сторонник","стороннúк","supporter"),
 ("protivnik","противник","прóтивник","adversary"),
 ("priverezhenets","приверженец","привéрженец","adherent"),
 ("kritika","критика","крúтика","criticism"),
 ("polemika","полемика","полéмика","polemics"),
 ("debaty","дебаты","дебáты","debate"),
 ("preniya","прения","прéния","debate (formal)"),
 ("rassuzhdenie","рассуждение","рассуждéние","reasoning"),
 ("obosnovanie","обоснование","обосновáние","justification"),
 ("sofizm","софизм","софúзм","sophism"),
 ("manipulyaciya","манипуляция","манипулýция","manipulation"),
 ("davlenie","давление","давлéние","pressure"),
 ("vnushenie","внушение","внушéние","suggestion, influence"),
 ("ubeditelnost","убедительность","убедúтельность","convincingness"),
 ("dostovernost","достоверность","достóверность","reliability"),
 ("nadezhnost","надежность","надёжность","dependability"),
 ("avtoritet","авторитет","авторитéт","authority"),
 ("kompetentnost","компетентность","компетéнтность","competence"),
 ("veskiy","веский","вéский","weighty"),
 ("ubeditelnyy","убедительный","убедúтельный","convincing"),
 ("spornyy","спорный","спóрный","controversial"),
 ("sporit","спорить","спóрить","to argue"),
 ("otsenivat","оценивать","оцéнивать","to evaluate"),
 ("sudite","судить","суди́ть","to judge"),
 ("verit","верить","вéрить","to believe"),
 ("oprovergat","опровергать","опровергáть","to refute"),
 ("ssylatsya","ссылаться","ссылáться","to cite, refer"),
 ("apellyaciya","апелляция","апеллýция","appeal"),
 ("tsirovat","цитировать","цитúровать","to quote"),
 ("iskazhenie","искажение","искажéние","distortion"),
 ("preuvelichenie","преувеличение","преувеличéние","exaggeration"),
 ("preumenshenie","преуменьшение","преумéньшение","understatement"),
 ("pokazanie","показание","показáние","testimony"),
 ("prigovor","приговор","пригóвор","verdict, sentence"),
 ("obvinenie","обвинение","обвинéние","accusation"),
 ("podozrevat","подозревать","подозревáть","to suspect"),
 ("podozrenie","подозрение","подозрéние","suspicion"),
 ("dopros","допрос","допрóс","interrogation"),
 ("rassledovanie","расследование","расслéдование","investigation"),
 ("razbiratelstvo","разбирательство","разбирáтельство","hearing, inquiry"),
 ("sud","суд","суд","court"),
 ("zasedanie","заседание","засéдание","session, meeting"),
 ("advokat","адвокат","адвóкат","lawyer"),
 ("prisyaga","присяга","прися́га","oath"),
 ("klyatva","клятва","клятвá","oath, vow"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.argue.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "argue.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2.ya-schitayu-chto", "name": "Я считаю, что claim", "category": "syntax",
  "definition": "Claims use я считаю, что: я считаю, что важно. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2.s-drugoy-storony", "name": "С другой стороны counter", "category": "syntax",
  "definition": "Counterpoints use с другой стороны: с другой стороны, однако. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u410","Это утверждение.","This is a claim.",["утверждение"]),
 ("u411","Это оппонент.","This is an opponent.",["оппонент"]),
 ("u412","Это дебаты.","This is a debate.",["дебаты"]),
 ("u413","Это обоснование.","This is a justification.",["обоснование"]),
 ("u414","Это давление.","This is pressure.",["давление"]),
 ("u415","Это авторитет.","This is authority.",["авторитет"]),
 ("u416","Это обвинение.","This is an accusation.",["обвинение"]),
 ("u417","Это суд.","This is a court.",["суд"]),
 ("u418","Это присяга.","This is an oath.",["присяга"]),
 ("u419","Это заседание.","This is a session.",["заседание"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.argumentation-reading", "goal_id": "ru.goal.b2.argumentation",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify claim words (утверждение, тезис) in a supplied argument.",
      "Match с другой стороны chunks to their counterpoint.",
      "Distinguish довод (reason) from контраргумент (counterargument)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.argumentation-writing", "goal_id": "ru.goal.b2.argumentation",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a claim with the supplied я считаю, что chunk.",
      "Counter with the supplied с другой стороны chunk.",
      "Support with a supplied обоснование or довод chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.argumentation"
    description: "Build positions, claims, and argument structure."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.future-conditions2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2.ya-schitayu-chto", "ru.grammar.b2.s-drugoy-storony", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.argumentation-reading", "ru.assess.b2.argumentation-writing"]
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
 ("410-argue-01","Claim","утверждение, отрицание, критика, обоснование and рассуждение.",
  ["utverzhdenie","otricanie","kritika","obosnovanie","rassuzhdenie"], "s:u410",
  "Do not confuse утверждение (claim) with отрицание (negation)."),
 ("411-argue-02","Opponent","оппонент, защитник, сторонник, противник and приверженец.",
  ["opponent","zashchitnik","storonnik","protivnik","priverezhenets"], "s:u411",
  "Do not confuse сторонник (supporter) with противник (adversary)."),
 ("412-argue-03","Debate","дебаты, прения, полемика, спорить and критика.",
  ["debaty","preniya","polemika","sporit","kritika"], "s:u412",
  "Do not confuse прения (formal debate) with полемика (polemics)."),
 ("413-argue-04","Sophism","софизм, манипуляция, внушение, давление and искажение.",
  ["sofizm","manipulyaciya","vnushenie","davlenie","iskazhenie"], "s:u413",
  "Do not confuse внушение (influence) with манипуляция (manipulation)."),
 ("414-argue-05","Convincing","убедительность, достоверность, надежность, компетентность and авторитет.",
  ["ubeditelnost","dostovernost","nadezhnost","kompetentnost","avtoritet"], "s:u414",
  "Do not confuse достоверность (reliability) with надежность (dependability)."),
 ("415-argue-05b","Weighty","веский, убедительный, спорный, оценивать and судить.",
  ["veskiy","ubeditelnyy","spornyy","otsenivat","sudite"], "s:u415",
  "Do not confuse оценивать (to evaluate) with судить (to judge)."),
 ("416-argue-06","Refute","опровергать, ссылаться, апелляция, цитировать and верить.",
  ["oprovergat","ssylatsya","apellyaciya","tsirovat","verit"], "s:u416",
  "Do not confuse ссылаться (to cite) with цитировать (to quote)."),
 ("417-argue-07","Exaggeration","преувеличение, преуменьшение, искажение, спорный and критика.",
  ["preuvelichenie","preumenshenie","iskazhenie","spornyy","kritika"], "s:u417",
  "Do not confuse преувеличение (exaggeration) with преуменьшение (understatement)."),
 ("418-argue-08","Testimony","показание, приговор, обвинение, подозрение and допрос.",
  ["pokazanie","prigovor","obvinenie","podozrenie","dopros"], "s:u418",
  "Do not confuse обвинение (accusation) with подозрение (suspicion)."),
 ("419-argue-09","Court","суд, заседание, адвокат, присяга and разбирательство.",
  ["sud","zasedanie","advokat","prisyaga","razbiratelstvo"], "s:u419",
  "Do not confuse присяга (oath) with клятва (vow)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.argue.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.b2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.b2.' + uid + '"')
    L.append('goal_id: "ru.goal.b2.argumentation"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.b2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.b2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.b2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.b2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: argument with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 39 written")
assert len(WORDS) == 50, len(WORDS)
