#!/usr/bin/env python3
"""ja-JP batch 46: B2 units 500-509 (film-analysis)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("eiga","えいが","noun","film"),
 ("eigakan","えいがかん","noun","cinema"),
 ("kantoku","かんとく","noun","director"),
 ("eizo","えいぞう","noun","moving image"),
 ("kamera","かめら","noun","camera"),
 ("satsuei","さつえい","noun","filming"),
 ("sutajio","すたじお","noun","film studio"),
 ("shashin","しゃしん","noun","photograph"),
 ("jo","じょう","noun","emotion"),
 ("kaijo","かいじょう","noun","venue"),
 ("joryu","じょりゅう","noun","genre"),
 ("onsetsu","おんせつ","noun","sound setting"),
 ("gensaku","げんさく","noun","original work"),
 ("kiroku","きろく","noun","record"),
 ("bunpou","ぶんぽう","noun","grammar"),
 ("ugoki","うごき","noun","movement"),
 ("setkei","せつけい","noun","design"),
 ("shutsuen","しゅつえん","noun","film appearance"),
 ("anime","あにめ","noun","anime"),
 ("hihyou","ひひょう","noun","criticism"),
 ("rekishi","れきし","noun","history"),
 ("geijutsu","げいじゅつ","noun","art"),
 ("hyouban","ひょうばん","noun","billboard"),
 ("nyuusha","にゅうしゃ","noun","entering a company"),
 ("kangei","かんげい","noun","welcome"),
 ("kanyuu","かんにゅう","noun","screening admission"),
 ("kanyuu2","かんにゅう","noun","admission"),
 ("jouhou","じょうほう","noun","information"),
 ("seika","せいか","noun","success"),
 ("dokyuumentari","どきゅめんたり","noun","documentary"),
 ("eizo2","えいぞう","noun","image"),
 ("katto","かっと","noun","cut"),
 ("shott","しょっと","noun","shot"),
 ("zum","ずむ","noun","zoom"),
 ("appu","あっぷ","noun","close-up"),
 ("satsueijou","さつえいじょう","noun","filming stage"),
 ("shuen","しゅえん","noun","starring"),
 ("chokusatsu","ちょくさつ","noun","directing"),
 ("kyaku","きゃく","noun","customer"),
 ("senryaku","せんりゃく","noun","strategy"),
 ("fukuzai","ふくざい","noun","complexity"),
 ("kankyou","かんきょう","noun","environment"),
 ("hakyuu","はっきゅう","noun","expansion"),
 ("teishou","ていしょう","noun","proposal"),
 ("katsudo","かつどう","noun","activity"),
 ("katsuyaku","かつやく","noun","performance"),
 ("zokusei","ぞくせい","noun","attribute"),
 ("kouchou","こうちょう","noun","growth"),
 ("tekisuto","てきすと","noun","text"),
 ("onsei","おんせい","noun","voice sound"),
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

with open(os.path.join(R, "lexicon", "film.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("film", rid, kana, pos, gloss, "film"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-tsurete", "name": "〜につれて (as)", "category": "syntax",
  "definition": "につれて marks concomitant change: じだい につれて はんのう が かわる. Draft definition pending review."},
 {"id": "ja.grammar.b2.dake-dewa", "name": "〜だけでは (not just by)", "category": "syntax",
  "definition": "だけでは limits: じょうほう だけでは はんのう が ぶそく. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("film-language","えいが の ぶんぽう を べんきょう しました。","eiga no bunpou wo benkyou shimashita.","I studied the grammar of film.",["えいが"]),
 ("genre-analysis","じょりゅう の ぶんるい を べんきょう しました。","joryu no bunrui wo benkyou shimashita.","I studied the classification of genres.",["じょりゅう"]),
 ("director-style","かんとく の はなし を ききました。","kantoku no hanashi wo kikimashita.","I heard the director's talk.",["かんとく"]),
 ("camera-meaning","かめら の うごき を かんさつ しました。","kamera no ugoki wo kansatsu shimashita.","I observed the camera's movement.",["かめら"]),
 ("sound-design","せつけい の ねっしん を べんきょう しました。","setkei no nesshin wo benkyou shimashita.","I studied enthusiasm for design.",["せつけい"]),
 ("adaptation-study","げんさく の てきすと を べんきょう しました。","gensaku no tekisuto wo benkyou shimashita.","I studied the source text.",["げんさく"]),
 ("documentary-critique","きろく の ぶんせき を かきました。","kiroku no bunseki wo kakimashita.","I wrote an analysis of the record.",["きろく"]),
 ("film-history","えいがかん の れきし を べんきょう しました。","eigakan no rekishi wo benkyou shimashita.","I studied the history of cinemas.",["えいがかん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.film-analysis", "goal_id": "ja.goal.b2.film-analysis",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss film language, genre, direction, and adaptation with precise vocabulary",
              "analyze a film scene or review without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.film-analysis
    description: 'Discuss film: language of cinema, genre, direction, and adaptation.'
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
    - ja.lex.film.eiga
    - ja.lex.film.kantoku
    assessment_ids:
    - ja.assess.film-analysis
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
 ("500-film-language","film language","film-language","ja.goal.b2.film-analysis",
  ["eiga","eizo","jo","kaijo","bunpou"], "s:film-language"),
 ("501-genre-analysis","genre analysis","genre-analysis","ja.goal.b2.film-analysis",
  ["joryu","anime","dokyuumentari","kanyuu","kanyuu2"], "s:genre-analysis"),
 ("502-director-style","director style","director-style","ja.goal.b2.film-analysis",
  ["kantoku","shutsuen","sutajio","chokusatsu","shuen"], "s:director-style"),
 ("503-camera-meaning","camera meaning","camera-meaning","ja.goal.b2.film-analysis",
  ["kamera","satsuei","shashin","ugoki","katto"], "s:camera-meaning"),
 ("504-sound-design","sound design","sound-design","ja.goal.b2.film-analysis",
  ["setkei","onsetsu","eizo2","zum","appu"], "s:sound-design"),
 ("505-adaptation-study","adaptation study","adaptation-study","ja.goal.b2.film-analysis",
  ["gensaku","tekisuto","onsei","shott","satsueijou"], "s:adaptation-study"),
 ("506-documentary-critique","documentary critique","documentary-critique","ja.goal.b2.film-analysis",
  ["kiroku","hihyou","hakyuu","katsuyaku","zokusei"], "s:documentary-critique"),
 ("507-film-history","film history","film-history","ja.goal.b2.film-analysis",
  ["rekishi","eigakan","teishou","kangei","nyuusha"], "s:film-history"),
 ("508-animation-arts","animation arts","animation-arts","ja.goal.b2.film-analysis",
  ["geijutsu","hyouban","katsudo","fukuzai","kankyou"], "g:ja.grammar.b2.ni-tsurete"),
 ("509-film-reviews","film reviews","film-reviews","ja.goal.b2.film-analysis",
  ["jouhou","seika","kyaku","senryaku","kouchou"], "g:ja.grammar.b2.dake-dewa"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.film.{w}" for w in words]
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

print("batch46 written")
