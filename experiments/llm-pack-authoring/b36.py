#!/usr/bin/env python3
"""ja-JP batch 36: B1 units 410-414 (health-wellness complete) + B2 units 420-424 (politics-governance start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("rourei","ろうれい","noun","elderly"),
 ("kaigo","かいご","noun","care"),
 ("hoken2","ほけん","noun","insurance"),
 ("taizen2","たいぜん","noun","full"),
 ("rojin","ろうじん","noun","old person"),
 ("wakamono","わかもの","noun","young person"),
 ("kaiin","かいいん","noun","member"),
 ("kyoubu","きょうぶ","noun","club"),
 ("junren","じゅんれん","noun","practice"),
 ("taikyu2","たいきゅう","noun","absence"),
 ("choushin","ちょうしん","noun","dieting"),
 ("appu","アプリ","noun","app"),
 ("uebi","うえび","noun","upper"),
 ("ureba","うれば","noun","lower"),
 ("kenkou3","けんこう","noun","wellness"),
 ("byouin2","びょういん","noun","hospital"),
 ("isya3","いしゃ","noun","doctor"),
 ("fukushi2","ふくし","noun","welfare"),
 ("touhyou2","とうひょう","noun","vote"),
 ("koukai2","こうかい","noun","public session"),
 ("senkyo2","せんきょ","noun","election"),
 ("seido2","せいど","noun","system"),
 ("hanko","はんこう","noun","stamp"),
 ("hankou","はんこう","noun","countering"),
 ("koureisha","こうれいしゃ","noun","senior citizen"),
 ("giin","ぎいん","noun","legislator"),
 ("gikai","ぎかい","noun","assembly"),
 ("kyohi","きょひ","noun","abstention"),
 ("seitou","せいとう","noun","party"),
 ("yushu","ゆうしゅう","noun","superiority"),
 ("hosen","ほせん","noun","by-election"),
 ("touhyousha","とうひょうしゃ","noun","voter"),
 ("hankyou","はんきょう","noun","opposition"),
 ("toushou","とうしょう","noun","vote count"),
 ("hansou","はんそう","noun","debate"),
 ("touhou","とうほう","noun","faction"),
 ("seikan","せいかん","noun","administration"),
 ("yosan3","よさん","noun","budget estimate"),
 ("kessan4","けっさん","noun","settlement of accounts"),
 ("kokkai","こっかい","noun","national diet"),
 ("iinkai","いいんかい","noun","committee"),
 ("buon","ぶのう","noun","field"),
 ("kentei2","けんてい","noun","consideration"),
 ("houpatsu","ほうはつ","noun","bill"),
 ("sangin","さんぎん","noun","upper house member"),
 ("shugiin","しゅうぎん","noun","lower house member"),
 ("zeisei","ぜいせい","noun","tax system"),
 ("housian","ほうあん","noun","bill (proposal)"),
 ("rougo","ろうごう","noun","labor union"),
 ("shounen","しょうねん","noun","youth"),
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

with open(os.path.join(R, "lexicon", "health3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[:25]:
        f.write(json.dumps(entry("health3", rid, kana, pos, gloss, "health"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "politics.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[25:]:
        f.write(json.dumps(entry("politics", rid, kana, pos, gloss, "politics"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.ni-tsurete", "name": "〜につれて (as)", "category": "syntax",
  "definition": "につれて shows accompanying change: ねんれい に つれて、からだが かわります. Draft definition pending review."},
 {"id": "ja.grammar.b1.ka-ni-shitara", "name": "〜か〜にしたたら (choice conditional)", "category": "syntax",
  "definition": "か〜にしたら marks a choice-based conditional: ぜい を ふやす か、けいさく する か. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("care-aging","かいご の べんきょう を しました。","kaigo no benkyou wo shimashita.","I studied care.",["かいご"]),
 ("fitness-club","きょうぶ の かいいん に なりました。","kyoubu no kaiin ni narimashita.","I became a club member.",["きょうぶ"]),
 ("diet-culture","ちょうしん の こと を はなしました。","choushin no koto wo hanashimashita.","I talked about dieting.",["ちょうしん"]),
 ("wellbeing-app","アプリ の じょうほう を しらべました。","appu no jouhou wo shirabemashita.","I researched app information.",["アプリ"]),
 ("health-debate","こうかい で とうひょう しました。","koukai de touhyou shimashita.","We voted in the public session.",["とうひょう"]),
 ("electoral-system","ぎかい の はなし を ききました。","gikai no hanashi wo kikimashita.","I heard about the assembly.",["ぎかい"]),
 ("parliament-debate","ぎいん の はんそう を ききました。","giin no hansou wo kikimashita.","I heard the legislator's debate.",["はんそう"]),
 ("policy-analysis","ほうあん の ぶんしょう を よみました。","housian no bunshou wo yomimashita.","I read the bill's text.",["ほうあん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.politics-governance", "goal_id": "ja.goal.b2.politics-governance",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss electoral systems, parties, and policy analysis",
              "participate in public debate about governance without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("410-care-and-aging","care and aging","care-and-aging","ja.goal.b1.health-wellness",
  ["rourei","kaigo","hoken2","taizen2","rojin"], "s:care-aging"),
 ("411-fitness-club-life","fitness club life","fitness-club-life","ja.goal.b1.health-wellness",
  ["wakamono","kaiin","kyoubu","junren","taikyu2"], "s:fitness-club"),
 ("412-diet-culture","diet culture","diet-culture","ja.goal.b1.health-wellness",
  ["choushin","appu","uebi","ureba","kenkou3"], "s:diet-culture"),
 ("413-wellbeing-apps","wellbeing apps","wellbeing-apps","ja.goal.b1.health-wellness",
  ["byouin2","isya3","fukushi2","touhyou2","koukai2"], "s:wellbeing-app"),
 ("414-health-debate","health debate","health-debate","ja.goal.b1.health-wellness",
  ["senkyo2","seido2","hanko","hankou","koureisha"], "g:ja.grammar.b1.ni-tsurete"),
 ("420-electoral-systems","electoral systems","electoral-systems","ja.goal.b2.politics-governance",
  ["giin","gikai","seitou","yushu","hosen"], "s:electoral-system"),
 ("421-parliament-debate","parliament debate","parliament-debate","ja.goal.b2.politics-governance",
  ["touhyousha","kyohi","hankyou","toushou","hansou"], "s:parliament-debate"),
 ("422-voting-behavior","voting behavior","voting-behavior","ja.goal.b2.politics-governance",
  ["touhou","seikan","yosan3","kessan4","kokkai"], "g:ja.grammar.b1.ka-ni-shitara"),
 ("423-party-systems","party systems","party-systems","ja.goal.b2.politics-governance",
  ["iinkai","buon","kentei2","houpatsu","sangin"], "s:policy-analysis"),
 ("424-policy-analysis","policy analysis","policy-analysis","ja.goal.b2.politics-governance",
  ["shugiin","zeisei","housian","rougo","shounen"], "s:policy-analysis"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    shard = "health3" if "health" in goal else "politics"
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

for fname, topic, uid, goal, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, words, newitem))

print("batch36 written")
