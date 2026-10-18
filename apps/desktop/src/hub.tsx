/**
 * K-81 (owner decision A, 2026-10-10): the Practice hub. Five top-level
 * destinations; the self-directed practice modes live behind one hub
 * instead of one tab each. The routes themselves are unchanged — the hub
 * only changes how a learner reaches them. Copy stays honest: modes note
 * what is formative vs scored, matching each route's own framing.
 */

import { PackText } from "@openlang/ui";
import type { PackUpdate } from "./home";

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
    // I03: the card says what the screen actually asks. This mode is
    // read-aloud recognition; listen-and-type dictation is a separate
    // practice task, so nothing here may blur the two.
    id: "dictation",
    label: "Speaking",
    blurb: "Read a sentence aloud and see what the local model heard. Guided: nothing is graded.",
  },
  {
    // I03: the promise matches the check — a written answer compared with the
    // form the pack expects, never an open-ended composition with corrections.
    id: "writing",
    label: "Writing",
    blurb: "Write the answer the pack asks for; a miss shows the form it expected.",
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

export function PracticeHub({
  onOpen,
  kanjiAvailable = true,
  updates = [],
  onOpenLanguagePacks,
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
}) {
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
              <PackText tag="strong">{u.display_name}</PackText> version{" "}
              {u.installed_version} is on this device. The pack catalogue lists version{" "}
              {u.available_version}.
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
            <span className="meta"> — {m.blurb}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
