#!/usr/bin/env python3
"""ru-RU batch 65: B2 units 670-679 (institutions, participation, and responsibilities)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("institutsionalnyy","институциональный","институциона́льный","institutional"),
 ("soucastie","соучастие","соучáстие","complicity"),
 ("soucastnik","соучастник","соучáстник","accomplice"),
 ("bezotvetstvennost","безответственность","безответствéнность","irresponsibility"),
 ("bezotvetstvennyy","безответственный","безответствéнный","irresponsible"),
 ("samoupravlenie","самоуправление","самоуправлéние","self-government"),
 ("obshchina","община","обшúна","community"),
 ("samoorganizaciya","самоорганизация","самоорганизáция","self-organization"),
 ("dobrovolets","доброволец","добровóлец","volunteer"),
 ("blagotvoritelnost","благотворительность","благотворúтельность","charity"),
 ("blagotvoritel","благотворитель","благотворúтель","philanthropist"),
 ("pozherstvovanie","пожертвование","пожертвóвание","donation"),
 ("pozherstvovat","пожертвовать","пожертвóвать","to donate"),
 ("vznos","взнос","взнóс","membership fee, contribution"),
 ("chlenstvo","членство","члéнство","membership"),
 ("ryady","ряды","рýды","ranks"),
 ("aktiv","актив","актúв","activists, active core"),
 ("ravnodushie","равнодушие","равнодýшие","indifference"),
 ("ravnodushnyy","равнодушный","равнодýшный","indifferent"),
 ("bezrazlichie","безразличие","безразлúчие","indifference"),
 ("bezrazlichnyy","безразличный","безразлúчный","indifferent"),
 ("prichastnost","причастность","причáстность","implication"),
 ("prichastnyy","причастный","причáстный","implicated"),
 ("yurisdikciya","юрисдикция","юрисдúкция","jurisdiction"),
 ("glasnost","гласность","глáсность","publicity, openness"),
 ("prozrachnost","прозрачность","прозра́чность","transparency"),
 ("zasekrechennyy","засекреченный","засéкреченный","classified"),
 ("sekretnost","секретность","секрéтность","secrecy"),
 ("tsennosti","ценности","ценнóсти","values"),
 ("nravstvennost","нравственность","нрáвственность","morality"),
 ("nravstvennyy","нравственный","нрáвственный","moral"),
 ("etichnyy","этичный","éтичный","ethical"),
 ("neetichnyy","неэтичный","неéтичный","unethical"),
 ("dobrosovestnost","добросовестность","добросовéстность","conscientiousness, good faith"),
 ("dobrosovestnyy","добросовестный","добросовéстный","conscientious"),
 ("nedobrosovestnyy","недобросовестный","недобросовéстный","unscrupulous"),
 ("zloupotreblenie","злоупотребление","злоупотреблéние","abuse, misuse"),
 ("zloupotreblyat","злоупотреблять","злоупотреблýть","to abuse, misuse"),
 ("prevyshenie","превышение","превýшение","exceeding"),
 ("prevysit","превысить","превы́сить","to exceed"),
 ("privilegiya","привилегия","привилéгия","privilege"),
 ("privilegirovannyy","привилегированный","привилегúрованный","privileged"),
 ("ravnopravie","равноправие","равнопрáвие","equality of rights"),
 ("ravnopravnyy","равноправный","равнопрáвный","equal in rights"),
 ("nespravedlivost","несправедливость","несправéдливость","injustice"),
 ("proizvolnyy","произвольный","произвóльный","arbitrary"),
 ("bezzakonie","беззаконие","беззакóние","lawlessness"),
 ("byurokratizm","бюрократизм","бюрокрáтизм","bureaucratism"),
 ("predvybornyy","предвыборный","предвúборный","pre-election"),
 ("partiynyy","партийный","партúйный","party (adj.)"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.soc.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "soc3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-otvechaet-pered", "name": "Отвечает перед + instr", "category": "syntax",
  "definition": "Accountability uses отвечает перед: отвечает перед обществом. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-uchastvuet-v", "name": "Участвует в + prep", "category": "syntax",
  "definition": "Participation uses участвует в: участвует в обсуждении. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u670","Это самоуправление.","This is self-government.",["самоуправление"]),
 ("u671","Это взнос.","This is a membership fee.",["взнос"]),
 ("u672","Это актив.","This is the active core.",["актив"]),
 ("u673","Это равнодушие.","This is indifference.",["равнодушие"]),
 ("u674","Это юрисдикция.","This is jurisdiction.",["юрисдикция"]),
 ("u675","Это привилегия.","This is a privilege.",["привилегия"]),
 ("u676","Это нравственность.","This is morality.",["нравственность"]),
 ("u677","Это добросовестность.","This is conscientiousness.",["добросовестность"]),
 ("u678","Это злоупотребление.","This is abuse.",["злоупотребление"]),
 ("u679","Это равноправие.","This is equality of rights.",["равноправие"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("670-inst-01","Institutions","институциональный, самоуправление, община, самоорганизация and бюрократизм.",
  ["institutsionalnyy","samoupravlenie","obshchina","samoorganizaciya","byurokratizm"], "s:u670",
  "Do not confuse самоуправление (self-government) with самоорганизация (self-organization)."),
 ("671-inst-02","Participation","доброволец, пожертвование, пожертвовать, взнос and членство.",
  ["dobrovolets","pozherstvovanie","pozherstvovat","vznos","chlenstvo"], "s:u671",
  "Do not confuse пожертвование (donation) with взнос (membership fee)."),
 ("672-inst-03","Ranks","ряды, актив, партийный, предвыборный and гласность.",
  ["ryady","aktiv","partiynyy","predvybornyy","glasnost"], "s:u672",
  "Do not confuse актив (active core) with ряды (ranks)."),
 ("673-inst-04","Indifference","равнодушие, равнодушный, безразличие, безразличный and причастность.",
  ["ravnodushie","ravnodushnyy","bezrazlichie","bezrazlichnyy","prichastnost"], "s:u673",
  "Do not confuse равнодушие (indifference) with причастность (implication)."),
 ("674-inst-05","Implication","причастный, соучастие, соучастник, юрисдикция and прозрачность.",
  ["prichastnyy","soucastie","soucastnik","yurisdikciya","prozrachnost"], "s:u674",
  "Do not confuse соучастие (complicity) with причастность (implication)."),
 ("675-inst-06","Privileges","засекреченный, секретность, привилегия, привилегированныу and произвольный.",
  ["zasekrechennyy","sekretnost","privilegiya","privilegirovannyy","proizvolnyy"], "s:u675",
  "Do not confuse привилегия (privilege) with секретность (secrecy)."),
 ("676-inst-07","Values","ценности, нравственность, нравственный, этичный and неэтичный.",
  ["tsennosti","nravstvennost","nravstvennyy","etichnyy","neetichnyy"], "s:u676",
  "Do not confuse нравственность (morality) with этичный (ethical)."),
 ("677-inst-08","Good faith","добросовестность, добросовестный, недобросовестный, злоупотребление and злоупотреблять.",
  ["dobrosovestnost","dobrosovestnyy","nedobrosovestnyy","zloupotreblenie","zloupotreblyat"], "s:u677",
  "Do not confuse добросовестность (good faith) with злоупотребление (abuse)."),
 ("678-inst-09","Abuse","превышение, превысить, безответственность, безответственный and беззаконие.",
  ["prevyshenie","prevysit","bezotvetstvennost","bezotvetstvennyy","bezzakonie"], "s:u678",
  "Do not confuse превышение (exceeding) with беззаконие (lawlessness)."),
 ("679-inst-10","Fairness","равноправие, равноправный, несправедливость, благотворительность and благотворитель.",
  ["ravnopravie","ravnopravnyy","nespravedlivost","blagotvoritelnost","blagotvoritel"], "s:u679",
  "Do not confuse равноправие (equality) with несправедливость (injustice)."),
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

print("ru batch 65 written")
assert len(WORDS) == 50, len(WORDS)
