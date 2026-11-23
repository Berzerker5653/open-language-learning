/**
 * FEEL-PROGRESS-001 — the one shared instrument bar.
 *
 * Both `.dim-progress` sites (goal-dimension bars in home.tsx, band-retention
 * bars in memory-stats.tsx) render through DimProgress so the mock's motion
 * legend lands identically on both: the fill rect grows from the value LAST
 * SHOWN for this keyId (zero on the first visit) to the current value over
 * `--dur-glide` ease-out — `@keyframes dim-glide` reads the `--fill-from`
 * custom property the component sets from a module-level last-shown map.
 * CSS width on `<rect>` is a geometry property (Chromium/Firefox support
 * it); browsers without it keep the attribute width — honest data, just no
 * motion. Class names, `data-progress-pct`, and the exact role=progressbar
 * aria semantics both sites had are unchanged; SSR-safe (no effects).
 */
import type { CSSProperties } from "react";

const BAR_W = 120;
const lastShown = new Map<string, number>();

function fillPx(pct: number): number {
  return (BAR_W * Math.min(100, Math.max(0, pct))) / 100;
}

export function DimProgress({
  pct,
  keyId,
  ariaLabel,
}: {
  pct: number;
  /** Stable identity for "the value this bar last showed" (survives remounts
   *  within the session; the glide then starts from there, per the mock). */
  keyId: string;
  ariaLabel: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  const prev = lastShown.get(keyId);
  lastShown.set(keyId, clamped);
  return (
    <svg
      className="dim-progress"
      width={BAR_W}
      height="8"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      data-progress-pct={clamped}
    >
      <rect className="dim-progress-track" width={BAR_W} height="8" rx="4" />
      <rect
        className="dim-progress-fill"
        style={{ "--fill-from": `${prev === undefined ? 0 : fillPx(prev)}px` } as CSSProperties}
        width={fillPx(clamped)}
        height="8"
        rx="2"
      />
    </svg>
  );
}
