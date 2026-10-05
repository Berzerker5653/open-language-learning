#!/usr/bin/env python3
"""ja-JP batch 72: B2 units 760-769 (abstract-debate tail + nuance-register start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

A3 = [
 ("itchi","いっち","noun","consistency, agreement"),
 ("junjo","じゅんじょ","noun","consistency, order"),
 ("gosei","ごうせい","noun","synthesis"),
 ("yoryo","ようりょう","noun","summary"),
 ("koten","こうてん","noun","key point"),
 ("yoten","ようてん","noun","key point"),
 ("henyo","へんよう","noun","change, variation"),
 ("taisho","たいしょう","noun","contrast"),
 ("hikaku2","ひかく","noun","comparison"),
 ("kyoten","きょうてん","noun","common point"),
 ("sa","さ","noun","difference, gap"),
 ("kyoka","きょうか","noun","commonality"),
 ("chujutsu","ちゅうじゅつ","noun","quotation"),
 ("inyou","いんよう","noun","quotation, citation"),
 ("youso","ようそ","noun","element"),
]
REG = [
 ("keigo","けいご","noun","honorific language"),
 ("teinei","ていねい","na-adjective","polite"),
 ("katai","かたい","i-adjective","stiff, formal"),
 ("yawarakai","やわらかい","i-adjective","soft (expression)"),
 ("futsuu","ふつう","na-adjective","ordinary"),
 ("koushiki","こうしき","noun","formality"),
 ("kougo","こうご","noun","colloquial language"),
 ("kudai","くだい","noun","humility"),
 ("sonkeigo","そんけいご","noun","respectful language"),
 ("kenjougo","けんじょうご","noun","humble language"),
 ("teineigo","ていねいご","noun","polite language"),
 ("chokusetsu","ちょくせつ","na-adjective","direct"),
 ("hogen","ほうげん","noun","phrase, expression"),
 ("kotei2","こうてい","noun","set phrase"),
 ("yougen","ようげん","noun","assertion"),
 ("kougen","こうげん","noun","utterance"),
 ("shucho","しゅちょう","noun","claim"),
 ("enryo","えんりょ","noun","restraint, diffidence"),
 ("honne","ほんね","noun","true feeling"),
 ("tatemae","たてまえ","noun","public stance"),
 ("omomuki","おもむき","noun","nuance, taste"),
 ("kanji2","かんじ","noun","feeling, impression"),
 ("nyuansu","にゅうあんす","noun","nuance"),
 ("imi","いみ","noun","meaning"),
 ("bunmyaku","ぶんみゃく","noun","context"),
 ("chowa","ちょうわ","noun","harmony, tone"),
 ("kion","きおん","noun","tone (of voice)"),
 ("moyo","もうよう","noun","manner, style"),
 ("yoshiki","ようしき","noun","style, form"),
 ("kudaranai","くだらない","i-adjective","trivial, vulgar"),
 ("zonzai","ぞんざい","na-adjective","rough, casual"),
 ("reigi","れいぎ","noun","manners"),
 ("jouretsu","じょうれつ","na-adjective","courteous"),
 ("kotoba","ことば","noun","word, language"),
 ("ika","いかが","noun","manner (how)"),
]
assert len(A3) == 15 and len(REG) == 35

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "abst3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in A3:
        f.write(json.dumps(entry("abst3", rid, kana, pos, gloss, "abstract"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "reg1.jsonl"), "w") as f:
    for rid, kana, pos, gloss in REG:
        f.write(json.dumps(entry("reg1", rid, kana, pos, gloss, "register"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-kagiru", "name": "〜に限る (nothing but, limited to)", "category": "syntax",
  "definition": "に限る restricts to the best or only option: ぶんせき に かぎって さいよ い. Draft definition pending review."},
 {"id": "ja.grammar.b2-to-itara", "name": "〜っていったら (when it comes to)", "category": "syntax",
  "definition": "っていったら introduces a topic for evaluation: この ことば の おもむき っていったら、むずかしい. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("consistency-checks","いっち を かくにん しました。","itchi wo kakunin shimashita.","I checked the consistency.",["いっち"]),
 ("steel-manning","しゅちょう を より よい かたち に しました。","shucho wo yori yoi katachi ni shimashita.","I put the claim in a better form.",["しゅちょう"]),
 ("synthesis-essay","ようりょう を つくりました。","yoryou wo tsukurimashita.","I made a summary.",["ようりょう"]),
 ("formal-versus-casual","けいご と ふつう の ことば を つかいわけました。","keigo to futsuu no kotoba wo tsukaiwakemashita.","I divided honorific and ordinary words.",["けいご"]),
 ("written-style-variation","こうしき と こうご の ちがいを べんきょう しました。","koushiki to kougo no chigai wo benkyou shimashita.","I studied the difference between formal and colloquial language.",["こうしき"]),
 ("politeness-scales","そんけいご と けんじょうご を ならいました。","sonkeigo to kenjougo wo naramashita.","I learned respectful and humble language.",["そんけいご"]),
 ("indirect-expression","ほんね を えんりょ の ある いいかた で しました。","honne wo enryo no aru iikata de shimashita.","I stated the true feeling in a restrained way.",["ほんね"]),
 ("emphasis-devices","おもむき の ちがい を べんきょう しました。","omomuki no chigai wo benkyou shimashita.","I studied the difference in nuance.",["おもむき"]),
 ("hedge-words","こうげん の かた を やわらかく しました。","kougen no kata wo yawarakaku shimashita.","I softened the form of the utterance.",["こうげん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.nuance-register", "goal_id": "ja.goal.b2.nuance-register",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "shift between polite and casual wording appropriately for the situation",
              "use honorific or humble forms without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.nuance-register
    description: 'Adjust register and nuance: politeness scales, indirectness, and word choice.'
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
    - target: ja.goal.b2.language-linguistics
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.reg1.keigo
    - ja.lex.reg1.teinei
    assessment_ids:
    - ja.assess.nuance-register
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

DEP = """- from: ja.goal.b2.nuance-register
  to: ja.goal.b2.language-linguistics
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

