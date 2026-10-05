#!/usr/bin/env python3
"""ja-JP batch 66: B2 units 700-709 (urban tail + environment-policy start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

URB = [
 ("bunkasai","ぶんかさい","noun","cultural festival"),
 ("geijutsu2","げいじゅつ","noun","art, arts"),
 ("isshiki","いっしき","noun","together, in one place"),
 ("inaka","いなか","noun","countryside"),
 ("koryu2","こうりゅう","noun","exchange, interaction"),
 ("seisan","せいさん","noun","production"),
 ("shiminkatsu","しみんかつどう","noun","civic activity"),
 ("ronsetsu","ろんせつ","noun","argument, thesis"),
 ("kotsu","こうつう","noun","exchange, communication"),
 ("shakaigaku","しゃかいがく","noun","sociology"),
 ("hisshou","ひっしょう","noun","necessity, must"),
]
ENV = [
 ("kikou","きこう","noun","climate"),
 ("seisaku2","せいさく","noun","policy making"),
 ("cooling","くりーにんぐ","noun","cooling"),
 ("ene2","えねるぎー","noun","energy"),
 ("shifuku","しふく","noun","transition, shift"),
 ("kennkyuu","けんきゅう","noun","study, investigation"),
 ("taniso2","たんにょう","noun","carbon dioxide equivalent"),
 ("baishutsu","ばいしゅつ","noun","emission"),
 ("tax","たっくす","noun","tax"),
 ("shijou","しじょう","noun","market"),
 ("seibutsu","せいぶつ","noun","living thing, organism"),
 ("shakubutsu","しゃくぶつ","noun","species"),
 ("tansaku","たんさく","noun","exploration, search"),
 ("hogo","ほご","noun","protection"),
 ("kankyouho","かんきょうほう","noun","environmental law"),
 ("risshou","りっしょう","noun","establishment, founding"),
 ("moyoroshi","もよおし","noun","event, gathering"),
 ("shiminundo","しみんうんどう","noun","citizens' movement"),
 ("seimei","せいめい","noun","life, living things"),
 ("junkan2","じゅんかん","noun","cycle, circulation"),
 ("mottainai","もったいない","i-adjective","wasteful"),
 ("saisei","さいせい","noun","recycling, regeneration"),
 ("teiki","てき","na-adjective","appropriate, suitable"),
 ("katei2","かてい","noun","assumption, premise"),
 ("rinen","りねん","noun","principle, ideal"),
 ("katsudou2","かつどう","noun","activity, movement"),
 ("hantai2","はんたい","noun","opposition"),
 ("seikyou","せいきょう","noun","request, appeal"),
 ("kisan","きさん","noun","base, foundation"),
 ("chiseki","ちせき","noun","trace, vestige"),
 ("denryoku","でんりょく","noun","electric power"),
 ("kiki","きき","noun","crisis"),
 ("kokumin","こくみん","noun","citizens, people"),
 ("seiji","せいじ","noun","politics"),
 ("houkoku3","ほうこく","noun","report"),
 ("yakuwari","やくわり","noun","role"),
 ("mirai2","みらい","noun","future"),
 ("kokusai2","こくさい","noun","international"),
 ("kiso","きそ","noun","foundation, base"),
 ("kankaku2","かんかく","noun","awareness, sense"),
]
assert len(URB) == 11 and len(ENV) == 40

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "urban3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in URB:
        f.write(json.dumps(entry("urban3", rid, kana, pos, gloss, "urban"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "env3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in ENV:
        f.write(json.dumps(entry("env3", rid, kana, pos, gloss, "environment"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-to-ha", "name": "〜とは (what exactly is)", "category": "syntax",
  "definition": "とは asks or defines essence: しゃかい がく と は 何か. Draft definition pending review."},
 {"id": "ja.grammar.b2-ni-kaete", "name": "〜に変えて (in exchange for)", "category": "syntax",
  "definition": "に変えて marks substitution: けいぞく に かえて しんぶん を かった. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("city-culture","ぶんかさい の はなし を しました。","bunkasai no hanashi wo shimashita.","We talked about the cultural festival.",["ぶんかさい"]),
 ("rural-urban-link","いなか と としの こうりゅう を はなしました。","inaka to toshi no kōryū wo hanashimashita.","We talked about rural-urban exchange.",["いなか"]),
 ("climate-policy","きこう の せいさく を ぎろん しました。","kikō no seisaku wo giron shimashita.","We discussed climate policy.",["きこう"]),
 ("energy-transition","えねるぎー の しふく を べんきょう しました。","enerugī no shifuku wo benkyou shimashita.","I studied the energy transition.",["えねるぎー"]),
 ("carbon-economics","ばいしゅつ の もんだい を べんきょう しました。","baishutsu no mondai wo benkyou shimashita.","I studied the emissions problem.",["ばいしゅつ"]),
 ("biodiversity","しゃくぶつ の ぜんめつ を はなしました。","shakubutsu no zenmetsu wo hanashimashita.","We talked about species extinction.",["しゃくぶつ"]),
 ("circular-economy","じゅんかん がた の けいざい を べんきょう しました。","junkan gata no keizai wo benkyou shimashita.","I studied the circular economy.",["じゅんかん"]),
 ("environmental-law","かんきょうほう の ぎろん を ききました。","kankyōhō no giron wo kikimashita.","I listened to the environmental-law debate.",["かんきょうほう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.environment-policy", "goal_id": "ja.goal.b2.environment-policy",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss a climate or energy issue using taught environment vocabulary",
              "argue for or against a policy measure without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.environment-policy
    description: 'Discuss environment policy: climate, energy, biodiversity, and law.'
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
    - target: ja.goal.b2.global-issues
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.env3.kikou
    - ja.lex.env3.hogo
    assessment_ids:
    - ja.assess.environment-policy
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

DEP = """- from: ja.goal.b2.environment-policy
  to: ja.goal.b2.global-issues
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

