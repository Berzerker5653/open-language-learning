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
  surface?: string | null;
  gloss?: string | null;
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

export interface WorldEnvironment {
  id: string;
  display_name: string;
  unlocked: boolean;
  missing: string[];
}

export interface HomeProps {
  displayName: string;
  plan: SessionPlan;
  activeBudget: number;
  onBudget(minutes: number): void;
  environments?: WorldEnvironment[];
  onStart?(item: PlannedItem): void;
}

export function Home(p: HomeProps) {
  return (
    <section aria-label="Practice">
      <h1>Hi {p.displayName}</h1>
      <p className="prompt">what to practice now</p>
      <div role="group" aria-label="Time budget" className="seg">
        {BUDGET_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            className="seg-btn"
            aria-pressed={p.activeBudget === m}
            onClick={() => p.onBudget(m)}
          >
            {m} min
          </button>
        ))}
      </div>
      <p className="plan-summary">
        {p.plan.items.length} activities · about {Math.round(p.plan.total_seconds / 60)} minutes
      </p>
      {p.plan.items.length === 0 ? (
        <p className="empty">
          Nothing is due right now. Come back when reviews are due, or explore new material.
        </p>
      ) : (
        <ul className="plan-list">
          {p.plan.items.map((item) => (
            <li key={item.item_id}>
              {p.onStart && item.modality === "recall-meaning" && item.surface ? (
                <button type="button" className="plan-item" onClick={() => p.onStart!(item)}>
                  <span className="plan-reason">{REASON_LABELS[item.reason]}</span>
                  <strong className="plan-surface" lang="ja">
                    {item.surface}
                  </strong>
                  {item.gloss && <span className="plan-gloss">{item.gloss}</span>}
                  <span className="meta">~{item.est_seconds}s</span>
                </button>
              ) : (
                <>
                  <span className="plan-reason">{REASON_LABELS[item.reason]}</span>
                  {item.surface ? (
                    <>
                      <strong className="plan-surface" lang="ja">
                        {item.surface}
                      </strong>
                      {item.gloss && <span className="plan-gloss">{item.gloss}</span>}
                    </>
                  ) : (
                    <code>{item.content_id}</code>
                  )}
                  <span className="meta">
                    {item.modality}, ~{item.est_seconds}s
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {p.environments && p.environments.length > 0 && (
        <section aria-label="Environments">
          <h2>Places you can go</h2>
          <p>
            <small>Places open as your capabilities grow — not from activity counts.</small>
          </p>
          <ul className="place-list">
            {p.environments.map((e) => (
              <li key={e.id} data-unlocked={e.unlocked ? "yes" : "no"}>
                <span className="plan-reason">{e.display_name}</span>
                {e.unlocked ? (
                  <span className="badge badge--open">open</span>
                ) : (
                  <>
                    <span className="badge">locked</span>
                    <span className="meta">grows with: {e.missing.join(", ")}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
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
        <p className="empty">No evidence yet. Practice to see capability differences here.</p>
      ) : (
        <div className="table-wrap">
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
                      {row.state}{" "}
                      {row.needs_refresh ? <span className="badge">needs refresh</span> : null}
                    </td>
                    <td>{Math.round(row.confidence * 100)}%</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export interface GoalDimension {
  modality: string;
  state: string;
  exemplar: string | null;
}

export interface GoalPrereq {
  target: string;
  dimension: string;
  required_state: string;
  strength: string;
  satisfied: boolean;
}

export interface GoalCard {
  pack_id: string;
  id: string;
  description: string;
  band: string | null;
  review_status: string | null;
  modalities: string[];
  assessed: boolean;
  locked: boolean;
  prerequisites: GoalPrereq[];
  dimensions: GoalDimension[];
}

const STATE_LABELS: Record<string, string> = {
  unseen: "not started",
  introduced: "introduced",
  supported: "supported",
  independent: "independent",
  flexible: "flexible",
  retained: "retained",
};

/**
 * K-40: goal-level progress map. Goals, bands, prerequisites and
 * dimensions come from installed pack data only — never unit counts,
 * activity counts, dates, or streaks (ADR-0002).
 */
export function GoalMap({ goals }: { goals: GoalCard[] }) {
  const bands: string[] = [];
  for (const g of goals) {
    const b = g.band ?? "other";
    if (!bands.includes(b)) bands.push(b);
  }
  return (
    <section aria-label="Goal map">
      <h1>Capabilities you are building</h1>
      <p>
        <small>
          Each goal grows per modality from what you can actually do — reading does not imply
          speaking. Goals open as their prerequisites are met.
        </small>
      </p>
      {goals.length === 0 ? (
        <p className="empty">
          No goals are available yet. Install a language pack to see its goal map.
        </p>
      ) : (
        bands.map((band) => (
          <section key={band} aria-label={`Band ${band}`}>
            <h2>{band}</h2>
            <ul className="goal-list">
              {goals
                .filter((g) => (g.band ?? "other") === band)
                .map((g) => (
                  <li key={g.id} data-locked={g.locked ? "yes" : "no"}>
                    <strong>{g.description}</strong>
                    {g.locked ? (
                      <span className="badge">locked</span>
                    ) : (
                      <span className="badge badge--open">open</span>
                    )}
                    {g.review_status === "draft" || g.review_status === "review-needed" ? (
                      <span className="badge">draft content</span>
                    ) : null}
                    <ul className="goal-dims">
                      {g.dimensions.map((d) => (
                        <li key={d.modality}>
                          <span className="meta">{d.modality}</span>{" "}
                          <span data-state={d.state}>{STATE_LABELS[d.state] ?? d.state}</span>
                        </li>
                      ))}
                    </ul>
                    {g.locked && (
                      <p className="meta">
                        Grows with:{" "}
                        {g.prerequisites
                          .filter((p) => p.strength === "hard" && !p.satisfied)
                          .map((p) => `${p.target} (${p.dimension} → ${p.required_state})`)
                          .join(", ")}
                      </p>
                    )}
                    {!g.assessed && (
                      <p className="meta">No assessment defined for this goal yet.</p>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
