/**
 * SESSION-CHROME-001 (market audit U3): the thin in-session chrome that
 * rides every activity route while a bounded session is running — a slim
 * progress bar, an "n of N" step count, and a remaining-time estimate.
 *
 * Honesty rules, mirroring the session panel's contract in home.tsx:
 * - `total` is the queue snapshot taken when the session began, so the
 *   count never drifts under the learner when the plan re-plans.
 * - The time estimate comes from the engine's own per-item `est_seconds`
 *   (docs/01: the planner already prices every activity). An absent
 *   estimate renders NO time at all — never a fabricated number.
 * - No XP, streak, streak-guilt, or reward language anywhere (ADR-0002).
 */

export interface SessionChromeProps {
  /** Activities finished so far in this session. */
  done: number;
  /** Snapshot size fixed when the session began. */
  total: number;
  /**
   * Engine-estimated seconds still to work (remaining planned items,
   * including the one currently open). Null when the engine has not
   * priced the rest — the chrome then shows no time figure.
   */
  remainingSeconds: number | null;
  status?: "running" | "paused";
}

/**
 * SESSION-TIMER-001: the seconds still to work in a session queue, from
 * `index` (the open item included) to the end. The engine prices every
 * planned item, so the header's estimate is that price summed — the whole
 * queue at the first question, the rest as the session advances. An
 * unpriced queue derives to 0, and `remainingTimeLabel` then hides the
 * label rather than printing "0 min left".
 */
export function remainingPlanSeconds(
  items: readonly { est_seconds: number }[],
  index: number,
): number {
  return items.slice(Math.max(0, index)).reduce((s, it) => s + it.est_seconds, 0);
}

/**
 * "~X min left" from an engine estimate. A zero/unknown estimate renders
 * nothing rather than promising "0 minutes"; any positive estimate rounds
 * to whole minutes with a floor of 1, and is marked as an estimate.
 */
export function remainingTimeLabel(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  return `~${Math.max(1, Math.round(seconds / 60))} min left`;
}

/**
 * FEEL-DRILL-001: per-question step dots for the EMBEDDED runners — the
 * placement quiz and the kanji drill — whose position state (question
 * index, drill stage) App already tracks but never rendered. A quiet row
 * of pips: done marked, current marked. This is position, not score —
 * the same honesty posture as the session bar: no XP, no streak, no
 * reward language anywhere (ADR-0002). A single-step runner renders no
 * dots at all: one pip says nothing and only adds noise.
 */
export interface StepDotsProps {
  /** Steps in this runner (questions, or drill stages). */
  total: number;
  /** Zero-based index of the step the learner is in. */
  current: number;
  /** Plain-language name for the screen reader label, e.g. "Placement question". */
  label: string;
}

export function StepDots({ total, current, label }: StepDotsProps) {
  if (total < 2) return null;
  const step = Math.min(Math.max(0, current) + 1, total);
  return (
    <div
      className="step-dots"
      data-step-dots
      role="img"
      aria-label={`${label} ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={
            i === current
              ? "step-dot step-dot--current"
              : i < current
                ? "step-dot step-dot--done"
                : "step-dot"
          }
        />
      ))}
    </div>
  );
}

export function SessionChrome(p: SessionChromeProps) {
  if (p.total <= 0) return null;
  const done = Math.min(p.done, p.total);
  const pct = Math.round((done / p.total) * 100);
  // The step the learner is in right now; once everything is done the
  // counter parks at N of N rather than promising an N+1th step.
  const step = Math.min(done + 1, p.total);
  const remaining = remainingTimeLabel(p.remainingSeconds);
  return (
    <div className="session-chrome" data-session-chrome aria-label="Session progress">
      <div
        className="session-bar"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={p.total}
        aria-label={`${done} of ${p.total} activities done`}
      >
        <span className="session-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="session-chrome-meta">
        {p.status === "paused" ? "Session paused — " : ""}
        {step} of {p.total}
        {remaining ? ` · ${remaining}` : ""}
      </p>
    </div>
  );
}
