#!/usr/bin/env python3
"""Batch 17: ja-JP B1 units 220-229 (work-professional part 1)."""
import json, os
from pathlib import Path

R = str(Path(__file__).resolve().parents[2] / "languages/ja-JP")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("keiyaku","けいやく","noun","contract"),
 ("keiyaku-sho","けいやくしょ","noun","contract document"),
 ("shoubei","しょうべい","noun","negotiation"),
 ("shouhou","しょうほう","noun","proposal"),
 ("danmoku","だんもく","noun","silence"),
 ("gijiroku","ぎじろく","noun","meeting minutes"),
 ("chousei","ちょうせい","noun","mediation; adjustment"),
 ("taishou","たいしょう","noun","target; subject"),
 ("mokuhyou","もくひょう","noun","goal; target"),
 ("shikumi","しくみ","noun","system; mechanism"),
 ("kouryaku","こうりゃく","noun","strategy"),
 ("tantou","たんとう","noun","person in charge"),
 ("haitatsu","はいたつ","noun","delivery"),
 ("shukka","しゅっか","noun","shipping"),
 ("nyuuka","にゅうか","noun","receiving; intake"),
 ("zaiko","ざいこ","noun","inventory; stock"),
 ("tanpin","たんぴん","noun","shortage"),
 ("keiri","けいり","noun","profit"),
 ("sonshitsu","そんしつ","noun","loss"),
 ("baibai","ばいばい","noun","sales"),
 ("chingin","ちんぎん","noun","wages"),
 ("kokyaku","こきゃく","noun","customer"),
 ("aite","あいて","noun","counterpart"),
 ("renkei","れんけい","noun","coordination; linkage"),
 ("kyoudou","きょうどう","noun","collaboration"),
 ("jirei","じれい","noun","example"),
 ("hanrei","はんれい","noun","counterexample"),
 ("teian","ていあん","noun","suggestion; proposal"),
 ("iken","いけん","noun","opinion"),
 ("hantai","はんたい","noun","opposition"),
 ("kettei","けってい","noun","decision"),
 ("kettei-ken","けっていけん","noun","decision-making authority"),
 ("buchou","ぶちょう","noun","section chief"),
 ("kacho","かちょう","noun","department chief"),
 ("shacho","しゃちょう","noun","company president"),
 ("jigyounushi","じぎょうぬし","noun","employer"),
 ("roushi","ろうし","noun","labor union"),
 ("rodo","ろうどう","noun","labor"),
 ("hoshou","ほしょう","noun","compensation; guarantee"),
 ("shikaku","しかく","noun","qualification"),
 ("shouhou","しょうほう","noun","praise"),
 ("genshou","げんしょう","noun","phenomenon"),
 ("kouchiku","こうちく","noun","accumulation"),
 ("kouka","こうか","noun","effect"),
 ("kouritsu","こうりつ","noun","efficiency"),
 ("seisansei","せいさんせい","noun","productivity"),
 ("yuuryou","ゆうりょう","na-adjective","excellent"),
 ("yuutou","ゆうとう","na-adjective","superior; outstanding"),
 ("keiei","けいえい","noun","business management"),
 ("tenyaku","てんやく","noun","job transfer"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "work2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.work2.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["work"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.ukemi-passive", "name": "〜られる/〜される (passive)", "category": "morphology",
  "definition": "The passive marks the patient as topic: ぎじろくは たんとうが かかれました becomes ぎじろくが かかれました; けっていされました is the passive of けっていします. Business reports use it to foreground results. Draft definition pending review."},
 {"id": "ja.grammar.b1.keigo-soncho-intro", "name": "尊敬語 introduction (honorific forms)", "category": "pragmatics",
  "definition": "Honorific forms elevate the other party: ぶちょうが おかえしに なりました, しゃちょうが いらしゃいます. Plain forms are fine with colleagues; honorifics mark client and superior contexts. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("interview-qualification","しょくばで しかくを とりたいです。","shokuba de shikaku wo toritai desu.","I want to get a qualification at work.",["しかく"]),
 ("resume-experience","3ねん しょくむ けいけんが あります。","3-nen shokumu keiken ga arimasu.","I have three years of work experience.",["けいけん"]),
 ("minutes-written","ぎじろくは たんとうが かきました。","gijiroku wa tantou ga kakimashita.","The person in charge wrote the minutes.",["ぎじろく"]),
 ("opinion-before-decision","けっていの まえに いけんを います。","kettei no mae ni iken wo iimasu.","I state my opinion before the decision.",["いけん"]),
 ("profit-loss","けいりが ふえて、そんしつも ふえました。","keiri ga fuete, sonshitsu mo fuemashita.","Profits grew, and losses also grew.",["けいり"]),
 ("praise-words","ぶちょうに しょうほうの ことばを もらいました。","buchou ni shouhou no kotoba wo moraimashita.","I received words of praise from the section chief.",["しょうほう"]),
 ("union-talks","しゃちょうと ろうしが ろうどう じょうけんの はなしあいを します。","shacho to roushi ga rodou jouken no hanashiai wo shimasu.","The president and the union discuss working conditions.",["しゃちょう"]),
 ("contract-check","けいやくしょを かくにんして ください。","keiyaku-sho wo kakunin shite kudasai.","Please check the contract document.",["けいやくしょ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.work-professional", "goal_id": "ja.goal.b1.work-professional",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "exchange opinions, suggestions, and decisions in a meeting using work vocabulary",
              "handle a report, feedback, or contract-document exchange without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

# Units: (file, topic, unit-id, words(5), new item (grammar/sentence or None), extra old refs)
U = [
 ("220-job-interview-prep","job interview prep","interview-prep",
  ["shikaku","tantou","jirei","hanrei","yuuryou"], "s:interview-qualification"),
 ("221-writing-a-resume","writing a resume","writing-resume",
  ["yuutou","kouchiku","seisansei","genshou","kouka"], "s:resume-experience"),
 ("222-workplace-communication","workplace communication","workplace-comm",
  ["renkei","kyoudou","chousei","danmoku","gijiroku"], "s:minutes-written"),
 ("223-meeting-opinions","meeting opinions","meeting-opinions",
  ["iken","hantai","kettei","kettei-ken","mokuhyou"], "s:opinion-before-decision"),
 ("224-project-reports","project reports","project-reports",
  ["keiei","kouritsu","sonshitsu","keiri","baibai"], "s:profit-loss"),
 ("225-deadline-negotiation","deadline negotiation","deadline-negotiation",
  ["shoubei","haitatsu","shukka","nyuuka","tanpin"], "g:ja.grammar.b1.ukemi-passive"),
 ("226-giving-feedback","giving feedback","giving-feedback",
  ["shouhou","taishou","aite","kokyaku","buchou"], "s:praise-words"),
 ("227-accepting-feedback","accepting feedback","accepting-feedback",
  ["kacho","shacho","jigyounushi","roushi","rodo"], "s:union-talks"),
 ("228-career-change-plans","career change plans","career-change-plans",
  ["keiyaku","keiyaku-sho","shouhou","chingin","hoshou"], "g:ja.grammar.b1.keigo-soncho-intro"),
 ("229-professional-email","professional email","professional-email",
  ["zaiko","shikumi","tenyaku","teian","kouryaku"], "s:contract-check"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(fname, topic, uid, words, newitem):
    lex = [f"ja.lex.work2.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = [f"# ai-assisted draft unit (Mode B B1 work-professional); content refs are pack data; qualified review pending.",
             f"id: ja.unit.{uid}", "goal_id: ja.goal.b1.work-professional",
             f"title: {topic}", f"summary: Professional workplace language for {topic}.",
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
        f.write(unit_yaml(fname, topic, uid, words, newitem))

print("batch17 written")
