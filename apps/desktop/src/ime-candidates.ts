/**
 * IN-APP-IME-001 phase 2: lexicon-backed conversion candidates.
 *
 * The wire shape of the engine's `ime_candidates` command, mirrored
 * exactly: every candidate carries its provenance — which source answered
 * and (for pack candidates) the content id of the lexicon entry that
 * produced it. Candidates NEVER come from a baked-in word list in the
 * engine: pack lexicon first, then the separately-labeled offline aux
 * slice (which never claims a pack content id — same never-masquerading
 * posture as the reader's WordCardView). Cap and deterministic order are
 * the engine's (IME_CANDIDATE_CAP, lexicon read order); these helpers only
 * format what arrived.
 */
export interface ImeCandidate {
  text: string;
  reading: string | null;
  gloss: string;
  /** "pack" (the active pack's own lexicon) or "aux" (the offline
   * auxiliary slice, clearly labeled and secondary). */
  source: string;
  /** The content id of the lexicon entry that produced this candidate;
   * always null for aux rows — the aux slice owns no pack ids. */
  entry_id: string | null;
  /** Attribution for aux rows only (kaikki.org license line). */
  attribution: string | null;
}

/** The engine's feature id for pack-lexicon-backed candidates, as packs
 * declare it under `capabilities.input_methods`. */
export const LEXICON_CANDIDATES_METHOD_ID = "lexicon-candidates";

/** A human-readable provenance line for the current conversion candidate:
 * what answered, and the pack entry id when there is one. Used for the
 * UI's conversion label, never for behavior branching. */
export function candidateProvenanceLabel(c: ImeCandidate): string {
  const origin =
    c.source === "pack"
      ? c.entry_id !== null
        ? `pack lexicon · ${c.entry_id}`
        : "pack lexicon"
      : c.attribution !== null
        ? `auxiliary lexicon · ${c.attribution}`
        : "auxiliary lexicon";
  const gloss = c.gloss !== "" ? ` · ${c.gloss}` : "";
  return `${c.text} (${origin})${gloss}`;
}
