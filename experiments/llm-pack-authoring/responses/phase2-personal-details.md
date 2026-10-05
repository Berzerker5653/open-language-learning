```text
curriculum/goals.yaml
curriculum/units/020-personal-details-01.yaml
curriculum/units/021-personal-details-02.yaml
curriculum/units/022-personal-details-03.yaml
curriculum/units/023-personal-details-04.yaml
curriculum/units/024-personal-details-05.yaml
curriculum/units/025-personal-details-06.yaml
curriculum/units/026-personal-details-07.yaml
curriculum/units/027-personal-details-08.yaml
curriculum/units/028-personal-details-09.yaml
curriculum/units/029-personal-details-10.yaml
grammar/concepts.jsonl
lexicon/personal.jsonl
sentences/entries.jsonl
assessments/definitions.jsonl
```

### curriculum/goals.yaml

```yaml
goals:
  - id: "ru.goal.on-ramp.cyrillic"
    description: "Recognize and copy all printed Cyrillic letter case forms and interpret the teaching stress mark."
    band: "on-ramp"
    modalities: ["reading", "writing"]
    prerequisites: []
    required_concepts: []
    assessment_ids: ["ru.assess.on-ramp.cyrillic-recognition", "ru.assess.on-ramp.cyrillic-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "GPT-6 Astra Pro"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
  - id: "ru.goal.on-ramp.greetings"
    description: "Read and write taught greetings, farewells, and polite responses in short text exchanges."
    band: "on-ramp"
    modalities: ["reading", "writing"]
    prerequisites:
      - target: "ru.goal.on-ramp.cyrillic"
        dimension: "orthography-recognition"
        required_state: "independent"
        strength: "hard"
    required_concepts: ["ru.grammar.on-ramp.formulaic-politeness"]
    assessment_ids: ["ru.assess.on-ramp.greetings-recognition", "ru.assess.on-ramp.greetings-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "GPT-6 Astra Pro"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
  - id: "ru.goal.on-ramp.self-introduction"
    description: "Read and write a name and a minimal self-introduction using taught patterns."
    band: "on-ramp"
    modalities: ["reading", "writing"]
    prerequisites:
      - target: "ru.goal.on-ramp.cyrillic"
        dimension: "orthography-recognition"
        required_state: "independent"
        strength: "hard"
    required_concepts: ["ru.grammar.on-ramp.formulaic-politeness", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.on-ramp.self-introduction-recognition", "ru.assess.on-ramp.self-introduction-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "GPT-6 Astra Pro"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
  - id: "ru.goal.on-ramp.classroom"
    description: "Recognize essential written learning instructions and use taught clarification requests."
    band: "on-ramp"
    modalities: ["reading", "writing"]
    prerequisites:
      - target: "ru.goal.on-ramp.cyrillic"
        dimension: "orthography-recognition"
        required_state: "independent"
        strength: "hard"
    required_concepts: ["ru.grammar.on-ramp.formulaic-politeness"]
    assessment_ids: ["ru.assess.on-ramp.classroom-recognition", "ru.assess.on-ramp.classroom-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "GPT-6 Astra Pro"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
  - id: "ru.goal.on-ramp.everyday"
    description: "Identify familiar people and objects in short written identification statements."
    band: "on-ramp"
    modalities: ["reading", "writing"]
    prerequisites:
      - target: "ru.goal.on-ramp.cyrillic"
        dimension: "orthography-recognition"
        required_state: "independent"
        strength: "hard"
    required_concepts: ["ru.grammar.on-ramp.zero-present-copula", "ru.grammar.on-ramp.eto-identification"]
    assessment_ids: ["ru.assess.on-ramp.everyday-recognition", "ru.assess.on-ramp.everyday-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "GPT-6 Astra Pro"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
  - id: "ru.goal.on-ramp.numbers"
    description: "Match and write the number words zero through nine and their digits."
    band: "on-ramp"
    modalities: ["reading", "writing"]
    prerequisites:
      - target: "ru.goal.on-ramp.cyrillic"
        dimension: "orthography-recognition"
        required_state: "independent"
        strength: "hard"
    required_concepts: ["ru.grammar.on-ramp.eto-identification"]
    assessment_ids: ["ru.assess.on-ramp.numbers-recognition", "ru.assess.on-ramp.numbers-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "GPT-6 Astra Pro"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
  - id: "ru.goal.a1.personal-details"
    description: "Read and complete simple personal profiles with names, origin, age, and contact details."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.on-ramp.cyrillic", dimension: "orthography-recognition", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.self-introduction", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.greetings", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.classroom", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.numbers", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.subject-pronouns", "ru.grammar.on-ramp.zero-present-copula", "ru.grammar.a1.noun-gender", "ru.grammar.a1.questions", "ru.grammar.on-ramp.eto-identification", "ru.grammar.a1.genitive-basic", "ru.grammar.a1.dative-recipient-age", "ru.grammar.a1.numerals-time"]
    assessment_ids: ["ru.assess.a1.personal-details-reading", "ru.assess.a1.personal-details-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "GPT-6 Astra Pro"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
```

### curriculum/units/020-personal-details-01.yaml

