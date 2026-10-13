#!/usr/bin/env python3
"""Batch 27: ja-JP B1 units 320-329 (environment part 2 + travel-extended part 1)."""
import json, os
from pathlib import Path

R = str(Path(__file__).resolve().parents[2] / "languages/ja-JP")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("bousai-houzu","ぼうさいほうじ","noun","disaster preparedness"),
 ("mizu-bubun","みずぶぶん","noun","water resources"),
 ("food-loss","フードロス","noun","food waste"),
 ("resucha","れすちゃ","noun","leftover tea"),
 ("midori","みどり","noun","greenery"),
 ("shizen-hozen","しぜんほぜん","noun","nature preservation"),
 ("footprint","フットプリント","noun","footprint"),
 ("nenryou","ねんりょう","noun","fuel"),
 ("taihi","たいひ","noun","evacuation"),
 ("shinan","しなん","noun","drill"),
 ("yokei","よけい","noun","warning"),
 ("bousui","ぼうすい","noun","flood prevention"),
 ("suidou","すいどう","noun","water supply"),
 ("jousui","じょうすい","noun","water purification"),
 ("compost","コンポスト","noun","compost"),
 ("kakei","かけい","noun","household accounts"),
 ("shokuhin","しょくひん","noun","food product"),
 ("nouhin","のうひん","noun","farm product"),
 ("gas","ガス","noun","gas"),
 ("muda","むだ","noun","waste"),
 ("setsuyaku","せつやく","noun","thrift"),
 ("kinchou","きんちょう","noun","tension"),
 ("kesshin","けっしん","noun","determination"),
 ("rikai","りかい","noun","understanding"),
 ("muda-zukai","むだづかい","noun","wasteful use"),
 ("itinerari","イティネラリ","noun","itinerary"),
 ("henkyo","henkyou","noun","change (booking)"),
 ("shukuhaku","しゅくはく","noun","lodging"),
 ("ryokou-ki","りょこうき","noun","travel diary"),
 ("taiken","たいけん","noun","experience"),
 ("shinkou","しんこう","noun","trust"),
 ("bunka-shock","ぶんかしょっく","noun","culture shock"),
 ("ureshii","うれしい","i-adjective","happy"),
 ("tomadoi","とまどい","noun","confusion"),
 ("azukaru","あずかる","verb","to receive; to entrust"),
 ("mochiiru","もちいる","verb","to use"),
 ("nakama","なかま","noun","companion"),
 ("joken","じょうけん","noun","condition"),
 ("taihen","たいへん","na-adjective","tough"),
 ("kantan","かんたん","na-adjective","easy"),
 ("mendou","めんどう","na-adjective","troublesome"),
 ("pazuru","パズル","noun","puzzle"),
 ("kankei","かんけい","noun","relationship"),
 ("yuujo","ゆうじょう","noun","friendship"),
 ("shin","しん","noun","close friend"),
 ("pasupoto","ぱすぽーと","noun","passport"),
 ("nyukan","にゅうかん","noun","customs"),
 ("annai-zu","あんないず","noun","guide map"),
 ("ryokan","りょかん","noun","Japanese inn"),
 ("minshuku","みんしゅく","noun","guesthouse"),
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

