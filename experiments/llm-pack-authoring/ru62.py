#!/usr/bin/env python3
"""ru-RU batch 62: B2 units 640-649 (clarification, mediation, and agreement)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("utochnyat","уточнять","уточнýть","to clarify"),
 ("razyasnenie","разъяснение","разъяснéние","explanation, clarification"),
 ("razyasnit","разъяснить","разъяснúть","to explain, clarify"),
 ("poyasnyat","пояснять","пояснýть","to explain"),
 ("utochnyayushchiy","уточняющий","уточнýющий","clarifying"),
 ("voprositelnyy","вопросительный","вопросúтельный","interrogative"),
 ("peresprosit","переспросить","переспросúть","to ask again"),
 ("peresprashivat","переспрашивать","переспрáшивать","to ask again"),
 ("perespros","переспрос","пéреспрос","re-asking"),
 ("perefrazirovat","перефразировать","перефрáзировать","to rephrase"),
 ("perefraze","перефраз","перéфраз","rephrasing"),
 ("parafraze","парафраз","пáрафраз","paraphrase"),
 ("reziumirovat","резюмировать","резюмúровать","to summarize"),
 ("obobshchit","обобщить","обобщúть","to generalize"),
 ("obobshchayushchiy","обобщающий","обобщáющий","generalizing"),
 ("detalizaciya","детализация","детализáция","detailing"),
 ("detalizirovat","детализировать","детализúровать","to detail"),
 ("konkretyzaciya","конкретизация","конкретизáция","concretization"),
 ("konkretyzirovat","конкретизировать","конкретизúровать","to concretize"),
 ("sopostavit","сопоставить","сопоставúть","to compare"),
 ("sopostavimyy","сопоставимый","сопоставúмый","comparable"),
 ("nesopostavimyy","несопоставимый","несопоставúмый","incomparable"),
 ("ekvivalentnost","эквивалентность","эквивалéнтность","equivalence"),
 ("ekvivalentnyy","эквивалентный","эквивалéнтный","equivalent"),
 ("ekvivalent","эквивалент","эквивалéнт","equivalent"),
 ("ravnotsennyy","равноценный","равноцéнный","equivalent, equal in value"),
 ("ravnotsennost","равноценность","равноцéнность","equivalence"),
 ("sorazmernyy","соразмерный","соразмéрный","commensurate, proportionate"),
 ("sorazmernost","соразмерность","соразмéрность","commensurability"),
 ("adekvatnost","адекватность","адеквáтность","adequacy"),
 ("neadekvatnyy","неадекватный","неадеквáтный","inadequate"),
 ("soglasovannost","согласованность","согласóванность","consistency, coordination"),
 ("nesoglasovannost","несогласованность","несогласóванность","inconsistency"),
 ("slazhennost","слаженность","слажéнность","coordination, smoothness"),
 ("slazhennyy","слаженный","слажéнный","coordinated, smooth"),
 ("sygrannost","сыгранность","сыгрáнность","teamwork, cohesion"),
 ("sygrannyy","сыгранный","сыгрáнный","coordinated (team)"),
 ("edinodushnyy","единодушный","единодýшный","unanimous"),
 ("solidarnost","солидарность","солидáрность","solidarity"),
 ("solidarnyy","солидарный","солидáрный","solidary"),
 ("vzaimoponimanie","взаимопонимание","взаимопонúмание","mutual understanding"),
 ("vzaimosvyazannyy","взаимосвязанный","взаимосвýзанный","interconnected"),
 ("sinkhronizaciya","синхронизация","синхронизáция","synchronization"),
 ("sinkhronnyy","синхронный","синхрóнный","synchronous"),
 ("skreplenie","скрепление","скреплéние","fastening, securing"),
 ("skreplyat","скреплять","скреплýть","to fasten, secure"),
 ("legitimaciya","легитимация","легитимáция","legitimation"),
 ("legitimnyy","легитимный","легитúмный","legitimate"),
 ("pravomochost","правомочность","правомóчность","competence, authority"),
 ("pravomochnyy","правомочный","правомóчный","competent, authorized"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.neg.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "neg4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-poyasnite-pozhaluysta", "name": "Поясните, пожалуйста", "category": "syntax",
  "definition": "Clarification uses поясните, пожалуйста: поясните, пожалуйста, срок. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-takim-obrazom", "name": "Таким образом + clause", "category": "syntax",
  "definition": "Agreement summaries use таким образом: таким образом, мы согласны. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u640","Это разъяснение.","This is a clarification.",["разъяснение"]),
 ("u641","Это переспрос.","This is a re-asking.",["переспрос"]),
 ("u642","Это парафраз.","This is a paraphrase.",["парафраз"]),
 ("u643","Это детализация.","This is detailing.",["детализация"]),
 ("u644","Это эквивалент.","This is an equivalent.",["эквивалент"]),
 ("u645","Это соразмерность.","This is commensurability.",["соразмерность"]),
 ("u646","Это согласованность.","This is consistency.",["согласованность"]),
 ("u647","Это солидарность.","This is solidarity.",["солидарность"]),
 ("u648","Это взаимопонимание.","This is mutual understanding.",["взаимопонимание"]),
 ("u649","Это легитимация.","This is legitimation.",["легитимация"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("640-clar-01","Clarifying","уточнять, разъяснение, разъяснить, пояснять and уточняющий.",
  ["utochnyat","razyasnenie","razyasnit","poyasnyat","utochnyayushchiy"], "s:u640",
  "Do not confuse разъяснение (clarification) with пояснение (explanation)."),
 ("641-clar-02","Re-asking","вопросительный, переспросить, переспрашивать, переспрос and перефразировать.",
  ["voprositelnyy","peresprosit","peresprashivat","perespros","perefrazirovat"], "s:u641",
  "Do not confuse переспросить (to ask again) with уточнять (to clarify)."),
 ("642-clar-03","Rephrasing","перефраз, парафраз, резюмировать, обобщить and обобщающий.",
  ["perefraze","parafraze","reziumirovat","obobshchit","obobshchayushchiy"], "s:u642",
  "Do not confuse перефраз (rephrasing) with парафраз (paraphrase)."),
 ("643-clar-04","Detailing","детализация, детализировать, конкретизация, конкретизировать and сопоставить.",
  ["detalizaciya","detalizirovat","konkretyzaciya","konkretyzirovat","sopostavit"], "s:u643",
  "Do not confuse детализация (detailing) with конкретизация (concretization)."),
 ("644-clar-05","Comparing","сопоставимый, несопоставимый, эквивалентность, эквивалентный and эквивалент.",
  ["sopostavimyy","nesopostavimyy","ekvivalentnost","ekvivalentnyy","ekvivalent"], "s:u644",
  "Do not confuse сопоставимый (comparable) with эквивалентный (equivalent)."),
 ("645-clar-06","Equivalence","равноценный, равноценность, соразмерный, соразмерность and адекватность.",
  ["ravnotsennyy","ravnotsennost","sorazmernyy","sorazmernost","adekvatnost"], "s:u645",
  "Do not confuse равноценность (equivalence) with соразмерность (commensurability)."),
 ("646-clar-07","Adequacy","неадекватный, согласованность, несогласованность, слаженность and слаженный.",
  ["neadekvatnyy","soglasovannost","nesoglasovannost","slazhennost","slazhennyy"], "s:u646",
  "Do not confuse согласованность (consistency) with слаженность (coordination)."),
 ("647-clar-08","Coordination","сыгранность, сыгранный, единодушный, солидарность and солидарный.",
  ["sygrannost","sygrannyy","edinodushnyy","solidarnost","solidarnyy"], "s:u647",
  "Do not confuse сыгранность (teamwork) with солидарность (solidarity)."),
 ("648-clar-09","Understanding","взаимопонимание, взаимосвязанный, синхронизация, синхронный and скрепление.",
  ["vzaimoponimanie","vzaimosvyazannyy","sinkhronizaciya","sinkhronnyy","skreplenie"], "s:u648",
  "Do not confuse синхронизация (synchronization) with скрепление (fastening)."),
 ("649-clar-10","Legitimacy","скреплять, легитимация, легитимный, правомочность and правомочный.",
  ["skreplyat","legitimaciya","legitimnyy","pravomochost","pravomochnyy"], "s:u649",
  "Do not confuse легитимный (legitimate) with правомочный (authorized)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.neg.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.negotiation"')
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
    L.append(f'  expected_interpretations: ["{title}: negotiation exchange with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 62 written")
assert len(WORDS) == 50, len(WORDS)
