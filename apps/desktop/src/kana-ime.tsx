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

export interface KanaIME {
  onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void;
  /** Call from the input's `onChange` before forwarding the value: the edit
   * did not come through the layer, so the layer realigns to the new text
   * on the next key rather than trusting a stale buffer. */
  noteExternalEdit(): void;
}

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
}): KanaIME {
  const buffer = useRef("");
  const base = useRef("");
  const lastWritten = useRef("");
  const composing = useRef(false);
  const { enabled, value } = opts;
  const onDraft = opts.onDraft;
  const converter = opts.converter ?? ROMAJI_KANA_CONVERTER;

  const write = () => {
    const next = base.current + converter.display(buffer.current);
    lastWritten.current = next;
    onDraft(next);
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
        // text as the base and start the buffer fresh.
        base.current = value;
        buffer.current = "";
        lastWritten.current = value;
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
        return;
      }
      if (k === "Escape") {
        if (buffer.current === "") return;
        e.preventDefault();
        buffer.current = "";
        write();
        return;
      }
      if (/^[a-zA-Z']$/.test(k)) {
        e.preventDefault();
        buffer.current += k;
        write();
      }
    },
    noteExternalEdit() {
      buffer.current = "";
      lastWritten.current = "";
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
