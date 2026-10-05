#!/usr/bin/env python3
"""ja-JP batch 75: B2 units 790-799 (humor tail + relationships-deep start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

H = [
 ("kyofu","きょうふ","noun","absurdity"),
 ("baki","ばか","noun","foolishness"),
 ("jiko","じこ","noun","self"),
 ("kenjou","けんじょう","noun","modesty"),
 ("hiji","ひじ","noun","elbow (idiom)"),
 ("te2","て","noun","hand"),
 ("ashi","あし","noun","leg"),
 ("kubi","くび","noun","neck"),
 ("kao","かお","noun","face"),
 ("mune","むね","noun","chest, heart"),
 ("onake","おなか","noun","stomach"),
 ("atama","あたま","noun","head"),
 ("me2","め","noun","eye"),
 ("mimi","みみ","noun","ear"),
 ("kuchi","くち","noun","mouth"),
]
REL = [
 ("kizuna","きずな","noun","bond"),
 ("shinko","しんこう","noun","trust, faith"),
 ("kaitaku","かいたく","noun","relief"),
 ("yamaimadara","やまいただら","noun","hopes and worries"),
 ("omoide","おもいで","noun","memory"),
 ("tsukai","つかい","noun","errand"),
 ("kaigi2","かいぎ","noun","meeting"),
 ("kenkyo","けんきょ","na-adjective","modest"),
 ("shinsetsu","しんせつ","na-adjective","kind"),
 ("shimatsu","しまつ","noun","management, end"),
 ("yoji","ようじ","noun","business, errand"),
 ("setsu","せつ","noun","season, set"),
 ("renraku","れんらく","noun","contact"),
 ("hokoku","ほうこく","noun","report"),
 ("sodan","そうだん","noun","consultation"),
 ("kenzai","けんざい","noun","examination"),
 ("chokai","ちょうかい","noun","understanding"),
 ("hakai2","はかい","noun","respect"),
 ("soncho","そんちょう","noun","respect"),
 ("aijo","あいじょう","noun","affection"),
 ("jooho2","じょうほう","noun","information"),
 ("kokan","こうかん","noun","exchange"),
 ("kofuku","こうふく","na-adjective","happy"),
 ("futsu","ふつう","noun","normal"),
 ("ketsui","けつい","noun","decision"),
 ("kangeki","かんげき","noun","emotion"),
 ("kansha","かんしゃ","noun","gratitude"),
 ("hangeki","はんげき","noun","revenge"),
 ("fuman","ふまん","noun","discontent"),
 ("shikin","しきん","noun","funds"),
 ("yuuai","ゆうあい","noun","friendship"),
 ("yujo","ゆうじょう","noun","friendship"),
 ("rikai","りかい","noun","understanding"),
 ("takai","たかい","i-adjective","high, expensive"),
 ("kankei3","かんけい","noun","relationship"),
]
assert len(H) == 15 and len(REL) == 35

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "humor2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in H:
        f.write(json.dumps(entry("humor2", rid, kana, pos, gloss, "humor"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "rel1.jsonl"), "w") as f:
    for rid, kana, pos, gloss in REL:
        f.write(json.dumps(entry("rel1", rid, kana, pos, gloss, "relationships"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-tsurete-ite", "name": "〜につれて (as)", "category": "syntax",
  "definition": "につれて marks parallel change: ねんれい に つれて やわらかく なる. Draft definition pending review."},
 {"id": "ja.grammar.b2-ni-hansite", "name": "〜に反して (contrary to)", "category": "syntax",
  "definition": "に反して marks opposition to expectation: きぼう に はんして かなわなかった. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("absurd-humor","きょうふ な はなし で わらいました。","kyoufu na hanashi de waraimashita.","We laughed at an absurd story.",["きょうふ"]),
 ("self-deprecating","じぶん の ばか さ を わらいました。","jibun no baka sa wo waraimashita.","I laughed at my own foolishness.",["ばか"]),
 ("humor-essay","えっせー の なか に けいじ を いれました。","essay no naka ni keiji wo iremashita.","I put humor into the essay.",["けいじ"]),
 ("long-term-commitment","ながい ねんれい の ともだち と の きずな を だいじ に します。","nagai nenrei no tomodachi to no kizuna wo daiji ni shimasu.","I value the bond with a friend of many years.",["きずな"]),
 ("family-conflict","かぞく の なか の もめごと を そうだん しました。","kazoku no naka no momegoto wo soudan shimashita.","I consulted about a family dispute.",["そうだん"]),
 ("caregiving-talk","かいご の ことば を べんきょう しました。","kaigo no kotoba wo benkyou shimashita.","I studied the words of caregiving.",["かいご"]),
 ("friendship-maintenance","ともだち と まれ に れんらく を とります。","tomodachi to mare ni renraku wo torimasu.","I rarely contact friends.",["れんらく"]),
 ("mentor-relationship","せんせい と の しんこう の かんけい を べんきょう しました。","sensei to no shinkou no kankei wo benkyou shimashita.","I studied the relationship of trust with a teacher.",["しんこう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.relationships-deep", "goal_id": "ja.goal.b2.relationships-deep",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss a family or friendship matter using taught relationship vocabulary",
              "express trust, gratitude, or a boundary without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.relationships-deep
    description: 'Discuss deep relationships: commitment, family conflict, caregiving, and friendship.'
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
    - target: ja.goal.b2.culture-identity
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.rel1.kizuna
    - ja.lex.rel1.shinko
    assessment_ids:
    - ja.assess.relationships-deep
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

DEP = """- from: ja.goal.b2.relationships-deep
  to: ja.goal.b2.culture-identity
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

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