URBG = "ja.goal.b2.urban-life"
ENVG = "ja.goal.b2.environment-policy"
U = [
 ("700-city-culture","city culture","700-city-culture",URBG,"urban3",
  ["bunkasai","geijutsu2","isshiki","shiminkatsu","koryu2"], "s:city-culture"),
 ("701-rural-urban-link","rural urban link","701-rural-urban-link",URBG,"urban3",
  ["inaka","seisan","kotsu","shakaigaku","hisshou"], "s:rural-urban-link"),
 ("702-urban-essay","urban essay","702-urban-essay",URBG,"urban3",
  ["ronsetsu"], "g:ja.grammar.b2-to-ha"),
 ("703-climate-policy","climate policy","703-climate-policy",ENVG,"env3",
  ["kikou","seisaku2","cooling","kiki","kokumin"], "s:climate-policy"),
 ("704-energy-transition","energy transition","704-energy-transition",ENVG,"env3",
  ["ene2","shifuku","denryoku","seiji","teiki"], "s:energy-transition"),
 ("705-carbon-economics","carbon economics","705-carbon-economics",ENVG,"env3",
  ["taniso2","baishutsu","tax","shijou","seikyou"], "s:carbon-economics"),
 ("706-biodiversity","biodiversity","706-biodiversity",ENVG,"env3",
  ["seibutsu","shakubutsu","tansaku","hogo","seimei"], "s:biodiversity"),
 ("707-circular-economy","circular economy","707-circular-economy",ENVG,"env3",
  ["junkan2","mottainai","saisei","kiso","chiseki"], "s:circular-economy"),
 ("708-environmental-law","environmental law","708-environmental-law",ENVG,"env3",
  ["kankyouho","risshou","hantai2","houkoku3","yakuwari"], "s:environmental-law"),
 ("709-activism-movements","activism movements","709-activism-movements",ENVG,"env3",
  ["moyoroshi","shiminundo","katsudou2","mirai2","kokusai2"], "g:ja.grammar.b2-ni-kaete"),
]
EXTRA702 = ["ja.lex.env3.kennkyuu","ja.lex.env3.katei2","ja.lex.env3.rinen","ja.lex.env3.kankaku2"]

def unit_yaml(topic, uid, goal, shard, words, newitem):
    lex = [f"ja.lex.{shard}.{w}" for w in words]
    if uid == "702-urban-essay":
        lex += EXTRA702
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

print("batch66 written")
