/**
 * K-81 (owner decision A, 2026-10-10): the Practice hub. Five top-level
 * destinations; the self-directed practice modes live behind one hub
 * instead of one tab each. The routes themselves are unchanged — the hub
 * only changes how a learner reaches them. Copy stays honest: modes note
 * what is formative vs scored, matching each route's own framing.
 */

export type HubMode =
  | "pronunciation"
  | "dictation"
  | "writing"
  | "scenarios"
  | "shadowing"
  | "reading"
  | "kanji"
  | "placement";

export const HUB_MODES: { id: HubMode; label: string; blurb: string }[] = [
  {
    id: "pronunciation",
    label: "Pronunciation",
    blurb: "Hear the difference between similar words; guided feedback on your attempts.",
  },
  {
    id: "dictation",
    label: "Speaking",
    blurb: "Listen and type what you hear, one sentence at a time.",
  },
  {
    id: "writing",
    label: "Writing",
    blurb: "Compose with the words you know and get corrections.",
  },
  {
    id: "scenarios",
    label: "Scenarios",
    blurb: "Guided conversations with support and recovery moves.",
  },
  {
    id: "shadowing",
    label: "Shadowing",
    blurb: "Speak along with model audio. Formative: nothing is scored or saved.",
  },
  {
    id: "reading",
    label: "Reading",
    blurb: "Graded stories with tap-to-look-up words. Formative.",
  },
  {
    id: "kanji",
    label: "Kanji",
    blurb: "Meaning and reading drills for kanji you have met.",
  },
  {
    id: "placement",
    label: "Placement",
    blurb: "Optional low-stakes check of what you already know.",
  },
];

export function PracticeHub({ onOpen }: { onOpen(mode: HubMode): void }) {
  return (
    <section aria-label="Practice modes">
      <h1>Practice</h1>
      <p className="empty">
        The guided path is on Today. These are the self-directed modes — pick whichever you feel
        like; each keeps its own honesty about what is scored and what is not.
      </p>
      <ul className="pack-list">
        {HUB_MODES.map((m) => (
          <li key={m.id}>
            <button type="button" className="btn" onClick={() => onOpen(m.id)}>
              {m.label}
            </button>
            <span className="meta"> — {m.blurb}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
