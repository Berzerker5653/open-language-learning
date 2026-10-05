#!/usr/bin/env python3
"""ja-JP batch 48: B2 units 520-529 (history-critical tail)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("monument","monument","n","monument"),
 ("kinenbi","memorial","n","memorial"),
 ("shouzou","statue","n","statue"),
 ("hoko","emblem","n","emblem, symbol"),
 ("hyougeki","controversy","n","controversy"),
 ("sagitou","debate","n","debate"),
 ("shiryoukan","archive","n","archive"),
 ("kanren","relation","n","relation"),
 ("kousatsu","verification","n","verification"),
 ("teikyou","submission","n","submission"),
 ("hensen","revision","n","revision"),
 ("saikoutei","reassessment","n","reassessment"),
 ("intabyuu","interview","n","interview"),
 ("denko","transmission","n","transmission, passing down"),
 ("kaisou","recollection","n","recollection"),
 ("senjo","prewar","n","prewar"),
 ("sengo2","postwar","n","postwar"),
 ("fukko","reconstruction","n","reconstruction"),
 ("seicho","growth","n","growth"),
 ("kinkyo","economic crisis","n","economic crisis"),
 ("senryaku2","strategy","n","strategy"),
 ("seimen","facade","n","facade"),
 ("jissai","reality","n","reality"),
 ("honne2","true intention","n","true intention"),
 ("gijinka","personification","n","personification"),
 ("fuhai","distribution","n","distribution"),
 ("hyoujun","standard","n","standard"),
 ("kijun","norm","n","norm, criterion"),
 ("ihan","deviation","n","deviation"),
 ("toui","discussion","n","discussion"),
 ("ruiji","analogy","n","analogy"),
 ("konkyo","basis","n","basis, grounds"),
 ("risou","ideal","n","ideal"),
 ("genjitsu","actuality","n","actuality"),
 ("kachi","value","n","value"),
 ("kiso","foundation","n","foundation"),
 ("soshi","clue","n","clue, hint"),
 ("kento","examination","n","examination"),
 ("katsuyou","application","n","application"),
 ("shiten2","viewpoint","n","viewpoint"),
 ("tachiba","standpoint","n","standpoint"),
 ("irezumi","tattoo","n","tattoo"),
 ("kiji","article","n","article"),
 ("koseki","family register","n","family register"),
 ("chosa","survey","n","survey"),
 ("mousho","written document","n","written document"),
 ("nikki","diary","n","diary"),
 ("tegami","letter","n","letter"),
 ("kioku","memory","n","memory"),
 ("kuchikami","oral tradition","n","oral tradition"),
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

with open(os.path.join(R, "lexicon", "history2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("history2", rid, kana, pos, gloss, "history"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.to-okeru", "name": "〜における (in, at)", "category": "syntax",
  "definition": "における modifies a noun with a domain: せんじょう における せいかつ. Draft definition pending review."},
 {"id": "ja.grammar.b2.ni-kagete", "name": "〜に限って (only, limited to)", "category": "syntax",
  "definition": "に限って restricts a set: とうきょう に かぎって ちゅうし した. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("economic-history-b","きんきょう の きじ を よみました。","kinkyou no kiji wo yomimashita.","I read the article about the crisis.",["きんきょう"]),
 ("social-history","こせき を しらべました。","koseki wo shirabemashita.","I examined the family register.",["こせき"]),
 ("regional-history","いれずみ を みました。","irezumi wo mimashita.","I saw the tattoo.",["いれずみ"]),
 ("history-and-identity","きおく の はなし を ききました。","kioku no hanashi wo kikimashita.","I heard the memory story.",["きおく"]),
 ("monument-debate","きねんび の ぎろん を べんきょう しました。","kinenbi no giron wo benkyou shimashita.","I studied the memorial debate.",["きねんび"]),
 ("archives-research","しりょうかん に いきました。","shiryoukan ni ikimashita.","I went to the archive.",["しりょうかん"]),
 ("revisionism-debate","ぎろん の じっさい を しらべました。","giron no jissai wo shirabemashita.","I examined the reality of the debate.",["じっさい"]),
 ("oral-history","くちかみ を とりました。","kuchikami wo torimashita.","I recorded the oral tradition.",["くちかみ"]),
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
 ("520-economic-history","economic history","economic-history-b",
  ["kinkyo","seicho","fukko","senjo","sengo2"], "s:economic-history-b"),
 ("521-social-history","social history","social-history",
  ["koseki","chosa","nikki","tegami","mousho"], "s:social-history"),
 ("522-regional-history","regional history","regional-history",
  ["irezumi","kiji","kanren","kaisou","hyoujun"], "s:regional-history"),
 ("523-history-and-identity","history and identity","history-and-identity",
  ["kioku","kachi","risou","konkyo","gijinka"], "s:history-and-identity"),
 ("524-monument-debate","monument debate","monument-debate",
  ["monument","kinenbi","shouzou","hoko","hyougeki"], "s:monument-debate"),
 ("525-archives-research","archives research","archives-research",
  ["shiryoukan","teikyou","kousatsu","kento","soshi"], "s:archives-research"),
 ("526-historical-method","historical method","historical-method",
  ["hensen","saikoutei","ihan","kijun","ruiji"], "g:ja.grammar.b2.to-okeru"),
 ("527-revisionism-debate","revisionism debate","revisionism-debate",
  ["sagitou","toui","seimen","jissai","honne2"], "s:revisionism-debate"),
 ("528-oral-history","oral history","oral-history",
  ["kuchikami","intabyuu","denko","tachiba","shiten2"], "s:oral-history"),
 ("529-museums-memory","museums and memory","museums-memory",
  ["senryaku2","kiso","fuhai","genjitsu","katsuyou"], "g:ja.grammar.b2.ni-kagete"),
]

def unit_yaml(topic, uid, goal, shard, words, newitem):
    lex = [f"ja.lex.{shard}.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = [f"# ai-assisted draft unit (Mode B B2); content refs are pack data; qualified review pending.",
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
        f.write(unit_yaml(topic, uid, "ja.goal.b2.history-critical", "history2", words, newitem))

print("batch48 written")
