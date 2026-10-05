#!/usr/bin/env python3
"""ja-JP batch 60: B2 units 640-649 (art-design tail + media-critique start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("bunka3","ぶんか","noun","culture"),
 ("geijutsu2","げいじゅつ","noun","art"),
 ("tenji2","てんじ","noun","exhibition"),
 ("media","めであ","noun","media"),
 ("denwa2","でんわ","noun","telephone"),
 ("houdou","ほうどう","noun","reporting, news report"),
 ("kiji2","きじ","noun","news article"),
 ("kisha","きしゃ","noun","reporter, journalist"),
 ("housou3","ほうそう","noun","broadcasting"),
 ("tsuushin3","つうしん","noun","news agency, correspondence"),
 ("shaka","しゃか","noun","society"),
 ("yoron","よろん","noun","public opinion"),
 ("seiron","せいろん","noun","argument, discourse"),
 ("fureimu","ふれいむ","noun","framing"),
 ("kata","かた","noun","shape, form"),
 ("kuchikomi","くちこみ","noun","word of mouth"),
 ("dempatsu","でんぱつ","noun","propaganda"),
 ("honne","ほんね","noun","true feeling"),
 ("tatemae","たてまえ","noun","stance, pretense"),
 ("seisaku2","せいさく","noun","production"),
 ("puroguramu","ぷろぐらむ","noun","program"),
 ("nyuusu","にゅーす","noun","news"),
 ("shoukai3","しょうかい","noun","introduction"),
 ("taimu","たいむ","noun","time, current affairs"),
 ("intabyuu","いんたびゅー","noun","interview"),
 ("touhyo2","とうひょう","noun","vote, poll"),
 ("chousa2","ちょうさ","noun","survey, investigation"),
 ("data","でーた","noun","data"),
 ("shaka3","しゃかい","noun","society"),
 ("kouchiku3","こうちく","noun","construction of discourse"),
 ("shikou","しこう","noun","thought, thinking"),
 ("hihan","ひはん","noun","criticism"),
 ("hyougen2","ひょうげん","noun","expression"),
 ("shiten2","してん","noun","viewpoint"),
 ("kachi","かち","noun","value, worth"),
 ("risou3","りそう","noun","ideal"),
 ("jissai","じっさい","noun","reality, fact"),
 ("genjitsu","げんじつ","noun","reality"),
 ("risuku","りすく","noun","risk"),
 ("byoudou","びょうどう","noun","equality, fairness"),
 ("shinrai","しんらい","noun","trust"),
 ("sekinin4","せきにん","noun","responsibility"),
 ("jouhou2","じょうほう","noun","information"),
 ("tsuushin5","つうしん","noun","communications"),
 ("ryutsuu2","りゅうつう","noun","flow, circulation"),
 ("shuuryuu","しゅうりゅう","noun","trend, flow"),
 ("kairyou2","かいりょう","noun","understanding"),
 ("seminaa","せみなー","noun","seminar"),
 ("ronbun2","ろんぶん","noun","written argument"),
 ("bessou","べっそう","noun","separate draft"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.media3.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["media"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "media3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-to-iu-koto", "name": "〜ということ (the fact that)", "category": "syntax",
  "definition": "ということ nominalizes a clause: ほうどう が じょうほう である ということ. Draft definition pending review."},
 {"id": "ja.grammar.b2-wake-da", "name": "〜わけだ (that explains why)", "category": "syntax",
  "definition": "わけだ marks a concluded reason: ぜんぶ でんぱつ だ なら, ぎもん は とける わけ だ. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("art-and-culture","ぶんか の げいじゅつ を べんきょう しました。","bunka no geijutsu wo benkyou shimashita.","I studied the culture's art.",["ぶんか"]),
 ("exhibition-writing","てんじ の ぶんしょう を かきました。","tenji no bunshou wo kakimashita.","I wrote the exhibition text.",["てんじ"]),
 ("aesthetics-essay","び の ろんぶん を かきました。","bi no ronbun wo kakimashita.","I wrote the essay on beauty.",["び"]),
 ("discourse-analysis","せいろん の ぶんせき を しました。","seiron no bunseki wo shimashita.","I did the discourse analysis.",["せいろん"]),
 ("propaganda-history","でんぱつ の れきし を べんきょう しました。","dempatsu no rekishi wo benkyou shimashita.","I studied propaganda history.",["でんぱつ"]),
 ("news-production","にゅーす の せいさく を べんきょう しました。","nyuusu no seisaku wo benkyou shimashita.","I studied news production.",["にゅーす"]),
 ("audience-studies","しゅうりゅう の ちょうさ を しました。","shuuryuu no chousa wo shimashita.","I did the trend survey.",["しゅうりゅう"]),
 ("journalism-standards","きしゃ の きじ を よみました。","kisha no kiji wo yomimashita.","I read the reporter's article.",["きしゃ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.media-critique", "goal_id": "ja.goal.b2.media-critique",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "analyze a news item's framing using taught media vocabulary",
              "distinguish fact from propaganda in supplied text without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.media-critique
    description: 'Critique media: discourse, framing, propaganda, news production, and standards.'
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
    - ja.lex.media3.media
    - ja.lex.media3.houdou
    assessment_ids:
    - ja.assess.media-critique
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

DEP = """- from: ja.goal.b2.media-critique
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

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

U = [
 ("640-art-and-culture","art and culture","art-and-culture","ja.goal.b2.art-design",
  ["bunka3","geijutsu2","tenji2","kata","kairyou2"], "s:art-and-culture"),
 ("641-exhibition-writing","exhibition writing","exhibition-writing","ja.goal.b2.art-design",
  ["bessou","ronbun2","seminaa","hyougen2","shiten2"], "s:exhibition-writing"),
 ("642-aesthetics-essay","aesthetics essay","aesthetics-essay","ja.goal.b2.art-design",
  ["kachi","risou3","genjitsu","jissai","shikou"], "s:aesthetics-essay"),
 ("643-discourse-analysis","discourse analysis","discourse-analysis","ja.goal.b2.media-critique",
  ["seiron","kouchiku3","hihan","media","tsuushin5"], "s:discourse-analysis"),
 ("644-framing-theory","framing theory","framing-theory","ja.goal.b2.media-critique",
  ["fureimu","honne","tatemae","kuchikomi","shaka3"], "g:ja.grammar.b2-to-iu-koto"),
 ("645-propaganda-history","propaganda history","propaganda-history","ja.goal.b2.media-critique",
  ["dempatsu","yoron","shinrai","byoudou","risuku"], "s:propaganda-history"),
 ("646-news-production","news production","news-production","ja.goal.b2.media-critique",
  ["houdou","kiji2","housou3","puroguramu","nyuusu"], "s:news-production"),
 ("647-platform-effects","platform effects","platform-effects","ja.goal.b2.media-critique",
  ["jouhou2","ryutsuu2","shuuryuu","data","denwa2"], "g:ja.grammar.b2-wake-da"),
 ("648-audience-studies","audience studies","audience-studies","ja.goal.b2.media-critique",
  ["chousa2","touhyo2","intabyuu","taimu","shaka"], "s:audience-studies"),
 ("649-journalism-standards","journalism standards","journalism-standards","ja.goal.b2.media-critique",
  ["sekinin4","shoukai3","tsuushin3","kisha","seisaku2"], "s:journalism-standards"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.media3.{w}" for w in words]
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

print("batch60 written")
