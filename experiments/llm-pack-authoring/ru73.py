#!/usr/bin/env python3
"""ru-RU batch 73: B2 units 750-759 (identity, belonging, and representation)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("prinadlezhnost","принадлежность","принадле́жность","belonging"),
 ("reprezentaciya","репрезентация","репрезента́ция","representation"),
 ("neterpimost","нетерпимость","нетерпи́мость","intolerance"),
 ("ksenofobiya","ксенофобия","ксенофо́бия","xenophobia"),
 ("rasizm","расизм","ра́сизм","racism"),
 ("neuvazenie","неуважение","неуваже́ние","disrespect"),
 ("prezrenie","презрение","презре́ние","contempt"),
 ("nenavist","ненависть","не́нависть","hatred"),
 ("tovarishchestvo","товарищество","товари́щество","comradeship, fellowship"),
 ("obshchnost","общность","о́бщность","community, commonality"),
 ("samobytnost","самобытность","самобы́тность","distinctiveness, originality"),
 ("autentichnost","аутентичность","аутенти́чность","authenticity"),
 ("podlinnost","подлинность","по́длинность","authenticity, genuineness"),
 ("konformizm","конформизм","конформи́зм","conformism"),
 ("nonkonformist","нонконформист","нонконформи́ст","nonconformist"),
 ("marginal","маргинал","маргина́л","marginal person"),
 ("autsajder","аутсайдер","аутса́йдер","outsider"),
 ("izgoy","изгой","изго́й","outcast"),
 ("otshelnik","отшельник","о́тшельник","hermit"),
 ("odinochka","одиночка","одино́чка","loner"),
 ("samoidentifikaciya","самоидентификация","самоидентифика́ция","self-identification"),
 ("samoopredelenie","самоопределение","самоопределе́ние","self-determination"),
 ("individualnost","индивидуальность","индивиду\u0301альность","individuality"),
 ("samouvazenie","самоуважение","самоуваже́ние","self-respect"),
 ("samouverennost","самоуверенность","самоуве́ренность","self-confidence"),
 ("zastenchivost","застенчивость","засте́нчивость","shyness"),
 ("tshcheslavie","тщеславие","тщесла́вие","vanity"),
 ("vysokomerie","высокомерие","высоко́мерие","arrogance"),
 ("spes","спесь","спе́сь","hubris, arrogance"),
 ("gordynya","гордыня","горды́ня","hubris, pride"),
 ("trusost","трусость","тру́тость","cowardice"),
 ("hrabrost","храбрость","хра́брость","bravery"),
 ("samoutverzhdenie","самоутверждение","самоутвержде́ние","self-assertion"),
 ("unikalnost","уникальность","уника́льность","uniqueness"),
 ("chuzhoy","чужой","чужо́й","someone else's, foreign"),
 ("svoy","свой","свой́","one's own"),
 ("chuzhdyj","чуждый","чужды́й","alien, hostile to"),
 ("lichnost","личность","ли́чность","person, personality"),
 ("persona","персона","персона́","person, persona"),
 ("individ","индивид","индиви́д","individual"),
 ("individuum","индивидуум","индиви́дуум","individual"),
 ("konformnyj","конформный","конфо́рмный","conformist (adj.)"),
 ("buntar","бунтарь","бунта́рь","rebel"),
 ("myatezhnik","мятежник","мяте́жник","mutineer, rebel"),
 ("dissident","диссидент","диссиде́нт","dissident"),
 ("uedinenie","уединение","уедине́ние","solitude, seclusion"),
 ("prinadlezhat","принадлежать","принадлежа́ть","to belong to"),
 ("otnositsya","относиться","относи́ться","to relate to; to regard"),
 ("oshchushchenie","ощущение","ощуще́ние","sensation, feeling"),
 ("vospriyatie","восприятие","восприятие́","perception"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.cult.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "cult3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-chuvstvuet-sebya", "name": "Чувствует себя + instr", "category": "syntax",
  "definition": "Self-perception uses чувствует себя + instrumental: Он чувствует себя чужим. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-dlya-nego-vazhno", "name": "Для него важно + inf", "category": "syntax",
  "definition": "What matters to a person: для него важно принадлежать. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u750","Это общность.","This is a community.",["общность"]),
 ("u751","Это самоуважение.","This is self-respect.",["самоуважение"]),
 ("u752","Это подлинность.","This is authenticity.",["подлинность"]),
 ("u753","Это изгой.","This is an outcast.",["изгой"]),
 ("u754","Это бунтарь.","This is a rebel.",["бунтарь"]),
 ("u755","Это диссидент.","This is a dissident.",["диссидент"]),
 ("u756","Это спесь.","This is hubris.",["спесь"]),
 ("u757","Это ненависть.","This is hatred.",["ненависть"]),
 ("u758","Это репрезентация.","This is a representation.",["репрезентация"]),
 ("u759","Это персона.","This is a persona.",["персона"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("750-iden-01","Belonging","принадлежность, общность, товарищество, принадлежать and относиться.",
  ["prinadlezhnost","obshchnost","tovarishchestvo","prinadlezhat","otnositsya"], "s:u750",
  "Do not confuse принадлежность (belonging) with собственность (property)."),
 ("751-iden-02","Self-definition","самоидентификация, самоопределение, самоутверждение, самоуважение and самоуверенность.",
  ["samoidentifikaciya","samoopredelenie","samoutverzhdenie","samouvazenie","samouverennost"], "s:u751",
  "Do not confuse самоуважение (self-respect) with самоуверенность (self-confidence)."),
 ("752-iden-03","Authenticity","самобытность, аутентичность, подлинность, уникальность and индивидуальность.",
  ["samobytnost","autentichnost","podlinnost","unikalnost","individualnost"], "s:u752",
  "Do not confuse аутентичность (authenticity) with подлинность (genuineness)."),
 ("753-iden-04","Outsiders","маргинал, аутсайдер, изгой, одиночка and уединение.",
  ["marginal","autsajder","izgoy","odinochka","uedinenie"], "s:u753",
  "Do not confuse одиночка (loner) with уединение (solitude)."),
 ("754-iden-05","Nonconformity","конформизм, нонконформист, конформный, бунтарь and мятежник.",
  ["konformizm","nonkonformist","konformnyj","buntar","myatezhnik"], "s:u754",
  "Do not confuse бунтарь (rebel) with мятежник (mutineer)."),
 ("755-iden-06","Dissent","диссидент, восприятие, ощущение, чужой and свой.",
  ["dissident","vospriyatie","oshchushchenie","chuzhoy","svoy"], "s:u755",
  "Do not confuse чужой (someone else's) with свой (one's own)."),
 ("756-iden-07","Pride","чуждый, гордыня, спесь, высокомерие and тщеславие.",
  ["chuzhdyj","gordynya","spes","vysokomerie","tshcheslavie"], "s:u756",
  "Do not confuse гордыня (hubris) with тщеславие (vanity)."),
 ("757-iden-08","Hostility","неуважение, презрение, ненависть, нетерпимость and ксенофобия.",
  ["neuvazenie","prezrenie","nenavist","neterpimost","ksenofobiya"], "s:u757",
  "Do not confuse презрение (contempt) with ненависть (hatred)."),
 ("758-iden-09","Representation","репрезентация, расизм, застенчивость, трусость and храбрость.",
  ["reprezentaciya","rasizm","zastenchivost","trusost","hrabrost"], "s:u758",
  "Do not confuse застенчивость (shyness) with трусость (cowardice)."),
 ("759-iden-10","Individual","индивид, индивидуум, личность, персона and отшельник.",
  ["individ","individuum","lichnost","persona","otshelnik"], "s:u759",
  "Do not confuse индивид (individual) with личность (person)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.cult.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.culture-perspectives"')
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
    L.append(f'  expected_interpretations: ["{title}: literary response with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 73 written")
assert len(WORDS) == 50, len(WORDS)
