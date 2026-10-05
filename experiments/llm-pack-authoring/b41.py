#!/usr/bin/env python3
"""ja-JP batch 41: B2 units 460-469 (law-justice complete + philosophy-ethics start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("chouyaku","ちょうやく","noun","treaty"),
 ("shiho","しほう","noun","private law"),
 ("kohoku","こうこく","noun","public notice"),
 ("hokoku","ほうこく","noun","report"),
 ("fukumu","ふくむ","noun","duties"),
 ("yakujo","やくじょう","noun","role"),
 ("kigen","きげん","noun","deadline"),
 ("hifu","ひふ","noun","expenses"),
 ("keihi","けいひ","noun","costs"),
 ("shuushuu","しゅうしゅう","noun","collection"),
 ("shuukyu","しゅうきゅう","noun","levy"),
 ("kansoku","かんそく","noun","supervision"),
 ("kosai","こうさい","noun","public interest"),
 ("johou","じょうほう","noun","information"),
 ("touzoku","とうぞく","noun","theft"),
 ("joron","じょろん","noun","preliminary discussion"),
 ("hihan","ひはん","noun","criticism"),
 ("bunseki","ぶんせき","noun","analysis"),
 ("kyoka","きょうか","noun","permission"),
 ("hinka","ひんか","noun","dignity"),
 ("teishutsu","ていしゅつ","noun","submission"),
 ("touhi","とうひ","noun","opposition"),
 ("kufuku","くふく","noun","restoration"),
 ("shouhisha","しょうひしゃ","noun","consumer"),
 ("shiire","しいれ","noun","purchasing stock"),
 ("zaimuko","ざいむこ","noun","inventory"),
 ("unyu","うんゆ","noun","distribution of goods"),
 ("butsuryuu","ぶつりゅう","noun","logistics"),
 ("houitsu","ほういつ","noun","uniformity"),
 ("seibi","せいび","noun","preparation"),
 ("yojo","ようぞう","noun","reserve"),
 ("kizon","きぞん","noun","existence"),
 ("sonzai","そんざい","noun","existence"),
 ("genshitsu","げんしつ","noun","essence"),
 ("bunmyaku","ぶんみゃく","noun","context"),
 ("keito","けいとう","noun","system"),
 ("denrou","でんろう","noun","tradition"),
 ("teikei","たいけい","noun","systematic body"),
 ("haka","はか","noun","frame"),
 ("tetsugaku","てつがく","noun","philosophy"),
 ("shisou","しそう","noun","thought"),
 ("rinen","りねん","noun","ideal"),
 ("genri","げんり","noun","principle"),
 ("gijiron","ぎじろん","noun","epistemology"),
 ("ronri-gaku","ろんりがく","noun","logic"),
 ("hasei","はせい","noun","genesis"),
 ("hensen","へんせん","noun","evolution"),
 ("kiso-gairon","きそがいろん","noun","elementary introduction"),
 ("giwa","ぎわ","noun","doubt"),
 ("igen","いげん","noun","will"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

PHIL = {"tetsugaku","shisou","rinen","genri","gijiron","ronri-gaku","hasei","hensen","kiso-gairon"}
def shard_of(rid):
    return "philosophy" if rid in PHIL else "law2"

with open(os.path.join(R, "lexicon", "law2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if shard_of(rid) == "law2":
            f.write(json.dumps(entry("law2", rid, kana, pos, gloss, "law"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "philosophy.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if shard_of(rid) == "philosophy":
            f.write(json.dumps(entry("philosophy", rid, kana, pos, gloss, "philosophy"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-kansuru", "name": "〜に関する (concerning)", "category": "syntax",
  "definition": "に関する modifies a noun by topic: ほうりつ に関する ぶんせき. Draft definition pending review."},
 {"id": "ja.grammar.b2.ni-yoru", "name": "〜による (depending on)", "category": "syntax",
  "definition": "による marks cause or dependence: じょうほう による はんのう が かわる. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("restorative-justice","こうさい の ため の ちてき を べんきょう しました。","kosai no tame no chiteki wo benkyou shimashita.","I studied wisdom for the public interest.",["こうさい"]),
 ("privacy-law","じょうほう の ほご を はなしました。","johou no hogo wo hanashimashita.","I talked about information protection.",["じょうほう"]),
 ("consumer-protection","しょうひしゃ の けんり を べんきょう しました。","shouhisha no kenri wo benkyou shimashita.","I studied consumer rights.",["しょうひしゃ"]),
 ("labor-law","ろうどう の ほうりつ を べんきょう しました。","roudou no houritsu wo benkyou shimashita.","I studied labor law.",["ろうどう"]),
 ("international-law","ちょうやく の ないよう を よみました。","chouyaku no naiyou wo yomimashita.","I read the treaty's contents.",["ちょうやく"]),
 ("legal-news","ほうこく の ないよう を ぶんせき しました。","hokoku no naiyou wo bunseki shimashita.","I analyzed the report's contents.",["ほうこく"]),
 ("ethics-of-law","ほうりつ と げんり の こと を はなしました。","houritsu to genri no koto wo hanashimashita.","I talked about law and principle.",["げんり"]),
 ("justice-essay","こうさい の ため の さく を かきました。","kosai no tame no saku wo kakimashita.","I wrote a work for the public interest.",["こうさい"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.philosophy-ethics", "goal_id": "ja.goal.b2.philosophy-ethics",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss ethical frameworks, moral dilemmas, and philosophical concepts",
              "reason about a moral question without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.philosophy-ethics
    description: 'Discuss philosophy and ethics: frameworks, dilemmas, and reasoning.'
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
    - target: ja.goal.b2.law-justice
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.philosophy.tetsugaku
    - ja.lex.philosophy.rinen
    assessment_ids:
    - ja.assess.philosophy-ethics
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

U = [
 ("460-restorative-justice","restorative justice","restorative-justice","ja.goal.b2.law-justice",
  ["kosai","kufuku","hinka","giwa","seibi"], "s:restorative-justice"),
 ("461-privacy-law","privacy law","privacy-law","ja.goal.b2.law-justice",
  ["johou","kyoka","kohoku","yojo","kigen"], "s:privacy-law"),
 ("462-consumer-protection","consumer protection","consumer-protection","ja.goal.b2.law-justice",
  ["shouhisha","shiire","zaimuko","unyu","butsuryuu"], "s:consumer-protection"),
 ("463-labor-law","labor law","labor-law","ja.goal.b2.law-justice",
  ["fukumu","yakujo","hifu","keihi","kansoku"], "s:labor-law"),
 ("464-international-law","international law","international-law","ja.goal.b2.law-justice",
  ["chouyaku","shiho","houitsu","teishutsu","touhi"], "s:international-law"),
 ("465-legal-news","legal news","legal-news","ja.goal.b2.law-justice",
  ["hokoku","joron","hihan","bunseki","touzoku"], "s:legal-news"),
 ("466-ethics-of-law","ethics of law","ethics-of-law","ja.goal.b2.law-justice",
  ["shuushuu","shuukyu","igen","kizon","sonzai"], "g:ja.grammar.b2.ni-kansuru"),
 ("467-justice-essay","justice essay","justice-essay","ja.goal.b2.law-justice",
  ["genshitsu","bunmyaku","keito","denrou","genri"], "g:ja.grammar.b2.ni-yoru"),
 ("468-ethical-frameworks","ethical frameworks","ethical-frameworks","ja.goal.b2.philosophy-ethics",
  ["tetsugaku","shisou","rinen","gijiron","ronri-gaku"], "s:ethics-of-law"),
 ("469-moral-dilemmas","moral dilemmas","moral-dilemmas","ja.goal.b2.philosophy-ethics",
  ["hasei","hensen","kiso-gairon","teikei","haka"], "s:justice-essay"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.{shard_of(w)}.{w}" for w in words]
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

for fname, topic, uid, goal, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, words, newitem))

print("batch41 written")
