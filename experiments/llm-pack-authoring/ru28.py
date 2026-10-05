#!/usr/bin/env python3
"""ru-RU batch 28: B1 units 300-309 (feelings, misunderstandings, repair)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("emociya","эмоция","эмо́ция","emotion"),
 ("toska","тоска","тоска́","melancholy"),
 ("pechal","печаль","печа́ль","sorrow"),
 ("trevoga","тревога","трево́га","anxiety"),
 ("revnost","ревность","ре́вность","jealousy"),
 ("styd","стыд","стыд","shame"),
 ("dostoinstvo","достоинство","доста́инство","dignity"),
 ("zavist","зависть","за́висть","envy"),
 ("nezhnost","нежность","не́жность","tenderness"),
 ("simpatiya","симпатия","симпа́тия","sympathy"),
 ("antipatiya","антипатия","антипа́тия","antipathy"),
 ("nedoponimanie","недопонимание","недопонима́ние","misunderstanding"),
 ("putanica","путаница","пу́таница","mix-up"),
 ("nedorazumenie","недоразумение","недоразуме́ние","misunderstanding"),
 ("opravdanie","оправдание","оправда́ние","justification"),
 ("uprek","упрёк","упрёк","reproach"),
 ("molchanie","молчание","молча́ние","silence"),
 ("primirenie","примирение","примире́ние","reconciliation"),
 ("obnyat","обнять","обня́ть","to hug"),
 ("pceluy","поцелуй","поцелу́й","kiss"),
 ("obyatie","объятие","объя́тие","embrace"),
 ("zhest","жест","же́ст","gesture"),
 ("mimika","мимика","мими́ка","facial expression"),
 ("ulybka","улыбка","улы́бка","smile"),
 ("hmuryj","хмурый","хму́рый","frowning"),
 ("plakat","плакать","пла́кать","to cry"),
 ("smeyatsya","смеяться","смея́ться","to laugh"),
 ("shutka","шутка","шу́тка","joke"),
 ("yumor","юмор","ю́мор","humor"),
 ("ironiya","ирония","иро́ния","irony"),
 ("sarkazm","сарказм","сарка́зм","sarcasm"),
 ("vostorg","восторг","во́сторг","delight"),
 ("vdokhnovenie","вдохновение","вдохнове́ние","inspiration"),
 ("grustnyj","грустный","гру́стный","sad"),
 ("odinochestvo","одиночество","одино́чество","loneliness"),
 ("skuka","скука","ску́ка","boredom"),
 ("bojazn","боязнь","боя́знь","fear"),
 ("udivlenie","удивление","удивле́ние","surprise"),
 ("napryazhenie","напряжение","напряже́ние","tension"),
 ("razlad","разлад","разлад","discord"),
 ("doveryat","доверять","доверя́ть","to trust"),
 ("razocharovat","разочаровать","разочаро́вать","to disappoint"),
 ("opravat","оправдать","оправда́ть","to justify, acquit"),
 ("obvinyat","обвинять","обвиня́ть","to accuse"),
 ("protiv","против","про́тив","against"),
 ("pohozhe","похоже","похо́же","it seems"),
 ("vyglyadet","выглядеть","выгляде́ть","to look"),
 ("oshchat","ощущать","ощуща́ть","to feel"),
 ("perezhivat","переживать","пережива́ть","to worry, experience"),
 ("podderzhat","поддержать","поддержа́ть","to support"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.feelings.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "feelings.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.perezhivat-o", "name": "Переживать о + prepositional", "category": "syntax",
  "definition": "Worrying uses переживать о + prepositional: переживать о друге. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.repair-chunks", "name": "Repair chunks", "category": "syntax",
  "definition": "Repair uses давай + мириться/поговорить: давай мириться, давай поговорим. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u300","Это эмоция.","This is an emotion.",["эмоция"]),
 ("u301","Это тревога.","This is anxiety.",["тревога"]),
 ("u302","Это путаница.","This is a mix-up.",["путаница"]),
 ("u303","Это недоразумение.","This is a misunderstanding.",["недоразумение"]),
 ("u304","Это упрёк.","This is a reproach.",["упрёк"]),
 ("u305","Это молчание.","This is silence.",["молчание"]),
 ("u306","Это примирение.","This is reconciliation.",["примирение"]),
 ("u307","Это улыбка.","This is a smile.",["улыбка"]),
 ("u308","Это шутка.","This is a joke.",["шутка"]),
 ("u309","Это восторг.","This is delight.",["восторг"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("300-feelings-01","Emotions","эмоция, печаль, тоска, тревога and грустный.",
  ["emociya","pechal","toska","trevoga","grustnyj"], "s:u300",
  "Do not confuse печаль (sorrow) with тоска (melancholy)."),
 ("301-feelings-02","Anxiety","тревога, боязнь, одиночество, напряжение and переживать.",
  ["trevoga","bojazn","odinochestvo","napryazhenie","perezhivat"], "s:u301",
  "Do not confuse боязнь (fear) with тревога (anxiety)."),
 ("302-feelings-03","Mix-ups","путаница, недоразумение, недопонимание, разлад and похоже.",
  ["putanica","nedorazumenie","nedoponimanie","razlad","pohozhe"], "s:u302",
  "Do not confuse путаница (mix-up) with разлад (discord)."),
 ("303-feelings-04","Misunderstanding","недоразумение, недопонимание, оправдать, обвинять and против.",
  ["nedorazumenie","nedoponimanie","opravat","obvinyat","protiv"], "s:u303",
  "Do not confuse оправдать (justify) with обвинять (accuse)."),
 ("304-feelings-05","Reproach","упрёк, оправдание, стыд, достоинство and молчание.",
  ["uprek","opravdanie","styd","dostoinstvo","molchanie"], "s:u304",
  "Do not confuse упрёк (reproach) with оправдание (justification)."),
 ("305-feelings-06","Silence","молчание, разлад, напряжение, доверять and поддерживать.",
  ["molchanie","razlad","napryazhenie","doveryat","podderzhat"], "s:u305",
  "Do not confuse молчание (silence) with разлад (discord)."),
 ("306-feelings-07","Reconciliation","примирение, обнять, объятие, поцелуй and жест.",
  ["primirenie","obnyat","obyatie","pceluy","zhest"], "s:u306",
  "Do not confuse объятие (embrace) with жест (gesture)."),
 ("307-feelings-08","Smile","улыбка, мимика, хмурый, выглядеть and ощущать.",
  ["ulybka","mimika","hmuryj","vyglyadet","oshchat"], "s:u307",
  "Do not confuse мимика (facial expression) with улыбка (smile)."),
 ("308-feelings-09","Jokes","шутка, юмор, ирония, сарказм and смеяться.",
  ["shutka","yumor","ironiya","sarkazm","smeyatsya"], "s:u308",
  "Do not confuse ирония (irony) with сарказм (sarcasm)."),
 ("309-feelings-10","Delight","восторг, удивление, вдохновение, нежность and плакать.",
  ["vostorg","udivlenie","vdokhnovenie","nezhnost","plakat"], "s:u309",
  "Do not confuse вдохновение (inspiration) with удивление (surprise)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.feelings.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.relationships"')
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
    L.append(f'  expected_interpretations: ["{title}: feelings with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 28 written")
assert len(WORDS) == 50, len(WORDS)
