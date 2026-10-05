#!/usr/bin/env python3
"""Batch 20: ja-JP B1 units 250-259 (media-news part 1)."""
import json, os

R = "/home/hunter/game-dev/LTS/languages/ja-JP"
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("news","にゅーす","noun","news"),
 ("shimbun","しんぶん","noun","newspaper"),
 ("shuppansha","しゅっぱんしゃ","noun","publisher"),
 ("houdou","ほうどう","noun","news reporting"),
 ("head","へッド","noun","headline"),
 ("hassha","はっしゃ","noun","broadcasting"),
 ("kiji","きじ","noun","article"),
 ("kisha","きしゃ","noun","reporter"),
 ("housou","ほうそう","noun","broadcast"),
 ("housou-kyoku","ほうそうきょく","noun","broadcasting station"),
 ("rajio","らじお","noun","radio"),
 ("toron","とろん","noun","debate"),
 ("gazou","がぞう","noun","image"),
 ("caption","きゃぷしょん","noun","caption"),
 ("denshi-media","でんしめでぃあ","noun","digital media"),
 ("netto","ねっと","noun","internet"),
 ("post","ぽすと","noun","post"),
 ("comment","こめんと","noun","comment"),
 ("ii-ne","いいね","noun","like (social media)"),
 ("share","しぇあ","noun","share"),
 ("follow","ふぉろー","noun","follow"),
 ("honne","ほんね","noun","true feeling"),
 ("tatemae","たてまえ","noun","public stance"),
 ("jijitsu","じじつ","noun","fact"),
 ("hadan","はだん","noun","speculation"),
 ("uwasa","うわさ","noun","rumor"),
 ("gijou","ぎじょう","noun","circumstances"),
 ("seimu","せいむ","noun","government affairs"),
 ("seiji","せいじ","noun","politics"),
 ("keizai","けいざい","noun","economy"),
 ("shakai","しゃかい","noun","society"),
 ("bunka","ぶんか","noun","culture"),
 ("kaga","かか","noun","fire"),
 ("jiko","じこ","noun","accident"),
 ("saigai","さいがい","noun","disaster"),
 ("fukkyuu-saigai","ふっきゅうさいがい","noun","disaster recovery"),
 ("anzen","あんぜん","noun","safety"),
 ("bousai","ぼうさい","noun","disaster prevention"),
 ("yobou","よぼう","noun","prevention"),
 ("choui","ちょうい","noun","caution"),
 ("houmon","ほうもん","noun","visit; interview"),
 ("touhyou","とうひょう","noun","vote"),
 ("senkyo","せんきょ","noun","election"),
 ("koumin","こうみん","noun","citizen"),
 ("keitai","けいたい","noun","mobile phone"),
 ("ninoki","にのき","noun","popularity"),
 ("ryuukou","りゅうこう","noun","trend"),
 ("burando","ぶらんど","noun","brand"),
 ("maruke","まーけ","noun","market"),
 ("media-habits","めでぃあはびつ","noun","media habits"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "media.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.media.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["media"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.node-versus-kara", "name": "ので vs から (reason softness)", "category": "syntax",
  "definition": "ので gives a soft objective reason: あめが ふったので、ニュースに なりました; から is more direct and personal. Reports prefer ので. Draft definition pending review."},
 {"id": "ja.grammar.b1.zu-ni-de", "name": "〜ずにで (without doing)", "category": "syntax",
  "definition": "ずにで marks doing something without another action: かくにん せずに でました (left without checking). Formal writing and reports use it often. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("news-morning","まいあさ しんぶん の へッド を よみます。","maiasa shimbun no heddo wo yomimasu.","Every morning I read the newspaper headlines.",["しんぶん"]),
 ("fact-speculation","じじつ と はだん を くべつ して かきます。","jijitsu to hadan wo kubetsu shite kakimasu.","I write distinguishing fact from speculation.",["じじつ"]),
 ("article-summary","きじ を 3ぶん で まとめました。","kiji wo 3-bun de matimashita.","I summarized the article in three sentences.",["きじ"]),
 ("news-discuss","ニュース の ぎじょう について ともだち と はなしました。","nyuusu no gijou ni tsuite tomodachi to hanashimashita.","I talked with a friend about the news circumstances.",["ぎじょう"]),
 ("net-use","ねっと に 1にち 2じかん つかっています。","netto ni 1-nichi 2-jikan tsukatteimasu.","I use the internet two hours a day.",["ねっと"]),
 ("check-rumor","うわさ かどうか ほんの ほうどう で かくにん します。","uwasa ka dou ka hon no houdou de kakunin shimasu.","I check whether a rumor is true with real reporting.",["うわさ"]),
 ("media-habits-night","よる は rajio で おんがく を ききます。","yoru wa rajio de ongaku wo kikimasu.","At night I listen to music on the radio.",["rajio"]),
 ("photo-caption","しゃしん の きゃぷしょん が ながすぎます。","shashin no kyapushon ga nagasugimasu.","The photo caption is too long.",["きゃぷしょん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.media-news", "goal_id": "ja.goal.b1.media-news",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "summarize a news article and distinguish fact from speculation",
              "discuss media habits or a broadcast item without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("250-reading-news","reading news","reading-news","ja.goal.b1.media-news",
  ["news","shimbun","head","houdou","kiji"], "s:news-morning"),
 ("251-headline-style","headline style","headline-style","ja.goal.b1.media-news",
  ["kisha","housou","hassha","housou-kyoku","rajio"], "g:ja.grammar.b1.node-versus-kara"),
 ("252-opinion-versus-fact","opinion versus fact","opinion-vs-fact","ja.goal.b1.media-news",
  ["jijitsu","hadan","uwasa","honne","tatemae"], "s:fact-speculation"),
 ("253-article-summary","article summary","article-summary","ja.goal.b1.media-news",
  ["gijou","seimu","seiji","keizai","bunka"], "s:article-summary"),
 ("254-discussing-news","discussing news","discussing-news","ja.goal.b1.media-news",
  ["shakai","kaga","jiko","saigai","fukkyuu-saigai"], "s:news-discuss"),
 ("255-social-media-use","social media use","social-media-use","ja.goal.b1.media-news",
  ["netto","post","comment","ii-ne","share"], "s:net-use"),
 ("256-checking-misinformation","checking misinformation","check-misinfo","ja.goal.b1.media-news",
  ["anzen","bousai","yobou","choui","follow"], "s:check-rumor"),
 ("257-media-habits","media habits","media-habits","ja.goal.b1.media-news",
  ["media-habits","toron","houmon","gazou","caption"], "s:media-habits-night"),
 ("258-photo-captions","photo captions","photo-captions","ja.goal.b1.media-news",
  ["denshi-media","ninoki","ryuukou","burando","maruke"], "s:photo-caption"),
 ("259-broadcast-style","broadcast style","broadcast-style","ja.goal.b1.media-news",
  ["keitai","shuppansha","touhyou","senkyo","koumin"], "g:ja.grammar.b1.zu-ni-de"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.media.{w}" for w in words]
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

print("batch20 written")
