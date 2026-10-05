#!/usr/bin/env python3
"""ru-RU batch 57: B2 units 590-599 (process descriptions and responsibilities)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("polnomochiya","полномочия","полномóчия","authority, powers"),
 ("funkcional","функционал","функциона́л","functional scope"),
 ("poruchenie","поручение","порýчение","task, assignment"),
 ("podpisant","подписант","подписáнт","signatory"),
 ("utverdit","утвердить","утвéрдить","to approve"),
 ("utverzhdennyy","утверждённый","утверждённый","approved"),
 ("soglasovannyy","согласованный","согласóванный","agreed, approved"),
 ("paraf","параф","пáраф","initialing"),
 ("ispolnitel","исполнитель","исполнúтель","executor, performer"),
 ("podryadchik","подрядчик","подрáдчик","contractor"),
 ("zakazchik","заказчик","зáказчик","client, customer"),
 ("postavshchik","поставщик","поставщúк","supplier"),
 ("distributor","дистрибьютор","дистрибью́тор","distributor"),
 ("diler","дилер","дúлер","dealer"),
 ("broker","брокер","брóкер","broker"),
 ("makler","маклер","мáклер","broker"),
 ("shtat","штат","штáт","staff, payroll"),
 ("uvolnenie","увольнение","увóльнение","dismissal"),
 ("uvolnyat","увольнять","увóльнять","to dismiss"),
 ("raspredelenie","распределение","распределéние","distribution"),
 ("raspredelit","распределить","распределúть","to distribute"),
 ("delegirovat","делегировать","делéгировать","to delegate"),
 ("delegirovanie","делегирование","делегúрование","delegation"),
 ("eskalcia","эскалация","эскалáция","escalation"),
 ("eskalirovat","эскалировать","эскáлировать","to escalate"),
 ("podotchetnost","подотчётность","подотчéтность","accountability"),
 ("podotchetnyy","подотчётный","подотчéтный","accountable"),
 ("upolnomochit","уполномочить","уполномóчить","to authorize"),
 ("upolnomochennyy","уполномоченный","уполномóченный","authorized representative"),
 ("predstavitelstvo","представительство","представúтельство","representation"),
 ("kvorum","кворум","квóрум","quorum"),
 ("protokolirovanie","протоколирование","протоколúрование","minute-taking"),
 ("fikseciya","фиксация","фиксáция","fixation, recording"),
 ("samokontrol","самоконтроль","самокóнтроль","self-control"),
 ("proverochnyy","проверочный","провéрочный","verification, inspection (adj)"),
 ("inventarizaciya","инвентаризация","инвентаризáция","inventory"),
 ("uchetnyy","учётный","ýчётный","accounting, registration (adj)"),
 ("uchreditel","учредитель","учредúтель","founder"),
 ("uchreditelnyy","учредительный","учредúтельный","founding, constituent"),
 ("reglamentirovat","регламентировать","регламентúровать","to regulate"),
 ("uregulirovanie","урегулирование","урегулúрование","settlement, regulation"),
 ("vetirovat","ветировать","вéтировать","to veto"),
 ("veto","вето","вéто","veto"),
 ("nalozenie","наложение","наложéние","application, imposition"),
 ("peregovoshchik","переговорщик","перегóвощик","negotiator"),
 ("mediator","медиатор","медиáтор","mediator"),
 ("mediaciya","медиация","медиáция","mediation"),
 ("arbitrazhnyy","арбитражный","арбитра́жный","arbitration (adj)"),
 ("treteyskiy","третейский","третéйский","third-party, arbitral"),
 ("pretenzionnyy","претензионный","претензиóнный","claims (adj)"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.prof.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "prof3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-otvechaet-za", "name": "Отвечает за + acc", "category": "syntax",
  "definition": "Responsibility uses отвечает за: отвечает за проект. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-ramkakh", "name": "В рамках + gen", "category": "syntax",
  "definition": "Process scope uses в рамках: в рамках договора. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u590","Это поручение.","This is an assignment.",["поручение"]),
 ("u591","Это параф.","This is an initialing.",["параф"]),
 ("u592","Это заказчик.","This is a client.",["заказчик"]),
 ("u593","Это штат.","This is the staff.",["штат"]),
 ("u594","Это эскалация.","This is an escalation.",["эскалация"]),
 ("u595","Это кворум.","This is a quorum.",["кворум"]),
 ("u596","Это фиксация.","This is a recording.",["фиксация"]),
 ("u597","Это учредитель.","This is a founder.",["учредитель"]),
 ("u598","Это вето.","This is a veto.",["вето"]),
 ("u599","Это медиатор.","This is a mediator.",["медиатор"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("590-proc-01","Authority","полномочия, функционал, поручение, подписант and утвердить.",
  ["polnomochiya","funkcional","poruchenie","podpisant","utverdit"], "s:u590",
  "Do not confuse поручение (assignment) with поручительство (surety)."),
 ("591-proc-02","Approval chain","утверждённый, согласованный, параф, исполнитель and подрядчик.",
  ["utverzhdennyy","soglasovannyy","paraf","ispolnitel","podryadchik"], "s:u591",
  "Do not confuse исполнитель (executor) with подрядчик (contractor)."),
 ("592-proc-03","Trade roles","заказчик, поставщик, дистрибьютор, дилер and брокер.",
  ["zakazchik","postavshchik","distributor","diler","broker"], "s:u592",
  "Do not confuse заказчик (client) with поставщик (supplier)."),
 ("593-proc-04","Staffing","маклер, штат, увольнение, увольнять and распределение.",
  ["makler","shtat","uvolnenie","uvolnyat","raspredelenie"], "s:u593",
  "Do not confuse штат (staff) with распределение (distribution)."),
 ("594-proc-05","Delegation","распределить, делегировать, делегирование, эскалация and эскалировать.",
  ["raspredelit","delegirovat","delegirovanie","eskalcia","eskalirovat"], "s:u594",
  "Do not confuse делегировать (to delegate) with эскалировать (to escalate)."),
 ("595-proc-06","Accountability","подотчётность, подотчётный, уполномочить, уполномоченный and представительство.",
  ["podotchetnost","podotchetnyy","upolnomochit","upolnomochennyy","predstavitelstvo"], "s:u595",
  "Do not confuse уполномочить (to authorize) with уполномоченный (authorized representative)."),
 ("596-proc-07","Meeting records","кворум, протоколирование, фиксация, самоконтроль and проверочный.",
  ["kvorum","protokolirovanie","fikseciya","samokontrol","proverochnyy"], "s:u596",
  "Do not confuse протоколирование (minute-taking) with фиксация (recording)."),
 ("597-proc-08","Founding","инвентаризация, учётный, учредитель, учредительный and регламентировать.",
  ["inventarizaciya","uchetnyy","uchreditel","uchreditelnyy","reglamentirovat"], "s:u597",
  "Do not confuse учредитель (founder) with учётный (accounting)."),
 ("598-proc-09","Dispute handling","урегулирование, ветировать, вето, наложение and переговорщик.",
  ["uregulirovanie","vetirovat","veto","nalozenie","peregovoshchik"], "s:u598",
  "Do not confuse ветировать (to veto) with урегулирование (settlement)."),
 ("599-proc-10","Dispute resolution","медиатор, медиация, арбитражный, третейский and претензионный.",
  ["mediator","mediaciya","arbitrazhnyy","treteyskiy","pretenzionnyy"], "s:u599",
  "Do not confuse медиатор (mediator) with переговорщик (negotiator)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.prof.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.b2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.b2.' + uid + '"')
    L.append('goal_id: "ru.goal.b2.professional-writing"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.b2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.b2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.b2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.b2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: business letter with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 57 written")
assert len(WORDS) == 50, len(WORDS)