with open(os.path.join(R, "lexicon", "env2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[:25]:
        f.write(json.dumps(entry("env2", rid, kana, pos, gloss, "environment"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "travel.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[25:]:
        f.write(json.dumps(entry("travel", rid, kana, pos, gloss, "travel"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.nai-u-de", "name": "〜ないうちに (while not yet)", "category": "syntax",
  "definition": "ないうちに urges action before a change: ぎゅうひょう が なくなる ないうちに よやく します. Draft definition pending review."},
 {"id": "ja.grammar.b1.toi-toka", "name": "〜とか〜とか (listing examples)", "category": "pragmatics",
  "definition": "とか lists examples casually: りょこうでは しゃしん を とるとか おみyage を かうとか します. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("disaster-prep","ぼうさいほうじ の かい で じゅんび を ならいました。","bousai-houzu no kai de junbi wo naraimashita.","At the disaster-preparedness meeting I learned preparation.",["ぼうさいほうじ"]),
 ("water-issue","この ちほう の みずぶぶん が じゅうよう です。","kono chiho no mizu-bubun ga juuyou desu.","This region's water resources are important.",["みずぶぶん"]),
 ("food-waste","フードロス を へらす ために ちょうりょう を します。","fuudo-rosu wo herasu tame ni chouryou wo shimasu.","To cut food waste I portion carefully.",["フードロス"]),
 ("green-city","この まち は みどり の こうえん が おおいです。","kono machi wa midori no kouen ga ooi desu.","This town has many green parks.",["みどり"]),
 ("footprint-home","うち の ねんりょう の フットプリント を はかりました。","uchi no nenryou no footprint wo hakarimashita.","I measured our household fuel footprint.",["ねんりょう"]),
 ("itinerary-plan","イティネラリ を つくって しゅくはく を よやく しました。","itinerari wo tsukutte shukuhaku wo yoyaku shimashita.","I made an itinerary and booked lodging.",["イティネラリ"]),
 ("booking-change","よやく の へんきょう で とまどい が ありました。","yoyaku no henkyou de tomadoi ga arimashita.","There was confusion with the booking change.",["とまどい"]),
 ("culture-shock","ぶんかしょっく で うれしい ことも ありました。","bunka-shock de ureshii koto mo arimashita.","With culture shock there were also happy moments.",["ぶんかしょっく"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.travel-extended", "goal_id": "ja.goal.b1.travel-extended",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "plan an itinerary, handle a booking change, and describe a travel experience",
              "discuss hosting a visitor or culture shock without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("320-disaster-preparation","disaster preparation","disaster-preparation","ja.goal.b1.environment",
  ["bousai-houzu","taihi","shinan","yokei","bousui"], "s:disaster-prep"),
 ("321-water-issues","water issues","water-issues","ja.goal.b1.environment",
  ["mizu-bubun","suidou","jousui","compost","gas"], "s:water-issue"),
 ("322-food-waste","food waste","food-waste","ja.goal.b1.environment",
  ["food-loss","resucha","shokuhin","nouhin","muda"], "s:food-waste"),
 ("323-green-cities","green cities","green-cities","ja.goal.b1.environment",
  ["midori","shizen-hozen","setsuyaku","kakei","kesshin"], "s:green-city"),
 ("324-personal-footprint","personal footprint","personal-footprint","ja.goal.b1.environment",
  ["footprint","nenryou","kinchou","rikai","muda-zukai"], "s:footprint-home"),
 ("325-itinerary-planning","itinerary planning","itinerary-planning","ja.goal.b1.travel-extended",
  ["itinerari","henkyo","shukuhaku","ryokou-ki","taiken"], "s:itinerary-plan"),
 ("326-booking-problems","booking problems","booking-problems","ja.goal.b1.travel-extended",
  ["tomadoi","azukaru","mochiiru","joken","taihen"], "s:booking-change"),
 ("327-travel-essay","travel essay","travel-essay","ja.goal.b1.travel-extended",
  ["shinkou","bunka-shock","ureshii","kantan","mendou"], "g:ja.grammar.b1.nai-u-de"),
 ("328-hosting-interaction","hosting interaction","hosting-interaction","ja.goal.b1.travel-extended",
  ["nakama","kankei","yuujo","shin","pazuru"], "g:ja.grammar.b1.toi-toka"),
 ("329-culture-shock","culture shock","culture-shock","ja.goal.b1.travel-extended",
  ["pasupoto","nyukan","annai-zu","ryokan","minshuku"], "s:culture-shock"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    shard = "env2" if "environment" in goal else "travel"
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

print("batch27 written")
