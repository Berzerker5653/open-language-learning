#!/usr/bin/env python3
"""Batch 23: ja-JP B1 units 280-289 (culture-tradition part 1)."""
import json, os

R = "/home/hunter/game-dev/LTS/languages/ja-JP"
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("shuukan","しゅうかん","noun","custom"),
 ("reigi","れいぎ","noun","etiquette"),
 ("girei","ぎれい","noun","ceremony"),
 ("kansha","かんしゃ","noun","gratitude"),
 ("nenchuu","ねんちゅう","noun","annual"),
 ("matsuri","まつり","noun","festival"),
 ("mikoshi","みこし","noun","portable shrine"),
 ("yatai","やたい","noun","festival stall"),
 ("bon-odori","ぼんおどり","noun","bon dance"),
 ("yukimi","ゆきみ","noun","snow-viewing"),
 ("koge","こうげ","noun","craft"),
 ("dentou","でんとう","noun","tradition"),
 ("washi","わし","noun","Japanese paper"),
 ("kimono","きもの","noun","kimono"),
 ("chado","ちゃどう","noun","tea ceremony"),
 ("kisoku","きそく","noun","rule"),
 ("manner","マナー","noun","manners"),
 ("teaji","てあい","noun","help"),
 ("omotenashi","おもてなし","noun","hospitality"),
 ("saiho","さいほう","noun","worship"),
 ("minzoku","みんぞく","noun","folk"),
 ("mukashibanashi","むかしばなし","noun","old tale"),
 ("hogen","ほうげん","noun","dialect"),
 ("meisho","めいしょ","noun","famous place"),
 ("kanko","かんこう","noun","sightseeing"),
 ("koryu","こうりゅう","noun","exchange"),
 ("fuhaku","ふはく","noun","exhibition"),
 ("bijutsukan","びじゅつかん","noun","art museum"),
 ("kankyaku","かんきゃく","noun","audience"),
 ("chihou","ちほう","noun","region"),
 ("tenjikai","てんじかい","noun","exhibition"),
 ("tenji-butsu","てんじぶつ","noun","exhibit"),
 ("guide","ガイド","noun","guide"),
 ("nyujou","にゅうじょう","noun","admission"),
 ("rekishi","れきし","noun","history"),
 ("iseki","いせき","noun","ruins"),
 ("shiseki","しせき","noun","historic site"),
 ("shaji","しゃじ","noun","castle"),
 ("jinja","じんじゃ","noun","shrine"),
 ("tera","てら","noun","temple"),
 ("katei","かてい","noun","family"),
 ("sandai","さんだい","noun","three generations"),
 ("denkyou","でんきょう","noun","inheritance"),
 ("youraku","ようやく","noun","summary; synopsis"),
 ("hokori","ほこり","noun","pride"),
 ("kachi","かち","noun","value"),
 ("tsuuke","つうかく","noun","fluency"),
 ("minyo","みんよう","noun","folk song"),
 ("shasei","しゃせい","noun","sketch"),
 ("shinko-zai","しんこうざい","noun","article of faith"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "culture.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.culture.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["culture"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.maeni-ato-de", "name": "〜前に/〜あとで (before / after)", "category": "syntax",
  "definition": "Verb dictionary form + 前に and た-form + あとで frame sequences: じんじゃ に いく まえに てを あらいます; まつり の あとで やたい を かたづけます. Draft definition pending review."},
 {"id": "ja.grammar.b1.ba-formal", "name": "〜ば (conditional, formal)", "category": "syntax",
  "definition": "The ば conditional states conditions: きそく を まもれば、だれでも にゅうじょう できます. Formal writing prefers it over と/たら. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("custom-explain","この しゅうかん は ねんちゅう の ぎれい です。","kono shuukan wa nenchuu no girei desu.","This custom is an annual ceremony.",["しゅうかん"]),
 ("festival-mikoshi","まつり で みこし を かつぎました。","matsuri de mikoshi wo katsugimashita.","At the festival we carried the portable shrine.",["みこし"]),
 ("craft-washi","わし を てで つくる こうげ です。","washi wo te de tsukuru kouge desu.","It is a craft making Japanese paper by hand.",["こうげ"]),
 ("etiquette-rule","マナー の きそく は かいしゃ ごとに ことなります。","manner no kisoku wa kaisha goto ni kotonarimasu.","Manners rules differ by company.",["きそく"]),
 ("region-dialect","その ちほう の ほうげん が すき です。","sono chiho no hogen ga suki desu.","I like that region's dialect.",["ほうげん"]),
 ("museum-exhibit","びじゅつかん の てんじぶつ が きれい でした。","bijutsukan no tenji-butsu ga kirei deshita.","The art museum's exhibit was beautiful.",["てんじぶつ"]),
 ("shrine-visit","じんじゃ で さいほう して、おみず を のみました。","jinja de saisho shite, omizu wo nomimashita.","At the shrine I worshipped and drank the water.",["じんじゃ"]),
 ("pride-craft","わし の こうげ に ほこり を かんじます。","washi no kouge ni hokori wo kanjimasu.","I feel pride in the washi craft.",["ほこり"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.culture-tradition", "goal_id": "ja.goal.b1.culture-tradition",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "explain a custom, festival, or craft using culture vocabulary",
              "compare regional or historical features without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("280-explaining-customs","explaining customs","explaining-customs","ja.goal.b1.culture-tradition",
  ["shuukan","reigi","girei","kansha","nenchuu"], "s:custom-explain"),
 ("281-festival-details","festival details","festival-details","ja.goal.b1.culture-tradition",
  ["matsuri","mikoshi","yatai","bon-odori","yukimi"], "s:festival-mikoshi"),
 ("282-traditional-crafts","traditional crafts","traditional-crafts","ja.goal.b1.culture-tradition",
  ["koge","dentou","washi","kimono","chado"], "s:craft-washi"),
 ("283-etiquette-rules","etiquette rules","etiquette-rules","ja.goal.b1.culture-tradition",
  ["kisoku","manner","teaji","omotenashi","saiho"], "s:etiquette-rule"),
 ("284-regional-cultures","regional cultures","regional-cultures","ja.goal.b1.culture-tradition",
  ["minzoku","mukashibanashi","hogen","meisho","kanko"], "s:region-dialect"),
 ("285-culture-comparison","culture comparison","culture-comparison","ja.goal.b1.culture-tradition",
  ["koryu","fuhaku","bijutsukan","kankyaku","chihou"], "g:ja.grammar.b1.maeni-ato-de"),
 ("286-museum-exhibits","museum exhibits","museum-exhibits","ja.goal.b1.culture-tradition",
  ["tenjikai","tenji-butsu","guide","nyujou","rekishi"], "s:museum-exhibit"),
 ("287-historical-sites","historical sites","historical-sites","ja.goal.b1.culture-tradition",
  ["iseki","shiseki","shaji","jinja","tera"], "s:shrine-visit"),
 ("288-tradition-change","tradition change","tradition-change","ja.goal.b1.culture-tradition",
  ["katei","sandai","denkyou","youraku","shinko-zai"], "g:ja.grammar.b1.ba-formal"),
 ("289-cultural-pride","cultural pride","cultural-pride","ja.goal.b1.culture-tradition",
  ["hokori","kachi","tsuuke","minyo","shasei"], "s:pride-craft"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.culture.{w}" for w in words]
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

print("batch23 written")
