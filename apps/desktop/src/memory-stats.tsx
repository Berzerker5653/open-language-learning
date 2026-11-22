/**
 * PROGRESS-STATS-001 (visual-ui-audit U7/U14): the memory stats strip that
 * sits above the capability tree — due today, ~minutes, per-band retention,
 * and a 12-week activity calendar.
 *
 * Honesty contract (ADR-0002, docs/03): every figure is this learner's OWN
 * local scheduler and evidence data (n=1), read straight off the engine.
 * The framing is "instrument, not grade": no XP, no streak guilt, no
 * comparison to anyone else, no certificate language. Where the engine
 * abstains (a band with nothing scheduled, an unpriced queue), the strip
 * says there is no data rather than drawing 0.
 *
 * Charts are dependency-free SVG — no chart library is added, and the
 * a11y contract matches SessionChrome's progressbar semantics.
 */

import { bandHeader } from "./home";

export interface BandRetention {
  band: string;
  /** Mean current retrievability of this band's scheduled items, 0-100.
   *  Null means the band has nothing scheduled yet — an abstention. */
  retention_pct: number | null;
  scheduled_items: number;
}

export interface ActivityDay {
  /** UTC calendar day, YYYY-MM-DD. */
  date: string;
  events: number;
}

export interface MemoryStats {
  due_today: number;
  /** Engine-priced review minutes (planner's own per-review estimate). */
  est_minutes: number;
  band_retention: BandRetention[];
  activity_days: ActivityDay[];
}

const DAY_MS = 86_400_000;
const WEEKS = 12;

/**
 * 12-week activity calendar: one column per week (Sunday first), one row
 * per weekday, one cell per UTC day the window covers. Days with no events
 * render as empty cells; the whole chart carries a single summary label
 * (screen readers get the story without 84 anonymous boxes).
 */
export function ActivityCalendar({ days, today }: { days: ActivityDay[]; today?: string }) {
  const counts = new Map(days.map((d) => [d.date, d.events]));
  const end = new Date(`${(today ?? new Date().toISOString()).slice(0, 10)}T00:00:00Z`);
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS);
  // Align the first column to the Sunday of (or before) the window start.
  const firstColumnSunday = new Date(start.getTime() - start.getUTCDay() * DAY_MS);
  const columns: { date: string; inWindow: boolean; events: number }[][] = [];
  for (let col = 0; col < WEEKS + 1; col++) {
    const week: { date: string; inWindow: boolean; events: number }[] = [];
    for (let row = 0; row < 7; row++) {
      const d = new Date(firstColumnSunday.getTime() + (col * 7 + row) * DAY_MS);
      if (d > end) break;
      const iso = d.toISOString().slice(0, 10);
      week.push({
        date: iso,
        inWindow: d >= start,
        events: counts.get(iso) ?? 0,
      });
    }
    if (week.length > 0) columns.push(week);
  }
  const activeDays = days.filter((d) => d.events > 0).length;
  const busiest = days.reduce((m, d) => Math.max(m, d.events), 0);
  return (
    <div
      className="memory-calendar"
      role="group"
      aria-label={`Activity calendar, last ${WEEKS} weeks: ${activeDays} active ${activeDays === 1 ? "day" : "days"}, busiest day ${busiest} ${busiest === 1 ? "exercise" : "exercises"}`}
    >
      <svg width={columns.length * 14} height={7 * 14} role="img" aria-hidden="true">
        {columns.map((week, c) =>
          week.map((cell, r) => {
            if (!cell.inWindow) return null;
            // Lightness speaks volume, not color: events 1..n map to a
            // bounded set of fill levels so contrast never depends on a
            // hue pair.
            const level =
              cell.events === 0 ? 0 : Math.min(4, 1 + Math.ceil(Math.log2(cell.events)));
            return (
              <rect
                key={`${cell.date}`}
                className={`memory-cal-cell memory-cal-cell--${level}`}
                data-date={cell.date}
                data-events={cell.events}
                x={c * 14}
                y={r * 14}
                width={11}
                height={11}
                rx={2}
              />
            );
          }),
        )}
      </svg>
      <p className="meta">
        <small>
          {activeDays} of the last {WEEKS * 7} days had practice.
        </small>
      </p>
    </div>
  );
}

export function MemoryStatsStrip({ stats, today }: { stats: MemoryStats; today?: string }) {
  return (
    <section aria-label="Memory instruments" className="memory-stats" data-memory-stats>
      <h2>Your memory, by the numbers</h2>
      <p className="meta">
        <small>
          All of it is local data from your own practice — one learner&apos;s worth (n=1). These are
          instruments for reading your memory, not a grade or a certificate.
        </small>
      </p>
      <ul className="memory-stats-facts">
        <li data-due-today={stats.due_today}>
          {stats.due_today === 0
            ? "Nothing is due today"
            : `${stats.due_today} ${stats.due_today === 1 ? "card is" : "cards are"} due today`}
          {stats.due_today > 0 && stats.est_minutes > 0
            ? ` · about ${stats.est_minutes} ${stats.est_minutes === 1 ? "minute" : "minutes"} of review`
            : ""}
        </li>
      </ul>
      {stats.band_retention.length > 0 && (
        <div className="memory-retention" role="group" aria-label="Retention by band">
          <h3>How well your scheduled material is holding</h3>
          <ul>
            {stats.band_retention.map((b) => {
              const header = bandHeader(b.band);
              return (
                <li key={b.band} data-band={b.band}>
                  <span className="meta">{header.label}</span>{" "}
                  {b.retention_pct === null ? (
                    <span className="meta">— no scheduled material in this band yet</span>
                  ) : (
                    <svg
                      className="dim-progress"
                      width="120"
                      height="8"
                      role="progressbar"
                      aria-valuenow={b.retention_pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Band ${header.label}: about ${b.retention_pct}% of ${b.scheduled_items} scheduled ${b.scheduled_items === 1 ? "item is" : "items are"} still retrievable right now`}
                      data-progress-pct={b.retention_pct}
                    >
                      <rect className="dim-progress-track" width="120" height="8" rx="4" />
                      <rect
                        className="dim-progress-fill"
                        width={(120 * Math.min(100, Math.max(0, b.retention_pct))) / 100}
                        height="8"
                        rx="2"
                      />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ActivityCalendar days={stats.activity_days} today={today} />
    </section>
  );
}