PLAYG = "ja.goal.b2.humor-wordplay"
RELG = "ja.goal.b2.relationships-deep"
U = [
 ("790-absurd-humor","absurd humor","790-absurd-humor",PLAYG,"humor2",
  ["kyofu","baki","jiko","kenjou","hiji"], "s:absurd-humor"),
 ("791-self-deprecating","self-deprecating","791-self-deprecating",PLAYG,"humor2",
  ["te2","ashi","kubi","kao","mune"], "s:self-deprecating"),
 ("792-humor-essay","humor essay","792-humor-essay",PLAYG,"humor2",
  ["onake","atama","me2","mimi","kuchi"], "s:humor-essay"),
 ("793-long-term-commitment","long-term commitment","793-long-term-commitment",RELG,"rel1",
  ["kizuna","shinko","kaitaku","yamaimadara","kenkyo"], "s:long-term-commitment"),
 ("794-family-conflict","family conflict","794-family-conflict",RELG,"rel1",
  ["shinsetsu","shimatsu","yoji","setsu","renraku"], "s:family-conflict"),
 ("795-caregiving-talk","caregiving talk","795-caregiving-talk",RELG,"rel1",
  ["hokoku","sodan","kenzai","chokai","hakai2"], "s:caregiving-talk"),
 ("796-friendship-maintenance","friendship maintenance","796-friendship-maintenance",RELG,"rel1",
  ["soncho","aijo","jooho2","kokan","kofuku"], "s:friendship-maintenance"),
 ("797-mentor-relationship","mentor relationship","797-mentor-relationship",RELG,"rel1",
  ["futsu","ketsui","kangeki","kansha","hangeki"], "s:mentor-relationship"),
 ("798-conflict-mediation","conflict mediation","798-conflict-mediation",RELG,"rel1",
  ["fuman","shikin","yuuai","yujo","rikai"], "g:ja.grammar.b2-ni-tsurete-ite"),
 ("799-boundary-setting","boundary setting","799-boundary-setting",RELG,"rel1",
  ["takai","kenkyo","shinsetsu","chokai","kansha"], "g:ja.grammar.b2-ni-hansite"),
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

print("batch75 written")
