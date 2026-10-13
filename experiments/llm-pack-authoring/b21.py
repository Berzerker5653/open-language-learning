#!/usr/bin/env python3
"""Batch 21: ja-JP B1 units 260-269 (media-news part 2 + technology part 1)."""
import json, os
from pathlib import Path

R = str(Path(__file__).resolve().parents[2] / "languages/ja-JP")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("editorial","えでとりある","noun","editorial"),
 ("ronsa","ろんさ","noun","discussion"),
 ("shiten","してん","noun","viewpoint"),
 ("kaisetsu","かいせつ","noun","commentary"),
 ("ronsetsu","ろんせつ","noun","argumentative writing"),
 ("hanron","はんろん","noun","rebuttal"),
 ("hihyou","ひひょう","noun","criticism"),
 ("ketsui","けつい","noun","resolution"),
 ("an","あん","noun","plan"),
 ("kaiken","かいけん","noun","opinion; experience"),
 ("sesaku","せさく","noun","current affairs"),
 ("kokunai","こくない","noun","domestic"),
 ("kokusai","こくさい","noun","international"),
 ("chiiki","ちいき","noun","region"),
 ("sekai","せかい","noun","world"),
 ("ronsuu","ろんすう","noun","debate"),
 ("taaron","たあろん","noun","counter-argument"),
 ("kouchou","こうちょう","noun","advantage; pros"),
 ("hitei","ひてい","noun","negation"),
 ("kaitou","かいとう","noun","answer; response"),
 ("rinri","りんり","noun","ethics"),
 ("kohei","こうへい","noun","fairness"),
 ("shino","しんのう","noun","trust"),
 ("kenryoku","けんりょく","noun","authority; power"),
 ("tsushin","つうしん","noun","news; communications"),
 ("debisu","でびす","noun","device"),
 ("sumaho","すまほ","noun","smartphone"),
 ("pasokon","ぱそこん","noun","personal computer"),
 ("taburet","たぶれっと","noun","tablet"),
 ("purinto","ぷりんと","noun","printer"),
 ("sekiyuriti","せきゅりてぃ","noun","security"),
 ("pasuwado","ぱすわーど","noun","password"),
 ("uirusu","ういるす","noun","virus"),
 ("spam","すぱむ","noun","spam"),
 ("hack","ハック","noun","hack"),
 ("privacy","ぷらいばしー","noun","privacy"),
 ("kojin-jouhou","こじんじょうほう","noun","personal information"),
 ("settings","せっとぃんぐ","noun","settings"),
 ("account","あくあんと","noun","account"),
 ("login","ろぐいん","noun","login"),
 ("apurikeeshon","あぷりけーしょん","noun","application"),
 ("software","そふとうぇあ","noun","software"),
 ("update","あっぷでーと","noun","update"),
 ("download","だうんろーど","noun","download"),
 ("bug","ばぐ","noun","bug"),
 ("web-site","ウェブサイト","noun","website"),
 ("search","さーち","noun","search"),
 ("database","でーたべーす","noun","database"),
 ("cloud","く라우드","noun","cloud"),
 ("backup","ばっくあっぷ","noun","backup"),
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
with open(os.path.join(R, "lexicon", "media2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[:25]:
        f.write(json.dumps(entry("media2", rid, kana, pos, gloss, "media"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "tech.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[25:]:
        f.write(json.dumps(entry("tech", rid, kana, pos, gloss, "technology"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.shieki-causative", "name": "〜させる (causative)", "category": "morphology",
  "definition": "The causative marks causing or letting: せんせいが がくせい に しゅくだい を させます (makes them do). With intransitives the causee takes を, with transitives に. Draft definition pending review."},
 {"id": "ja.grammar.b1.kanoukei-expansion", "name": "可能形 expansion (can do well / barely)", "category": "morphology",
  "definition": "Beyond できる: じゅぎょう が ひとりで きける (can follow a class alone), ぜんぜん わから ない (cannot understand at all). Potential forms pair with が for the object. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("editorial-viewpoint","えでとりある の してん が ふるい と ひひょう しました。","editorial no shiten ga furui to hihyou shimashita.","I criticized the editorial's viewpoint as outdated.",["してん"]),
 ("news-response","ニュース の ぎじょう へ の かいとう を かきました。","nyuusu no gijou e no kaitou wo kakimashita.","I wrote a response to the news item.",["かいとう"]),
 ("debate-point","ろんすう で たあろん を いう のが とくい です。","ronsuu de taaron wo iu no ga tokui desu.","I am good at making counter-arguments in debates.",["たあろん"]),
 ("device-daily","すまほ と ぱそこん が まいひち の でびす です。","sumaho to pasokon ga maihiichi no debisu desu.","The smartphone and PC are my daily devices.",["すまほ"]),
 ("safety-password","ぱすわーど を 3かげつ に 1ど かえます。","pasuwado wo 3-kagetsu ni 1-do kaemasu.","I change my password once every three months.",["ぱすわーど"]),
 ("privacy-setting","ぷらいばしー の せっとぃんぐ を かえました。","privacy no settings wo kaemashita.","I changed the privacy settings.",["せっとぃんぐ"]),
 ("software-update","そふとうぇあ の あっぷでーと が おくれました。","software no update ga okuremashita.","The software update was late.",["あっぷでーと"]),
 ("online-search","でーたべーす を さーち して じょうほう を みつけました。","database wo search shite jouhou wo mitsukemashita.","I searched the database and found the information.",["でーたべーす"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.technology", "goal_id": "ja.goal.b1.technology",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe device, account, and privacy settings and ask for help with software",
              "explain an online-service problem and its fix without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("260-reading-editorials","reading editorials","reading-editorials","ja.goal.b1.media-news",
  ["editorial","ronsa","shiten","kaisetsu","ronsetsu"], "s:editorial-viewpoint"),
 ("261-responding-to-news","responding to news","responding-news","ja.goal.b1.media-news",
  ["hanron","hihyou","ketsui","an","kaiken"], "s:news-response"),
 ("262-current-events","current events","current-events","ja.goal.b1.media-news",
  ["sesaku","kokunai","kokusai","chiiki","sekai"], "g:ja.grammar.b1.shieki-causative"),
 ("263-class-debate","class debate","class-debate","ja.goal.b1.media-news",
  ["ronsuu","taaron","kouchou","hitei","kaitou"], "s:debate-point"),
 ("264-media-ethics","media ethics","media-ethics","ja.goal.b1.media-news",
  ["rinri","kohei","shino","kenryoku","tsushin"], "g:ja.grammar.b1.kanoukei-expansion"),
 ("265-daily-devices","daily devices","daily-devices","ja.goal.b1.technology",
  ["debisu","sumaho","pasokon","taburet","purinto"], "s:device-daily"),
 ("266-internet-safety","internet safety","internet-safety","ja.goal.b1.technology",
  ["sekiyuriti","pasuwado","uirusu","spam","hack"], "s:safety-password"),
 ("267-privacy-settings","privacy settings","privacy-settings","ja.goal.b1.technology",
  ["privacy","kojin-jouhou","settings","account","login"], "s:privacy-setting"),
 ("268-software-help","software help","software-help","ja.goal.b1.technology",
  ["apurikeeshon","software","update","download","bug"], "s:software-update"),
 ("269-online-services","online services","online-services","ja.goal.b1.technology",
  ["web-site","search","database","cloud","backup"], "s:online-search"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    shard = "media2" if "media-news" in goal else "tech"
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

print("batch21 written")
