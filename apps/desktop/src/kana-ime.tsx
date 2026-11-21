/**
 * The input-method layer of the in-app keyboard (issue #2 phase 1,
 * generalized by IME-TOGGLE-UX-001) plus the input-mode bubble pinned to
 * the app chrome.
 *
 * `useKanaIME` decorates a controlled text input: while the learner's
 * in-app keyboard setting names a converter AND the active pack's manifest
 * grants it (resolved in App.tsx via `ime.ts`, and the layer is not even
 * mounted into the handler otherwise), single letter keys feed the pure
 * converter and the field shows the existing text + converted text + a
 * visible pending tail. The layer stands down while an OS IME is composing,
 * stands down for modified keys (the toggle shortcut must never leak a
 * letter into a field), and always passes through anything that is not a
 * letter, Backspace, Enter, or Escape — `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md`
 * requires that controls and shortcuts never intercept ordinary text entry.
 *
 * When the field's value no longer matches what the layer wrote (an OS-IME
 * insertion, a paste, the App clearing a form after Add), the romaji buffer
 * is realigned to the new text and kept as the tail — the layer never
 * overwrites text it did not write, and never disables itself.
 *
 * Enter commits pending kana into the FIELD ONLY: submit stays button-only
 * (the writing/practice contract, ACCESSIBILITY_AUDIT §"no premature
 * submit"). Caret placement mid-text is phase 1 naive: typing appends.
 */
import { useRef } from "react";
import { ROMAJI_KANA_CONVERTER, type ScriptKeyboardConverter } from "./ime";
import type { ImeCandidate } from "./ime-candidates";
import { candidateProvenanceLabel } from "./ime-candidates";

export interface KanaIME {
  onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void;
  /** Call from the input's `onChange` before forwarding the value: the edit
   * did not come through the layer, so the layer realigns to the new text
   * on the next key rather than trusting a stale buffer. */
  noteExternalEdit(): void;
  /** IN-APP-IME-001 phase 2: a human-readable provenance line for the
   * currently selected conversion candidate (`null` while no conversion is
   * armed or the buffer kana is showing) — what the UI renders so the
   * learner can see WHICH source and entry produced the word. */
  conversionLabel(): string | null;
}

/** A run of kana at the end of the text — the span a conversion replaces.
 * Written with code-point escapes: the engine sources stay free of CJK
 * literals (pinned structurally by ime.test.ts). */
const TRAILING_KANA_RUN = /[\u3041-\u30ff\u31f0-\u31ff\u3005/]+$/;

