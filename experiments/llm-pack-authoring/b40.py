#!/usr/bin/env python3
"""ja-JP batch 40: B2 units 450-459 (economics-work complete + law-justice start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("kanzei","かんぜい","noun","tariff"),
 ("seihin","せいひん","noun","manufactured product"),
 ("shouhin","しょうひん","noun","merchandise"),
 ("daikin","だいきん","noun","price to pay"),
 ("heikin","へいきん","noun","average"),
 ("ronten","ろんてん","noun","point at issue"),
 ("shouchuu","しゅちょう","noun","assertion"),
 ("shihon","しほん","noun","capital"),
 ("seiri","せいり","noun","profit"),
 ("rieki","りえき","noun","benefit"),
 ("houritsu","ほうりつ","noun","law"),
 ("hourei","ほうれい","noun","decree"),
 ("houan","ほうあん","noun","bill"),
 ("houkou","ほうこう","noun","regulation"),
 ("jourei","じょうれい","noun","ordinance"),
 ("saiban","さいばん","noun","trial"),
 ("saibansho","さいばんしょ","noun","court"),
 ("saibanin","さいばんいん","noun","lay judge"),
 ("kensatsu","けんさつ","noun","prosecution"),
 ("shikoku","しこく","noun","prosecution office"),
 ("saimu","さいむ","noun","debt"),
 ("sonin","そんにん","noun","damage"),
 ("baisou","ばいしょう","noun","compensation"),
 ("chukan","ちゅうかん","noun","mediation"),
 ("uttaa","うったえ","noun","lawsuit"),
 ("hanza","はんざ","noun","crime"),
 ("hannin","はんにん","noun","criminal"),
 ("keiji","けいじ","noun","criminal case"),
 ("hoiho","ほいほ","noun","arrest"),
 ("sosa","そさ","noun","investigation"),
 ("minji","みんじ","noun","civil matter"),
 ("enzan","えんざん","noun","wrongful prosecution"),
 ("higaisha","ひがいしゃ","noun","victim"),
 ("batsu","ばつ","noun","punishment"),
 ("fusei","ふせい","noun","unfairness"),
 ("bengoshi","べんごし","noun","lawyer"),
 ("benron","べんろん","noun","argument"),
 ("bengo","べんご","noun","defense"),
 ("shonin","しょうにん","noun","witness"),
 ("kijun","きじゅん","noun","standard"),
 ("hanketsu","はんけつ","noun","judgment"),
 ("siso","そそ","noun","litigation"),
 ("soshou","そしょう","noun","complaint"),
 ("kokuso","こくそ","noun","appeal"),
 ("jyouso","じょうそう","noun","appeal"),
 ("saishin","さいしん","noun","retrial"),
 ("kanpou","かんぽう","noun","official gazette"),
 ("shikkou","しっこう","noun","enforcement"),
 ("zange","ざんげ","noun","repentance"),
 ("kufu","くふ","noun","distribution"),
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

def shard_of(rid):
    return "economy3" if rid in ("kanzei","seihin","shouhin","daikin","heikin","ronten","shouchuu","shihon","seiri","rieki") else "law"

with open(os.path.join(R, "lexicon", "economy3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if shard_of(rid) == "economy3":
            f.write(json.dumps(entry("economy3", rid, kana, pos, gloss, "economics"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "law.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if shard_of(rid) == "law":
            f.write(json.dumps(entry("law", rid, kana, pos, gloss, "law"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.wake-da", "name": "〜わけだ (that explains why)", "category": "syntax",
  "definition": "わけだ draws a conclusion: はんけつ が ふくすう あれば さいばん が ながい わけ だ. Draft definition pending review."},
 {"id": "ja.grammar.b2.ni-tsunete", "name": "〜について (about)", "category": "syntax",
  "definition": "について marks the topic: ほうりつ について はなす. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("globalization","かんぜい の げんしょう を べんきょう しました。","kanzei no genshou wo benkyou shimashita.","I studied the phenomenon of tariffs.",["かんぜい"]),
 ("economic-debate","ろんてん の しゅちょう を たしかめました。","ronten no shouchuu wo tashikamemashita.","I checked the assertion about the point at issue.",["ろんてん"]),
 ("legal-systems","ほうりつ の せいど を べんきょう しました。","houritsu no seido wo benkyou shimashita.","I studied systems of law.",["ほうりつ"]),
 ("court-process","さいばんしょ で じっけん を みました。","saibansho de jikken wo mimashita.","I witnessed an experiment at the court.",["さいばんしょ"]),
 ("contract-law","うったえ の ないよう を よみました。","uttaa no naiyou wo yomimashita.","I read the contents of the lawsuit.",["うったえ"]),
 ("criminal-justice","はんざ の とくちょう を べんきょう しました。","hanza no tokuchou wo benkyou shimashita.","I studied characteristics of crime.",["はんざ"]),
 ("civil-rights","ひがいしゃ の こと を ききました。","higaisha no koto wo kikimashita.","I heard about the victim.",["ひがいしゃ"]),
 ("legal-vocabulary","べんごし と はなしました。","bengoshi to hanashimashita.","I talked with a lawyer.",["べんごし"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.law-justice", "goal_id": "ja.goal.b2.law-justice",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss legal systems, court processes, rights, and punishment theory",
              "analyze a legal case or controversy without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.law-justice
    description: 'Discuss law and justice: legal systems, courts, rights, and punishment.'
    band: B2
    framework_refs: []
    contexts:
    - ja.situation.classroom
    modalities:
    - listening
    - speaking
    - reading
    - writing
    prerequisites:
    - target: ja.goal.b2.economics-work
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.law.houritsu
    - ja.lex.law.saiban
    assessment_ids:
    - ja.assess.law-justice
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-04'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

U = [
 ("450-globalization","globalization","globalization","ja.goal.b2.economics-work",
  ["kanzei","seihin","shouhin","daikin","heikin"], "s:globalization"),
 ("451-economic-debate","economic debate","economic-debate","ja.goal.b2.economics-work",
  ["ronten","shouchuu","shihon","seiri","rieki"], "s:economic-debate"),
 ("452-legal-systems","legal systems","legal-systems","ja.goal.b2.law-justice",
  ["houritsu","hourei","houan","houkou","jourei"], "s:legal-systems"),
 ("453-court-process","court process","court-process","ja.goal.b2.law-justice",
  ["saiban","saibansho","saibanin","kensatsu","shikoku"], "s:court-process"),
 ("454-contract-law","contract law","contract-law","ja.goal.b2.law-justice",
  ["saimu","sonin","baisou","chukan","uttaa"], "s:contract-law"),
 ("455-criminal-justice","criminal justice","criminal-justice","ja.goal.b2.law-justice",
  ["hanza","hannin","keiji","hoiho","sosa"], "s:criminal-justice"),
 ("456-civil-rights","civil rights","civil-rights","ja.goal.b2.law-justice",
  ["minji","enzan","higaisha","batsu","fusei"], "s:civil-rights"),
 ("457-legal-vocabulary","legal vocabulary","legal-vocabulary","ja.goal.b2.law-justice",
  ["bengoshi","benron","bengo","shonin","kijun"], "s:legal-vocabulary"),
 ("458-jury-debate","jury debate","jury-debate","ja.goal.b2.law-justice",
  ["hanketsu","siso","soshou","kokuso","jyouso"], "g:ja.grammar.b2.wake-da"),
 ("459-punishment-theory","punishment theory","punishment-theory","ja.goal.b2.law-justice",
  ["saishin","kanpou","shikkou","zange","kufu"], "g:ja.grammar.b2.ni-tsunete"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.{shard_of(w)}.{w}" for w in words]
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

print("batch40 written")
