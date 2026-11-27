/**
 * K-81 (owner decision A, 2026-10-10): the Practice hub. Five top-level
 * destinations; the self-directed practice modes live behind one hub
 * instead of one tab each. The routes themselves are unchanged — the hub
 * only changes how a learner reaches them. Copy stays honest: modes note
 * what is formative vs scored, matching each route's own framing.
 */

import { PackText } from "@openlang/ui";
import type { PackUpdate } from "./home";
import { EmptyState } from "./empty-state";

export type HubMode =
  | "pronunciation"
  | "dictation"
  | "free-speaking"
  | "writing"
  | "scenarios"
  | "shadowing"
  | "reading"
  | "kanji"
  | "placement";

/**
 * SESSION-CHROME-001 (U3 acceptance): the graded/formative distinction is a
 * badge on the mode card, not prose the learner has to parse out of a
 * blurb. `graded` means the screen returns an explicit right/wrong verdict
 * for answers; `formative` means it gives feedback without a verdict and
 * no scoring language. Each entry matches what that route actually does.
 */
export type ModeGradeKind = "graded" | "formative";

export const HUB_MODES: {
  id: HubMode;
  label: string;
  blurb: string;
  gradeKind: ModeGradeKind;
}[] = [
  {
    id: "pronunciation",
    label: "Pronunciation",
    blurb: "Hear the difference between similar words; guided feedback on your attempts.",
    gradeKind: "formative",
  },
  {
    // I03: the card says what the screen actually asks. This mode is
    // read-aloud recognition; listen-and-type dictation is a separate
    // practice task, so nothing here may blur the two.
    id: "dictation",
    label: "Speaking",
    blurb: "Read a sentence aloud and see what the local model heard. Guided: nothing is graded.",
    gradeKind: "formative",
  },
  {
    // SPEAK-PRACTICE-001: free-speaking is the guided sibling of Speaking —
    // a prompt from the lesson pool, a free attempt, and per-word coloring
    // from the whisper.cpp aligner. Coaching only; the card says so.
    id: "free-speaking",
    label: "Free speaking",
    blurb:
      "Say the sentence aloud and see which words came through, word by word. Guided: nothing is graded.",
    gradeKind: "formative",
  },
  {
    // I03: the promise matches the check — a written answer compared with the
    // form the pack expects, never an open-ended composition with corrections.
    id: "writing",
    label: "Writing",
    blurb: "Write the answer the pack asks for; a miss shows the form it expected.",
    gradeKind: "graded",
  },
  {
    id: "scenarios",
    label: "Scenarios",
    blurb: "Guided conversations with support and recovery moves.",
    // The engine judges each scenario step and the transfer attempt, so the
    // card says what the screen does instead of leaving it implicit.
    gradeKind: "graded",
  },
  {
    id: "shadowing",
    label: "Shadowing",
    blurb: "Speak along with model audio. Formative: nothing is scored or saved.",
    gradeKind: "formative",
  },
  {
    id: "reading",
    // U3 honesty: "graded" here used to mean level-matched, which reads as
    // scoring on a formative card. Say what it means and badge the kind.
    label: "Reading",
    blurb: "Stories matched to your level, with tap-to-look-up words. Formative.",
    gradeKind: "formative",
  },
  {
    id: "kanji",
    label: "Kanji",
    blurb: "Meaning and reading drills for kanji you have met.",
    gradeKind: "graded",
  },
  {
    id: "placement",
    label: "Placement",
    blurb: "Optional low-stakes check of what you already know.",
    gradeKind: "graded",
  },
];

export function PracticeHub({
  onOpen,
  kanjiAvailable = true,
  updates = [],
  onOpenLanguagePacks,
  noPack = false,
}: {
  onOpen(mode: HubMode): void;
  /**
   * I03: a mode is only advertised when the active pack can actually run it.
   * Kanji drills come from the pack's own orthography data, so a pack that
   * teaches no kanji must not offer the card at all.
   */
  kanjiAvailable?: boolean;
  /// PACK-UPDATE-UX-001: installed packs the pack catalogue lists at a different
  /// version, from the same derivation App.tsx feeds Home and Settings. Empty
  /// means the app and the catalogue agree, and the hub stays silent.
  updates?: PackUpdate[];
  onOpenLanguagePacks?(): void;
  /// EMPTY-STATES-001: no pack is active, so every mode would fail its own
  /// pack read. Show the designed empty state instead of offering cards
  /// that cannot run — one state, one way out.
  noPack?: boolean;
}) {
  if (noPack) {
    return (
      <section aria-label="Practice modes">
        <h1>Practice</h1>
        <EmptyState
          glyph="compass"
          title="No language pack is active, so there is nothing to practice yet."
          copy="Choose a language pack first — every practice mode builds from one."
          actionLabel="Choose a pack"
          onAction={onOpenLanguagePacks}
          dataTestId="hub-empty"
        />
      </section>
    );
  }
  const modes = HUB_MODES.filter((m) => m.id !== "kanji" || kanjiAvailable);
  return (
    <section aria-label="Practice modes">
      <h1>Practice</h1>
      <p className="empty">
        The guided path is on Today. These are the self-directed modes — pick whichever you feel
        like; each keeps its own honesty about what is scored and what is not.
      </p>
      {updates.length > 0 ? (
        <div className="notice pack-updates" role="status">
          {updates.map((u) => (
            <p key={u.pack_id} className="pack-version">
              <PackText tag="strong">{u.display_name}</PackText> version {u.installed_version} is on
              this device. The pack catalogue lists version {u.available_version}.
            </p>
          ))}
          {onOpenLanguagePacks ? (
            <button type="button" className="btn btn--quiet" onClick={onOpenLanguagePacks}>
              Review pack updates
            </button>
          ) : null}
        </div>
      ) : null}
      <ul className="pack-list">
        {modes.map((m) => (
          <li key={m.id}>
            <button type="button" className="btn" onClick={() => onOpen(m.id)}>
              {m.label}
            </button>
            <span
              className={`mode-grade-badge mode-grade-badge--${m.gradeKind}`}
              data-grade-kind={m.gradeKind}
            >
              {m.gradeKind === "graded" ? "Graded" : "Formative"}
            </span>
            <span className="meta"> — {m.blurb}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
