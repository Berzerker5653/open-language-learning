#!/usr/bin/env python3
"""ja-JP batch 58: B2 units 620-629 (formal-correspondence tail + art-design start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("gijiroku","ぎじろく","noun","minutes, meeting record"),
 ("joken","じょうけん","noun","clause, term"),
 ("hotei","ほうてい","noun","provision, clause"),
 ("kaigi2","かいぎ","noun","meeting, council"),
 ("houkokusho","ほうこくしょ","noun","written report"),
 ("houmonsho","ほうもんしょ","noun","letter of visit request"),
 ("shoukaijo","しょうかいじょ","noun","letter of introduction"),
 ("ansho","あんしょ","noun","reply letter"),
 ("mimaijo","みまいじょ","noun","get-well letter"),
 ("iansho","いあんしょ","noun","condolence letter"),
 ("gankajou","がんかじょう","noun","year-end greeting letter"),
 ("chuuomimai","ちゅうおみまい","noun","midsummer greeting"),
 ("keijou","けいじょう","noun","celebratory letter"),
 ("zange","ざんげ","noun","confession, repentance"),
 ("shougi","しょうぎ","noun","argument, dispute"),
 ("satei","さてい","noun","assessment, appraisal"),
 ("sakujo","さくじょ","noun","removal, deletion"),
 ("koutei2","こうてい","noun","course, process"),
 ("biijutsu","びじゅつ","noun","fine art"),
 ("geijutsu","げいじゅつ","noun","art, arts"),
 ("bijutsukan","びじゅつかん","noun","art museum"),
 ("tenjikai","てんじかい","noun","exhibition"),
 ("sakuhin","さくひん","noun","work, artwork"),
 ("gasaku","がさく","noun","painting"),
 ("toukyou","とうきょう","noun","sculpture"),
 ("bi","び","noun","beauty"),
 ("kanshou","かんしょう","noun","appreciation"),
 ("shikisai","しきさい","noun","color, coloring"),
 ("sen","せん","noun","line"),
 ("katachi","かたち","noun","shape, form"),
 ("ryousen","りょうせん","noun","perspective"),
 ("kontrastu","こんとらすと","noun","contrast"),
 ("baransu","ばらんす","noun","balance"),
 ("kakuchou","かくちょう","noun","extension, stretch"),
 ("mokuhyou2","もくひょう","noun","aim, aim-point"),
 ("hyoushiki","ひょうしき","noun","expression form"),
 ("ishiki","いしき","noun","consciousness"),
 ("bunkaten","ぶんかてん","noun","cultural event"),
 ("denpou","でんぽう","noun","telegraph, wire"),
 ("fuukei","ふうけい","noun","scenery, landscape"),
 ("shashin","しゃしん","noun","photograph"),
 ("e2","え","noun","picture, drawing"),
 ("tenjikan","てんじかん","noun","exhibition hall"),
 ("kairan","かいらん","noun","viewing, inspection"),
 ("bijin","びじん","noun","beautiful person"),
 ("shizei","しぜい","noun","natural form"),
 ("motsuchi","もつち","noun","material, medium"),
 ("tenkyuu","てんきゅう","noun","celestial sphere"),
 ("shiten","してん","noun","viewpoint"),
 ("hennyu","へんにゅう","noun","insertion, amendment"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.formal2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "formal2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss, "formal"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-tomonau", "name": "〜に伴う (accompanying)", "category": "syntax",
  "definition": "に伴って marks accompaniment of change: びじゅつ に ともなう へんか. Draft definition pending review."},
 {"id": "ja.grammar.b2-ni-totte", "name": "〜にとって (for, to)", "category": "syntax",
  "definition": "にとって marks the perspective holder: びじゅつ は ぶんか にとって たいせつ. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("meeting-minutes","ぎじろく を かきました。","gijiroku wo kakimashita.","I wrote the minutes.",["ぎじろく"]),
 ("contract-terms","じょうけん を かくにん しました。","joken wo kakunin shimashita.","I confirmed the clause.",["じょうけん"]),
 ("legal-correspondence","あんしょ を だしました。","ansho wo dashimashita.","I sent the reply letter.",["あんしょ"]),
 ("diplomatic-style","ほうもんしょ を おくりました。","houmonsho wo okurimashita.","I sent the visit request.",["ほうもんしょ"]),
 ("ceremony-speech","けいじょう の かき を かきました。","keijou no kaki wo kakimashita.","I wrote the celebratory note.",["けいじょう"]),
 ("public-announcements","こうほ の ぶんしょ を よみました。","kouho no bunsho wo yomimashita.","I read the announcement document.",["こうほ"]),
 ("editorial-letters","びじゅつ の てがみ を かきました。","bijutsu no tegami wo kakimashita.","I wrote the art letter.",["びじゅつ"]),
 ("correspondence-portfolio","しょうかいじょ を かきました。","shoukaijo wo kakimashita.","I wrote the introduction letter.",["しょうかいじょ"]),
 ("visual-analysis","さくひん を かんしょう しました。","sakuhin wo kanshou shimashita.","I appreciated the artwork.",["さくひん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.art-design", "goal_id": "ja.goal.b2.art-design",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe a visual work using taught form, color, and line vocabulary",
              "state an opinion about design without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.art-design
    description: 'Discuss visual art and design: form, color, exhibition, and appreciation.'
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
    - target: ja.goal.b2.film-analysis
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.formal2.biijutsu
    - ja.lex.formal2.sakuhin
    assessment_ids:
    - ja.assess.art-design
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

DEP = """- from: ja.goal.b2.art-design
  to: ja.goal.b2.film-analysis
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
 ("620-meeting-minutes","meeting minutes","meeting-minutes","ja.goal.b2.formal-correspondence",
  ["gijiroku","kaigi2","houkokusho","koutei2","satei"], "s:meeting-minutes"),
 ("621-contract-terms","contract terms","contract-terms","ja.goal.b2.formal-correspondence",
  ["joken","hotei","sakujo","hennyu","shougi"], "s:contract-terms"),
 ("622-legal-correspondence","legal correspondence","legal-correspondence","ja.goal.b2.formal-correspondence",
  ["ansho","houmonsho","zange","shoukaijo","mimaijo"], "s:legal-correspondence"),
 ("623-diplomatic-style","diplomatic style","diplomatic-style","ja.goal.b2.formal-correspondence",
  ["iansho","gankajou","chuuomimai","keijou","denpou"], "s:diplomatic-style"),
 ("624-ceremony-speech","ceremony speech","ceremony-speech","ja.goal.b2.formal-correspondence",
  ["geijutsu","bunkaten","ishiki","hyoushiki","bi"], "s:ceremony-speech"),
 ("625-public-announcements","public announcements","public-announcements","ja.goal.b2.formal-correspondence",
  ["tenjikai","tenjikan","kairan","bijin","shizei"], "s:public-announcements"),
 ("626-editorial-letters","editorial letters","editorial-letters","ja.goal.b2.formal-correspondence",
  ["biijutsu","gasaku","sakuhin","kanshou","shiten"], "s:editorial-letters"),
 ("627-correspondence-portfolio","correspondence portfolio","correspondence-portfolio","ja.goal.b2.formal-correspondence",
  ["toukyou","fuukei","shashin","e2","motsuchi"], "s:correspondence-portfolio"),
 ("628-visual-analysis","visual analysis","visual-analysis","ja.goal.b2.art-design",
  ["sen","katachi","ryousen","kontrastu","baransu"], "s:visual-analysis"),
 ("629-design-principles","design principles","design-principles","ja.goal.b2.art-design",
  ["bijutsukan","kakuchou","mokuhyou2","tenkyuu","shikisai"], "g:ja.grammar.b2-ni-totte"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.formal2.{w}" for w in words]
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

for fname, topic, uid, goal, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, words, newitem))

print("batch58 written")
