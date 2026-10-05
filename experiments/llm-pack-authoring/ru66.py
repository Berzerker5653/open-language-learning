#!/usr/bin/env python3
"""ru-RU batch 66: B2 units 680-689 (balanced discussion of public issues)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("oprovergnut","опровергнуть","опровер́гнуть","to refute"),
 ("podtverdit","подтвердить","подтвéрдить","to confirm"),
 ("dokazatelnyy","доказательный","доказáтельный","evidential, conclusive"),
 ("neubeditelnyy","неубедительный","неубéдительный","unconvincing"),
 ("somnitelnyy","сомнительный","сомнúтельный","doubtful, dubious"),
 ("usomnitsya","усомниться","усóмниться","to doubt"),
 ("doverchivyy","доверчивый","довéрчивый","credulous"),
 ("nedoverchivyy","недоверчивый","недóверчивый","distrustful"),
 ("skeptsitsizm","скептицизм","скептицúзм","skepticism"),
 ("skepticheskiy","скептический","скептúческий","skeptical"),
 ("skeptik","скептик","скéптик","skeptic"),
 ("ironichnyy","ироничный","иронúчный","ironic"),
 ("sarkastichnyy","саркастичный","саркастúчный","sarcastic"),
 ("preuvelichivat","преувеличивать","преувéличивать","to exaggerate"),
 ("preumenshat","преуменьшать","преумéньшать","to understate"),
 ("iskazit","исказить","иска́зить","to distort"),
 ("mificheskiy","мифический","мúфический","mythical"),
 ("molva","молва","молвá","rumor, hearsay"),
 ("domysel","домысел","домúсел","speculation, surmise"),
 ("maloveryatnyy","маловероятный","маловерóятный","unlikely"),
 ("pravdopodobnyy","правдоподобный","правдопóдобный","plausible"),
 ("pravdopodobie","правдоподобие","правдопóдобие","plausibility"),
 ("nedostovernyy","недостоверный","недостóверный","unreliable"),
 ("neargumentirovannyy","неаргументированный","неаргументúрованный","unargued"),
 ("nelogichnyy","нелогичный","нелогúчный","illogical"),
 ("demagog","демагог","демáгог","demagogue"),
 ("populistkiy","популистский","популúстский","populist"),
 ("ritoricheskiy","риторический","ритóрический","rhetorical"),
 ("polemicheskiy","полемический","полемúческий","polemical"),
 ("beskompromissnyy","бескомпромиссный","бескомпромúсный","uncompromising"),
 ("primirimyy","примиримый","примúримый","reconcilable"),
 ("neprimirimosost","непримиримость","непримирúмость","intransigence"),
 ("polutona","полутона","полутóна","half-tones, nuances"),
 ("nepredzyatyy","непредвзятый","непредвзýтый","unprejudiced, unbiased"),
 ("pristrastnost","пристрастность","пристра́стность","partiality, bias"),
 ("pristrastnyy","пристрастный","пристра́стный","partial, biased"),
 ("vzveshennost","взвешенность","взвéшенность","balance, deliberateness"),
 ("samokritika","самокритика","самокрúтика","self-criticism"),
 ("analiticheskiy","аналитический","аналúтический","analytical"),
 ("razbor","разбор","разбóр","analysis, review"),
 ("kontrargumentaciya","контраргументация","контраргументáция","counter-argumentation"),
 ("faktologiya","фактология","фактолóгия","fact base"),
 ("podtasovka","подтасовка","подтáсовка","falsification, rigging"),
 ("podtasovat","подтасовать","подтасóвать","to falsify, rig"),
 ("manipulyativnyy","манипулятивный","манипулýтивный","manipulative"),
 ("navazyvanie","навязывание","навýзывание","imposing, pushing"),
 ("navazchivost","навязчивость","навýзчивость","obsessiveness"),
 ("nasmeshlivyy","насмешливый","насмéшливый","mocking"),
 ("yazvitelnyy","язвительный","язвúтельный","caustic, biting"),
 ("yazvitelnost","язвительность","язвúтельность","causticity"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.soc.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "soc4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-sdrugoy-storony", "name": "С другой стороны", "category": "syntax",
  "definition": "Balanced discussion uses с другой стороны: с другой стороны, риск. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-pravda-esli", "name": "Правда, если + clause", "category": "syntax",
  "definition": "Qualified agreement uses правда, если: правда, если цифры верны. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u680","Это опровержение.","This is a refutation.",["опровержение"]),
 ("u681","Это скептицизм.","This is skepticism.",["скептицизм"]),
 ("u682","Это скептик.","This is a skeptic.",["скептик"]),
 ("u683","Это молва.","This is a rumor.",["молва"]),
 ("u684","Это домысел.","This is a surmise.",["домысел"]),
 ("u685","Это правдоподобие.","This is plausibility.",["правдоподобие"]),
 ("u686","Это демагог.","This is a demagogue.",["демагог"]),
 ("u687","Это разбор.","This is an analysis.",["разбор"]),
 ("u688","Это фактология.","This is the fact base.",["фактология"]),
 ("u689","Это подтасовка.","This is rigging.",["подтасовка"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("680-bal-01","Refutation","опровергнуть, подтвердить, доказательный, неубедительный and сомнительный.",
  ["oprovergnut","podtverdit","dokazatelnyy","neubeditelnyy","somnitelnyy"], "s:u680",
  "Do not confuse опровергнуть (to refute) with подтвердить (to confirm)."),
 ("681-bal-02","Doubt","усомниться, доверчивый, недоверчивый, скептицизм and скептический.",
  ["usomnitsya","doverchivyy","nedoverchivyy","skeptsitsizm","skepticheskiy"], "s:u681",
  "Do not confuse доверчивый (credulous) with недоверчивый (distrustful)."),
 ("682-bal-03","Skeptic","скептик, ироничный, саркастичный, насмешливый and язвительный.",
  ["skeptik","ironichnyy","sarkastichnyy","nasmeshlivyy","yazvitelnyy"], "s:u682",
  "Do not confuse ироничный (ironic) with саркастичный (sarcastic)."),
 ("683-bal-04","Exaggeration","преувеличивать, преуменьшать, исказить, мифический and молва.",
  ["preuvelichivat","preumenshat","iskazit","mificheskiy","molva"], "s:u683",
  "Do not confuse преувеличивать (to exaggerate) with преуменьшать (to understate)."),
 ("684-bal-05","Speculation","домысел, маловероятный, правдоподобный, правдоподобие and недостоверный.",
  ["domysel","maloveryatnyy","pravdopodobnyy","pravdopodobie","nedostovernyy"], "s:u684",
  "Do not confuse правдоподобие (plausibility) with достоверность (reliability)."),
 ("685-bal-06","Argument quality","неаргументированный, нелогичный, демагог, популистский and риторический.",
  ["neargumentirovannyy","nelogichnyy","demagog","populistkiy","ritoricheskiy"], "s:u685",
  "Do not confuse демагог (demagogue) with оратор (orator)."),
 ("686-bal-07","Polemic","полемический, бескомпромиссный, примиримый, непримиримость and язвительность.",
  ["polemicheskiy","beskompromissnyy","primirimyy","neprimirimosost","yazvitelnost"], "s:u686",
  "Do not confuse примиримый (reconcilable) with бескомпромиссный (uncompromising)."),
 ("687-bal-08","Balance","полутона, непредвзятый, пристрастность, пристрастный and взвешенность.",
  ["polutona","nepredzyatyy","pristrastnost","pristrastnyy","vzveshennost"], "s:u687",
  "Do not confuse пристрастность (bias) with непредвзятый (unbiased)."),
 ("688-bal-09","Analysis","самокритика, аналитический, разбор, контраргументация and фактология.",
  ["samokritika","analiticheskiy","razbor","kontrargumentaciya","faktologiya"], "s:u688",
  "Do not confuse разбор (analysis) with контраргументация (counter-argumentation)."),
 ("689-bal-10","Manipulation","подтасовка, подтасовать, манипулятивный, навязывание and навязчивость.",
  ["podtasovka","podtasovat","manipulyativnyy","navazyvanie","navazchivost"], "s:u689",
  "Do not confuse подтасовка (rigging) with искажение (distortion)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.soc.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.society-policy"')
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
    L.append(f'  expected_interpretations: ["{title}: policy notice with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 66 written")
assert len(WORDS) == 50, len(WORDS)
