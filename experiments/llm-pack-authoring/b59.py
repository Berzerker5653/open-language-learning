#!/usr/bin/env python3
"""ja-JP batch 59: B2 units 630-639 (art-design)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("dentou","でんとう","noun","tradition"),
 ("denshou","でんしょう","noun","transmission, heritage"),
 ("kogei","こうげい","noun","craft, handicraft"),
 ("washi","わし","noun","Japanese paper"),
 ("chado","ちゃどう","noun","tea ceremony"),
 ("kadou","かどう","noun","calligraphy"),
 ("ikebana","いけばな","noun","flower arrangement"),
 ("kabuki","かぶき","noun","kabuki theater"),
 ("nou","のう","noun","noh theater"),
 ("geino","げいのう","noun","performing arts"),
 ("ongaku","おんがく","noun","music"),
 ("melodi","めるでぃ","noun","melody"),
 ("raito","らいと","noun","light, lighting"),
 ("kuukan","くうかん","noun","space"),
 ("kenchiku","けんちく","noun","architecture"),
 ("tatemono","たてもの","noun","building"),
 ("toshi","とし","noun","city"),
 ("douro","どうろ","noun","street, road"),
 ("koen","こうえん","noun","park"),
 ("setubi","せつび","noun","equipment, facilities"),
 ("keikaku2","けいかく","noun","plan, planning"),
 ("bi2","び","noun","beauty"),
 ("minamo","みなも","noun","grace, elegance"),
 ("shitsunai","しつない","noun","interior design"),
 ("kagu","かぐ","noun","furniture"),
 ("fukushoku","ふくしょく","noun","interior decoration"),
 ("purodakuto","ぷろだくと","noun","product"),
 ("dezain2","でざいん","noun","design"),
 ("tsukurite","つくりて","noun","maker, craftsman"),
 ("shouhin2","しょうひん","noun","consumer goods"),
 ("maketto","まけっと","noun","market"),
 ("ne","ね","noun","price, cost"),
 ("kyaku","きゃく","noun","customer, guest"),
 ("ato","あと","noun","trace, remains"),
 ("koukyou","こうきょう","noun","public, community"),
 ("shiminkou","しみんこう","noun","civic demand"),
 ("sekinin3","せきにん","noun","responsibility"),
 ("rinen","りねん","noun","principle, ideal"),
 ("hakai2","はかい","noun","destruction"),
 ("hogo","ほご","noun","protection"),
 ("mirai","みらい","noun","future"),
 ("shinkou","しんこう","noun","faith, trust"),
 ("hatsugen","はつげん","noun","statement, utterance"),
 ("kouchou","こうちょう","noun","extension, elongation"),
 ("chie","ちえ","noun","wisdom, cleverness"),
 ("kankei2","かんけい","noun","relation, connection"),
 ("mondai2","もんだい","noun","problem, question"),
 ("kaitou","かいとう","noun","solution, answer"),
 ("risou2","りそう","noun","ideal"),
 ("yogen","よげん","noun","prediction, prophecy"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.art2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["art"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "art2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-to-shite", "name": "〜として (as)", "category": "syntax",
  "definition": "として marks a role or capacity: げいのう として せいかつ する. Draft definition pending review."},
 {"id": "ja.grammar.b2-ni-motte", "name": "〜をもって (by means of, with)", "category": "syntax",
  "definition": "をもって marks means or instrument: び を もって ぶんか を つたえる. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("traditional-arts","でんとう の げいのう を べんきょう しました。","dentou no geino wo benkyou shimashita.","I studied traditional arts.",["でんとう"]),
 ("modern-art","げいじゅつ の あたらしい かたち を みました。","geijutsu no atarashii katachi wo mimashita.","I saw a new art form.",["げいじゅつ"]),
 ("architecture-talk","けんちく の しゃしん を みました。","kenchiku no shashin wo mimashita.","I saw the architecture photos.",["けんちく"]),
 ("urban-design","とし の けいかく を ぎろん しました。","toshi no keikaku wo giron shimashita.","We discussed the city plan.",["とし"]),
 ("craft-aesthetics","こうげい の さくひん を みました。","kogei no sakuhin wo mimashita.","I saw the craft work.",["こうげい"]),
 ("photography-art","しゃしん の てんじ へ いきました。","shashin no tenji e ikimashita.","I went to the photo exhibition.",["しゃしん"]),
 ("music-analysis","おんがく の めるでぃ を ききました。","ongaku no merodi wo kikimashita.","I listened to the melody.",["めるでぃ"]),
 ("public-art","こうきょう の げい について かきました。","koukyou no gei ni tsuite kakimashita.","I wrote about public art.",["こうきょう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

U = [
 ("630-traditional-arts","traditional arts","traditional-arts",
  ["dentou","denshou","kogei","washi","chado"], "s:traditional-arts"),
 ("631-modern-art","modern art","modern-art",
  ["kadou","ikebana","kabuki","nou","geino"], "s:modern-art"),
 ("632-architecture-talk","architecture talk","architecture-talk",
  ["kenchiku","tatemono","kuukan","raito","kouchou"], "s:architecture-talk"),
 ("633-urban-design","urban design","urban-design",
  ["toshi","douro","koen","setubi","keikaku2"], "s:urban-design"),
 ("634-craft-aesthetics","craft aesthetics","craft-aesthetics",
  ["bi2","minamo","tsukurite","purodakuto","kagu"], "s:craft-aesthetics"),
 ("635-photography-art","photography art","photography-art",
  ["shitsunai","fukushoku","dezain2","ato","kaitou"], "s:photography-art"),
 ("636-music-analysis","music analysis","music-analysis",
  ["ongaku","melodi","chie","kankei2","hatsugen"], "s:music-analysis"),
 ("637-art-market","art market","art-market",
  ["maketto","ne","kyaku","shouhin2","yogen"], "g:ja.grammar.b2-to-shite"),
 ("638-public-art","public art","public-art",
  ["koukyou","shiminkou","hogo","sekinin3","mondai2"], "s:public-art"),
 ("639-design-ethics","design ethics","design-ethics",
  ["rinen","hakai2","mirai","shinkou","risou2"], "g:ja.grammar.b2-ni-motte"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.art2.{w}" for w in words]
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

for fname, topic, uid, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, "ja.goal.b2.art-design", words, newitem))

print("batch59 written")
