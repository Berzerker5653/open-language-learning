#!/usr/bin/env python3
"""ja-JP batch 64: B2 units 680-689 (medicine tail + urban-life start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

MED = [
 ("iryou","いりょう","noun","medical care"),
 ("fukushi","ふくし","noun","welfare"),
 ("soudan","そうだん","noun","consultation"),
 ("houmon","ほうもん","noun","visit"),
 ("chiryou","ちりょう","noun","treatment"),
 ("roujin","ろうじん","noun","elderly person"),
 ("yogo","ようご","noun","nursing care"),
 ("kaigo","かいご","noun","care, caregiving"),
 ("katei","かてい","noun","household, home"),
 ("kofuku","こうふく","noun","wellbeing, welfare"),
 ("eiyou","えいよう","noun","nutrition"),
 ("tanpakushitsu","たんぱくしつ","noun","protein"),
 ("bitamin","びたみん","noun","vitamin"),
 ("karorii","かろりー","noun","calorie"),
 ("shokuzai","しょくざい","noun","food, ingredient"),
 ("fubyou","ふびょう","noun","inequality"),
 ("kakusa","かくさ","noun","disparity, gap"),
 ("binbou","びんぼう","noun","poverty"),
 ("koukyou","こうきょう","noun","public, community"),
 ("kenri","けんり","noun","right, entitlement"),
 ("denwa","でんわ","noun","telephone"),
 ("onrain","おんらいん","noun","online"),
 ("apuri","あぷり","noun","app, application"),
 ("denki","でんき","noun","electricity"),
 ("koukan","こうかん","noun","exchange, interchange"),
 ("rinri","りんり","noun","ethics, morals"),
 ("gimon","ぎもん","noun","doubt, question"),
 ("teigen","ていげん","noun","objection"),
 ("houritsu","ほうりつ","noun","law"),
 ("keni","けんい","noun","authority, power"),
 ("pandemu","ぱんでみっく","noun","pandemic"),
 ("taishuu","たいしゅう","noun","the public, masses"),
 ("kankyou","かんきょう","noun","environment"),
 ("jouhou","じょうほう","noun","information"),
 ("kyouryoku","きょうりょく","noun","cooperation"),
 ("seisaku","せいさく","noun","policy"),
 ("houan","ほうあん","noun","bill, proposal"),
 ("bunseki","ぶんせき","noun","analysis"),
 ("kouron","こうろん","noun","public debate"),
 ("shian","しあん","noun","guideline"),
]
URB = [
 ("toshi","とし","noun","city, urban area"),
 ("kuukan","くうかん","noun","space"),
 ("kouchiku","こうちく","noun","public facility"),
 ("machi","まち","noun","town, street"),
 ("keikaku","けいかく","noun","plan, planning"),
 ("koutsuu","こうつう","noun","transport, traffic"),
 ("densha","でんしゃ","noun","train"),
 ("basu","ばす","noun","bus"),
 ("unten","うんてん","noun","driving"),
 ("norikae","のりかえ","noun","transfer (transport)"),
]
assert len(MED) == 40 and len(URB) == 10

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "med2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in MED:
        f.write(json.dumps(entry("med2", rid, kana, pos, gloss, "medicine"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-dake-atte", "name": "〜だけあって (just as expected)", "category": "syntax",
  "definition": "だけあって confirms an expected quality: けんきゅう だけあって じょうほう が たしか. Draft definition pending review."},
 {"id": "ja.grammar.b2-muke-no", "name": "〜向けの (aimed at)", "category": "syntax",
  "definition": "向けの marks an target audience: たいしゅう むけ の かつどう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("mental-health-services","いりょう の そうだん を しました。","iryō no soudan wo shimashita.","I had a medical consultation.",["いりょう"]),
 ("aging-medicine","かいご の げんじょう を はなしました。","kaigo no genjou wo hanashimashita.","We talked about the state of caregiving.",["かいご"]),
 ("nutrition-science","えいよう の べんきょう を しました。","eiyou no benkyou wo shimashita.","I studied nutrition.",["えいよう"]),
 ("health-inequality","かくさ の もんだい を ぎろん しました。","kakusa no mondai wo giron shimashita.","We discussed the disparity problem.",["かくさ"]),
 ("digital-medicine","おんらいん の ちりょう を べんきょう しました。","onrain no chiryou wo benkyou shimashita.","I studied online treatment.",["おんらいん"]),
 ("ethics-debate","りんり の ぎろん を べんきょう しました。","rinri no giron wo benkyou shimashita.","I studied the ethics debate.",["りんり"]),
 ("pandemic-lessons","ぱんでみっく の きょうくん を はなしました。","pandemu no kyoukun wo hanashimashita.","We talked about pandemic lessons.",["ぱんでみっく"]),
 ("city-planning","とし けいかく について はなしました。","toshi keikaku ni tsuite hanashimashita.","We talked about city planning.",["とし"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.urban-life", "goal_id": "ja.goal.b2.urban-life",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe city space and transport using taught urban vocabulary",
              "discuss a planning proposal without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.urban-life
    description: 'Discuss cities: planning, space, facilities, and transport.'
    band: B2
    framework_refs: []
    contexts:
    - ja.situation.classroom
    modalities:
    - listening
    - speaking
    - reading
    - writing
    prerequisites:
    - target: ja.goal.b2.society-change
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.urban.toshi
    - ja.lex.urban.koutsuu
    assessment_ids:
    - ja.assess.urban-life
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-05'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.urban-life
  to: ja.goal.b2.society-change
  dimension: grammar-controlled
  required_state: independent
  strength: hard
"""
dp = os.path.join(R, "grammar", "dependencies.yaml")
with open(dp) as f:
    dep = f.read()
