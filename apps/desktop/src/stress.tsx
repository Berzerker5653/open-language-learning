/**
 * K-41: stress-mark visibility. Readings that carry U+0301 combining
 * acute accents render with the stressed vowel highlighted. Entirely
 * data-driven: any pack reading with combining stress gets the
 * treatment; packs without stress data render unchanged. The user
 * toggle (auto/on/off) is a display setting only — grading, evidence,
 * and scheduling never consult it.
 */

export type StressMode = "auto" | "on" | "off";

export interface DisplaySettingsView {
  stress_mode: StressMode;
  pack_has_stress: boolean;
}

export function stressEnabled(settings: DisplaySettingsView | null): boolean {
  if (!settings) return false;
  if (settings.stress_mode === "on") return true;
  if (settings.stress_mode === "off") return false;
  return settings.pack_has_stress;
}

/**
 * Split text into runs at U+0301 marks. Each combining mark attaches
 * to the base character before it; that base+mark pair is the
 * highlighted unit. Returns null when nothing is stressed (render the
 * text plainly).
 */
export function stressRuns(text: string): { text: string; stressed: boolean }[] | null {
  const chars = [...text];
  if (!chars.includes("\u0301")) return null;
  const runs: { text: string; stressed: boolean }[] = [];
  let current = "";
  for (const c of chars) {
    if (c === "\u0301") {
      // Attach the mark to the base character immediately before it and
      // highlight that base+mark pair only; everything before the base
      // stays in the plain run. A mark with no base highlights the mark
      // alone.
      const base = current ? [...current].pop()! : "";
      if (base) current = [...current].slice(0, -1).join("");
      if (current) runs.push({ text: current, stressed: false });
      runs.push({ text: base + c, stressed: true });
      current = "";
    } else {
      current += c;
    }
  }
  if (current) runs.push({ text: current, stressed: false });
  return runs;
}

/** Render text with stressed vowel runs wrapped in a highlight span. */
export function StressText({ text }: { text: string }) {
  const runs = stressRuns(text);
  if (!runs) return <>{text}</>;
  return (
    <>
      {runs.map((r, i) =>
        r.stressed ? (
          <span
            key={i}
            className="stress"
            aria-label={`${r.text.replace("\u0301", "")} (stressed)`}
          >
            {r.text}
          </span>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}