export function useKanaIME(opts: {
  /** The learner's in-app keyboard preference, resolved by the caller:
   * true only when the setting is on AND the active pack's declared
   * scripts grant the converter (pack capability gating). */
  enabled: boolean;
  /** The field's current value — the layer only edits what it wrote. */
  value: string;
  onDraft(next: string): void;
  /** IME-TOGGLE-UX-001: the converter this field types with, resolved from
   * the pack-declared capability. Phase 1 registers only romaji→kana, so
   * callers pass nothing; a future script's keyboard passes its own. */
  converter?: ScriptKeyboardConverter;
  /** IN-APP-IME-001 phase 2: pack-lexicon-backed conversion candidates for
   * a committed kana run, resolved by the caller through the engine's
   * `ime_candidates` command — the caller applies the pack's declared
   * input-method gate and passes undefined when the pack rules the method
   * out. The engine reads the ACTIVE PACK'S OWN LEXICON (with provenance):
   * there is no baked-in word list anywhere in the input path. */
  candidates?: (kana: string) => Promise<ImeCandidate[]>;
}): KanaIME {
  const buffer = useRef("");
  const base = useRef("");
  const lastWritten = useRef("");
  const composing = useRef(false);
  // Conversion state (phase 2): the kana run under conversion, its
  // candidates, and which one (if any) currently stands in the field.
  const convRun = useRef("");
  const convList = useRef<ImeCandidate[]>([]);
  const convIndex = useRef(-1);
  const convSeq = useRef(0);
  const { enabled, value } = opts;
  const onDraft = opts.onDraft;
  const converter = opts.converter ?? ROMAJI_KANA_CONVERTER;

  const write = () => {
    const next = base.current + converter.display(buffer.current);
    lastWritten.current = next;
    onDraft(next);
  };

  const disarmConversion = () => {
    convSeq.current += 1;
    convRun.current = "";
    convList.current = [];
    convIndex.current = -1;
  };

  return {
    onKeyDown(e) {
      if (!enabled) return;
      if (e.nativeEvent.isComposing || composing.current) return;
      // Modified keys belong to shortcuts (e.g. the Ctrl+Shift+K input-mode
      // toggle), never to the buffer: the layer must not swallow them.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (value !== lastWritten.current) {
        // Externally edited (OS IME kana, paste, a form clear): adopt the
        // text as the base and start the buffer fresh. A conversion the
        // layer was holding dies with the edit it no longer describes.
        base.current = value;
        buffer.current = "";
        lastWritten.current = value;
        disarmConversion();
      }
      const k = e.key;
      if (k === "Backspace") {
        if (buffer.current === "") return;
        e.preventDefault();
        buffer.current = buffer.current.slice(0, -1);
        write();
        return;
      }
      if (k === "Enter") {
        if (buffer.current === "") return;
        // Commit the converted text into the field. The app never submits
        // on Enter (writing.tsx / practice.tsx grade by button only), so
        // this only finalizes the word — the muscle memory stays valid.
        e.preventDefault();
        base.current = base.current + converter.commit(buffer.current);
        buffer.current = "";
        lastWritten.current = base.current;
        onDraft(base.current);
        // IN-APP-IME-001 phase 2: arm conversion for the kana run just
        // written. Candidates come from the engine's lexicon lookup —
        // async by design (pack data on disk), so a slow or failing
        // lookup simply never arms: the field keeps its kana.
        if (opts.candidates) {
          const run = TRAILING_KANA_RUN.exec(base.current)?.[0] ?? "";
          if (run !== "") {
            const seq = ++convSeq.current;
            convRun.current = run;
            void opts
              .candidates(run)
              .then((list) => {
                if (seq !== convSeq.current) return; // stale answer
                if (list.length === 0) {
                  disarmConversion();
                  return;
                }
                convList.current = list;
                convIndex.current = -1;
              })
              .catch(() => {
                if (seq === convSeq.current) disarmConversion();
              });
          }
        }
        return;
      }
      if (k === " ") {
        // IN-APP-IME-001 phase 2: SPACE cycles the committed kana run
        // through its pack-lexicon candidates and back. Only while
        // conversion is armed AND the field still ends with that run
        // (typing anything else or an external edit disarms first).
        if (
          convList.current.length === 0 ||
          convRun.current === "" ||
          !base.current.endsWith(
            convIndex.current >= 0 ? convList.current[convIndex.current]!.text : convRun.current,
          )
        ) {
          return;
        }
        e.preventDefault();
        const run = convRun.current;
        const list = convList.current;
        const next = (convIndex.current + 1) % (list.length + 1);
        convIndex.current = next;
        const shown = next === list.length ? run : list[next]!.text;
        base.current = base.current.slice(0, base.current.length - run.length) + shown;
        lastWritten.current = base.current;
        onDraft(base.current);
        return;
      }
      if (k === "Escape") {
        // Escape first retracts an armed conversion back to the plain kana
        // run (a candidate is a proposal, not a commitment), then clears
        // the romaji preedit as before.
        if (convList.current.length > 0 && convIndex.current >= 0) {
          e.preventDefault();
          const run = convRun.current;
          const at = base.current.lastIndexOf(run);
          if (at !== -1) {
            base.current = base.current.slice(0, at) + run + base.current.slice(at + run.length);
            lastWritten.current = base.current;
            onDraft(base.current);
          }
          convIndex.current = -1;
          return;
        }
        if (convList.current.length > 0) disarmConversion();
        if (buffer.current === "") return;
        e.preventDefault();
        buffer.current = "";
        write();
        return;
      }
      // Any other key belongs to ordinary typing: an armed conversion is
      // over, the learner has moved past the word they were converting.
      disarmConversion();
      if (/^[a-zA-Z']$/.test(k)) {
        e.preventDefault();
        buffer.current += k;
        write();
      }
    },
    noteExternalEdit() {
      buffer.current = "";
      lastWritten.current = "";
      disarmConversion();
    },
    conversionLabel() {
      if (convIndex.current < 0 || convIndex.current >= convList.current.length) return null;
      return candidateProvenanceLabel(convList.current[convIndex.current]!);
    },
  };
}

/**
 * IME-TOGGLE-UX-001: the input-mode bubble, pinned to the app chrome and
 * rendered on every in-app screen by App.tsx — only while the active pack
 * declares a script an in-app converter serves. It states the current
 * input mode and clicking it flips the keyboard setting (the same
 * per-profile write Settings performs). The mode text arrives via `label`,
 * composed from the ACTIVE pack's declared script metadata plus converter
 * data — never a language literal — and it lives inside a `role="status"`
 * live region so a mode change announces to screen readers (A11Y-FLOW-001
 * semantics).
 */
export function InputModeBubble(props: {
  /** Whether the in-app keyboard is the active input mode. */
  on: boolean;
  /** The pack-derived mode label, e.g. "romaji → hiragana · katakana". */
  label: string;
  /** Human-readable form of the documented toggle shortcut. */
  shortcutHint: string;
  onToggle(): void;
}) {
  const mode = props.on
    ? `In-app keyboard on: ${props.label}`
    : `System keyboard; in-app ${props.label} is one press away`;
  return (
    <div className="input-mode-bubble" data-testid="input-mode-bubble">
      <button
        type="button"
        className="input-mode-bubble__button"
        aria-pressed={props.on}
        title={`Switch input method (${props.shortcutHint})`}
        onClick={props.onToggle}
      >
        <span
          className="input-mode-bubble__mode"
          role="status"
          aria-live="polite"
          data-testid="input-mode-announcement"
        >
          {mode}
        </span>
      </button>
    </div>
  );
}
