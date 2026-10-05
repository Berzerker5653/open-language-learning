#!/usr/bin/env python3
"""ja-JP batch 55: B2 units 590-599 (global-issues tail + academic-skills start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("shigen2","しげん","noun","resource"),
 ("senryaku","せんりゃく","noun","strategy"),
 ("seisan","せいさん","noun","production"),
 ("butsuryu","ぶつりゅう","noun","logistics, flow of goods"),
 ("unyu","うんゆ","noun","transport of goods"),
 ("toshi2","とし","noun","city"),
 ("jinko2","じんこう","noun","population"),
 ("kutsu2","くう","noun","housing shortage"),
 ("kankakusha","かんきゃくしゃ","noun","tourist"),
 ("shigai2","しがい","noun","over-tourism"),
 ("sekinin2","せきにん","noun","responsibility"),
 ("kyousei4","きょうせい","noun","coercion"),
 ("kokusai3","こくさい","noun","internationality"),
 ("hoitsu","ほういつ","noun","law, legislation"),
 ("ken-i","けんい","noun","authority, power"),
 ("koso","こそう","noun","construction, organization"),
 ("koryu2","こうりゅう","noun","exchange, flow"),
 ("ryutsuu","りゅうつう","noun","circulation"),
 ("bunmyaku","ぶんみゃく","noun","context"),
 ("shutai","しゅたい","noun","subject, agent"),
 ("ronsho","ろんしょ","noun","thesis, paper"),
 ("shiryo4","しりょう","noun","reference material"),
 ("bunko","ぶんこ","noun","literature"),
 ("kouchiku","こうちく","noun","construction, structuring"),
 ("seika3","せいか","noun","correctness, accuracy"),
 ("rongi","ろんぎ","noun","argument, logic"),
 ("gensoku","げんそく","noun","principle, criterion"),
 ("hikaku2","ひかく","noun","comparison"),
 ("bunseki2","ぶんせき","noun","analysis"),
 ("shouko2","しょうこ","noun","evidence"),
 ("hyouji","ひょうじ","noun","display, indication"),
 ("zu","ず","noun","diagram"),
 ("hyou","ひょう","noun","table"),
 ("yougaki","ようがき","noun","terminology, glossary"),
 ("inyou","いんよう","noun","quotation, citation"),
 ("sansa","さんさ","noun","reference, consultation"),
 ("teigi","ていぎ","noun","definition"),
 ("setsumei","せつめい","noun","explanation"),
 ("ronbun","ろんぶん","noun","essay, thesis"),
 ("hyougen","ひょうげん","noun","expression"),
 ("shiji","しじ","noun","instruction, direction"),
 ("koubun2","こうぶん","noun","writing, composition"),
 ("gouki","ごうき","noun","combination"),
 ("bunpatsu","ぶんぱつ","noun","paragraph"),
 ("mokuji","もくじ","noun","table of contents"),
 ("kensa","けんさ","noun","inspection, check"),
 ("shukyou","しゅうきょう","noun","emphasis"),
 ("seiri","せいり","noun","organization, sorting"),
 ("sakuho","さくほう","noun","method, technique"),
 ("junbi","じゅんび","noun","preparation"),
]
assert len(WORDS) == 50, len(WORDS)

GLOBAL_IDS = ["shigen2","senryaku","seisan","butsuryu","unyu","toshi2","jinko2","kutsu2",
              "kankakusha","shigai2","sekinin2","kyousei4","kokusai3","hoitsu","ken-i",
              "koso","koryu2","ryutsuu","bunmyaku","shutai"]

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "global2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if rid in GLOBAL_IDS:
            f.write(json.dumps(entry("global2", rid, kana, pos, gloss, "global"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "academic.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if rid not in GLOBAL_IDS:
            f.write(json.dumps(entry("academic", rid, kana, pos, gloss, "academic"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-chikai", "name": "〜に近い (close to)", "category": "syntax",
  "definition": "に近い marks proximity: こうりゅう に ちかい ぶぶん. Draft definition pending review."},
 {"id": "ja.grammar.b2.ni-hiku", "name": "〜に劣る (inferior to)", "category": "syntax",
  "definition": "に劣る marks inferiority: げんぶん に おとる しりょう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("resource-politics","せいさん の きじ を よみました。","seisan no kiji wo yomimashita.","I read the production article.",["せいさん"]),
 ("global-cities","とし の じょうほう を あつめました。","toshi no jouhou wo atsumemashita.","I gathered city information.",["とし"]),
 ("tourism-impact","せきにん の ぎろん を べんきょう しました。","sekinin no giron wo benkyou shimashita.","I studied the responsibility debate.",["せきにん"]),
 ("supply-chains","こうりゅう の ぶんみゃく を べんきょう しました。","koryuu no bunmyaku wo benkyou shimashita.","I studied the context of flows.",["こうりゅう"]),
 ("global-governance","ほういつ の せいさく について かきました。","houitsu no seisaku ni tsuite kakimashita.","I wrote about lawmaking.",["ほういつ"]),
 ("thesis-construction","ろんぶん を かきました。","ronbun wo kakimashita.","I wrote the essay.",["ろんぶん"]),
 ("literature-review","ぶんこ を あつめました。","bunko wo atsumemashita.","I gathered the literature.",["ぶんこ"]),
 ("methodology-basics","ぶんせき の さくほう を べんきょう しました。","bunseki no sakuhou wo benkyou shimashita.","I studied the analysis method.",["ぶんせき"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.academic-skills", "goal_id": "ja.goal.b2.academic-skills",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "construct an argument with sources, evidence, and clear structure",
              "present data or a literature summary without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.academic-skills
    description: 'Academic Japanese: thesis construction, literature review, method, and presentation.'
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
    - target: ja.goal.b2.literature-study
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.academic.ronsho
    - ja.lex.academic.bunko
    assessment_ids:
    - ja.assess.academic-skills
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-04'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.academic-skills
  to: ja.goal.b2.literature-study
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

U = [
 ("590-resource-politics","resource politics","resource-politics","global2",
  ["shigen2","senryaku","seisan","butsuryu","unyu"], "s:resource-politics"),
 ("591-global-cities","global cities","global-cities","global2",
  ["toshi2","jinko2","kutsu2","kankakusha","shigai2"], "s:global-cities"),
 ("592-tourism-impact","tourism impact","tourism-impact","global2",
  ["sekinin2","kyousei4","hoitsu","ken-i","koso"], "s:tourism-impact"),
 ("593-supply-chains","supply chains","supply-chains","global2",
  ["koryu2","ryutsuu","bunmyaku","shutai","kokusai3"], "s:supply-chains"),
 ("594-global-governance","global governance","global-governance","academic",
  ["kouchiku","rongi","gensoku","teigi","seika3"], "s:global-governance"),
 ("595-global-essay","global essay","global-essay","academic",
  ["junbi","inyou","sansa","koubun2","gouki"], "g:ja.grammar.b2.ni-chikai"),
 ("596-thesis-construction","thesis construction","thesis-construction","academic",
  ["ronsho","bunpatsu","mokuji","yougaki","kensa"], "s:thesis-construction"),
 ("597-literature-review","literature review","literature-review","academic",
  ["bunko","shiryo4","setsumei","hyougen","seiri"], "s:literature-review"),
 ("598-methodology-basics","methodology basics","methodology-basics","academic",
  ["sakuho","hikaku2","bunseki2","shouko2","shiji"], "s:methodology-basics"),
 ("599-data-presentation","data presentation","data-presentation","academic",
  ["zu","hyou","hyouji","ronbun","shukyou"], "g:ja.grammar.b2.ni-hiku"),
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
    lines = [f"# ai-assisted draft unit (Mode B B2); content refs are pack data; qualified review pending.",
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

for fname, topic, uid, shard, words, newitem in U:
    goal = "ja.goal.b2.global-issues" if shard == "global2" else "ja.goal.b2.academic-skills"
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch55 written")