dep = dep.replace("notes:", DEP + "notes:", 1)
with open(dp, "w") as f:
    f.write(dep)
with open(os.path.join(R, "lexicon", "urban.jsonl"), "w") as f:
    for rid, kana, pos, gloss in URB:
        f.write(json.dumps(entry("urban", rid, kana, pos, gloss, "urban"), ensure_ascii=False) + "\n")

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

MEDG = "ja.goal.b2.medicine-society"
URBG = "ja.goal.b2.urban-life"
U = [
 ("680-mental-health-services","mental health services","680-mental-health-services",MEDG,"med2",
  ["iryou","fukushi","soudan","houmon","chiryou"], "s:mental-health-services"),
 ("681-aging-medicine","aging medicine","681-aging-medicine",MEDG,"med2",
  ["roujin","yogo","kaigo","katei","kofuku"], "s:aging-medicine"),
 ("682-nutrition-science","nutrition science","682-nutrition-science",MEDG,"med2",
  ["eiyou","tanpakushitsu","bitamin","karorii","shokuzai"], "s:nutrition-science"),
 ("683-health-inequality","health inequality","683-health-inequality",MEDG,"med2",
  ["fubyou","kakusa","binbou","koukyou","kenri"], "s:health-inequality"),
 ("684-digital-medicine","digital medicine","684-digital-medicine",MEDG,"med2",
  ["denwa","onrain","apuri","denki","koukan"], "s:digital-medicine"),
 ("685-medical-ethics","medical ethics","685-medical-ethics",MEDG,"med2",
  ["rinri","gimon","teigen","houritsu","keni"], "s:ethics-debate"),
 ("686-pandemic-lessons","pandemic lessons","686-pandemic-lessons",MEDG,"med2",
  ["pandemu","taishuu","kankyou","jouhou","kyouryoku"], "s:pandemic-lessons"),
 ("687-health-policy-essay","health policy essay","687-health-policy-essay",MEDG,"med2",
  ["seisaku","houan","bunseki","kouron","shian"], "g:ja.grammar.b2-dake-atte"),
 ("688-city-planning","city planning","688-city-planning",URBG,"urban",
  ["toshi","kuukan","kouchiku","machi","keikaku"], "s:city-planning"),
 ("689-transport-systems","transport systems","689-transport-systems",URBG,"urban",
  ["koutsuu","densha","basu","unten","norikae"], "g:ja.grammar.b2-muke-no"),
]

def unit_yaml(topic, uid, goal, shard, words, newitem):
    lex = [f"ja.lex.{shard}.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = ["# ai-assisted draft unit (Mode B B2); content refs are pack data; qualified review pending.",
             f"id: ja.unit.{uid}", f"goal_id: {goal}",
             f"title: {topic}", f"summary: B2 language for {topic}.",
             "estimated_minutes: 6", "generation_contract:", "  allowed_vocab:"]
    for r in lex + [x for x in refs if x.startswith("ja.sent.")]: lines.append(f"  - {r}")
    lines.append("  allowed_grammar:")
    for g in allowed_gram: lines.append(f"  - {g}")
    lines += ["  new_item_budget: 6", "  validation_method: choice", "activities:"]
    acts = [("enc","encounter-read","reading",5),("listen","listen-and-choose","listening",3),
            ("match","match","reading",2),("speak","recall-choice","speaking",2)]
    for aid, atype, mod, sup in acts:
        lines += [f"- id: ja.activity.{uid}-{aid}", f"  type: {atype}", f"  modality: {mod}",
                  f"  support_level: {sup}", "  content_refs:"]
        for r in refs: lines.append(f"  - {r}")
    cloze_refs = [r for r in refs if r.startswith("ja.sent.")][:2]
    for i, cr in enumerate(cloze_refs):
        lines += [f"- id: ja.activity.{uid}-cloze{i}", "  type: cloze", "  modality: writing",
                  "  support_level: 2", "  content_refs:", f"  - {cr}"]
    return "\n".join(lines) + "\n"

for fname, topic, uid, goal, shard, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch64 written")
