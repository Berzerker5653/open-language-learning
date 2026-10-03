/**
 * UX-002 home + progress views. Presentational: the plan comes from the
 * scheduler-backed planner (due reviews, weak skills, progression) —
 * never a trivial queue, and no streak/attendance surface anywhere
 * (ADR-0002).
 */

export interface PlannedItem {
  item_id: string;
  content_id: string;
  modality: string;
  reason: "due-review" | "weak-skill" | "progression";
  est_seconds: number;
}

export interface SessionPlan {
  items: PlannedItem[];
  total_seconds: number;
  budget_minutes: number;
  seed: number;
  planner_version: string;
}

export const BUDGET_PRESETS = [5, 10, 20, 30];

const REASON_LABELS: Record<PlannedItem["reason"], string> = {
  "due-review": "Due for review",
  "weak-skill": "Strengthen a weak spot",
  progression: "New material",
};

export interface HomeProps {
  displayName: string;
  plan: SessionPlan;
  activeBudget: number;
  onBudget(minutes: number): void;
}

export function Home(p: HomeProps) {
  return (
    <section aria-label="Practice">
      <h1>Hi {p.displayName} — what to practice now</h1>
      <div role="group" aria-label="Time budget">
        {BUDGET_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={p.activeBudget === m}
            onClick={() => p.onBudget(m)}
          >
            {m} min
          </button>
        ))}
      </div>
      <p>
        {p.plan.items.length} activities · about {Math.round(p.plan.total_seconds / 60)} minutes
      </p>
      {p.plan.items.length === 0 ? (
        <p>Nothing is due right now. Come back when reviews are due, or explore new material.</p>
      ) : (
        <ul>
          {p.plan.items.map((item) => (
            <li key={item.item_id}>
              <span>{REASON_LABELS[item.reason]}</span> — <code>{item.content_id}</code> (
              {item.modality}, ~{item.est_seconds}s)
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface ProgressRow {
  content_id: string;
  dimension: string;
  state: string;
  confidence: number;
  needs_refresh: boolean;
}

export function ProgressView({ rows }: { rows: ProgressRow[] }) {
  const byContent = new Map<string, ProgressRow[]>();
  for (const row of rows) {
    const list = byContent.get(row.content_id) ?? [];
    list.push(row);
    byContent.set(row.content_id, list);
  }
  return (
    <section aria-label="Progress">
      <h1>Capability progress</h1>
      <p>Each skill grows independently — reading does not imply speaking.</p>
      {rows.length === 0 ? (
        <p>No evidence yet. Practice to see capability differences here.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Content</th>
              <th>Dimension</th>
              <th>State</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {[...byContent.entries()].map(([content, list]) =>
              list.map((row) => (
                <tr key={`${content}#${row.dimension}`}>
                  <td>
                    <code>{content}</code>
                  </td>
                  <td>{row.dimension}</td>
                  <td>
                    {row.state}
                    {row.needs_refresh ? " (needs refresh)" : ""}
                  </td>
                  <td>{Math.round(row.confidence * 100)}%</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
