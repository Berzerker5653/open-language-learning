#!/usr/bin/env python3
"""ru-RU batch 8: A1 units 100-109 (basic-messages)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("pismo","письмо","письмо́","letter"),
 ("soobshchenie","сообщение","сообще́ние","message"),
 ("zvonok","звонок","звоно́к","phone call"),
 ("sms","смс","смс","text message"),
 ("otvet","ответ","отве́т","answer"),
 ("otvechat","отвечать","отвеча́ть","to answer"),
 ("sprosit","спросить","спроси́ть","to ask (a question)"),
 ("privet","привет","приве́т","hi"),
 ("kazhetsya","казаться","каза́ться","to seem"),
 ("ozhidaet","ожидать","ожида́ть","to expect"),
 ("razreshenie","разрешение","разреше́ние","permission"),
 ("mozhno","можно","мо́жно","it is allowed"),
 ("nelzya","нельзя","нельзя́","it is forbidden"),
 ("nado","надо","на́до","it is necessary"),
 ("dolzhen","должен","до́лжен","must (he)"),
 ("hochu","хотеть","хоте́ть","to want"),
 ("prosit","просить","проси́ть","to ask, to request"),
 ("blagodarnost","благодарность","благода́рность","gratitude"),
 ("vinovat","виноват","винова́т","to blame, sorry"),
 ("izvinenie","извинение","извине́ние","apology"),
 ("zapiska","записка","запи́ска","note"),
 ("konvert","конверт","конве́рт","envelope"),
 ("otpravit","отправлять","отправля́ть","to send"),
 ("poluchat","получать","получа́ть","to receive"),
 ("nabirat","набирать","набира́ть","to dial"),
 ("golos","голос","го́лос","voice"),
 ("slushat","слушать","слу́шать","to listen"),
 ("govorit","говорить","говори́ть","to speak"),
 ("skazat","сказать","сказа́ть","to say"),
 ("obeshchat","обещать","обеща́ть","to promise"),
 ("soglasen","согласен","согла́сен","agreed (he)"),
 ("pravda","правда","пра́вда","truth"),
 ("priglasit","приглашать","приглаша́ть","to invite"),
 ("soglasie","согласие","согла́сие","agreement"),
 ("otkaz","отказ","отка́з","refusal"),
 ("zanyat","занят","заня́т","busy"),
 ("svoboden","свободен","свобо́ден","free, available"),
 ("udobno","удобно","у́добно","convenient"),
 ("neudobno","неудобно","неу́добно","inconvenient"),
 ("povod","повод","по́вод","occasion"),
 ("sluchay","случай","слу́чай","case, occasion"),
 ("ideya","идея","иде́я","idea"),
 ("predlozhenie","предложение","предложе́ние","suggestion, offer"),
 ("vopros","вопрос","вопро́с","question"),
 ("tema","тема","те́ма","topic"),
 ("pozdravlenie","поздравление","поздравле́ние","congratulations"),
 ("sozvon","созвон","со́звон","arranged phone call"),
 ("tekst","текст","те́кст","text"),
 ("poka","пока","пока́","bye (informal)"),
 ("udachi","удачи","уда́чи","good luck"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.messages.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "messages.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.modal-impersonal", "name": "Impersonal modals", "category": "syntax",
  "definition": "можно, нельзя and надо are used impersonally: Можно войти? Нельзя курить. Мне надо читать. Learn these chunks as supplied; the modal words never change form."},
 {"id": "ru.grammar.a1.polite-requests", "name": "Requests with просить", "category": "syntax",
  "definition": "Requests use просить with the supplied dative person: Он просит мне помощь. The polite imperative Дайте, пожалуйста (already taught) is the other pattern. Learn the supplied dative forms мне and тебе; do not invent new ones."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u100","Это письмо.","This is a letter.",["письмо"]),
 ("u101","Это сообщение.","This is a message.",["сообщение"]),
 ("u102","Это ответ.","This is an answer.",["ответ"]),
 ("u103","Это голос.","This is a voice.",["голос"]),
 ("u104","Это идея.","This is an idea.",["идея"]),
 ("u105","Это правда.","This is the truth.",["правда"]),
 ("u106","Это текст.","This is a text.",["текст"]),
 ("u108","Это извинение.","This is an apology.",["извинение"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.basic-messages-reading", "goal_id": "ru.goal.a1.basic-messages",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify message, call and reply words in a supplied short note or chat line.",
      "Distinguish a question word from a request word in a supplied exchange.",
      "Match an impersonal modal (можно, нельзя, надо) to its supplied chunk."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.basic-messages-writing", "goal_id": "ru.goal.a1.basic-messages",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a message-identification statement with это and a taught nominative noun.",
      "Complete a permission or prohibition with the supplied impersonal modal.",
      "Make a polite request with the supplied просить or Дайте chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.basic-messages"
    description: "Read and write simple invitations, arrangements, and brief messages."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.time-plans", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.people-family", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.modal-impersonal", "ru.grammar.a1.polite-requests", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a1.basic-messages-reading", "ru.assess.a1.basic-messages-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

OLD_VOCAB = ["ru.lex.everyday.eto", "ru.lex.everyday.mama", "ru.lex.everyday.papa",
             "ru.lex.personal.anna", "ru.lex.personal.ivan", "ru.lex.everyday.kniga",
             "ru.lex.everyday.dom", "ru.lex.personal.ya"]
OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("100-basic-messages-01","Ways to write","письмо, сообщение, звонок, смс and конверт.",
  ["pismo","soobshchenie","zvonok","sms","konvert"], "s:u100",
  "Do not confuse смс (text message) with письмо (letter)."),
 ("101-basic-messages-02","Sending and receiving","отправлять, получать, набирать, записка and текст.",
  ["otpravit","poluchat","nabirat","zapiska","tekst"], "s:u101",
  "Do not confuse отправлять (to send) with получать (to receive)."),
 ("102-basic-messages-03","Questions and answers","ответ, отвечать, спросить, вопрос and тема.",
  ["otvet","otvechat","sprosit","vopros","tema"], "s:u102",
  "Do not confuse спросить (to ask a question) with просить (to request)."),
 ("103-basic-messages-04","On the phone","голос, слушать, говорить, сказать and созвон.",
  ["golos","slushat","govorit","skazat","sozvon"], "s:u103",
  "Do not confuse слушать (to listen) with any other perception verb; only слушать is taught."),
 ("104-basic-messages-05","Invitations","приглашать, поздравление, идея, предложение and случай.",
  ["priglasit","pozdravlenie","ideya","predlozhenie","sluchay"], "s:u104",
  "Do not confuse предложение (suggestion) with разрешение (permission)."),
 ("105-basic-messages-06","Yes and no","согласен, согласие, отказ, повод and правда.",
  ["soglasen","soglasie","otkaz","povod","pravda"], "s:u105",
  "Do not confuse согласие (agreement) with отказ (refusal)."),
 ("106-basic-messages-07","Busy or free","занят, свободен, удобно, неудобно and пока.",
  ["zanyat","svoboden","udobno","neudobno","poka"], "s:u106",
  "Do not confuse занят (busy) with свободен (free)."),
 ("107-basic-messages-08","Need and may","хотеть, надо, должен, можно and нельзя with the impersonal modals.",
  ["hochu","nado","dolzhen","mozhno","nelzya"], "g:ru.grammar.a1.modal-impersonal",
  "Do not decline можно, нельзя or надо; they never change form."),
 ("108-basic-messages-09","Asking and forgiving","просить, обещать, благодарность, извинение and виноват.",
  ["prosit","obeshchat","blagodarnost","izvinenie","vinovat"], "s:u108",
  "Do not confuse извинение (apology) with благодарность (gratitude)."),
 ("109-basic-messages-10","Seeming and expecting","казаться, ожидать, разрешение, привет and удачи with the request model.",
  ["kazhetsya","ozhidaet","razreshenie","privet","udachi"], "g:ru.grammar.a1.polite-requests",
  "Do not put the requested thing in the genitive after просить; use the supplied form."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.messages.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a1.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.mama"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a1.' + uid + '"')
    L.append('goal_id: "ru.goal.a1.basic-messages"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a1.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a1.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a1.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a1.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: messages with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 8 written")
