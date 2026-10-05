#!/usr/bin/env python3
"""Batch 22: ja-JP B1 units 270-279 (technology part 2)."""
import json, os

R = "/home/hunter/game-dev/LTS/languages/ja-JP"
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("koi","こい","noun","malfunction"),
 ("shuuri","しゅうり","noun","repair"),
 ("kairyou","かいりょう","noun","improvement"),
 ("benri","べんり","na-adjective","convenient"),
 ("fuben","ふべん","na-adjective","inconvenient"),
 ("jinkou-chinou","じんこうちのう","noun","artificial intelligence"),
 ("robotto","ろぼっと","noun","robot"),
 ("genkai","げんかい","noun","limit"),
 ("kanou","かのう","na-adjective","possible"),
 ("mirai","みらい","noun","future"),
 ("ryuuri","りゅうり","noun","flow"),
 ("senzu","せんず","noun","anxiety"),
 ("kankaku","かんかく","noun","sense; feeling"),
 ("kyoumi","きょうみ","noun","interest"),
 ("kuse","くせ","noun","habit"),
 ("kaku","かく","noun","each"),
 ("chigai","ちがい","noun","difference"),
 ("kosei","こうせい","noun","cost-performance"),
 ("koui","こうい","noun","performance"),
 ("kikan","きかん","noun","mechanism"),
 ("shien","しえん","noun","support"),
 ("juri","じゅり","noun","acceptance; reception"),
 ("kirikae","きりかえ","noun","switching"),
 ("setsuzoku","せつぞく","noun","connection"),
 ("onrain","おんらいん","noun","online"),
 ("koodo","こーど","noun","code"),
 ("programu","ぷろぐらむ","noun","program"),
 ("arugorizumu","あるごりずむ","noun","algorithm"),
 ("koutei","こうてい","noun","process"),
 ("data","でーた","noun","data"),
 ("sumaato-houmu","すまーとほーむ","noun","smart home"),
 ("onkyou","おんきょう","noun","remote control"),
 ("sensoru","せんさーる","noun","sensor"),
 ("jidou","じどう","noun","automatic"),
 ("setsubi","せつび","noun","equipment"),
 ("komyuniti","こみゅにてぃ","noun","community"),
 ("forumu","ふぉーむ","noun","forum"),
 ("groupu","ぐるーぷ","noun","group"),
 ("kodou","こうどう","noun","action; behavior"),
 ("shinko","しんこう","noun","relationship"),
 ("henka","へんか","noun","change"),
 ("shinka","しんか","noun","evolution"),
 ("jidai","じだい","noun","era"),
 ("kakushin","かくしん","noun","innovation"),
 ("saisei","さいせい","noun","renewal"),
 ("detokku","デトック","noun","detox"),
 ("shizen","しぜん","noun","nature"),
 ("yutori","ゆとり","noun","slack; margin"),
 ("seishin","せいしん","noun","spirit; mind"),
 ("hanare","はなれ","noun","separation"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "tech2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.tech2.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["technology"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.onaji-chigai", "name": "同じ/違う comparison frames", "category": "semantics",
  "definition": "と同じ marks identity and と違う marks difference: この でびす は あれ と おなじ こうい です; 2つ は ねっけつ が ちがいます. Draft definition pending review."},
 {"id": "ja.grammar.b1.te-iku-te-kuru", "name": "〜ていく/〜てくる (change over time)", "category": "morphology",
  "definition": "〜ていく shows change away from the speaker: ぎじゅつ は かわっていきました; 〜てくる shows change toward now: べんりが つかって きました. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("tech-problem-fix","こい を しゅうり するのに 1じかん かかりました。","koi wo shuuri suru no ni 1-jikan kakarimashita.","It took an hour to repair the malfunction.",["こい"]),
 ("ai-limit-talk","じんこうちのう の げんかい について はなしました。","jinkou-chinou no genkai ni tsuite hanashimashita.","We talked about the limits of AI.",["じんこうちのう"]),
 ("net-habit","ねっと の くせ が ぬけません。","netto no kuse ga nukemasen.","I cannot break my internet habit.",["くせ"]),
 ("support-reception","でんわ で しえん の じゅり を たのみました。","denwa de shien no juri wo tanomimashita.","I asked for support acceptance by phone.",["しえん"]),
 ("coding-process","こーど を かく こうてい を ならいました。","koodo wo kaku koutei wo naraimashita.","I learned the process of writing code.",["こーど"]),
 ("remote-control","おんきょう で でんき を けします。","onkyou de denki wo keshimasu.","I turn off the light with the remote.",["おんきょう"]),
 ("community-post","こみゅにてぃ の ぐるーぷ に はっぴょう しました。","komyuniti no groupu ni happyou shimashita.","I posted in the community group.",["こみゅにてぃ"]),
 ("detox-nature","しぜん の なか で ゆとり を もたせました。","shizen no naka de yutori wo motasemashita.","I made slack time in nature.",["ゆとり"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("270-tech-problems","tech problems","tech-problems","ja.goal.b1.technology",
  ["koi","shuuri","kairyou","benri","fuben"], "s:tech-problem-fix"),
 ("271-ai-tool-talk","ai tool talk","ai-tool-talk","ja.goal.b1.technology",
  ["jinkou-chinou","robotto","genkai","kanou","mirai"], "s:ai-limit-talk"),
 ("272-digital-habits","digital habits","digital-habits","ja.goal.b1.technology",
  ["ryuuri","senzu","kankaku","kyoumi","kuse"], "s:net-habit"),
 ("273-comparing-gadgets","comparing gadgets","comparing-gadgets","ja.goal.b1.technology",
  ["kaku","chigai","kosei","koui","kikan"], "g:ja.grammar.b1.onaji-chigai"),
 ("274-tech-support-visit","tech support visit","tech-support-visit","ja.goal.b1.technology",
  ["shien","juri","kirikae","setsuzoku","onrain"], "s:support-reception"),
 ("275-coding-basics","coding basics","coding-basics","ja.goal.b1.technology",
  ["koodo","programu","arugorizumu","koutei","data"], "s:coding-process"),
 ("276-smart-home","smart home","smart-home","ja.goal.b1.technology",
  ["sumaato-houmu","onkyou","sensoru","jidou","setsubi"], "s:remote-control"),
 ("277-online-communities","online communities","online-communities","ja.goal.b1.technology",
  ["komyuniti","forumu","groupu","kodou","shinko"], "s:community-post"),
 ("278-technology-change","technology change","technology-change","ja.goal.b1.technology",
  ["henka","shinka","jidai","kakushin","saisei"], "g:ja.grammar.b1.te-iku-te-kuru"),
 ("279-digital-detox","digital detox","digital-detox","ja.goal.b1.technology",
  ["detokku","shizen","yutori","seishin","hanare"], "s:detox-nature"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.tech2.{w}" for w in words]
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

print("batch22 written")