ABSTG = "ja.goal.b2.abstract-debate"
REGG = "ja.goal.b2.nuance-register"
U = [
 ("760-consistency-checks","consistency checks","760-consistency-checks",ABSTG,"abst3",
  ["itchi","junjo","kyoka","kyoten","sa"], "s:consistency-checks"),
 ("761-steel-manning","steel-manning","761-steel-manning",ABSTG,"abst3",
  ["koten","yoten","taisho","hikaku2","henyo"], "s:steel-manning"),
 ("762-synthesis-essay","synthesis essay","762-synthesis-essay",ABSTG,"abst3",
  ["gosei","yoryo","chujutsu","inyou","youso"], "g:ja.grammar.b2-ni-kagiru"),
 ("763-formal-versus-casual","formal versus casual","763-formal-versus-casual",REGG,"reg1",
  ["keigo","futsuu","kougo","koushiki","zonzai"], "s:formal-versus-casual"),
 ("764-written-style-variation","written style variation","764-written-style-variation",REGG,"reg1",
  ["katai","yawarakai","moyo","yoshiki","kion"], "s:written-style-variation"),
 ("765-politeness-scales","politeness scales","765-politeness-scales",REGG,"reg1",
  ["sonkeigo","kenjougo","teineigo","kudai","teinei"], "s:politeness-scales"),
 ("766-indirect-expression","indirect expression","766-indirect-expression",REGG,"reg1",
  ["honne","tatemae","enryo","chokusetsu","hogen"], "s:indirect-expression"),
 ("767-hedge-words","hedge words","767-hedge-words",REGG,"reg1",
  ["kougen","yougen","shucho","kotei2","ika"], "s:hedge-words"),
 ("768-emphasis-devices","emphasis devices","768-emphasis-devices",REGG,"reg1",
  ["omomuki","kanji2","nyuansu","imi","bunmyaku"], "s:emphasis-devices"),
 ("769-connotation-awareness","connotation awareness","769-connotation-awareness",REGG,"reg1",
  ["kotoba","reigi","jouretsu","kudaranai","chowa"], "g:ja.grammar.b2-to-itara"),
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

print("batch72 written")
