#!/usr/bin/env python3
"""ja-JP batch 73: B2 units 770-779 (nuance-register tail + humor-wordplay start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

REG2 = [
 ("hogen2","ほうげん","noun","dialect"),
 ("wakamono","わかもの","noun","young person"),
 ("rojin","ろうじん","noun","elderly person"),
 ("seinen","せいねん","noun","young adult"),
 ("otona","おとな","noun","adult"),
 ("kodomo","こども","noun","child"),
 ("onna","おんな","noun","woman"),
 ("otoko","おとこ","noun","man"),
 ("josei","じょせい","noun","feminine"),
 ("dansei","だんせい","noun","masculine"),
 ("shokuba","しょくば","noun","workplace"),
 ("kaisha","かいしゃ","noun","company"),
 ("meishi","めいし","noun","business card"),
 ("keiei","けいえい","noun","management"),
 ("jitsugyou","じつぎょう","noun","business"),
 ("bunpo","ぶんぽう","noun","writing style"),
 ("bungaku","ぶんがく","noun","literature"),
 ("shosetsu","しょうせつ","noun","novel"),
 ("shi","し","noun","poem"),
 ("omoshiroi","おもしろい","i-adjective","funny, interesting"),
 ("warai","わらい","noun","laughter"),
 ("tsukkomi","つっこみ","noun","straight-man retort"),
 ("boke","ぼけ","noun","funny role"),
 ("dajare","だじゃれ","noun","pun"),
 ("rakugo","らくご","noun","rakugo storytelling"),
 ("koudan","こうだん","noun","storytelling"),
 ("hyogen","ひょうげん","noun","expression"),
 ("kuchiguse","くちぐせ","noun","verbal habit"),
 ("jouhou","じょうほう","noun","information"),
 ("tsuushin","つうしん","noun","communication"),
 ("koukyuu","こうきゅう","noun","public"),
 ("koukoku","こうこく","noun","advertisement"),
 ("denwa","でんわ","noun","telephone"),
 ("kangae","かんがえ","noun","thought"),
 ("kuuki","くうき","noun","atmosphere"),
 ("tsuuyou","つうよう","noun","usage"),
 ("ryukou","りゅうこう","noun","trend"),
 ("hayari","はやり","noun","fashion"),
 ("iro","いろ","noun","color, nuance"),
 ("aji","あじ","noun","taste, flavor"),
]
PLAY = [
 ("dajare2","だじゃれ","noun","pun"),
 ("gyagu","ぎゃぐ","noun","gag"),
 ("choshi","ちょうし","noun","rhythm"),
 ("tsukkomi2","つっこみ","noun","retort"),
 ("boke2","ぼけ","noun","funny role"),
 ("manzai","まんざい","noun","manzai comedy"),
 ("warai2","わらい","noun","laughter"),
 ("hyogen2","ひょうげん","noun","expression"),
 ("kotowaza","ことわざ","noun","proverb"),
 ("zokugo","ぞくご","noun","slang"),
]
assert len(REG2) == 40 and len(PLAY) == 10

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "reg2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in REG2:
        f.write(json.dumps(entry("reg2", rid, kana, pos, gloss, "register"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "play1.jsonl"), "w") as f:
    for rid, kana, pos, gloss in PLAY:
        f.write(json.dumps(entry("play1", rid, kana, pos, gloss, "humor"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-shite-wa", "name": "〜にしては (considering)", "category": "syntax",
  "definition": "にしては judges against expectations: ろうじん に しては はやい. Draft definition pending review."},
 {"id": "ja.grammar.b2-to-ieba", "name": "〜といえば (speaking of)", "category": "syntax",
  "definition": "といえば introduces an associated topic: にほん の きぎょう と いえば、めいし. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("dialect-register","ほうげん の ことば を べんきょう しました。","hogen no kotoba wo benkyou shimashita.","I studied dialect words.",["ほうげん"]),
 ("age-register","わかもの と おとな の ことば は ちがいます。","wakamono to otona no kotoba wa chigaimasu.","Young people's and adults' words differ.",["わかもの"]),
 ("gendered-language","おんな と おとこ の はなしかた を べんきょう しました。","onna to otoko no hanashikata wo benkyou shimashita.","I studied women's and men's ways of speaking.",["おんな"]),
 ("business-register","かいしゃ で めいし を つかいました。","kaisha de meishi wo tsukaimashita.","I used a business card at the company.",["めいし"]),
 ("literary-register","しょうせつ と し を よみました。","shosetsu to shi wo yomimashita.","I read a novel and a poem.",["しょうせつ"]),
 ("humor-register","だじゃれ で みんな が わらいました。","dajare de minna ga waraimashita.","Everyone laughed at the pun.",["だじゃれ"]),
 ("style-imitation","ぶんぽう を まね しました。","bunpo wo mane shimashita.","I imitated the writing style.",["ぶんぽう"]),
 ("pun-mechanics","ことわざ を つかって だじゃれ を しました。","kotowaza wo tsukatte dajare wo shimashita.","I made a pun using a proverb.",["ことわざ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.humor-wordplay", "goal_id": "ja.goal.b2.humor-wordplay",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "explain or produce a pun based on similar sounds",
              "react to a short comedy exchange without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.humor-wordplay
    description: 'Understand and play with Japanese wordplay: puns, proverbs, and comedy formats.'
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
    - target: ja.goal.b2.nuance-register
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.play1.dajare2
    - ja.lex.play1.manzai
    assessment_ids:
    - ja.assess.humor-wordplay
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-05'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.humor-wordplay
  to: ja.goal.b2.nuance-register
  dimension: grammar-controlled
  required_state: independent
  strength: hard
"""
dp = os.path.join(R, "grammar", "dependencies.yaml")
with open(dp) as f:
    dep = f.read()
