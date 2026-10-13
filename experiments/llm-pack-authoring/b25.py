#!/usr/bin/env python3
"""Batch 25: ja-JP B1 units 300-309 (society-rules part 2)."""
import json, os
from pathlib import Path

R = str(Path(__file__).resolve().parents[2] / "languages/ja-JP")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("yuuutsu","ゆううつ","noun","worry"),
 ("soudan","そうだん","noun","consultation"),
 ("kotsuu","こうつう","noun","traffic"),
 ("chuga","ちゅうが","noun","congestion"),
 ("kouon","こうおん","noun","noise"),
 ("seimen","せいめん","noun","petition"),
 ("shomei","しょうめい","noun","signature"),
 ("kyoutei","きょうてい","noun","agreement"),
 ("seikyuu","せいきゅう","noun","request"),
 ("seido","せいど","noun","system"),
 ("gyousei","ぎょうせい","noun","administration"),
 ("kinmu","きんむ","noun","labor service"),
 ("houchi","ほうち","noun","public order"),
 ("hosei","ほうせい","noun","legislation"),
 ("yakuin","やくいん","noun","public official"),
 ("minshu","みんしゅ","noun","democracy"),
 ("kouho","こうほ","noun","candidate"),
 ("kensei","けんせい","noun","policy"),
 ("jumin","じゅうみん","noun","resident"),
 ("kenpou","けんぽう","noun","constitution"),
 ("kodoku","こどく","noun","loneliness"),
 ("hikikomori","ひきこもり","noun","social withdrawal"),
 ("kyuugyou","きゅうぎょう","noun","unemployment"),
 ("kyoufu","きょうふ","noun","fear"),
 ("shisan","しさん","noun","assets"),
 ("byoudou","びょうどう","noun","equality"),
 ("sa","さ","noun","difference"),
 ("kaihatsu","かいはつ","noun","development"),
 ("fbyoudou","ふびょうどう","noun","inequality"),
 ("kyousou","きょうそう","noun","competition"),
 ("inaka","いなか","noun","countryside"),
 ("kandou","かんどう","noun","excitement"),
 ("shizukasa","しずけさ","noun","quietness"),
 ("kominkan","こうみんかん","noun","community center"),
 ("toshi","とし","noun","city"),
 ("sedai","せいだい","noun","generation"),
 ("seinen","せいねん","noun","young adult"),
 ("kakusa","かくさ","noun","gap"),
 ("ishiki","しき","noun","awareness"),
 ("seishounen","せいしょうねん","noun","youth"),
 ("seimei","せいめい","noun","statement"),
 ("akusei","あこう","noun","accusation"),
 ("teigen","ていげん","noun","proposal"),
 ("houfuku","ほうふく","noun","response"),
 ("koufuku","こうふく","noun","public welfare"),
 ("sanka","さんか","noun","participation"),
 ("shimin","しみん","noun","citizen"),
 ("jichi","じち","noun","self-governance"),
 ("hatsugen","はつげん","noun","statement"),
 ("koryoku","きょうりょく","noun","cooperation"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "society2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.society2.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["society"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.azu-ni", "name": "〜ずに (without doing, formal)", "category": "syntax",
  "definition": "Formal negative connective ずに: しゅうみん が ぜんぜん さんか せずに、ほうせい が すすみました. Written style prefers ずに over ないで. Draft definition pending review."},
 {"id": "ja.grammar.b1.toba-conditional", "name": "なら/たら/ば conditional contrast", "category": "syntax",
  "definition": "なら marks a given topic: ぎむ なら ぜんぶ はたします; たら is narrative: さんか したら、たのしかった; ば is formal. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("community-worry","この ちほう の こうつう の ゆううつ が ふえました。","kono chiho no kotsuu no yuutsu ga fuemashita.","Traffic worries in this region have grown.",["ゆううつ"]),
 ("petition-signature","せいめん に 1000めい の しょうめい が あつまりました。","seimen ni 1000-mei no shomei ga atsumarimashita.","The petition gathered 1000 signatures.",["しょうめい"]),
 ("civic-hall-meeting","こうみんかん で ぎむ の はなしあいを しました。","kominkan de gimu no hanashiai wo shimashita.","We discussed duties at the community center.",["こうみんかん"]),
 ("voting-candidate","こうほ の けんせい を きいて とうひょう しました。","kouho no kensei wo kiite touhyou shimashita.","I listened to the candidate's policy and voted.",["こうほ"]),
 ("social-issue","こどく は げんざい の しゃかい もんだい です。","kodoku wa genzai no shakai mondai desu.","Loneliness is a current social problem.",["こどく"]),
 ("inequality-gap","しゃかい の びょうどう と かくさ を はなしました。","shakai no byoudou to kakusa wo hanashimashita.","We discussed social equality and gaps.",["びょうどう"]),
 ("urban-rural","とし と いなか の ちがいを べんきょう しました。","toshi to inaka no chigai wo benkyou shimashita.","We studied the difference between city and countryside.",["いなか"]),
 ("civic-participation","しみん さんか なくして きょうせい は ありません。","shimin sanka nakushite kyousei wa arimasen.","Without citizen participation there is no coexistence.",["しみん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("300-community-problems","community problems","community-problems","ja.goal.b1.society-rules",
  ["yuuutsu","soudan","kotsuu","chuga","kouon"], "s:community-worry"),
 ("301-writing-petitions","writing petitions","writing-petitions","ja.goal.b1.society-rules",
  ["seimen","shomei","kyoutei","seikyuu","seido"], "s:petition-signature"),
 ("302-local-government","local government","local-government","ja.goal.b1.society-rules",
  ["gyousei","kinmu","houchi","hosei","yakuin"], "s:civic-hall-meeting"),
 ("303-voting-information","voting information","voting-information","ja.goal.b1.society-rules",
  ["minshu","kouho","kensei","jumin","kenpou"], "s:voting-candidate"),
 ("304-social-issues","social issues","social-issues","ja.goal.b1.society-rules",
  ["kodoku","hikikomori","kyuugyou","kyoufu","shisan"], "s:social-issue"),
 ("305-inequality-discussion","inequality discussion","inequality-discussion","ja.goal.b1.society-rules",
  ["byoudou","sa","kaihatsu","fbyoudou","kyousou"], "s:inequality-gap"),
 ("306-urban-versus-rural","urban versus rural","urban-rural","ja.goal.b1.society-rules",
  ["inaka","kandou","shizukasa","kominkan","toshi"], "s:urban-rural"),
 ("307-generational-difference","generational difference","generational-difference","ja.goal.b1.society-rules",
  ["sedai","seinen","kakusa","ishiki","seishounen"], "g:ja.grammar.b1.azu-ni"),
 ("308-polite-protest","polite protest","polite-protest","ja.goal.b1.society-rules",
  ["seimei","akusei","teigen","houfuku","koufuku"], "g:ja.grammar.b1.toba-conditional"),
 ("309-civic-participation","civic participation","civic-participation","ja.goal.b1.society-rules",
  ["sanka","shimin","jichi","hatsugen","koryoku"], "s:civic-participation"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.society2.{w}" for w in words]
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

print("batch25 written")
