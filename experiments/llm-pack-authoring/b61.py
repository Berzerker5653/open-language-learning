#!/usr/bin/env python3
"""ja-JP batch 61: B2 units 650-659 (media-critique tail + psychology-mind start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("eizou","えいぞう","noun","image, video"),
 ("koukoku","こうこく","noun","advertisement"),
 ("puburisshu","ぱぶりっしゅ","noun","public relations"),
 ("keiei","けいえい","noun","management, business"),
 ("shieki","しえき","noun","share, equity"),
 ("toushi","とうし","noun","investment"),
 ("shihai","しはい","noun","domination, control"),
 ("eigyou","えいぎょう","noun","sales, business"),
 ("netto","ねっと","noun","net, internet"),
 ("platformu","ぷらっとむ","noun","platform"),
 ("tsuushin7","つうしん","noun","telecommunications"),
 ("sns","えすえぬえす","noun","social media"),
 ("tsuugou","つうごう","noun","communication merger"),
 ("hatsuho","はっぽう","noun","publication, release"),
 ("jiyuu2","じゆう","noun","freedom, liberty"),
 ("jinken","じんけん","noun","human rights"),
 ("ouken","おうけん","noun","royal power, prerogative"),
 ("hitei","ひてい","noun","denial, negation"),
 ("boikotto","ぼいこっと","noun","boycott"),
 ("hifan","ひはん","noun","criticism, blame"),
 ("sekinin5","せきにん","noun","responsibility"),
 ("houbi","ほうび","noun","reward, praise"),
 ("binzuke","びんづけ","noun","branding, labeling"),
 ("insaido","いんさいど","noun","inside, insider"),
 ("seshon","せしょん","noun","session"),
 ("shinrigaku","しんりがく","noun","psychology"),
 ("kokoro","こころ","noun","heart, mind"),
 ("nouryoku","のうりょく","noun","ability, intellect"),
 ("kioku","きおく","noun","memory"),
 ("shinrou","しんろう","noun","fatigue, tiredness"),
 ("suiryoku","すいりょく","noun","sleep"),
 ("yume","ゆめ","noun","dream"),
 ("kanjou","かんじょう","noun","emotion, feeling"),
 ("mushiki","むしき","noun","unconsciousness"),
 ("shinji","しんじ","noun","belief, faith"),
 ("kakushin","かくしん","noun","revolution, reform"),
 ("jiko","じこ","noun","self, ego"),
 ("kankei3","かんけい","noun","relationship"),
 ("taido","たいど","noun","attitude"),
 ("seikaku2","せいかく","noun","personality, character"),
 ("koui","こうい","noun","behavior, action"),
 ("doushutsu","どうしゅつ","noun","impulse, emission"),
 ("shukan","しゅかん","noun","habit"),
 ("seichou","せいちょう","noun","growth"),
 ("hatten4","はってん","noun","development"),
 ("kyouiku2","きょういく","noun","education"),
 ("torainingu","とれーにんぐ","noun","training"),
 ("senryou","せんりょう","noun","measurement, test"),
 ("chi","ち","noun","intelligence, wisdom"),
 ("hakuriki","はくりき","noun","memory power"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.critique.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["media"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "critique.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-yoru", "name": "〜による (depending on, by)", "category": "syntax",
  "definition": "によって marks agent or condition: メディア に よって じょうほう が かわる. Draft definition pending review."},
 {"id": "ja.grammar.b2-wake-dewa-nai", "name": "〜わけではない (it is not that)", "category": "syntax",
  "definition": "わけではない denies a total inference: じゆう な わけ で は ない. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("visual-rhetoric","えいぞう の てきすと を ぶんせき しました。","eizou no tekisuto wo bunseki shimashita.","I analyzed the video text.",["えいぞう"]),
 ("advertising-critique","こうこく の ぶんしょう を かきました。","koukoku no bunshou wo kakimashita.","I wrote the advertisement text.",["こうこく"]),
 ("public-relations","ぱぶりっしゅ の かい を もちました。","puburisshu no kai wo mochimashita.","We held the PR meeting.",["ぱぶりっしゅ"]),
 ("media-economics","けいえい の もんだい を ぎろん しました。","keiei no mondai wo giron shimashita.","We discussed the management problem.",["けいえい"]),
 ("digital-discourse","ねっと の せいろん を べんきょう しました。","netto no seiron wo benkyou shimashita.","I studied internet discourse.",["ねっと"]),
 ("press-freedom","じゆう の ぎろん を べんきょう しました。","jiyuu no giron wo benkyou shimashita.","I studied the freedom debate.",["じゆう"]),
 ("cancel-culture","ひはん の ぎろん を べんきょう しました。","hihan no giron wo benkyou shimashita.","I studied the criticism debate.",["ひはん"]),
 ("cognition-basics","しんりがく を べんきょう しました。","shinrigaku wo benkyou shimashita.","I studied psychology.",["しんりがく"]),
 ("memory-systems","きおく の しくみ を べんきょう しました。","kioku no shikumi wo benkyou shimashita.","I studied the memory system.",["きおく"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.psychology-mind", "goal_id": "ja.goal.b2.psychology-mind",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe a mental process using taught psychology vocabulary",
              "discuss memory, emotion, or habit without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.psychology-mind
    description: 'Discuss mind and cognition: memory, emotion, habit, and development.'
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
    - target: ja.goal.b2.science-tech-ethics
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.critique.shinrigaku
    - ja.lex.critique.kokoro
    assessment_ids:
    - ja.assess.psychology-mind
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

DEP = """- from: ja.goal.b2.psychology-mind
  to: ja.goal.b2.science-tech-ethics
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
 ("650-visual-rhetoric","visual rhetoric","visual-rhetoric","ja.goal.b2.media-critique",
  ["eizou","hitei","binzuke","insaido","seshon"], "s:visual-rhetoric"),
 ("651-advertising-critique","advertising critique","advertising-critique","ja.goal.b2.media-critique",
  ["koukoku","houbi","boikotto","shihai","eigyou"], "s:advertising-critique"),
 ("652-public-relations","public relations","public-relations","ja.goal.b2.media-critique",
  ["puburisshu","hatsuho","ouken","taido","kankei3"], "s:public-relations"),
 ("653-media-economics","media economics","media-economics","ja.goal.b2.media-critique",
  ["keiei","shieki","toushi","netto","platformu"], "s:media-economics"),
 ("654-digital-discourse","digital discourse","digital-discourse","ja.goal.b2.media-critique",
  ["sns","tsuugou","tsuushin7","sekinin5","jiyuu2"], "s:digital-discourse"),
 ("655-cancel-culture","cancel culture","cancel-culture","ja.goal.b2.media-critique",
  ["hifan","jinken","kakushin","jiko","kanjou"], "s:cancel-culture"),
 ("656-press-freedom","press freedom","press-freedom","ja.goal.b2.media-critique",
  ["seikaku2","koui","doushutsu","mushiki","shinji"], "s:press-freedom"),
 ("657-critique-essay","critique essay","critique-essay","ja.goal.b2.media-critique",
  ["senryou","kyouiku2","torainingu","nouryoku","chi"], "g:ja.grammar.b2-ni-yoru"),
 ("658-cognition-basics","cognition basics","cognition-basics","ja.goal.b2.psychology-mind",
  ["shinrigaku","kokoro","kioku","shinrou","yume"], "s:cognition-basics"),
 ("659-memory-systems","memory systems","memory-systems","ja.goal.b2.psychology-mind",
  ["hakuriki","suiryoku","shukan","seichou","hatten4"], "s:memory-systems"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.critique.{w}" for w in words]
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

print("batch61 written")