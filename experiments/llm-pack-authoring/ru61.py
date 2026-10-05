#!/usr/bin/env python3
"""ru-RU batch 61: B2 units 630-639 (concessions, conditions, and compromise)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("vstrechnyy","встречный","встрéчный","counter- (adj.)"),
 ("tonkost","тонкость","тóнкость","subtlety"),
 ("vzaimnyy","взаимный","взáимный","mutual"),
 ("vzaimovygodnyy","взаимовыгодный","взаимовыгóдный","mutually beneficial"),
 ("barter","бартер","бáртер","barter"),
 ("razmen","размен","разрéмен","swap, exchange"),
 ("razmenivat","разменивать","разменивáть","to exchange"),
 ("razmenyat","разменять","разменýть","to exchange (pf.)"),
 ("postupitsya","поступиться","поступúться","to relinquish"),
 ("zhertvovat","жертвовать","жéртвовать","to sacrifice"),
 ("snishoditelnost","снисходительность","снисходúтельность","indulgence"),
 ("snishoditelnyy","снисходительный","снисходúтельный","indulgent"),
 ("lojalnost","лояльность","лоя́льность","loyalty"),
 ("lojalnyy","лояльный","лоя́льный","loyal"),
 ("nelojalnyy","нелояльный","нелоя́льный","disloyal"),
 ("podlost","подлость","пóдлость","meanness"),
 ("podlyy","подлый","пóдлый","mean"),
 ("nedostoynyy","недостойный","недостóйный","unworthy"),
 ("nechestnost","нечестность","нечéстность","dishonesty"),
 ("nechestnyy","нечестный","нечéстный","dishonest"),
 ("obmanshchik","обманщик","обмáнщик","deceiver, swindler"),
 ("naduvatelstvo","надувательство","надувáтельство","swindling"),
 ("afera","афера","афéра","swindle, affair"),
 ("makhinaciya","махинация","махинáция","scheme, machination"),
 ("manipulirovat","манипулировать","манипулúровать","to manipulate"),
 ("dogovornoy","договорной","договорнóй","contractual"),
 ("kontraktnyy","контрактный","контрáктный","contract (adj.)"),
 ("soglasitelnyy","согласительный","согласúтельный","conciliation (adj.)"),
 ("primirit","примирить","примирúть","to reconcile"),
 ("primiritelnyy","примирительный","примирúтельный","conciliatory"),
 ("zatishye","затишье","затúшье","lull"),
 ("peredyshka","передышка","перéдышка","breather"),
 ("posrednichestvo","посредничество","посреднúчество","mediation"),
 ("posrednicheskiy","посреднический","посреднúческий","mediation (adj.)"),
 ("peregovornyy","переговорный","переговорнóй","negotiation (adj.)"),
 ("ratifikaciya","ратификация","ратификáция","ratification"),
 ("ratificirovat","ратифицировать","ратифицúровать","to ratify"),
 ("podpisanie","подписание","подписáние","signing"),
 ("parafirovanie","парафирование","парафúрование","initialing"),
 ("obyazyvayushchiy","обязывающий","обязывáющий","binding"),
 ("neobyazyvayushchiy","необязывающий","необязывáющий","non-binding"),
 ("dobrovolnost","добровольность","доброво́льность","voluntariness"),
 ("prinuditelnyy","принудительный","принудúтельный","coercive"),
 ("prinuzhdenie","принуждение","принуждéние","coercion"),
 ("shantazh","шантаж","шанта́ж","blackmail"),
 ("shantazhirovat","шантажировать","шантажúровать","to blackmail"),
 ("vymogatelstvo","вымогательство","вымогáтельство","extortion"),
 ("vymogat","вымогать","вымогáть","to extort"),
 ("vymogatel","вымогатель","вымогáтель","extortionist"),
 ("konsilium","консилиум","консúлиум","consultation board"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.neg.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "neg3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-pri-uslovii-chto", "name": "При условии, что", "category": "syntax",
  "definition": "Conditional concessions use при условии, что: при условии, что срок сдвинется. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-zamyan", "name": "Взамен + gen", "category": "syntax",
  "definition": "Exchanges use взамен: взамен уступки. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u630","Это размен.","This is a swap.",["размен"]),
 ("u631","Это бартер.","This is barter.",["бартер"]),
 ("u632","Это лояльность.","This is loyalty.",["лояльность"]),
 ("u633","Это подлость.","This is meanness.",["подлость"]),
 ("u634","Это афера.","This is a swindle.",["афера"]),
 ("u635","Это затишье.","This is a lull.",["затишье"]),
 ("u636","Это передышка.","This is a breather.",["передышка"]),
 ("u637","Это подписание.","This is a signing.",["подписание"]),
 ("u638","Это принуждение.","This is coercion.",["принуждение"]),
 ("u639","Это шантаж.","This is blackmail.",["шантаж"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("630-con-01","Counter-offers","встречный, тонкость, бартер, размен and разменивать.",
  ["vstrechnyy","tonkost","barter","razmen","razmenivat"], "s:u630",
  "Do not confuse размен (swap) with обмен (exchange)."),
 ("631-con-02","Mutuality","взаимный, взаимовыгодный, разменять, поступиться and жертвовать.",
  ["vzaimnyy","vzaimovygodnyy","razmenyat","postupitsya","zhertvovat"], "s:u631",
  "Do not confuse поступиться (to relinquish) with жертвовать (to sacrifice)."),
 ("632-con-03","Indulgence","снисходительность, снисходительный, лояльность, лояльный and нелояльный.",
  ["snishoditelnost","snishoditelnyy","lojalnost","lojalnyy","nelojalnyy"], "s:u632",
  "Do not confuse лояльный (loyal) with снисходительный (indulgent)."),
 ("633-con-04","Fairness","подлость, подлый, недостойный, нечестность and нечестный.",
  ["podlost","podlyy","nedostoynyy","nechestnost","nechestnyy"], "s:u633",
  "Do not confuse подлый (mean) with нечестный (dishonest)."),
 ("634-con-05","Swindling","обманщик, надувательство, афера, махинация and манипулировать.",
  ["obmanshchik","naduvatelstvo","afera","makhinaciya","manipulirovat"], "s:u634",
  "Do not confuse афера (swindle) with махинация (scheme)."),
 ("635-con-06","Conciliation","договорной, контрактный, согласительный, примирить and примирительный.",
  ["dogovornoy","kontraktnyy","soglasitelnyy","primirit","primiritelnyy"], "s:u635",
  "Do not confuse примирить (to reconcile) with уговорить (to persuade)."),
 ("636-con-07","Ceasefire","затишье, передышка, посредничество, посреднический and переговорный.",
  ["zatishye","peredyshka","posrednichestvo","posrednicheskiy","peregovornyy"], "s:u636",
  "Do not confuse посредничество (mediation) with переговоры (negotiations)."),
 ("637-con-08","Signing","ратификация, ратифицировать, подписание, парафирование and консилиум.",
  ["ratifikaciya","ratificirovat","podpisanie","parafirovanie","konsilium"], "s:u637",
  "Do not confuse подписание (signing) with ратификация (ratification)."),
 ("638-con-09","Binding","обязывающий, необязывающий, добровольность, принудительный and принуждение.",
  ["obyazyvayushchiy","neobyazyvayushchiy","dobrovolnost","prinuditelnyy","prinuzhdenie"], "s:u638",
  "Do not confuse добровольность (voluntariness) with принуждение (coercion)."),
 ("639-con-10","Coercion","шантаж, шантажировать, вымогательство, вымогать and вымогатель.",
  ["shantazh","shantazhirovat","vymogatelstvo","vymogat","vymogatel"], "s:u639",
  "Do not confuse шантаж (blackmail) with вымогательство (extortion)."),
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

print("ru batch 61 written")
assert len(WORDS) == 50, len(WORDS)
