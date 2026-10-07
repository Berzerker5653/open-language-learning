# AI screening handoff packet (2026-10-05)

You (the human) are asked to run this packet through a cloud LLM that the
project agent cannot access (e.g. ChatGPT, Claude, Gemini). It is the second
independent model pass required by the project's review policy
(`languages/*/review/REVIEW_POLICY.yaml` §ai_screening: ">=2 distinct model
families, run independently"). The first pass was run by the project agent's
own model; your cloud model is the independent second family.

## What this is

Two language-learning content packs (Japanese `ja-JP`, Russian `ru-RU`)
contain ~9,500 AI-drafted items: dictionary entries, example sentences, and
assessment rubrics. Nothing here is published; all content is labeled draft
and awaits human review. This screening pass flags clear defects to
prioritize human reviewer time. It is NOT a publication decision.

## How to run it

1. Open a chat with the cloud model. Paste the contents of `CONTEXT.md`
   first (scene-setting), then the matching prompt from `PROMPTS.md`.
2. Feed batches: paste one `batches/batch-NNNN-*.json` file's `items` list
   (or several small ones) and ask for the verdict JSON in the exact format
   from `PROMPTS.md`. ~25 items per request works well.
3. Save the model's JSON verdicts. One output line per batch, format in
   `results/EXAMPLE-model-b.jsonl`. Name files `model-b-01.jsonl`,
   `model-b-02.jsonl`, ...
4. Record which model you used (exact name + version/date) in each line's
   `model_id`/`model_version` fields.
5. When done (all 433 batches), drop the `model-b-*.jsonl` files back into
   the repo at `docs/review/ai-screening-2026-10-05/` and tell the agent.
   The agent merges: items both models pass advance to `review-needed`
   (still unreviewed); items either model flags stay `draft` and enter the
   human reviewer queue. AI verdicts never certify content.

Practical notes:
- 433 batches ≈ 10-15 chat sessions. Keep the same system prompt per kind
  (lexicon / sentences / assessments) — the batch file's `kind` field says
  which prompt to use.
- If the model refuses or produces malformed JSON, note the batch_id and
  skip; skipped items simply stay `draft` (no harm).
- Optional deeper pass: `QUALITATIVE.md` has open-ended questions on a
  sample — useful "views on the whole thing" beyond flagging.

## Privacy/licensing

Pack content is CC0/original project content; nothing sensitive. Do NOT
paste anything outside this packet into the cloud chat.