dep = dep.replace("notes:", DEP + "notes:", 1)
with open(dp, "w") as f:
    f.write(dep)

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

REGG = "ja.goal.b2.nuance-register"
PLAYG = "ja.goal.b2.humor-wordplay"
U = [
 ("770-dialect-register","dialect register","770-dialect-register",REGG,"reg2",
  ["hogen2","tsuuyou","hayari","ryukou","kuuki"], "s:dialect-register"),
 ("771-age-register","age register","771-age-register",REGG,"reg2",
  ["wakamono","rojin","seinen","otona","kodomo"], "s:age-register"),
 ("772-gendered-language","gendered language","772-gendered-language",REGG,"reg2",
  ["onna","otoko","josei","dansei","kuchiguse"], "s:gendered-language"),
 ("773-business-register","business register","773-business-register",REGG,"reg2",
  ["shokuba","kaisha","meishi","keiei","jitsugyou"], "s:business-register"),
 ("774-literary-register","literary register","774-literary-register",REGG,"reg2",
  ["bunpo","bungaku","shosetsu","shi","koudan"], "s:literary-register"),
 ("775-humor-register","humor register","775-humor-register",REGG,"reg2",
  ["omoshiroi","warai","tsukkomi","boke","rakugo"], "s:humor-register"),
 ("776-style-imitation","style imitation","776-style-imitation",REGG,"reg2",
  ["hyogen","jouhou","tsuushin","koukyuu","koukoku"], "s:style-imitation"),
 ("777-register-portfolio","register portfolio","777-register-portfolio",REGG,"reg2",
  ["denwa","kangae","iro","aji","dajare"], "g:ja.grammar.b2-ni-shite-wa"),
 ("778-pun-mechanics","pun mechanics","778-pun-mechanics",PLAYG,"play1",
  ["dajare2","gyagu","choshi","kotowaza","zokugo"], "s:pun-mechanics"),
 ("779-manzai-comedy","manzai comedy","779-manzai-comedy",PLAYG,"play1",
  ["manzai","tsukkomi2","boke2","warai2","hyogen2"], "g:ja.grammar.b2-to-ieba"),
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

for fname, topic, uid, goal, shard, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch73 written")