```yaml
id: "ru.unit.a1.personal-details-01"
goal_id: "ru.goal.a1.personal-details"
title: "Subject pronouns and profile labels"
summary: "Extend personal reference to we, they and neuter it. Read surname and patronymic labels, then match the eight subject pronouns to explicit people or noun cues."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u020-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.my", "ru.lex.personal.oni", "ru.lex.personal.ono", "ru.lex.personal.familiya", "ru.lex.personal.otchestvo", "ru.lex.personal.ya", "ru.lex.personal.ty", "ru.lex.personal.vy", "ru.lex.personal.on", "ru.lex.personal.ona"]
  - id: "ru.activity.a1.u020-grammar"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &g ["ru.grammar.a1.subject-pronouns", "ru.grammar.on-ramp.zero-present-copula"]
  - id: "ru.activity.a1.u020-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: *g
  new_item_budget: 6
  register: []
  expected_interpretations: ["Subject reference and two personal-name fields."]
  prohibited_ambiguity: ["Do not confuse polite singular you with a plural group."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/021-personal-details-02.yaml

```yaml
id: "ru.unit.a1.personal-details-02"
goal_id: "ru.goal.a1.personal-details"
title: "Gender in personal information"
summary: "Read country, city and contact labels. Sort the taught nouns by gender, using earlier family and classroom nouns for exceptions rather than guessing from English."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u021-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.strana", "ru.lex.personal.gorod", "ru.lex.personal.adres", "ru.lex.personal.telefon", "ru.lex.personal.pasport", "ru.lex.everyday.mama", "ru.lex.everyday.papa", "ru.lex.personal.imya", "ru.lex.classroom.slovo", "ru.lex.everyday.kniga"]
  - id: "ru.activity.a1.u021-grammar"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &g ["ru.grammar.a1.noun-gender"]
  - id: "ru.activity.a1.u021-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: *g
  new_item_budget: 6
  register: []
  expected_interpretations: ["Gender classification of the taught nouns."]
  prohibited_ambiguity: ["A soft sign alone does not determine gender; keep the taught exceptions."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/022-personal-details-03.yaml

```yaml
id: "ru.unit.a1.personal-details-03"
goal_id: "ru.goal.a1.personal-details"
title: "Questions about a person"
summary: "Read five question words. Match each to the missing information, then change a supplied identity statement into a written yes-no question without adding an auxiliary."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u022-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.kto", "ru.lex.personal.chto", "ru.lex.personal.gde", "ru.lex.personal.kak", "ru.lex.personal.otkuda", "ru.lex.personal.ya", "ru.lex.personal.anna", "ru.lex.everyday.eto", "ru.lex.everyday.kniga", "ru.sent.on-ramp.anna-introduction", "ru.sent.on-ramp.this-is-book"]
  - id: "ru.activity.a1.u022-grammar"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &g ["ru.grammar.a1.questions", "ru.grammar.on-ramp.zero-present-copula", "ru.grammar.on-ramp.eto-identification"]
  - id: "ru.activity.a1.u022-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: *g
  new_item_budget: 6
  register: []
  expected_interpretations: ["A question seeking identity, location, manner or origin."]
  prohibited_ambiguity: ["Do not supply an untaught answer pattern merely because a question word is known."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/023-personal-details-04.yaml

```yaml
id: "ru.unit.a1.personal-details-04"
goal_id: "ru.goal.a1.personal-details"
title: "Origin and the genitive"
summary: "Read four country names and the origin preposition. Practice their taught genitive forms and recognize possession and absence patterns with previously learned words."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u023-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.iz", "ru.lex.personal.rossiya", "ru.lex.personal.kanada", "ru.lex.personal.frantsiya", "ru.lex.personal.germaniya", "ru.lex.greetings.net", "ru.lex.personal.ya", "ru.lex.personal.ty", "ru.lex.personal.my", "ru.lex.personal.vy", "ru.lex.everyday.kniga"]
  - id: "ru.activity.a1.u023-grammar"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &g ["ru.grammar.a1.genitive-basic", "ru.grammar.a1.noun-gender"]
  - id: "ru.activity.a1.u023-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: *g
  new_item_budget: 6
  register: []
  expected_interpretations: ["Origin from a named country and basic genitive relationships."]
  prohibited_ambiguity: ["A country of origin is not automatically a claim about citizenship or ethnicity."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/024-personal-details-05.yaml

```yaml
id: "ru.unit.a1.personal-details-05"
goal_id: "ru.goal.a1.personal-details"
title: "Age and the person concerned"
summary: "Learn age, year, twenty, thirty and the quantity question word. Match dative pronoun forms to people; the number-year agreement practice follows in unit 025."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u024-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.god", "ru.lex.personal.vozrast", "ru.lex.personal.dvadtsat", "ru.lex.personal.tridtsat", "ru.lex.personal.skolko", "ru.lex.personal.ya", "ru.lex.personal.ty", "ru.lex.personal.on", "ru.lex.personal.ona", "ru.lex.personal.my", "ru.lex.personal.vy", "ru.lex.personal.anna", "ru.lex.personal.ivan"]
  - id: "ru.activity.a1.u024-grammar"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &g ["ru.grammar.a1.dative-recipient-age", "ru.grammar.a1.subject-pronouns", "ru.grammar.a1.noun-gender"]
  - id: "ru.activity.a1.u024-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: *g
  new_item_budget: 6
  register: []
  expected_interpretations: ["The dative person in a simple age statement."]
  prohibited_ambiguity: ["Do not request a full age sentence before the number-year pattern is practiced."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/025-personal-details-06.yaml

```yaml
id: "ru.unit.a1.personal-details-06"
goal_id: "ru.goal.a1.personal-details"
title: "Numbers for age and form fields"
summary: "Read ten through thirteen and forty, recycling the earlier numbers. Match digits and number words, then choose the supplied year form; calendar cases are reserved for later drills."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u025-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.desyat", "ru.lex.personal.odinnadtsat", "ru.lex.personal.dvenadtsat", "ru.lex.personal.trinadtsat", "ru.lex.personal.sorok", "ru.lex.personal.god", "ru.lex.personal.vozrast", "ru.lex.personal.dvadtsat", "ru.lex.personal.tridtsat", "ru.lex.numbers-time.nol", "ru.lex.numbers-time.odin", "ru.lex.numbers-time.dva", "ru.lex.numbers-time.tri", "ru.lex.numbers-time.chetyre", "ru.lex.numbers-time.pyat", "ru.lex.numbers-time.shest", "ru.lex.numbers-time.sem", "ru.lex.numbers-time.vosem", "ru.lex.numbers-time.devyat"]
  - id: "ru.activity.a1.u025-grammar"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &g ["ru.grammar.a1.numerals-time", "ru.grammar.a1.genitive-basic", "ru.grammar.a1.dative-recipient-age"]
  - id: "ru.activity.a1.u025-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: *g
  new_item_budget: 6
  register: []
  expected_interpretations: ["Numbers and the matching year form in an age expression."]
  prohibited_ambiguity: ["Do not require calendar vocabulary, oblique numerals or spoken ordinal dates here."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/026-personal-details-07.yaml

```yaml
id: "ru.unit.a1.personal-details-07"
goal_id: "ru.goal.a1.personal-details"
title: "Names and further countries"
summary: "Learn two names and three further countries. Read the origin model, complete its country form and write an analogous identity or origin statement using declared words."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u026-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.anton", "ru.lex.personal.mariya", "ru.lex.personal.angliya", "ru.lex.personal.italiya", "ru.lex.personal.ispaniya", "ru.lex.personal.iz", "ru.sent.a1.u026"]
  - id: "ru.activity.a1.u026-cloze"
    type: "cloze"
    modality: "writing"
    support_level: 1
    content_refs: ["ru.sent.a1.u026"]
  - id: "ru.activity.a1.u026-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: ["ru.grammar.on-ramp.zero-present-copula", "ru.grammar.a1.genitive-basic"]
  new_item_budget: 6
  register: []
  expected_interpretations: ["A named person is from the stated country."]
  prohibited_ambiguity: ["Do not infer citizenship from an origin statement."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/027-personal-details-08.yaml

```yaml
id: "ru.unit.a1.personal-details-08"
goal_id: "ru.goal.a1.personal-details"
title: "Age and contact fields"
summary: "Read street, apartment, identifier, mail and form labels. Complete the age model and identify the fields used for supplied fictional contact details."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u027-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.ulitsa", "ru.lex.personal.kvartira", "ru.lex.personal.nomer", "ru.lex.personal.pochta", "ru.lex.personal.anketa", "ru.lex.personal.ya", "ru.lex.personal.dvadtsat", "ru.lex.personal.god", "ru.sent.a1.u027"]
  - id: "ru.activity.a1.u027-cloze"
    type: "cloze"
    modality: "writing"
    support_level: 1
    content_refs: ["ru.sent.a1.u027"]
  - id: "ru.activity.a1.u027-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: ["ru.grammar.a1.dative-recipient-age", "ru.grammar.a1.numerals-time"]
  new_item_budget: 6
  register: []
  expected_interpretations: ["Age in years and basic contact-field meanings."]
  prohibited_ambiguity: ["Use supplied fictional details, not the learner's real contact information."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/028-personal-details-09.yaml

```yaml
id: "ru.unit.a1.personal-details-09"
goal_id: "ru.goal.a1.personal-details"
title: "Education and an address"
summary: "Read work and education labels. Interpret whose address is identified in the model, complete the genitive ending and label a short fictional profile."
estimated_minutes: 8
activities:
  - id: "ru.activity.a1.u028-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.shkola", "ru.lex.personal.universitet", "ru.lex.personal.rabota", "ru.lex.personal.student", "ru.lex.personal.studentka", "ru.lex.everyday.eto", "ru.lex.personal.adres", "ru.sent.a1.u028"]
  - id: "ru.activity.a1.u028-cloze"
    type: "cloze"
    modality: "writing"
    support_level: 1
    content_refs: ["ru.sent.a1.u028"]
  - id: "ru.activity.a1.u028-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: ["ru.grammar.on-ramp.eto-identification", "ru.grammar.a1.genitive-basic"]
  new_item_budget: 6
  register: []
  expected_interpretations: ["The address belongs to the school named in the model."]
  prohibited_ambiguity: ["Do not interpret the school's address as the learner's home address."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### curriculum/units/029-personal-details-10.yaml

```yaml
id: "ru.unit.a1.personal-details-10"
goal_id: "ru.goal.a1.personal-details"
title: "Completing a simple profile"
summary: "Learn the remaining profile fields. Read the student-and-origin model, then assemble a fictional profile with a name, role, origin, age and labeled contact details."
estimated_minutes: 12
activities:
  - id: "ru.activity.a1.u029-read"
    type: "encounter-read"
    modality: "reading"
    support_level: 1
    content_refs: &v ["ru.lex.personal.elektronnaya-pochta", "ru.lex.personal.grazhdanstvo", "ru.lex.personal.data-rozhdeniya", "ru.lex.personal.yazyk", "ru.lex.personal.professiya", "ru.lex.personal.ya", "ru.lex.personal.studentka", "ru.lex.personal.iz", "ru.lex.personal.frantsiya", "ru.sent.a1.u029", "ru.lex.personal.mariya", "ru.lex.personal.italiya", "ru.sent.a1.u026", "ru.lex.personal.dvadtsat", "ru.lex.personal.god", "ru.sent.a1.u027", "ru.lex.everyday.eto", "ru.lex.personal.adres", "ru.lex.personal.shkola", "ru.sent.a1.u028", "ru.lex.personal.imya", "ru.lex.personal.familiya", "ru.lex.personal.otchestvo", "ru.lex.personal.vozrast", "ru.lex.personal.telefon", "ru.lex.personal.ulitsa", "ru.lex.personal.kvartira", "ru.lex.personal.nomer", "ru.lex.personal.anketa", "ru.lex.personal.anna", "ru.lex.personal.ivan", "ru.lex.personal.kanada", "ru.lex.personal.rossiya"]
  - id: "ru.activity.a1.u029-cloze"
    type: "cloze"
    modality: "writing"
    support_level: 1
    content_refs: ["ru.sent.a1.u029"]
  - id: "ru.activity.a1.u029-write"
    type: "recall"
    modality: "writing"
    support_level: 0
    content_refs: *v
generation_contract:
  allowed_vocab: *v
  allowed_grammar: ["ru.grammar.on-ramp.zero-present-copula", "ru.grammar.a1.genitive-basic", "ru.grammar.a1.subject-pronouns", "ru.grammar.a1.dative-recipient-age", "ru.grammar.a1.numerals-time", "ru.grammar.on-ramp.eto-identification"]
  new_item_budget: 6
  register: []
  expected_interpretations: ["A female university student identifies her role and origin."]
  prohibited_ambiguity: ["Keep numeric birth dates in the explicitly supplied format; do not invent personal data."]
  target_proficiency: "A1"
  validation_method: "choice"
```

### grammar/concepts.jsonl

```jsonl
{"id":"ru.grammar.on-ramp.formulaic-politeness","name":"Fixed polite expressions","category":"syntax","status":"draft","definition":"Learn greetings, courteous responses, naming expressions and classroom requests as complete chunks. Choose the chunk matching the situation. A fixed chunk does not license changing its adjective, case or verb form; productive inflection is introduced later.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.on-ramp.zero-present-copula","name":"Present-tense identity without a copula","category":"syntax","status":"draft","definition":"In a simple present-tense identity statement, a subject pronoun can be followed directly by a nominative name or noun, normally without a word corresponding to English am, is or are. This lesson practices naming a person; possession, location, past and future reference require additional patterns.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.on-ramp.eto-identification","name":"Identification with это","category":"syntax","status":"draft","definition":"Use это followed by a nominative naming expression to identify a person, object or printed numeral. In this pattern, это stays unchanged even before a feminine noun. This is not the rule for a demonstrative modifier agreeing with a following noun.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.a1.subject-pronouns","name":"Subject pronouns and reference","category":"syntax","status":"draft","definition":"Use я, ты, он, она, оно, мы, вы and они as subject forms. Ты addresses one familiar person; вы addresses several people or one person politely. Он, она and оно can also refer to things according to grammatical gender. Subject pronouns precede the naming expression in the initial identity models. Do not insert an English-style present-tense copula.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.a1.noun-gender","name":"Basic noun gender","category":"syntax","status":"draft","definition":"Learn the gender with each noun. A final consonant or -й usually marks masculine nouns; -а or -я usually marks feminine nouns; -о or -е usually marks neuter nouns. A final soft sign does not determine gender on its own. Папа is masculine despite -а, and имя is neuter despite -я. These are patterns for taught nouns, not an exception-free guessing rule.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.a1.questions","name":"Basic written questions","category":"syntax","status":"draft","definition":"A yes-no question can retain statement word order and end with a question mark. Question words identify missing information: кто asks about a person, что about a thing, где about location, как about manner or a name pattern, and откуда about origin. Later question words follow the same information-seeking principle. Do not add an English-style auxiliary. Choose the question word for the requested information, not merely for the expected answer's first word.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.a1.genitive-basic","name":"Basic genitive forms","category":"syntax","status":"draft","definition":"Use the genitive after из for origin, after a naming noun for possession or association, and after нет for absence. Common singular patterns are consonant masculine + -а, masculine -й or -ь to -я, feminine -а to -ы or -и, feminine -я or -ь to -и, neuter -о to -а, and neuter -е to -я. Nouns in -ия take -ии. Apply the spelling rule that uses и rather than ы after г, к, х, ж, ч, ш and щ. Learn pronoun forms such as меня, тебя, нас and вас separately. Plural forms and exceptions must be supplied rather than guessed.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.a1.dative-recipient-age","name":"Dative recipients and age","category":"syntax","status":"draft","definition":"The dative identifies a recipient in taught verb patterns and the person whose age is stated. Use мне for я, тебе for ты, ему for он, ей for она, нам for мы and вам for вы. A simple age statement has the person in the dative followed by the number and the appropriate year form. Common noun patterns include masculine or neuter -у or -ю, feminine -а or -я to -е, feminine -ь to -и, and -ия to -ии. Practice recipient constructions only with verbs whose corresponding use has been taught.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.grammar.a1.numerals-time","name":"Numbers and basic time notation","category":"syntax","status":"draft","definition":"In nominative or inanimate-accusative counting phrases, 1 selects singular, 2-4 select genitive singular, and 5-20 select genitive plural. Larger numbers follow their final component, but endings 11-14 still select genitive plural. Learn год, года and лет as the year forms. Learn один, одна, одно and два, две as the supplied gender forms in nominative counting; oblique numeral declension is not taught here. Apply the same supplied-form method to hours and minutes. Read clock notation as HH:MM and the explicitly labeled date format as DD.MM.YYYY. Weekday expressions use the accusative with the preposition for on; month expressions use the prepositional with in; taught season time forms use the instrumental. Do not require an untaught calendar word or a spoken ordinal date.","sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
```

### lexicon/personal.jsonl

```jsonl
{"id":"ru.lex.personal.ya","status":"draft","forms":[{"text":"я","is_primary":true}],"readings":[{"text":"я","script":"cyrillic"}],"glosses":{"en-US":["I"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.ty","status":"draft","forms":[{"text":"ты","is_primary":true}],"readings":[{"text":"ты","script":"cyrillic"}],"glosses":{"en-US":["you (one familiar person)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.vy","status":"draft","forms":[{"text":"вы","is_primary":true}],"readings":[{"text":"вы","script":"cyrillic"}],"glosses":{"en-US":["you (plural or polite singular)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.on","status":"draft","forms":[{"text":"он","is_primary":true}],"readings":[{"text":"он","script":"cyrillic"}],"glosses":{"en-US":["he"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.ona","status":"draft","forms":[{"text":"она","is_primary":true}],"readings":[{"text":"она́","script":"cyrillic"}],"glosses":{"en-US":["she"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.anna","status":"draft","forms":[{"text":"Анна","is_primary":true}],"readings":[{"text":"А́нна","script":"cyrillic"}],"glosses":{"en-US":["Anna (given name)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.ivan","status":"draft","forms":[{"text":"Иван","is_primary":true}],"readings":[{"text":"Ива́н","script":"cyrillic"}],"glosses":{"en-US":["Ivan (given name)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.imya","status":"draft","forms":[{"text":"имя","is_primary":true}],"readings":[{"text":"и́мя","script":"cyrillic"}],"glosses":{"en-US":["name (given name)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.menya-zovut","status":"draft","forms":[{"text":"меня зовут","is_primary":true}],"readings":[{"text":"меня́ зову́т","script":"cyrillic"}],"glosses":{"en-US":["my name is (fixed introduction before a name)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.kak-vas-zovut","status":"draft","forms":[{"text":"как вас зовут","is_primary":true}],"readings":[{"text":"как вас зову́т","script":"cyrillic"}],"glosses":{"en-US":["what is your name? (fixed polite question)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.my","status":"draft","forms":[{"text":"мы","is_primary":true}],"readings":[{"text":"мы","script":"cyrillic"}],"glosses":{"en-US":["we"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.oni","status":"draft","forms":[{"text":"они","is_primary":true}],"readings":[{"text":"они́","script":"cyrillic"}],"glosses":{"en-US":["they"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.ono","status":"draft","forms":[{"text":"оно","is_primary":true}],"readings":[{"text":"оно́","script":"cyrillic"}],"glosses":{"en-US":["it (neuter subject pronoun)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.familiya","status":"draft","forms":[{"text":"фамилия","is_primary":true}],"readings":[{"text":"фами́лия","script":"cyrillic"}],"glosses":{"en-US":["surname; family name"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.otchestvo","status":"draft","forms":[{"text":"отчество","is_primary":true}],"readings":[{"text":"о́тчество","script":"cyrillic"}],"glosses":{"en-US":["patronymic"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.strana","status":"draft","forms":[{"text":"страна","is_primary":true}],"readings":[{"text":"страна́","script":"cyrillic"}],"glosses":{"en-US":["country"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.gorod","status":"draft","forms":[{"text":"город","is_primary":true}],"readings":[{"text":"го́род","script":"cyrillic"}],"glosses":{"en-US":["city; town"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.adres","status":"draft","forms":[{"text":"адрес","is_primary":true}],"readings":[{"text":"а́дрес","script":"cyrillic"}],"glosses":{"en-US":["address"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.telefon","status":"draft","forms":[{"text":"телефон","is_primary":true}],"readings":[{"text":"телефо́н","script":"cyrillic"}],"glosses":{"en-US":["telephone; phone number"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.pasport","status":"draft","forms":[{"text":"паспорт","is_primary":true}],"readings":[{"text":"па́спорт","script":"cyrillic"}],"glosses":{"en-US":["passport"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.kto","status":"draft","forms":[{"text":"кто","is_primary":true}],"readings":[{"text":"кто","script":"cyrillic"}],"glosses":{"en-US":["who"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.chto","status":"draft","forms":[{"text":"что","is_primary":true}],"readings":[{"text":"что","script":"cyrillic"}],"glosses":{"en-US":["what"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.gde","status":"draft","forms":[{"text":"где","is_primary":true}],"readings":[{"text":"где","script":"cyrillic"}],"glosses":{"en-US":["where (location)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.kak","status":"draft","forms":[{"text":"как","is_primary":true}],"readings":[{"text":"как","script":"cyrillic"}],"glosses":{"en-US":["how"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.otkuda","status":"draft","forms":[{"text":"откуда","is_primary":true}],"readings":[{"text":"отку́да","script":"cyrillic"}],"glosses":{"en-US":["where from"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.iz","status":"draft","forms":[{"text":"из","is_primary":true}],"readings":[{"text":"из","script":"cyrillic"}],"glosses":{"en-US":["from; out of (+ genitive)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.rossiya","status":"draft","forms":[{"text":"Россия","is_primary":true}],"readings":[{"text":"Росси́я","script":"cyrillic"}],"glosses":{"en-US":["Russia"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.kanada","status":"draft","forms":[{"text":"Канада","is_primary":true}],"readings":[{"text":"Кана́да","script":"cyrillic"}],"glosses":{"en-US":["Canada"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.frantsiya","status":"draft","forms":[{"text":"Франция","is_primary":true}],"readings":[{"text":"Фра́нция","script":"cyrillic"}],"glosses":{"en-US":["France"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.germaniya","status":"draft","forms":[{"text":"Германия","is_primary":true}],"readings":[{"text":"Герма́ния","script":"cyrillic"}],"glosses":{"en-US":["Germany"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.god","status":"draft","forms":[{"text":"год","is_primary":true}],"readings":[{"text":"год","script":"cyrillic"}],"glosses":{"en-US":["year"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.vozrast","status":"draft","forms":[{"text":"возраст","is_primary":true}],"readings":[{"text":"во́зраст","script":"cyrillic"}],"glosses":{"en-US":["age"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.dvadtsat","status":"draft","forms":[{"text":"двадцать","is_primary":true}],"readings":[{"text":"два́дцать","script":"cyrillic"}],"glosses":{"en-US":["twenty (20)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.tridtsat","status":"draft","forms":[{"text":"тридцать","is_primary":true}],"readings":[{"text":"три́дцать","script":"cyrillic"}],"glosses":{"en-US":["thirty (30)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.skolko","status":"draft","forms":[{"text":"сколько","is_primary":true}],"readings":[{"text":"ско́лько","script":"cyrillic"}],"glosses":{"en-US":["how many; how much"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.desyat","status":"draft","forms":[{"text":"десять","is_primary":true}],"readings":[{"text":"де́сять","script":"cyrillic"}],"glosses":{"en-US":["ten (10)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.odinnadtsat","status":"draft","forms":[{"text":"одиннадцать","is_primary":true}],"readings":[{"text":"оди́ннадцать","script":"cyrillic"}],"glosses":{"en-US":["eleven (11)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.dvenadtsat","status":"draft","forms":[{"text":"двенадцать","is_primary":true}],"readings":[{"text":"двена́дцать","script":"cyrillic"}],"glosses":{"en-US":["twelve (12)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.trinadtsat","status":"draft","forms":[{"text":"тринадцать","is_primary":true}],"readings":[{"text":"трина́дцать","script":"cyrillic"}],"glosses":{"en-US":["thirteen (13)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.sorok","status":"draft","forms":[{"text":"сорок","is_primary":true}],"readings":[{"text":"со́рок","script":"cyrillic"}],"glosses":{"en-US":["forty (40)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.anton","status":"draft","forms":[{"text":"Антон","is_primary":true}],"readings":[{"text":"Анто́н","script":"cyrillic"}],"glosses":{"en-US":["Anton (given name)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.mariya","status":"draft","forms":[{"text":"Мария","is_primary":true}],"readings":[{"text":"Мари́я","script":"cyrillic"}],"glosses":{"en-US":["Maria (given name)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.angliya","status":"draft","forms":[{"text":"Англия","is_primary":true}],"readings":[{"text":"А́нглия","script":"cyrillic"}],"glosses":{"en-US":["England"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.italiya","status":"draft","forms":[{"text":"Италия","is_primary":true}],"readings":[{"text":"Ита́лия","script":"cyrillic"}],"glosses":{"en-US":["Italy"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.ispaniya","status":"draft","forms":[{"text":"Испания","is_primary":true}],"readings":[{"text":"Испа́ния","script":"cyrillic"}],"glosses":{"en-US":["Spain"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.ulitsa","status":"draft","forms":[{"text":"улица","is_primary":true}],"readings":[{"text":"у́лица","script":"cyrillic"}],"glosses":{"en-US":["street"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.kvartira","status":"draft","forms":[{"text":"квартира","is_primary":true}],"readings":[{"text":"кварти́ра","script":"cyrillic"}],"glosses":{"en-US":["apartment"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.nomer","status":"draft","forms":[{"text":"номер","is_primary":true}],"readings":[{"text":"но́мер","script":"cyrillic"}],"glosses":{"en-US":["number (identifier)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.pochta","status":"draft","forms":[{"text":"почта","is_primary":true}],"readings":[{"text":"по́чта","script":"cyrillic"}],"glosses":{"en-US":["mail; postal service"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.anketa","status":"draft","forms":[{"text":"анкета","is_primary":true}],"readings":[{"text":"анке́та","script":"cyrillic"}],"glosses":{"en-US":["form; questionnaire"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.shkola","status":"draft","forms":[{"text":"школа","is_primary":true}],"readings":[{"text":"шко́ла","script":"cyrillic"}],"glosses":{"en-US":["school"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.universitet","status":"draft","forms":[{"text":"университет","is_primary":true}],"readings":[{"text":"университе́т","script":"cyrillic"}],"glosses":{"en-US":["university"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.rabota","status":"draft","forms":[{"text":"работа","is_primary":true}],"readings":[{"text":"рабо́та","script":"cyrillic"}],"glosses":{"en-US":["work; job"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.student","status":"draft","forms":[{"text":"студент","is_primary":true}],"readings":[{"text":"студе́нт","script":"cyrillic"}],"glosses":{"en-US":["university student (male)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.studentka","status":"draft","forms":[{"text":"студентка","is_primary":true}],"readings":[{"text":"студе́нтка","script":"cyrillic"}],"glosses":{"en-US":["university student (female)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.elektronnaya-pochta","status":"draft","forms":[{"text":"электронная почта","is_primary":true}],"readings":[{"text":"электро́нная по́чта","script":"cyrillic"}],"glosses":{"en-US":["email (mail service or contact field)"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.grazhdanstvo","status":"draft","forms":[{"text":"гражданство","is_primary":true}],"readings":[{"text":"гра́жданство","script":"cyrillic"}],"glosses":{"en-US":["citizenship"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.data-rozhdeniya","status":"draft","forms":[{"text":"дата рождения","is_primary":true}],"readings":[{"text":"да́та рожде́ния","script":"cyrillic"}],"glosses":{"en-US":["date of birth"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.yazyk","status":"draft","forms":[{"text":"язык","is_primary":true}],"readings":[{"text":"язы́к","script":"cyrillic"}],"glosses":{"en-US":["language"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.lex.personal.professiya","status":"draft","forms":[{"text":"профессия","is_primary":true}],"readings":[{"text":"профе́ссия","script":"cyrillic"}],"glosses":{"en-US":["profession; occupation"]},"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
```

### sentences/entries.jsonl

```jsonl
{"id":"ru.sent.on-ramp.farewell","status":"draft","text":"До свидания!","gloss":"Goodbye!","cloze_targets":["До свидания"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.on-ramp.anna-introduction","status":"draft","text":"Я Анна.","gloss":"I am Anna.","cloze_targets":["Анна"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.on-ramp.read-please","status":"draft","text":"Читайте, пожалуйста.","gloss":"Please read.","cloze_targets":["Читайте"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.on-ramp.repeat-please","status":"draft","text":"Повторите, пожалуйста.","gloss":"Please repeat.","cloze_targets":["Повторите"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.on-ramp.this-is-book","status":"draft","text":"Это книга.","gloss":"This is a book.","cloze_targets":["книга"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.on-ramp.this-is-zero","status":"draft","text":"Это ноль.","gloss":"This is zero.","cloze_targets":["ноль"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.on-ramp.this-is-five","status":"draft","text":"Это пять.","gloss":"This is five.","cloze_targets":["пять"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.a1.u026","status":"draft","text":"Мария из Италии.","gloss":"Maria is from Italy.","cloze_targets":["Италии"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.a1.u027","status":"draft","text":"Мне двадцать лет.","gloss":"I am twenty years old.","cloze_targets":["двадцать"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.a1.u028","status":"draft","text":"Это адрес школы.","gloss":"This is the school's address.","cloze_targets":["школы"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
{"id":"ru.sent.a1.u029","status":"draft","text":"Я студентка из Франции.","gloss":"I am a university student from France. (Female speaker.)","cloze_targets":["студентка"],"sources":["ru-original"],"generation":{"method":"ai-assisted","tool":"GPT-6 Astra Pro","date":"2026-10-04","notes":"ai-drafted; needs dictionary sourcing and human review"}}
```

### assessments/definitions.jsonl

```jsonl
{"id":"ru.assess.on-ramp.cyrillic-recognition","goal_id":"ru.goal.on-ramp.cyrillic","kind":"recognition","modality":"reading","rubric":{"scale":"observed","criteria":["Recognize all 33 printed uppercase/lowercase pairs from letter-name or partner-form prompts without a model.","Distinguish Е/Ё, И/Й and Ь/Ъ; reject Latin lookalikes when a Cyrillic symbol is requested.","Identify the vowel carrying the teaching stress mark and distinguish the mark from an alphabet letter."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.cyrillic-writing","goal_id":"ru.goal.on-ramp.cyrillic","kind":"production","modality":"writing","rubric":{"scale":"observed","criteria":["Copy each of the 66 printed letter forms with the requested case, using Cyrillic rather than Latin characters.","Retain the dots in Ё/ё, the breve in Й/й and the distinction between the two signs.","Copy a supplied vowel-plus-stress-mark sequence without omitting or detaching the accent."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.greetings-recognition","goal_id":"ru.goal.on-ramp.greetings","kind":"recognition","modality":"reading","rubric":{"scale":"observed","criteria":["Match all ten taught greeting and response expressions to their English meanings or written situations.","Distinguish greeting, farewell, thanks, courtesy and yes/no responses."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.greetings-writing","goal_id":"ru.goal.on-ramp.greetings","kind":"production","modality":"writing","rubric":{"scale":"observed","criteria":["Write a taught greeting and farewell from situation cues without copying a displayed Russian model.","Write thanks, a suitable courtesy response and the taught yes/no forms with correct Cyrillic spelling."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.self-introduction-recognition","goal_id":"ru.goal.on-ramp.self-introduction","kind":"recognition","modality":"reading","rubric":{"scale":"observed","criteria":["Match the five taught subject pronouns to their intended reference, including familiar versus polite or plural you.","Recognize both taught names, the name label, the fixed naming question and the first-person introduction."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.self-introduction-writing","goal_id":"ru.goal.on-ramp.self-introduction","kind":"production","modality":"writing","rubric":{"scale":"observed","criteria":["Write a minimal self-introduction using one taught name and either the no-copula pattern or the fixed naming expression.","Write the taught polite naming question without inventing new inflected forms."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.classroom-recognition","goal_id":"ru.goal.on-ramp.classroom","kind":"recognition","modality":"reading","rubric":{"scale":"observed","criteria":["Match the three taught written task instructions and the word/letter labels to their meanings.","Recognize all five taught clarification chunks in a text exchange."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.classroom-writing","goal_id":"ru.goal.on-ramp.classroom","kind":"production","modality":"writing","rubric":{"scale":"observed","criteria":["Write the fixed non-understanding expression and a suitable taught repeat, explain or help request.","Complete the reading and repetition models with the correct taught command and polite expression."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.everyday-recognition","goal_id":"ru.goal.on-ramp.everyday","kind":"recognition","modality":"reading","rubric":{"scale":"observed","criteria":["Match all nine taught person/object nouns and the identification word to their meanings.","Interpret the book-identification model without mistaking это for an agreeing modifier."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.everyday-writing","goal_id":"ru.goal.on-ramp.everyday","kind":"production","modality":"writing","rubric":{"scale":"observed","criteria":["Write the taught book-identification model and another identification using a taught nominative noun.","Keep это unchanged and use correct Cyrillic spelling and sentence punctuation."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.numbers-recognition","goal_id":"ru.goal.on-ramp.numbers","kind":"recognition","modality":"reading","rubric":{"scale":"observed","criteria":["Match each of the ten printed digits 0 through 9 to the corresponding taught Russian number word.","Interpret the supplied identification models for the printed digits 0 and 5 without introducing counted nouns."]},"review_status":"draft"}
{"id":"ru.assess.on-ramp.numbers-writing","goal_id":"ru.goal.on-ramp.numbers","kind":"production","modality":"writing","rubric":{"scale":"observed","criteria":["Write every taught number word from its digit cue and write every digit from its Russian word cue.","Use the taught citation forms; preserve the soft signs and spell four, eight and nine correctly."]},"review_status":"draft"}
{"id":"ru.assess.a1.personal-details-reading","goal_id":"ru.goal.a1.personal-details","kind":"recognition","modality":"reading","rubric":{"scale":"observed","criteria":["Identify names, age, origin, study/work role and labeled contact details in a supplied fictional profile.","Distinguish name, citizenship and country-of-origin fields without inferring one from another.","Interpret the taught question words and the number-year age pattern."]},"review_status":"draft"}
{"id":"ru.assess.a1.personal-details-writing","goal_id":"ru.goal.a1.personal-details","kind":"production","modality":"writing","rubric":{"scale":"observed","criteria":["Complete a fictional profile using the supplied name, role, origin, age and contact tokens.","Use the taught no-copula, genitive-origin and dative-age patterns with appropriate year forms.","Copy provided contact data into correctly labeled fields; do not require real personal information."]},"review_status":"draft"}
```

**Delivered in this response:** A1 units **020–029**, one new goal, **50 new lexical entries**, **6 new grammar concepts**, **4 new sentence records**, and **2 new assessments**. The five shared files above include their earlier records in full; unchanged pack files remain as previously supplied. Pasted markdown

**Cumulative delivered content:** 7 goals, 30 units, 100 lexical entries, 9 grammar concepts, 11 sentences, 67 orthography records, and 14 assessments, extending the supplied on-ramp. Pasted text

**A1 is not yet fully emitted:** units **030–109** and their supporting records remain pending. My progress updates described checks on the larger working draft, not the amount delivered here; this response contains only the first complete A1 cluster. That is a deviation from the requested whole-band-per-response schedule. The real `langpack` gates have **not** been run, and the inherited source-URN compatibility question remains unresolved.