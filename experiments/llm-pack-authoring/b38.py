#!/usr/bin/env python3
"""ja-JP batch 38: B2 units 435-444 (politics tail + economics-work start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("jidosuka","じどうか","noun","automation"),
 ("shouhi","しょうひ","noun","consumption"),
 ("shohi","しょうもう","noun","depletion"),
 ("shijou","しじょう","noun","market"),
 ("kyuukyuu","きょうきゅう","noun","supply"),
 ("kinyuu","きんゆう","noun","finance"),
 ("shikyuu","じゅきゅう","noun","demand"),
 ("mugyou","むよう","noun","unemployment"),
 ("roudou","ろうどう","noun","labor"),
 ("kabu","かぶ","noun","stock"),
 ("kabushiki","かぶしき","noun","shares"),
 ("kabushikikaisha","かぶしきがいしゃ","noun","joint-stock company"),
 ("shijo","りし","noun","interest rate"),
 ("kabunushi","かぶぬし","noun","shareholder"),
 ("kabuka","かぶか","noun","stock price"),
 ("baika","ばいか","noun","price rise"),
 ("neage","ねあげ","noun","price increase"),
 ("uchinage","うちなげ","noun","dumping"),
 ("shibora","しぼら","noun","deflation"),
 ("yuyutu","ゆうよ","noun","surplus"),
 ("tekiseki","てきせき","noun","suitability"),
 ("tsutome","つとめ","noun","employment"),
 ("hataraki","はたらき","noun","work"),
 ("kyougyou","きょうぎょう","noun","industry"),
 ("jigyousha","じぎょうしゃ","noun","business operator"),
 ("yakushoku","やくしょく","noun","company position"),
 ("bucho","ぶちょう","noun","department head"),
 ("kigyou","きぎょう","noun","enterprise"),
 ("kigyouka","きぎょうか","noun","commercialization"),
 ("toshin","としん","noun","urban area"),
 ("boshuu","ぼしゅう","noun","recruitment"),
 ("saiyou","さいよう","noun","hiring"),
 ("senyou","せんよう","noun","specialization"),
 ("jiken","じけん","noun","experience"),
 ("jitsuryoku","じつりょく","noun","practical ability"),
 ("senmonka","せんもんか","noun","specialist"),
 ("gijutsusha","ぎじゅつしゃ","noun","engineer"),
 ("idou","いどう","noun","personnel transfer"),
 ("hensoku","げんそく","noun","slowdown"),
 ("zouka","ぞうか","noun","increase"),
 ("genka","げんか","noun","cost"),
 ("shuunyuu","しゅうにゅう","noun","income"),
 ("kessai","けっさい","noun","payment settlement"),
 ("toushi","とうし","noun","investment"),
 ("tenshoku","てんしょく","noun","job change"),
 ("rinkou","ちんぎん","noun","wages"),
 ("haken","はけん","noun","temporary dispatch"),
 ("seishain","せいしゃいん","noun","regular employee"),
 ("shihonshugi","しほんしゅぎ","noun","capitalism"),
 ("kaikei","かいけい","noun","accounting"),
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

with open(os.path.join(R, "lexicon", "economy.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("economy", rid, kana, pos, gloss, "economics"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-shite", "name": "〜にして (from the standpoint of)", "category": "syntax",
  "definition": "にして marks a standpoint or standard: かいしゃ に して は じょうほう が げんげん. Draft definition pending review."},
 {"id": "ja.grammar.b2.dake-de", "name": "〜だけで (just by)", "category": "syntax",
  "definition": "だけで means 'just by/with only': ねあげ だけで ばいか が あがる. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("governance-essay","しじょう の ほうせい を べんきょう しました。","shijou no housei wo benkyou shimashita.","I studied market regulation.",["しじょう"]),
 ("market-basics","ばいか の げんいん を はなしました。","baika no gen'in wo hanashimashita.","I talked about the cause of the price rise.",["ばいか"]),
 ("supply-demand","きょうきゅう と じゅきゅう の かんけい を べんきょう しました。","kyuukyuu to shikyuu no kankei wo benkyou shimashita.","I studied the relationship of supply and demand.",["きょうきゅう"]),
 ("employment-trends","ろうどう の じょうきょう が かわりました。","roudou no joukyou ga kawarimashita.","Working conditions have changed.",["ろうどう"]),
 ("wage-discussion","ちんぎん の はなし を しました。","chingin no hanashi wo shimashita.","I talked about wages.",["ちんぎん"]),
 ("startup-culture","さいよう の じょうほう を みました。","saiyou no jouhou wo mimashita.","I looked at hiring information.",["さいよう"]),
 ("management-styles","ぶちょう と ぎむ を はなしました。","bucho to gim wo hanashimashita.","I discussed duties with the department head.",["ぶちょう"]),
 ("labor-rights","てんしょく の けいかく を たてました。","tenshoku no keikaku wo tatemashita.","I made a plan to change jobs.",["てんしょく"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.economics-work", "goal_id": "ja.goal.b2.economics-work",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss markets, employment trends, wages, and management practices",
              "analyze economic data and workplace issues without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.economics-work
    description: 'Discuss economics and work: markets, employment, wages, and management.'
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
    - target: ja.goal.b2.politics-governance
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.economy.shijou
    - ja.lex.economy.kinyuu
    assessment_ids:
    - ja.assess.economics-work
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
 ("435-governance-essay","governance essay","governance-essay","ja.goal.b2.politics-governance",
  ["shijou","kabu","kabushikikaisha","shijo","kabunushi"], "s:governance-essay"),
 ("436-market-basics","market basics","market-basics","ja.goal.b2.economics-work",
  ["baika","neage","uchinage","shibora","kessai"], "s:market-basics"),
 ("437-supply-demand","supply demand","supply-demand","ja.goal.b2.economics-work",
  ["kyuukyuu","shikyuu","zouka","hensoku","genka"], "s:supply-demand"),
 ("438-employment-trends","employment trends","employment-trends","ja.goal.b2.economics-work",
  ["roudou","mugyou","toshin","haken","seishain"], "s:employment-trends"),
 ("439-wage-discussion","wage discussion","wage-discussion","ja.goal.b2.economics-work",
  ["rinkou","shuunyuu","kaikei","tekiseki","jiken"], "s:wage-discussion"),
 ("440-startup-culture","startup culture","startup-culture","ja.goal.b2.economics-work",
  ["kigyou","kigyouka","jigyousha","saiyou","boshuu"], "s:startup-culture"),
 ("441-management-styles","management styles","management-styles","ja.goal.b2.economics-work",
  ["yakushoku","bucho","idou","kyougyou","senmonka"], "s:management-styles"),
 ("442-labor-rights","labor rights","labor-rights","ja.goal.b2.economics-work",
  ["tenshoku","tsutome","hataraki","senyou","jitsuryoku"], "s:labor-rights"),
 ("443-automation-impact","automation impact","automation-impact","ja.goal.b2.economics-work",
  ["jidosuka","gijutsusha","shouhi","shohi","yuyutu"], "g:ja.grammar.b2.ni-shite"),
 ("444-consumer-behavior","consumer behavior","consumer-behavior","ja.goal.b2.economics-work",
  ["kinyuu","toushi","shihonshugi","kabushiki","kabuka"], "g:ja.grammar.b2.dake-de"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.economy.{w}" for w in words]
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

print("batch38 written")
