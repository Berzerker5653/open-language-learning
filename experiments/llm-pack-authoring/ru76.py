#!/usr/bin/env python3
"""ru-RU batch 76: B2 units 780-789 (formality, politeness, and genre conventions)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("lyubeznost","любезность","любе́зность","courtesy, kindness"),
 ("bestaktnost","бестактность","беста́ктность","tactlessness"),
 ("nahalstvo","нахальство","наха́льство","brazenness, impudence"),
 ("uchtivyj","учтивый","учти́вый","courteous (adj.)"),
 ("lyubeznyj","любезный","любе́зный","amiable, courteous"),
 ("taktichnyj","тактичный","та́ктичный","tactful"),
 ("bestaktnyj","бестактный","беста́ктный","tactless"),
 ("privetlivyj","приветливый","приве́тливый","friendly, welcoming"),
 ("obhoditelnyj","обходительный","обходи́тельный","affable (adj.)"),
 ("obhozhdenie","обхождение","обхожде́ние","conduct, manner of dealing"),
 ("manery","манеры","ма́неры","manners"),
 ("ceremonnost","церемонность","цере́монность","ceremoniousness"),
 ("kanceljarskij","канцелярский","канцеля́рский","bureaucratic (adj.)"),
 ("neoficialnyj","неофициальный","неофициа́льный","unofficial"),
 ("mnogoslovie","многословие","многосло́вие","verbosity"),
 ("mnogoslovnyj","многословный","многосло́вный","verbose"),
 ("lakonichnyj","лаконичный","лако́ничный","laconic"),
 ("lakonizm","лаконизм","лако́низм","laconism"),
 ("szhatost","сжатость","сжа́тость","conciseness"),
 ("obstojatelnyj","обстоятельный","обсто́ятельный","thorough, detailed"),
 ("poshlost","пошлость","по́шлость","vulgarity, banality"),
 ("poshlyj","пошлый","по́шлый","vulgar, tacky"),
 ("vulgarnej","вульгарный","вульга́рный","vulgar"),
 ("expressiya","экспрессия","экспе́рссия","expression, expressiveness"),
 ("publicistika","публицистика","публици́стика","journalism, publicism"),
 ("telegramma","телеграмма","телегра́мма","telegram"),
 ("lest","лесть","ле́сть","flattery"),
 ("lstec","льстец","льсте́ц","flatterer"),
 ("priznatelnost","признательность","призна́тельность","appreciation, gratitude"),
 ("ukor","укор","уко́р","reproach"),
 ("ukorizna","укоризна","укори́зна","reproach, blame"),
 ("smyagchat","смягчать","смягча́ть","to soften, mitigate"),
 ("smyagchenie","смягчение","смягче́ние","softening, mitigation"),
 ("podshuchivat","подшучивать","подшу́чивать","to tease, joke about"),
 ("reverans","реверанс","ревера\u0301нс","curtsy, bow"),
 ("obhoditelnost","обходительность","обходи́тельность","affability"),
 ("predupreditelnost","предупредительность","предупреди́тельность","thoughtfulness"),
 ("zabotlivost","заботливость","забо́тливость","care, solicitousness"),
 ("cherstost","черствость","че́рствость","callousness"),
 ("cherstvyj","черствый","че́рствый","callous, hard"),
 ("oficioz","официоз","официо́з","officialdom"),
 ("protokolnyj","протокольный","протоко́льный","protocol (adj.)"),
 ("soboleznovanie","соболезнование","соболе́знование","condolence"),
 ("pozvolenie","позволение","позволе́ние","permission"),
 ("slushanie","слушание","слуша́ние","hearing, session"),
 ("poklon","поклон","покло́н","bow"),
 ("ugodlivost","угодливость","уго́дливость","obsequiousness"),
 ("podobostrastie","подобострастие","подобостра́стие","servility"),
 ("falsh","фальшь","фа́льшь","falsehood, falsity"),
 ("licemer","лицемер","лицеме́р","hypocrite"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.style.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "style2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-budte-dobry", "name": "Будьте добры + inf", "category": "syntax",
  "definition": "Polite request: будьте добры передать. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-mozhno-li-mne", "name": "Можно ли мне + inf", "category": "syntax",
  "definition": "Formal permission ask: можно ли мне уточнить. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u780","Это любезность.","This is courtesy.",["любезность"]),
 ("u781","Это бестактность.","This is tactlessness.",["бестактность"]),
 ("u782","Это манеры.","These are manners.",["манеры"]),
 ("u783","Это фальшь.","This is falsehood.",["фальшь"]),
 ("u784","Это лаконизм.","This is laconism.",["лаконизм"]),
 ("u785","Это публицистика.","This is journalism.",["публицистика"]),
 ("u786","Это лесть.","This is flattery.",["лесть"]),
 ("u787","Это укор.","This is a reproach.",["укор"]),
 ("u788","Это телеграмма.","This is a telegram.",["телеграмма"]),
 ("u789","Это пошлость.","This is vulgarity.",["пошлость"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("780-form-01","Courtesy","любезность, учтивый, любезный, приветливый and обходительный.",
  ["lyubeznost","uchtivyj","lyubeznyj","privetlivyj","obhoditelnyj"], "s:u780",
  "Do not confuse учтивый (courteous) with приветливый (friendly)."),
 ("781-form-02","Tact","тактичный, бестактный, бестактность, черствость and черствый.",
  ["taktichnyj","bestaktnyj","bestaktnost","cherstost","cherstvyj"], "s:u781",
  "Do not confuse бестактный (tactless) with черствый (callous)."),
 ("782-form-03","Manners","манеры, обхождение, поклон, реверанс and церемонность.",
  ["manery","obhozhdenie","poklon","reverans","ceremonnost"], "s:u782",
  "Do not confuse поклон (bow) with реверанс (curtsy)."),
 ("783-form-04","Insincerity","нахальство, угодливость, подобострастие, фальшь and лицемер.",
  ["nahalstvo","ugodlivost","podobostrastie","falsh","licemer"], "s:u783",
  "Do not confuse угодливость (obsequiousness) with подобострастие (servility)."),
 ("784-form-05","Brevity","многословие, многословный, лаконичный, лаконизм and сжатость.",
  ["mnogoslovie","mnogoslovnyj","lakonichnyj","lakonizm","szhatost"], "s:u784",
  "Do not confuse лаконизм (laconism) with сжатость (conciseness)."),
 ("785-form-06","Style","обстоятельный, экспрессия, публицистика, канцелярский and неофициальный.",
  ["obstojatelnyj","expressiya","publicistika","kanceljarskij","neoficialnyj"], "s:u785",
  "Do not confuse публицистика (journalism) with канцелярский (bureaucratic)."),
 ("786-form-07","Regard","лесть, льстец, признательность, соболезнование and позволение.",
  ["lest","lstec","priznatelnost","soboleznovanie","pozvolenie"], "s:u786",
  "Do not confuse лесть (flattery) with признательность (appreciation)."),
 ("787-form-08","Reproach","укор, укоризна, смягчать, смягчение and подшучивать.",
  ["ukor","ukorizna","smyagchat","smyagchenie","podshuchivat"], "s:u787",
  "Do not confuse укор (reproach) with укоризна (blame)."),
 ("788-form-09","Official","официоз, протокольный, слушание, телеграмма and обходительность.",
  ["oficioz","protokolnyj","slushanie","telegramma","obhoditelnost"], "s:u788",
  "Do not confuse официоз (officialdom) with протокольный (protocol)."),
 ("789-form-10","Care","заботливость, предупредительность, пошлость, пошлый and вульгарный.",
  ["zabotlivost","predupreditelnost","poshlost","poshlyj","vulgarnej"], "s:u789",
  "Do not confuse пошлый (vulgar) with вульгарный (vulgar)."),
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

print("ru batch 76 written")
assert len(WORDS) == 50, len(WORDS)
