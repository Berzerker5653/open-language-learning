#!/usr/bin/env python3
"""ru-RU batch 42: B2 units 440-449 (evaluation and reasoned conclusions)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("recenzent","рецензент","рецéнзент","reviewer"),
 ("motivirovka","мотивировка","мотивúровка","reasoning, motivation"),
 ("argumentirovannyy","аргументированный","аргументúрованный","well-argued"),
 ("obosnovannyy","обоснованный","обоснóванный","well-founded"),
 ("neobosnovannyy","необоснованный","необоснóванный","unfounded"),
 ("slabyy","слабый","слáбый","weak"),
 ("silnyy","сильный","сúльный","strong"),
 ("krepkiy","крепкий","крéпкий","sturdy"),
 ("prochnyy","прочный","прóчный","durable"),
 ("shatkiy","шаткий","шáткий","shaky"),
 ("neustoychivyy","неустойчивый","неустóйчивый","unstable"),
 ("ustoychivyy","устойчивый","устóйчивый","stable"),
 ("protivorechivyy","противоречивый","противорéчивый","contradictory"),
 ("racionalnyy","рациональный","рационáльный","rational"),
 ("emocionalnyy","эмоциональный","эмоционáльный","emotional"),
 ("obekktivnyy","объективный","объектúвный","objective"),
 ("subekktivnyy","субъективный","субъектúвный","subjective"),
 ("predvzyatyy","предвзятый","предвзýтый","biased"),
 ("nejtralnyy","нейтральный","нейтрáльный","neutral"),
 ("bespristrastnyy","беспристрастный","беспристрáстный","impartial"),
 ("demagogiya","демагогия","демагóгия","demagogy"),
 ("populizm","популизм","популúзм","populism"),
 ("tryuk","трюк","трюк","trick"),
 ("ulovka","уловка","ýловка","trick, artifice"),
 ("hitrost","хитрость","хúтрость","cunning"),
 ("vveshennyy","взвешенный","взвéшенный","balanced, weighed"),
 ("obdumannyy","обдуманный","обдýманный","considered"),
 ("produmannyy","продуманный","продýманный","well-thought-out"),
 ("produmat","продумать","продýмать","to think through"),
 ("proschitat","просчитать","просчúтать","to calculate"),
 ("proschyot","просчёт","просчёт","miscalculation"),
 ("merilo","мерило","мéрило","measure, yardstick"),
 ("cennost","ценность","цéнность","value"),
 ("tsenit","ценить","цéнить","to value"),
 ("prok","прок","прок","use, benefit"),
 ("radi","ради","рáди","for the sake of"),
 ("rychag","рычаг","рýчаг","lever"),
 ("nazhim","нажим","нажим","pressure"),
 ("vershina","вершина","вершúна","summit, peak"),
 ("pik","пик","пик","peak"),
 ("predel","предел","прéдел","limit, bound"),
 ("bereg","берег","бéрег","shore, bank"),
 ("kray","край","край","edge, region"),
 ("seredina","середина","серéдина","middle"),
 ("poverhnost","поверхность","повéрхность","surface"),
 ("ploskost","плоскость","плóскость","plane, flat"),
 ("liniya","линия","лúния","line"),
 ("krivaya","кривая","крúвая","curve"),
 ("pryamaya","прямая","прямáя","straight line"),
 ("os","ось","ось","axis"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.argue4.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "argue4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-sledovatelno", "name": "Следовательно conclusion", "category": "syntax",
  "definition": "Conclusions use следовательно: следовательно, вывод. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-s-tochki-zreniya", "name": "С точки зрения evaluation", "category": "syntax",
  "definition": "Evaluation uses с точки зрения: с точки зрения логики. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u440","Это рецензент.","This is a reviewer.",["рецензент"]),
 ("u441","Это мотивировка.","This is reasoning.",["мотивировка"]),
 ("u442","Это трюк.","This is a trick.",["трюк"]),
 ("u443","Это уловка.","This is an artifice.",["уловка"]),
 ("u444","Это ценность.","This is a value.",["ценность"]),
 ("u445","Это рычаг.","This is a lever.",["рычаг"]),
 ("u446","Это вершина.","This is a summit.",["вершина"]),
 ("u447","Это предел.","This is a limit.",["предел"]),
 ("u448","Это середина.","This is the middle.",["середина"]),
 ("u449","Это ось.","This is an axis.",["ось"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.argumentation-reading4", "goal_id": "ru.goal.b2.argumentation4",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify evaluation words (обоснованный, необоснованный) in a supplied note.",
      "Match следовательно chunks to their conclusion.",
      "Distinguish объективный (objective) from субъективный (subjective)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.argumentation-writing4", "goal_id": "ru.goal.b2.argumentation4",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Conclude with the supplied следовательно chunk.",
      "Evaluate with the supplied с точки зрения chunk.",
      "Weigh with a supplied взвешенный or продуманный chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.argumentation4"
    description: "Draw evaluation and reasoned conclusions."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.argumentation3", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-sledovatelno", "ru.grammar.b2-s-tochki-zreniya", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.argumentation-reading4", "ru.assess.b2.argumentation-writing4"]
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
 ("440-argue4-01","Reviewer","рецензент, мотивировка, аргументированный, обоснованныу and необоснованный.",
  ["recenzent","motivirovka","argumentirovannyy","obosnovannyy","neobosnovannyy"], "s:u440",
  "Do not confuse обоснованный (well-founded) with необоснованный (unfounded)."),
 ("441-argue4-02","Weak","слабый, сильный, крепкий, прочный and шаткий.",
  ["slabyy","silnyy","krepkiy","prochnyy","shatkiy"], "s:u441",
  "Do not confuse прочный (durable) with шаткий (shaky)."),
 ("442-argue4-03","Stable","неустойчивый, устойчивый, противоречивый, рациональный and эмоциональный.",
  ["neustoychivyy","ustoychivyy","protivorechivyy","racionalnyy","emocionalnyy"], "s:u442",
  "Do not confuse рациональный (rational) with эмоциональный (emotional)."),
 ("443-argue4-04","Objective","объективный, субъективный, предвзятый, нейтральный and беспристрастный.",
  ["obekktivnyy","subekktivnyy","predvzyatyy","nejtralnyy","bespristrastnyy"], "s:u443",
  "Do not confuse нейтральный (neutral) with беспристрастный (impartial)."),
 ("444-argue4-05","Demagogy","демагогия, популизм, трюк, уловка and хитрость.",
  ["demagogiya","populizm","tryuk","ulovka","hitrost"], "s:u444",
  "Do not confuse трюк (trick) with уловка (artifice)."),
 ("445-argue4-06","Balanced","взвешенный, обдуманный, продуманный, продумать and просчитать.",
  ["vveshennyy","obdumannyy","produmannyy","produmat","proschitat"], "s:u445",
  "Do not confuse продумать (to think through) with просчитать (to calculate)."),
 ("446-argue4-07","Miscalculation","просчёт, мерило, ценность, ценить and прок.",
  ["proschyot","merilo","cennost","tsenit","prok"], "s:u446",
  "Do not confuse мерило (yardstick) with ценность (value)."),
 ("447-argue4-08","Lever","ради, рычаг, нажим, вершина and пик.",
  ["radi","rychag","nazhim","vershina","pik"], "s:u447",
  "Do not confuse вершина (summit) with пик (peak)."),
 ("448-argue4-09","Limit","предел, берег, край, середина and поверхность.",
  ["predel","bereg","kray","seredina","poverhnost"], "s:u448",
  "Do not confuse берег (bank) with край (edge)."),
 ("449-argue4-10","Plane","плоскость, линия, кривая, прямая and ось.",
  ["ploskost","liniya","krivaya","pryamaya","os"], "s:u449",
  "Do not confuse кривая (curve) with прямая (straight line)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.argue4.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.argumentation4"')
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
    L.append(f'  expected_interpretations: ["{title}: evaluation with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 42 written")
assert len(WORDS) == 50, len(WORDS)
