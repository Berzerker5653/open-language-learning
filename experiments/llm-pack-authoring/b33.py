#!/usr/bin/env python3
"""ja-JP batch 33: B1 units 380-389 (comparison-debate complete, storytelling start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("hyoten","ひょうかひょう","noun","rating chart"),
 ("seisu","せいすう","noun","positive number"),
 ("yosan2","よさん","noun","estimate"),
 ("ryakusuji","りゃくすじ","noun","outline"),
 ("kessan2","けっさん","noun","settlement"),
 ("koukai","こうかい","noun","public showing"),
 ("kaisou2","かいそう","noun","brainstorm"),
 ("jaramu","じょうめん","noun","scene"),
 ("shutten2","しゅってん","noun","issue"),
 ("hikari2","ひかり","noun","light"),
 ("kage2","かげ","noun","shadow"),
 ("yami2","やみ","noun","darkness"),
 ("akari2","あかり","noun","lighting"),
 ("danwa","だんわ","noun","dialogue"),
 ("rondan","ろんたん","noun","discussion"),
 ("kyara","きゃら","noun","character"),
 ("bunshou","ぶんしょう","noun","passage"),
 ("sakuhin","さくひん","noun","work (art)"),
 ("sakka","さっか","noun","author"),
 ("shinbun","しんぶん","noun","newspaper"),
 ("haiyu","はいゆう","noun","actor"),
 ("geinou","げいのう","noun","entertainment"),
 ("dan","だん","noun","stair step"),
 ("danraku","だんらく","noun","fall"),
 ("gou","ごう","noun","combination"),
 ("monogatari","ものがたり","noun","story"),
 ("keimatsu","けいまつ","noun","ending"),
 ("setsu","せつ","noun","section"),
 ("geki","げき","noun","drama"),
 ("shuyaku","しゅやく","noun","lead role"),
 ("yuki2","ゆき","noun","snow"),
 ("kaze3","かぜ","noun","breeze"),
 ("ame2","あめ","noun","rain"),
 ("hare2","はれ","noun","clear weather"),
 ("kumo2","くも","noun","cloud"),
 ("itsuka","いつか","adverb","sometime"),
 ("itsumo","いつも","adverb","always"),
 ("doushite","どうして","adverb","why"),
 ("nanika","なにか","noun","something"),
 ("nanimo","なにも","noun","nothing"),
 ("konna","こんな","adnominal","like this"),
 ("sonna","そんな","adnominal","like that"),
 ("anna","あんな","adnominal","like that (over there)"),
 ("gogo","ごご","noun","afternoon"),
 ("hoshi","ほし","noun","star"),
 ("taiyou","たいよう","noun","sun"),
 ("wakusei","わくせい","noun","planet"),
 ("tsuyu2","つゆ","noun","rainy season"),
 ("shimo2","しも","noun","frost"),
 ("kiri2","きり","noun","fog"),
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

with open(os.path.join(R, "lexicon", "debate2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[:25]:
        f.write(json.dumps(entry("debate2", rid, kana, pos, gloss, "debate"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "story.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[25:]:
        f.write(json.dumps(entry("story", rid, kana, pos, gloss, "narrative"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.yori-mo", "name": "〜よりも (emphatic comparison)", "category": "syntax",
  "definition": "よりも emphasizes the standard: ゆき よりも かぜ の ほうが さむい. Draft definition pending review."},
 {"id": "ja.grammar.b1.to-toki", "name": "〜とき (temporal clause)", "category": "syntax",
  "definition": "とき marks a time: なかえ が きた とき、あめ が ふって いました. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("review-post","ひょうかひょう を かい ました。","hyoten wo kai mashita.","I wrote the rating chart.",["ひょうかひょう"]),
 ("rating-system","こうかい の レッスン で かいそう しました。","koukai no ressun de kaisou shimashita.","We brainstormed in the public-showing lesson.",["かいそう"]),
 ("budget-compare","ひかり と かげ を べんきょう しました。","hikari to kage wo benkyou shimashita.","We studied light and shadow.",["ひかり"]),
 ("travel-compare","ぶんしょう の ちゅうい を べんきょう しました。","bunshou no chui wo benkyou shimashita.","We studied passage notes.",["ぶんしょう"]),
 ("decision-essay","さっかく の こと を かきました。","sakka no koto wo kakimashita.","I wrote about the author.",["さっか"]),
 ("narrative-structure","ものがたり の けいまつ を かきました。","monogatari no keimatsu wo kakimashita.","I wrote the story's ending.",["けいまつ"]),
 ("background-setting","ゆき と かぜ と あめ を かんさつ しました。","yuki to kaze to ame wo kansatsu shimashita.","I observed snow, wind, and rain.",["ゆき"]),
 ("plot-sequencing","いつか きっと できる と おもいました。","itsuka kitto dekiru to omoimashita.","I thought I can do it someday.",["いつか"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.storytelling", "goal_id": "ja.goal.b1.storytelling",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "tell a story with clear structure, background, and sequence",
              "describe characters and settings without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("380-review-posts","review posts","review-posts","ja.goal.b1.comparison-debate",
  ["hyoten","seisu","yosan2","ryakusuji","kessan2"], "s:review-post"),
 ("381-rating-systems","rating systems","rating-systems","ja.goal.b1.comparison-debate",
  ["koukai","kaisou2","jaramu","shutten2","hikari2"], "s:rating-system"),
 ("382-budget-comparison","budget comparison","budget-comparison","ja.goal.b1.comparison-debate",
  ["kage2","yami2","akari2","danwa","rondan"], "g:ja.grammar.b1.yori-mo"),
 ("383-travel-comparison","travel comparison","travel-comparison","ja.goal.b1.comparison-debate",
  ["kyara","bunshou","sakuhin","sakka","shinbun"], "s:travel-compare"),
 ("384-decision-essay","decision essay","decision-essay","ja.goal.b1.comparison-debate",
  ["haiyu","geinou","dan","danraku","gou"], "s:decision-essay"),
 ("385-narrative-structure","narrative structure","narrative-structure","ja.goal.b1.storytelling",
  ["monogatari","keimatsu","setsu","geki","shuyaku"], "s:narrative-structure"),
 ("386-background-setting","background setting","background-setting","ja.goal.b1.storytelling",
  ["yuki2","kaze3","ame2","hare2","kumo2"], "s:background-setting"),
 ("387-plot-sequencing","plot sequencing","plot-sequencing","ja.goal.b1.storytelling",
  ["itsuka","itsumo","doushite","nanika","nanimo"], "g:ja.grammar.b1.to-toki"),
 ("388-character-description","character description","character-description","ja.goal.b1.storytelling",
  ["konna","sonna","anna","gogo","hoshi"], "s:background-setting"),
 ("389-setting-description","setting description","setting-description","ja.goal.b1.storytelling",
  ["taiyou","wakusei","tsuyu2","shimo2","kiri2"], "s:background-setting"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    shard = "debate2" if "comparison" in goal else "story"
    lex = [f"ja.lex.{shard}.{w}" for w in words]
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

print("batch33 written")
