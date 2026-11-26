/**
 * PROGRESS-STATS-001 (market audit U7/U14): the memory stats strip that
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
 *
 * FEEL-PROGRESS-001: the calendar's 84 cells are no longer anonymous —
 * each carries a date + summary label, is reachable by keyboard, scales
 * 1.15x on hover/focus with a teal ring, and opens a dark tip chip
 * (date · summary) so density is shape + text, never color alone. Bars
 * and cells fill in on arrival (dim-glide / cal-in) instead of snapping.
 */
import { useState } from "react";
import type { CSSProperties } from "react";
import { bandHeader } from "./home";
import { DimProgress } from "./dim-progress";
import { EmptyGlyph } from "./empty-state";

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

/** "Nov 20" — the mock's tip/label date voice, deterministic in UTC. */
function calDayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** The text half of "shape + text, never color alone" (FEEL-PROGRESS-001). */
function daySummary(events: number): string {
  return events === 0 ? "no practice" : `${events} ${events === 1 ? "exercise" : "exercises"}`;
}

/**
 * 12-week activity calendar: one column per week (Sunday first), one row
 * per weekday, one cell per UTC day the window covers. Days with no events
 * render as empty cells. The whole chart carries a summary group label AND
 * (FEEL-PROGRESS-001) every in-window cell carries its own
 * "<date> · <summary>" aria-label and is tab-reachable; hover/focus/tap
 * scales the cell and fades in a tip chip with the same text. Cells fill
 * in on arrival with a capped stagger (cal-in).
 */
export function ActivityCalendar({ days, today }: { days: ActivityDay[]; today?: string }) {
  const [tip, setTip] = useState<{
    date: string;
    events: number;
    left: number;
    top: number;
  } | null>(null);
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
  const showTip = (c: number, r: number, cell: { date: string; events: number }) =>
    setTip({
      date: cell.date,
      events: cell.events,
      // cell center under the cell: 14px grid, 11px cell
      left: c * 14 + 5.5,
      top: r * 14 + 14 + 6,
    });
  return (
    <div
      className="memory-calendar"
      role="group"
      aria-label={`Activity calendar, last ${WEEKS} weeks: ${activeDays} active ${activeDays === 1 ? "day" : "days"}, busiest day ${busiest} ${busiest === 1 ? "exercise" : "exercises"}`}
    >
      <svg width={columns.length * 14} height={7 * 14}>
        {columns.map((week, c) =>
          week.map((cell, r) => {
            if (!cell.inWindow) return null;
            // Lightness speaks volume, not color: events 1..n map to a
            // bounded set of fill levels so contrast never depends on a
            // hue pair. FEEL-PROGRESS-001 adds the text half: the cell is
            // labeled and reachable, and hover/focus/tap opens the tip.
            const level =
              cell.events === 0 ? 0 : Math.min(4, 1 + Math.ceil(Math.log2(cell.events)));
            return (
              <rect
                key={`${cell.date}`}
                className={`memory-cal-cell memory-cal-cell--${level}`}
                role="img"
                aria-label={`${calDayLabel(cell.date)} · ${daySummary(cell.events)}`}
                tabIndex={0}
                data-date={cell.date}
                data-events={cell.events}
                x={c * 14}
                y={r * 14}
                width={11}
                height={11}
                rx={2}
                style={{ "--cell-i": String(Math.min(40, c * 7 + r)) } as CSSProperties}
                onPointerEnter={() => showTip(c, r, cell)}
                onPointerLeave={() => setTip(null)}
                onFocus={() => showTip(c, r, cell)}
                onBlur={() => setTip(null)}
              />
            );
          }),
        )}
      </svg>
      {tip ? (
        <div
          className="memory-cal-tip"
          role="tooltip"
          style={{ left: `${tip.left}px`, top: `${tip.top}px` }}
        >
          {calDayLabel(tip.date)} · {daySummary(tip.events)}
        </div>
      ) : null}
      <p className="meta">
        <small>
          {activeDays} of the last {WEEKS * 7} days had practice.
        </small>
      </p>
    </div>
  );
}

export function ProgressZeroState({ onStart }: { onStart?(): void }) {
  // FEEL-PROGRESS-001: the mock's FRESH PROFILE card. Honest by
  // construction — App renders it ONLY when the engine's own lifetime
  // facts (learning_facts) report zero days active AND zero units done,
  // so it can never contradict a learner who has studied and merely has
  // an empty 12-week window. No invented streak, no fake history; the
  // copy points at the Today tab.
  // EMPTY-STATES-001: the ring is now a designed line-art glyph in the
  // serif identity (not a stray CSS circle), and the card carries the one
  // honest affordance: the Today tab, the tab that starts a session.
  return (
    <section
      aria-label="Progress not started"
      className="progress-zero"
      data-testid="progress-zero"
    >
      <EmptyGlyph kind="ring" />
      <p className="progress-zero-lead">Nothing studied yet</p>
      <p className="meta">
        your first session is on <strong>Today</strong>
      </p>
      {onStart ? (
        <button type="button" className="btn btn--quiet progress-zero-action" onClick={onStart}>
          Start your first session
        </button>
      ) : null}
    </section>
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
                    <DimProgress
                      pct={b.retention_pct}
                      keyId={`retention:${b.band}`}
                      ariaLabel={`Band ${header.label}: about ${b.retention_pct}% of ${b.scheduled_items} scheduled ${b.scheduled_items === 1 ? "item is" : "items are"} still retrievable right now`}
                    />
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
