/**
 * The input-method layer of the in-app kana keyboard (issue #2, phase 1).
 *
 * `useKanaIME` decorates a controlled text input: while the learner's
 * `kana-keyboard` setting is on, single letter keys feed the pure converter
 * in `ime.ts` and the field shows the existing text + kana + a visible
 * pending tail. The layer stands down while an OS IME is composing and
 * always passes through anything that is not a letter, Backspace, Enter, or
 * Escape — `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md` requires that
 * controls and shortcuts never intercept ordinary text entry, and with the
 * setting off the layer is not even mounted into the handler.
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
import { kanaCommit, kanaDisplay } from "./ime";

export interface KanaIME {
  onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void;
  /** Call from the input's `onChange` before forwarding the value: the edit
   * did not come through the layer, so the layer realigns to the new text
   * on the next key rather than trusting a stale buffer. */
  noteExternalEdit(): void;
}

export function useKanaIME(opts: {
  /** The learner's `kana-keyboard` preference, resolved by the caller. */
  enabled: boolean;
  /** The field's current value — the layer only edits what it wrote. */
  value: string;
  onDraft(next: string): void;
}): KanaIME {
  const buffer = useRef("");
  const base = useRef("");
  const lastWritten = useRef("");
  const composing = useRef(false);
  const { enabled, value } = opts;
  const onDraft = opts.onDraft;

  const write = () => {
    const next = base.current + kanaDisplay(buffer.current);
    lastWritten.current = next;
    onDraft(next);
  };

  return {
    onKeyDown(e) {
      if (!enabled) return;
      if (e.nativeEvent.isComposing || composing.current) return;
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
        // Commit the kana into the field. The app never submits on Enter
        // (writing.tsx / practice.tsx grade by button only), so this only
        // finalizes the word — the Anthy muscle memory stays valid.
        e.preventDefault();
        base.current = base.current + kanaCommit(buffer.current);
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
