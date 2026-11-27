# Verdict ru-lexwarn
Reviewer: fresh-context RU linguistic reviewer (Hermes subagent), 2026-11-27

The 72 warnings are dominated by false positives of the morph analyzer: Cyrillic letter-name transliterations (эм, тэ, бэ, пэ, дэ, гэ, ка, эн, эс, цэ, ша, вэ, ха, эл, зэ, жэ, эф, и краткое) are all valid, correctly-spelled alphabet names; short function words (не, но, ни, без, от, до, об, за, для, раз, равно, очень) are valid in context; and inflected forms the dictionary missed (неисправности, отправкой, ры́нке, са́ду/ле́су as locatives, А́нны, Ма́рии, тому, тому-адресату dative, перепутал, поднял, предложил, молча, кругом, понима́ю, зову́т, до́брое, хле́ба/сыра́/ма́сла/я́иц genitives, све́жий/вку́сный/хо́лодное) are genuine Russian. W13 "том" is valid (prepositional of тот / "volume"). W24 Ма́рии is a correct name genitive. Only four words are wrong as presented, all stress-mark errors that change or corrupt the word in its given context.

FLAG | W26 | саду́ | "в саду" requires end-stress (в саду́); the stem-stressed "са́ду" is a wrong stress mark in this locative context.
FLAG | W27 | лесу́ | "в лесу" requires end-stress (в лесу́); "ле́су" is a wrong stress mark in this locative context.
FLAG | W29 | хлеба́ | Partitive/substance genitive of хлеб is хлеба́; "хле́ба" means loaves (plural), wrong form in "батон хлеба".
FLAG | W36 | плачу́ | Context means "I pay" (платить → плачу́); the marked "пла́чу" is the cry-sense of плакать, wrong word for this context.
