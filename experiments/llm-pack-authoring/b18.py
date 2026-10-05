#!/usr/bin/env python3
"""Batch 18: ja-JP B1 units 230-239 (work-professional part 2 + education-academic part 1)."""
import json, os

R = "/home/hunter/game-dev/LTS/languages/ja-JP"
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("kenkai","けんかい","noun","luncheon meeting"),
 ("iwakai","いわかい","noun","banquet; party"),
 ("fuman-ire","ふまんいれ","noun","grievance box"),
 ("fukyu","ふくゆう","noun","wealth; affluence"),
 ("aijo","あいじょう","noun","affection; harmony"),
 ("wakamatsu","わかまつ","noun","young employee"),
 ("shokunin","しょくにん","noun","craftsman; occupation"),
 ("kohai","こうはい","noun","junior (colleague)"),
 ("shuumei","しゅうめい","noun","assembly; gathering"),
 ("kaihou","かいほう","noun","report"),
 ("kai-ken","かいけん","noun","meeting fee; membership dues"),
 ("kyoku","きょく","noun","bureau; department"),
 ("kounai","こうない","noun","within the company"),
 ("shokuba-ryou","しょくばりょう","noun","workplace etiquette"),
 ("kaihen","かいへん","noun","reply"),
 ("tsuujou","つうじょう","noun","regular mail; correspondence"),
 ("denwa-ban","でんわばん","noun","phone number"),
 ("moushiwake","もうしわけ","noun","apology"),
 ("moushiage","もうしあげ","noun","reporting (humble)"),
 ("kachou","かちょう","noun","satisfaction"),
 ("manzoku","まんぞく","noun","satisfaction; contentment"),
 ("kyouiku","きょういく","noun","education"),
 ("kyouiku-ken","きょういくけん","noun","right to education"),
 ("shingaku","しんがく","noun","advancing to higher education"),
 ("daigakuin","だいがくいん","noun","graduate school"),
 ("gakubu","がくぶ","noun","faculty; department"),
 ("kenkyuusei","けんきゅうせい","noun","research student"),
 ("kyouju","きょうじゅ","noun","professor"),
 ("gakuen","がくえん","noun","campus; school"),
 ("kougi","こうぎ","noun","lecture"),
 ("seminaa","せみなー","noun","seminar"),
 ("gijutsu","ぎじゅつ","noun","technique; technology"),
 ("kenkyuu","けんきゅう","noun","research"),
 ("kenkyuu-sha","けんきゅうしゃ","noun","researcher"),
 ("kenkyuu-hi","けんきゅうひ","noun","research expenses"),
 ("nyuushi","にゅうし","noun","entrance exam"),
 ("jissen","じっせん","noun","practice; exercise"),
 ("jugyou-ryaku","じゅぎょうりゃく","noun","class summary"),
 ("test","テスト","noun","test"),
 ("shiken","しけん","noun","examination"),
 ("gakushi","がくし","noun","bachelor's degree"),
 ("hakushi","はくし","noun","doctorate; PhD"),
 ("hyouka","ひょうか","noun","assessment; evaluation"),
 ("seiseki","せいせき","noun","grades; academic record"),
 ("shishou","ししょう","noun","supervisor; advisor"),
 ("ronbun","ろんぶん","noun","thesis; paper"),
 ("saku","さく","noun","work (authored)"),
 ("inshou","いんしょう","noun","impression"),
 ("inshou-ron","いんしょうろん","noun","subjective argument"),
 ("gakki","がっき","noun","semester"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "edu.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.edu.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["education"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.susume-continuity", "name": "〜続ける/〜出す (continue / begin)", "category": "morphology",
  "definition": "Verb ます-stem + 続ける shows continuation: かいぎは つづいています; + 出す shows onset: あいてが きびしく なりだしました. Draft definition pending review."},
 {"id": "ja.grammar.b1.to-iu-toka", "name": "〜というか (soft reformulation)", "category": "pragmatics",
  "definition": "というか softly reformulates: かんりが ふえて、というか しごとが ふえてきました. It hedges strong claims in professional and academic speech. Draft definition pending review."},
 {"id": "ja.grammar.b1.you-form-volitional", "name": "〜よう/〜まい (volitional)", "category": "morphology",
  "definition": "The volitional marks intent or invitation: ろんぶんを かこうと おもっています; negative volitional まい: まだ あきらめまい. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("grievance-box","ふまんいれに けんかいで のんきな はなしが でました。","fuman-ire ni kenkai de nonki na hanashi ga demashita.","A light topic came up at the luncheon about the grievance box.",["けんかい"]),
 ("senpai-help","せんぱいに しょくば-りょうを おしえて もらいました。","senpai ni shokuba-ryo wo oshiete moraimashita.","A senior taught me workplace etiquette.",["せんぱい"]),
 ("escalation-apology","もうしわけありません、すぐ しょうほうに かいとうします。","moushiwake arimasen, sugu shouhou ni kaitou shimasu.","I apologize; I will respond to the complaint right away.",["もうしわけ"]),
 ("presentation-structure","こうぎの じゅぎょうりゃくを 3てん に まとめました。","kougi no jugyou-ryaku wo 3-ten ni matimashita.","I summarized the lecture notes into three points.",["じゅぎょうりゃく"]),
 ("network-message","しゅめい の おり に せんせい と あいさつ しました。","shumei no ori ni sensei to aisatsu shimashita.","I greeted the professor at the assembly.",["しゅめい"]),
 ("promotion-talk","ひょうか の かい で しょうほう を もらいました。","hyouka no kai de shouhou wo moraimashita.","At the review meeting I received praise.",["ひょうか"]),
 ("university-system","だいがくいん の にゅうし を けんきゅう しています。","daigakuin no nyuushi wo kenkyuu shiteimasu.","I am researching graduate school entrance exams.",["にゅうし"]),
 ("essay-impression","ぶんしょう の いんしょう を せんせい に つたえました。","bunshou no inshou wo sensei ni tsutaemashita.","I conveyed the impression of the writing to the teacher.",["いんしょう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.education-academic", "goal_id": "ja.goal.b1.education-academic",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe university structure, classes, and assessment using academic vocabulary",
              "summarize a lecture or essay point without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")
# (file, topic, unit-id, goal, words(5), newitem)
U = [
 ("230-team-conflict","team conflict","team-conflict","ja.goal.b1.work-professional",
  ["fuman-ire","aijo","kenkai","iwakai","fukyu"], "s:grievance-box"),
 ("231-customer-escalation","customer escalation","customer-escalation","ja.goal.b1.work-professional",
  ["moushiwake","moushiage","manzoku","kaihen","denwa-ban"], "s:escalation-apology"),
 ("232-presentation-structure","presentation structure","presentation-structure","ja.goal.b1.work-professional",
  ["jugyou-ryaku","kougi","seminaa","shuumei","kaihou"], "g:ja.grammar.b1.susume-continuity"),
 ("233-networking-messages","networking messages","networking-messages","ja.goal.b1.work-professional",
  ["kounai","kohai","shokuba-ryou","kai-ken","shokunin"], "s:senpai-help"),
 ("234-promotion-conversations","promotion conversations","promotion-conversations","ja.goal.b1.work-professional",
  ["hyouka","kachou","kyoku","wakamatsu","kyouiku"], "s:promotion-talk"),
 ("235-university-system","university system","university-system","ja.goal.b1.education-academic",
  ["shingaku","daigakuin","gakubu","kenkyuusei","kyouju"], "s:network-message"),
 ("236-application-essay","application essay","application-essay","ja.goal.b1.education-academic",
  ["inshou","inshou-ron","saku","ronbun","shishou"], "s:essay-impression"),
 ("237-lecture-notes","lecture notes","lecture-notes","ja.goal.b1.education-academic",
  ["jissen","test","shiken","seiseki","gakushi"], "g:ja.grammar.b1.to-iu-toka"),
 ("238-seminar-discussion","seminar discussion","seminar-discussion","ja.goal.b1.education-academic",
  ["kenkyuu","kenkyuu-sha","kenkyuu-hi","gijutsu","hakushi"], "g:ja.grammar.b1.you-form-volitional"),
 ("239-citation-basics","citation basics","citation-basics","ja.goal.b1.education-academic",
  ["kyouiku-ken","tsuujou","nyuushi","gakuen","gakki"], "s:university-system"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.edu.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = [f"# ai-assisted draft unit (Mode B B1); content refs are pack data; qualified review pending.",
             f"id: ja.unit.{uid}", f"goal_id: {goal}",
             f"title: {topic}", f"summary: B1 language for {topic}.",
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

print("batch18 written")
