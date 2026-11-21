// @vitest-environment happy-dom
/**
 * IN-APP-IME-001 phase 2: the conversion cycle of the input layer. Enter
 * commits the romaji buffer (phase-1 semantics unchanged) AND arms
 * conversion for the kana run just written; SPACE cycles that run through
 * its candidates and back to the kana; a failing or empty lookup never
 * hijacks the field. Candidates arrive through the caller-supplied lookup
 * (the engine's `ime_candidates` command — pack lexicon with provenance);
 * the gate that rules the lookup out lives in App/ime.ts and is pinned in
 * ime.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useKanaIME, type KanaIME } from "./kana-ime";
import type { ImeCandidate } from "./ime-candidates";

// React 19's act() requires the act-environment flag on the global.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const NEKO = "\u306d\u3053"; // kana for "cat" (escapes on purpose: engine
const NEKO_KANJI = "\u732b"; // sources and their tests stay free of raw CJK)

function packCandidate(text: string, entryId: string): ImeCandidate {
  return {
    text,
    reading: NEKO,
    gloss: "cat",
    source: "pack",
    entry_id: entryId,
    attribution: null,
  };
}

type Harness = {
  ime(): KanaIME;
  value(): string;
  press(k: string): React.KeyboardEvent<HTMLInputElement> & {
    preventDefault: ReturnType<typeof vi.fn>;
  };
  mount(candidates?: (kana: string) => Promise<ImeCandidate[]>): Promise<() => Promise<void>>;
};

function makeHarness(): Harness {
  let imeRef!: KanaIME;
  let valueRef = "";
  let root: Root | null = null;
  function Comp(props: { candidates?: (kana: string) => Promise<ImeCandidate[]> }) {
    const [v, setV] = useState("");
    valueRef = v;
    imeRef = useKanaIME({
      enabled: true,
      value: v,
      onDraft: setV,
      candidates: props.candidates,
    });
    return null;
  }
  return {
    ime: () => imeRef,
    value: () => valueRef,
    press: (k) =>
      ({
        key: k,
        preventDefault: vi.fn(),
        nativeEvent: { isComposing: false },
      }) as unknown as React.KeyboardEvent<HTMLInputElement> & {
        preventDefault: ReturnType<typeof vi.fn>;
      },
    async mount(candidates) {
      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(<Comp candidates={candidates} />));
      return async () => {
        await act(async () => root!.unmount());
      };
    },
  };
}

async function typeAll(h: Harness, letters: string) {
  for (const ch of letters) {
    await act(async () => h.ime().onKeyDown(h.press(ch)));
  }
}

describe("lexicon-backed conversion cycle (IN-APP-IME-001 phase 2)", () => {
  it("typing still commits to kana on Enter; the lookup answers that exact run", async () => {
    const h = makeHarness();
    const lookup = vi.fn(async (kana: string) =>
      kana === NEKO ? [packCandidate(NEKO_KANJI, "ja.lex.fixture.neko")] : [],
    );
    const unmount = await h.mount(lookup);
    await typeAll(h, "neko");
    await act(async () => h.ime().onKeyDown(h.press("Enter")));
    // Phase-1 semantics unchanged: the field holds exactly the kana run,
    // and the candidate lookup was asked about exactly that run.
    expect(h.value()).toBe(NEKO);
    expect(lookup).toHaveBeenCalledWith(NEKO);
    await unmount();
  });

  it("Space cycles kana -> candidate -> kana, with provenance readable", async () => {
    const h = makeHarness();
    const lookup = vi.fn(async () => [packCandidate(NEKO_KANJI, "ja.lex.fixture.neko")]);
    const unmount = await h.mount(lookup);
    await typeAll(h, "neko");
    await act(async () => h.ime().onKeyDown(h.press("Enter")));
    // The lookup answered with one pack candidate; the field still shows
    // the kana until the learner cycles.
    expect(h.value()).toBe(NEKO);
    expect(h.ime().conversionLabel()).toBeNull();

    await act(async () => h.ime().onKeyDown(h.press(" ")));
    expect(h.value()).toBe(NEKO_KANJI);
    const label = h.ime().conversionLabel();
    expect(label).toContain("pack lexicon");
    expect(label).toContain("ja.lex.fixture.neko");

    // Cycling past the last candidate returns to the plain kana.
    await act(async () => h.ime().onKeyDown(h.press(" ")));
    expect(h.value()).toBe(NEKO);
    expect(h.ime().conversionLabel()).toBeNull();
    await unmount();
  });

  it("Space with no armed conversion is ordinary typing (preventDefault not called)", async () => {
    const h = makeHarness();
    const unmount = await h.mount(undefined);
    const ev = h.press(" ");
    await act(async () => h.ime().onKeyDown(ev));
    expect(ev.preventDefault).not.toHaveBeenCalled();
    await unmount();
  });

  it("a failing lookup never hijacks the field: Space stays ordinary typing", async () => {
    const h = makeHarness();
    const lookup = vi.fn(() => Promise.reject(new Error("engine offline")));
    const unmount = await h.mount(lookup);
    await typeAll(h, "neko");
    await act(async () => h.ime().onKeyDown(h.press("Enter")));
    const ev = h.press(" ");
    await act(async () => h.ime().onKeyDown(ev));
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(h.ime().conversionLabel()).toBeNull();
    expect(h.value()).toBe(NEKO);
    await unmount();
  });

  it("typing past the word disarms the armed conversion", async () => {
    const h = makeHarness();
    const lookup = vi.fn(async () => [packCandidate(NEKO_KANJI, "ja.lex.fixture.neko")]);
    const unmount = await h.mount(lookup);
    await typeAll(h, "neko");
    await act(async () => h.ime().onKeyDown(h.press("Enter")));
    await act(async () => h.ime().onKeyDown(h.press("i")));
    expect(h.ime().conversionLabel()).toBeNull();
    const ev = h.press(" ");
    await act(async () => h.ime().onKeyDown(ev));
    expect(ev.preventDefault).not.toHaveBeenCalled();
    await unmount();
  });
});
