#!/usr/bin/env python3
"""ru-RU batch 11: A2 units 130-139 (routine service transactions)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("usluga","услуга","услу́га","service"),
 ("klient","клиент","клие́нт","client"),
 ("prodavec","продавец","продаве́ц","seller, shop assistant"),
 ("ofitsiant","официант","официа́нт","waiter"),
 ("menedzher","менеджер","мене́джер","manager"),
 ("chek","чек","чек","receipt"),
 ("obmen","обмен","обме́н","exchange"),
 ("sdavat","сдавать","сдава́ть","to give change; to pass"),
 ("sdacha","сдача","сдача́","change (money)"),
 ("sdelka","сделка","сде́лка","deal"),
 ("uslovie","условие","усло́вие","condition, term"),
 ("tsena","цена","цена́","price"),
 ("stoimost","стоимость","стои́мость","cost, value"),
 ("skidka","скидка","ски́дка","discount"),
 ("aktsiya","акция","а́кция","promotion"),
 ("kredit","кредит","креди́т","credit, loan"),
 ("platezh","платёж","платё́ж","payment"),
 ("oplachivat","оплачивать","опла́чивать","to pay for"),
 ("vozvrat","возврат","возвра́т","return, refund"),
 ("vozvraschat","возвращать","возвраща́ть","to return"),
 ("garantiya","гарантия","гаранти́я","guarantee, warranty"),
 ("reklama","реклама","рекла́ма","advertisement"),
 ("otzyv","отзыв","отзы́в","review"),
 ("zhaloba","жалоба","жа́лоба","complaint"),
 ("pretenziya","претензия","прете́нзия","claim"),
 ("reshenie","решение","реше́ние","decision, solution"),
 ("otvetstvennost","ответственность","ответстве́нность","responsibility"),
 ("poryadok","порядок","по́рядок","order, procedure"),
 ("usloviya","условия","усло́вия","conditions"),
 ("prikaz","приказ","прика́з","order, command"),
 ("zayavka","заявка","заья́вка","request, application"),
 ("zayavit","заявлять","заявля́ть","to declare, file"),
 ("registratura","регистратура","регистрату́ра","registration desk"),
 ("registrat","регистрировать","регистри́ровать","to register"),
 ("anketa","анкета","анке́та","questionnaire"),
 ("zapolsyat","заполнять","заполня́ть","to fill in"),
 ("podpis","подпись","по́дпись","signature"),
 ("podpisat","подписывать","подписыва́ть","to sign"),
 ("pechat","печать","печа́ть","stamp, seal"),
 ("kopiya","копия","ко́пия","copy"),
 ("original","оригинал","оригина́л","original"),
 ("spravka","справка","спра́вка","certificate"),
 ("svidetelstvo","свидетельство","свиде́тельство","certificate"),
 ("schet","счёт","счёт","bill, account"),
 ("obmenyat","обменивать","обменива́ть","to exchange"),
 ("otdel","отдел","о́тдел","department"),
 ("priyomnaya","приёмная","приё́мная","reception"),
 ("sekretar","секретарь","секрета́рь","secretary"),
 ("prikhoday","приходить","приходи́ть","to come, arrive"),
 ("obsluzhivat","обслуживать","обслужива́ть","to serve"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.services.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "services.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.want-accusative", "name": "Хочу + accusative", "category": "syntax",
  "definition": "Хочу takes the accusative object: Я хочу счёт; Я хочу чек. Learn the supplied accusative forms; do not invent new endings."},
 {"id": "ru.grammar.a2.genitive-negation", "name": "Нет + genitive", "category": "syntax",
  "definition": "Negated nouns use the genitive after нет: нет сдачи, нет скидки. Learn the supplied genitive forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u130","Это услуга.","This is a service.",["услуга"]),
 ("u131","Это клиент.","This is a client.",["клиент"]),
 ("u132","Это чек.","This is a receipt.",["чек"]),
 ("u133","Это цена.","This is the price.",["цена"]),
 ("u134","Это скидка.","This is the discount.",["скидка"]),
 ("u135","Это заявка.","This is the request.",["заявка"]),
 ("u136","Это анкета.","This is the questionnaire.",["анкета"]),
 ("u137","Это подпись.","This is the signature.",["подпись"]),
 ("u138","Это справка.","This is the certificate.",["справка"]),
 ("u139","Это отдел.","This is the department.",["отдел"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.services-reading", "goal_id": "ru.goal.a2.services",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify receipt, price, and discount words on a supplied bill or sign.",
      "Match a service word to its хочу + accusative or нет + genitive chunk.",
      "Distinguish a request word from a complaint word in a supplied exchange."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.services-writing", "goal_id": "ru.goal.a2.services",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a service-identification statement with это and a taught nominative noun.",
      "Complete a want or negation with the supplied accusative or genitive chunk.",
      "Fill a supplied questionnaire field with a taught form."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.services"
    description: "Handle routine service transactions: payments, requests, paperwork."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.travel", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.shopping", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.want-accusative", "ru.grammar.a2.genitive-negation", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.services-reading", "ru.assess.a2.services-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-05"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("130-services-01","Service basics","услуга, клиент, менеджер, официант and продавец.",
  ["usluga","klient","menedzher","ofitsiant","prodavec"], "s:u130",
  "Do not confuse продавец (seller) with покупатель (buyer)."),
 ("131-services-02","Paying","чек, счёт, сдавать, сдача and платёж.",
  ["chek","schet","sdavat","sdacha","platezh"], "s:u131",
  "Do not confuse сдача (change) with сдавать (to give change)."),
 ("132-services-03","Price and discount","цена, стоимость, скидка, акция and кредит.",
  ["tsena","stoimost","skidka","aktsiya","kredit"], "s:u132",
  "Do not confuse скидка (discount) with акция (promotion)."),
 ("133-services-04","Returns","возврат, возвращать, обмен, обменивать and гарантия.",
  ["vozvrat","vozvraschat","obmen","obmenyat","garantiya"], "s:u133",
  "Do not confuse возврат (refund) with обмен (exchange)."),
 ("134-services-05","Ads and reviews","реклама, отзыв, жалоба, претензия and решение.",
  ["reklama","otzyv","zhaloba","pretenziya","reshenie"], "s:u134",
  "Do not confuse жалоба (complaint) with отзыв (review)."),
 ("135-services-06","Requests","заявка, заявлять, регистратура, регистрировать and анкета.",
  ["zayavka","zayavit","registratura","registrat","anketa"], "s:u135",
  "Do not confuse заявка (request) with приказ (order)."),
 ("136-services-07","Paperwork","заполнять, подпись, подписывать, печать and копия.",
  ["zapolsyat","podpis","podpisat","pechat","kopiya"], "s:u136",
  "Do not confuse подпись (signature) with печать (stamp)."),
 ("137-services-08","Certificates","оригинал, справка, свидетельство, ответственность and порядок.",
  ["original","spravka","svidetelstvo","otvetstvennost","poryadok"], "s:u137",
  "Do not confuse справка with свидетельство; both are certificates of different kinds."),
 ("138-services-09","At reception","отдел, приёмная, секретарь, приходить and обслуживать.",
  ["otdel","priyomnaya","sekretar","prikhoday","obsluzhivat"], "s:u138",
  "Do not confuse приёмная (reception) with отдел (department)."),
 ("139-services-10","Terms and deals","сделка, условие, условия, приказ and оплачивать.",
  ["sdelka","uslovie","usloviya","prikaz","oplachivat"], "s:u139",
  "Do not confuse условие (condition) with сделка (deal)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.services.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a2.' + uid + '"')
    L.append('goal_id: "ru.goal.a2.services"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: services with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 11 written")
