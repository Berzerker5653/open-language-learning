#!/usr/bin/env python3
"""ru-RU batch 78: B2 units 800-809 (integrated grammatical and stylistic revision). FINAL block."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("vychitka","вычитка","вы́читка","proofreading"),
 ("vkraplenie","вкрапление","вкрапле́ние","insertion, intercalation"),
 ("ustranenie","устранение","устран\u0301ение","elimination, removal"),
 ("izyan","изъян","изъя́н","flaw, defect"),
 ("sherohovatost","шероховатость","шероховатость́","roughness"),
 ("shlifovka","шлифовка","шлифо́вка","polishing"),
 ("ottachivanie","оттачивание","отта́чивание","honing"),
 ("otdelka","отделка","о́тделка","finishing"),
 ("uvyzyvat","увязывать","увя́зывать","to tie in, coordinate"),
 ("stykovat","стыковать","стыкова́ть","to fit, joint"),
 ("skleivat","склеивать","скле́ивать","to glue"),
 ("sshivat","сшивать","сш\u0301увать","to stitch together"),
 ("vychityvat","вычитывать","вы́читывать","to proofread"),
 ("sveryat","сверять","св\u0301ерять","to check against, collate"),
 ("shlifovat","шлифовать","шлифова́ть","to polish"),
 ("ottachivat","оттачивать","отта́чивать","to hone"),
 ("varvarizm","варваризм","варвар\u0301зм","barbarism"),
 ("purizm","пуризм","пури́зм","purism"),
 ("purist","пурист","пури́ст","purist"),
 ("normativnost","нормативность","нормати́вность","normativity"),
 ("opiska","описка","о́писка","slip of the pen"),
 ("dovodka","доводка","дов\u0301одка","finishing touches"),
 ("dorabatyvat","дорабатывать","дора́батывать","to refine, polish up"),
 ("vychishchat","вычищать","вычища́ть","to clean out"),
 ("vymaryvat","вымарывать","выма́рывать","to black out, censor"),
 ("vymarka","вымарка","выма́рка","blacking out, erasure"),
 ("izymat","изымать","изыма́ть","to remove, withdraw"),
 ("izyatie","изъятие","изъятие́","removal, withdrawal"),
 ("szhimat","сжимать","сжима́ть","to compress"),
 ("uplotnyat","уплотнять","уплотня́ть","to compact"),
 ("uplotnenie","уплотнение","уплотн\u0301ение","compaction"),
 ("vstavlyat","вставлять","вставля́ть","to insert"),
 ("vnosiat","вносить","вноси́ть","to introduce, add"),
 ("pripiska","приписка","при́писка","postscript, added note"),
 ("dopiska","дописка","до́писка","added note, supplement"),
 ("nadpiska","надписка","надпи́ска","inscription, overwriting"),
 ("pometa","помета","помета́","annotation, marginal note"),
 ("zarubka","зарубка","за́рубка","notch"),
 ("rasechka","засечка","зас\u0301ечка","notch, hook"),
 ("procherk","прочерк","проч\u0301ерк","dash, blank"),
 ("opechatka","опечатка","оп\u0301ечатка","typo"),
 ("filolog","филолог","фило́лог","philologist"),
 ("filologiya","филология","филоло́гия","philology"),
 ("ortografiya","орфография","орфогра́фия","orthography"),
 ("punktuaciya","пунктуация","пунктуа́ция","punctuation"),
 ("skobki","скобки","ско́бки","brackets"),
 ("redakciya","редакция","реда́кция","edition, editorial office"),
 ("vychitchik","вычитчик","вы́читчик","proofreader"),
 ("cenzor","цензор","це́нзор","censor"),
 ("literatur","литератор","литерато́р","man of letters, writer"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.style.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "style4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-pered-otpravkoy", "name": "Перед отправкой + gen", "category": "syntax",
  "definition": "Revision timing: перед отправкой проверьте. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-esli-nuzhno", "name": "Если нужно + inf", "category": "syntax",
  "definition": "Conditional revision step: если нужно уточнить. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u800","Это вычитка.","This is proofreading.",["вычитка"]),
 ("u801","Это опечатка.","This is a typo.",["опечатка"]),
 ("u802","Это отделка.","This is finishing.",["отделка"]),
 ("u803","Это вкрапление.","This is an insertion.",["вкрапление"]),
 ("u804","Это вымарка.","This is an erasure.",["вымарка"]),
 ("u805","Это уплотнение.","This is compaction.",["уплотнение"]),
 ("u806","Это редакция.","This is an edition.",["редакция"]),
 ("u807","Это скобки.","These are brackets.",["скобки"]),
 ("u808","Это филолог.","This is a philologist.",["филолог"]),
 ("u809","Это надписка.","This is an inscription.",["надписка"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("800-rev-01","Proofreading","вычитка, вычитывать, вычитчик, сверять and описка.",
  ["vychitka","vychityvat","vychitchik","sveryat","opiska"], "s:u800",
  "Do not confuse вычитка (proofreading) with сверка (collation)."),
 ("801-rev-02","Defects","изъян, шероховатость, опечатка, помета and прочерк.",
  ["izyan","sherohovatost","opechatka","pometa","procherk"], "s:u801",
  "Do not confuse изъян (flaw) with опечатка (typo)."),
 ("802-rev-03","Polishing","шлифовка, оттачивание, отделка, доводка and дорабатывать.",
  ["shlifovka","ottachivanie","otdelka","dovodka","dorabatyvat"], "s:u802",
  "Do not confuse отделка (finishing) with доводка (finishing touches)."),
 ("803-rev-04","Joining","увязывать, стыковать, склеивать, сшивать and вкрапление.",
  ["uvyzyvat","stykovat","skleivat","sshivat","vkraplenie"], "s:u803",
  "Do not confuse склеивать (to glue) with сшивать (to stitch)."),
 ("804-rev-05","Cuts","вымарывать, вымарка, изымать, изъятие and цензор.",
  ["vymaryvat","vymarka","izymat","izyatie","cenzor"], "s:u804",
  "Do not confuse вымарка (erasure) with изъятие (removal)."),
 ("805-rev-06","Compression","сжимать, уплотнять, уплотнение, вставлять and вносить.",
  ["szhimat","uplotnyat","uplotnenie","vstavlyat","vnosiat"], "s:u805",
  "Do not confuse сжимать (to compress) with уплотнять (to compact)."),
 ("806-rev-07","Norms","нормативность, варваризм, пуризм, пурист and редакция.",
  ["normativnost","varvarizm","purizm","purist","redakciya"], "s:u806",
  "Do not confuse пуризм (purism) with пурист (purist)."),
 ("807-rev-08","Orthography","орфография, пунктуация, скобки, засечка and зарубка.",
  ["ortografiya","punktuaciya","skobki","rasechka","zarubka"], "s:u807",
  "Do not confuse засечка (hook) with зарубка (notch)."),
 ("808-rev-09","Scholars","филолог, филология, литератор, приписка and дописка.",
  ["filolog","filologiya","literatur","pripiska","dopiska"], "s:u808",
  "Do not confuse приписка (postscript) with дописка (added note)."),
 ("809-rev-10","Revision","устранение, вычищать, шлифовать, оттачивать and надписка.",
  ["ustranenie","vychishchat","shlifovat","ottachivat","nadpiska"], "s:u809",
  "Do not confuse устранение (elimination) with вычищать (cleaning out)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.style.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.style-register"')
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
    L.append(f'  expected_interpretations: ["{title}: precision response with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 78 written")
assert len(WORDS) == 50, len(WORDS)
