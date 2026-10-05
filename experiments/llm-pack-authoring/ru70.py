#!/usr/bin/env python3
"""ru-RU batch 70: B2 units 720-729 (risk, probability, and uncertainty)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("doveritelnyy","доверительный","доверúтельный","confidence (adj.)"),
 ("shansy","шансы","шансы\u0301","odds, chances"),
 ("plato","плато","платó","plateau"),
 ("prognozirovat","прогнозировать","прогнози́ровать","to forecast"),
 ("prognoznyy","прогнозный","прогно́зный","forecast (adj.)"),
 ("predskazuemyy","предсказуемый","предсказýемый","predictable"),
 ("nepredskazuemyy","непредсказуемый","непредсказýемый","unpredictable"),
 ("opaslivyy","опасливый","опáсливый","cautious"),
 ("riskovannyy","рискованный","рискóванный","risky"),
 ("avtyura","авантюра","авантю́ра","adventure, gamble"),
 ("avtyurnyy","авантюрный","авантю́рный","adventurous"),
 ("nereshitelnyy","нерешительный","нерешúтельный","irresolute"),
 ("dilemma","дилемма","дилéмма","dilemma"),
 ("redkost","редкость","рéдкость","rarity"),
 ("ekstremum","экстремум","экстрéмум","extremum"),
 ("pikovyy","пиковый","пúковый","peak (adj.)"),
 ("fluaktuaciya","флуктуация","флуктуáция","fluctuation"),
 ("nestabilnost","нестабильность","нестабúльность","instability"),
 ("avariynyy","аварийный","авари́йный","emergency (adj.)"),
 ("poteri","потери","потéри","losses"),
 ("evakuaciya","эвакуация","эвакуáция","evacuation"),
 ("evakuirovat","эвакуировать","эвакуúровать","to evacuate"),
 ("predotvrashchenie","предотвращение","предотвращéние","prevention"),
 ("profilakticheskiy","профилактический","профилакти́ческий","preventive"),
 ("predupreditelnyy","предупредительный","предупредúтельный","warning (adj.)"),
 ("predostorozhnost","предосторожность","предосторóжность","precaution"),
 ("garantirovannyy","гарантированный","гаранти́рованный","guaranteed"),
 ("strahovoy","страховой","страховóй","insurance (adj.)"),
 ("annuitet","аннуитет","аннуитéт","annuity"),
 ("mery","меры","мéры","measures"),
 ("veroyatnostnyy","вероятностный","вероятнóстный","probabilistic"),
 ("determinirovannyy","детерминированный","детерминúрованный","deterministic"),
 ("zakonomernyy","закономерный","закономéрный","regular, law-governed"),
 ("haotichnyy","хаотичный","хаотúчный","chaotic"),
 ("stikhiynyy","стихийный","стихúйный","spontaneous, elemental"),
 ("nepredvidennyy","непредвиденный","непредвúденный","unforeseen"),
 ("nechayannyy","нечаянный","нечáйнный","accidental, unintentional"),
 ("artefakt","артефакт","артефáкт","artifact"),
 ("razvilka","развилка","развúлка","fork, crossroads"),
 ("povorotnyy","поворотный","поворотнóй","turning (adj.)"),
 ("perelom","перелом","перелóм","turning point, fracture"),
 ("perelomnyy","переломный","перелóмный","crucial, turning"),
 ("krizisnyy","кризисный","кри́зисный","crisis (adj.)"),
 ("perehodnyy","переходный","переходнóй","transitional"),
 ("neprochnyy","непрочный","непрóчный","fragile, unsound"),
 ("nebezopasnyy","небезопасный","небезопáсный","unsafe"),
 ("toksichnyy","токсичный","токсúчный","toxic"),
 ("toksichnost","токсичность","токсúчность","toxicity"),
 ("kancerogen","канцероген","канцерогéн","carcinogen"),
 ("stohasticheskiy","стохастический","стохастúческий","stochastic"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.sci.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "sci4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-veroyatnost-taka", "name": "Вероятность такова, что", "category": "syntax",
  "definition": "Probability statements use вероятность такова, что: вероятность такова, что риск мал. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-sluchae", "name": "В случае + gen", "category": "syntax",
  "definition": "Contingencies use в случае: в случае аварии. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u720","Это дилемма.","This is a dilemma.",["дилемма"]),
 ("u721","Это плато.","This is a plateau.",["плато"]),
 ("u722","Это авантюра.","This is a gamble.",["авантюра"]),
 ("u723","Это развилка.","This is a fork.",["развилка"]),
 ("u724","Это флуктуация.","This is a fluctuation.",["флуктуация"]),
 ("u725","Это эвакуация.","This is an evacuation.",["эвакуация"]),
 ("u726","Это предосторожность.","This is a precaution.",["предосторожность"]),
 ("u727","Это аннуитет.","This is an annuity.",["аннуитет"]),
 ("u728","Это артефакт.","This is an artifact.",["артефакт"]),
 ("u729","Это канцероген.","This is a carcinogen.",["канцероген"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("720-risk-01","Probability","шансы, доверительный, вероятностный, стохастический and детерминированный.",
  ["shansy","doveritelnyy","veroyatnostnyy","stohasticheskiy","determinirovannyy"], "s:u720",
  "Do not confuse стохастический (stochastic) with детерминированный (deterministic)."),
 ("721-risk-02","Forecasting","прогнозировать, прогнозный, предсказуемый, непредсказуемый and плато.",
  ["prognozirovat","prognoznyy","predskazuemyy","nepredskazuemyy","plato"], "s:u721",
  "Do not confuse предсказуемый (predictable) with непредсказуемый (unpredictable)."),
 ("722-risk-03","Risking","рискованный, авантюра, авантюрный, опасливый and нерешительный.",
  ["riskovannyy","avtyura","avtyurnyy","opaslivyy","nereshitelnyy"], "s:u722",
  "Do not confuse авантюрный (adventurous) with опасливый (cautious)."),
 ("723-risk-04","Turning points","дилемма, развилка, поворотный, перелом and переломный.",
  ["dilemma","razvilka","povorotnyy","perelom","perelomnyy"], "s:u723",
  "Do not confuse развилка (fork) with перелом (turning point)."),
 ("724-risk-05","Variation","редкость, экстремум, пиковый, флуктуация and нестабильность.",
  ["redkost","ekstremum","pikovyy","fluaktuaciya","nestabilnost"], "s:u724",
  "Do not confuse экстремум (extremum) with пиковый (peak)."),
 ("725-risk-06","Emergency","аварийный, потери, эвакуация, эвакуировать and кризисный.",
  ["avariynyy","poteri","evakuaciya","evakuirovat","krizisnyy"], "s:u725",
  "Do not confuse эвакуация (evacuation) with предотвращение (prevention)."),
 ("726-risk-07","Prevention","предотвращение, профилактический, предупредительный, предосторожность and меры.",
  ["predotvrashchenie","profilakticheskiy","predupreditelnyy","predostorozhnost","mery"], "s:u726",
  "Do not confuse предосторожность (precaution) with предупреждение (warning)."),
 ("727-risk-08","Coverage","страховой, аннуитет, гарантированный, переходный and непрочный.",
  ["strahovoy","annuitet","garantirovannyy","perehodnyy","neprochnyy"], "s:u727",
  "Do not confuse страховой (insurance) with гарантированный (guaranteed)."),
 ("728-risk-09","Order and chaos","закономерный, хаотичный, стихийный, непредвиденный and нечаянный.",
  ["zakonomernyy","haotichnyy","stikhiynyy","nepredvidennyy","nechayannyy"], "s:u728",
  "Do not confuse стихийный (elemental) with непредвиденный (unforeseen)."),
 ("729-risk-10","Harm","артефакт, небезопасный, токсичный, токсичность and канцероген.",
  ["artefakt","nebezopasnyy","toksichnyy","toksichnost","kancerogen"], "s:u729",
  "Do not confuse токсичность (toxicity) with опасность (danger)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.sci.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.science-environment"')
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
    L.append(f'  expected_interpretations: ["{title}: science report with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 70 written")
assert len(WORDS) == 50, len(WORDS)
