/**
 * UX-002 home + progress views. Presentational: the plan comes from the
 * scheduler-backed planner (due reviews, weak skills, progression), and
 * every item carries the engine's own `kind` so Home can introduce new
 * material before maintenance without deriving anything itself
 * (docs/adr/0020-derived-guidance.md). Never a trivial queue, and no
 * streak/attendance surface anywhere (ADR-0002).
 */

export interface PlannedItem {
  item_id: string;
  content_id: string;
  modality: string;
  reason: "due-review" | "weak-skill" | "progression";
  /** K-66: the engine's own classification of why this item is here —
   * `review` keeps something alive, `introduction` is material the
   * learner has never met. Derived from `reason` on the Rust side
   * (ADR-0020 §1); the UI never re-derives it. */
  kind: "review" | "introduction";
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

/**
 * K-66: the next reachable goal of the active pack's own goal map — the
 * lowest-band entry that is not `locked` (ADR-0020 §1). Null when the
 * active pack declares no goal map: Home then abstains instead of
 * inventing a goal. Every string here is the pack's own display text.
 */
export interface NextGoalView {
  pack_id: string;
  goal_id: string;
  description: string;
  band: string | null;
}

/**
 * K-66: one step of the first-run guidance, from the `first_run_steps`
 * command. Labels are pack display strings only — the engine never
 * names a script or writes an example (ADR-0021 rule 4). The engine
 * returns at most three; the section shows at most three.
 */
export interface FirstRunStep {
  kind: "introduction" | "review" | "practice";
  label: string;
  content_id: string | null;
  goal_id: string | null;
}

export const BUDGET_PRESETS = [5, 10, 20, 30];

const REASON_LABELS: Record<PlannedItem["reason"], string> = {
  "due-review": "Due for review",
  "weak-skill": "Strengthen a weak spot",
  progression: "New material",
};

/**
 * K-66: one plan, two different promises, so it is read in the order
 * ADR-0020 §2 describes — meet something new, then keep what you have.
 * The grouping comes from the engine's own `kind` field, never from a
 * guess made off the reason text.
 */
const KIND_LABELS: Record<FirstRunStep["kind"], string> = {
  introduction: "First look",
  review: "Keep it sticking",
  practice: "Practise it",
};

/** ADR-0020 §2: introduce, then maintain. */
const PLAN_KIND_ORDER: PlannedItem["kind"][] = ["introduction", "review"];

/** ADR-0020 §4: first-run guidance is the first three steps, no more. */
const FIRST_RUN_MAX = 3;

/**
 * D2: every modality the engine has a typed practice runner for must be
 * startable from the plan list, or the training the plan schedules is
 * unreachable. Keep in step with the `matches!` guard in `practice_build`
 * (apps/desktop/src-tauri/src/lib.rs); the verb is what the learner will
 * actually do, so the button says so instead of a generic "Start".
 */
const RUNNABLE_MODALITIES: Record<string, string> = {
  "recall-meaning": "Recall",
  "comprehension-listening": "Listen",
  "phonological-discrimination": "Hear the difference",
  "orthography-recognition": "Recognise the script",
  "production-writing": "Write it",
  "orthographic-encoding": "Type what you hear",
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
  /// Owner 2026-10-07: the active pack is named once on Home with its
  /// pack-level posture statement (derived from the pack's own review
  /// tallies by `packPosture` in language.tsx). Null when no pack is
  /// active or claims have not loaded; nothing is claimed then.
  activePack?: { name: string; posture: string } | null;
  /// K-66: the next reachable goal from the active pack's goal map, as
  /// `home_state` reports it. `undefined` while that call has not
  /// answered; `null` when the pack declares no goal map — Home then
  /// says so plainly rather than inventing a goal (ADR-0020 §4).
  nextGoal?: NextGoalView | null;
  /// K-66: the first-run steps from `first_run_steps`: pack-declared
  /// labels only. Empty, or not loaded yet, renders no section.
  firstRunSteps?: FirstRunStep[];
}

export function Home(p: HomeProps) {
  // The engine returns at most three steps; the section caps them again
  // so the promise ADR-0020 §4 makes — the first three steps — is a
  // rendering guarantee, not a hope about the API.
  const firstRun = (p.firstRunSteps ?? []).slice(0, FIRST_RUN_MAX);
  // `undefined` means home_state has not answered yet, and nothing is
  // claimed; `null` is the engine stating that the active pack declares
  // no goal map at all.
  const declaredGoal = p.nextGoal ?? null;
  const goalBand = declaredGoal?.band ? bandHeader(declaredGoal.band) : null;
  return (
    <section aria-label="Practice">
      <h1>Hi {p.displayName}</h1>
      <p className="prompt">what to practice now</p>
      {p.activePack ? (
        <p className="meta pack-posture">
          <strong>{p.activePack.name}</strong> — {p.activePack.posture}
        </p>
      ) : null}
      {firstRun.length > 0 ? (
        <section aria-label="First steps" className="first-run">
          <h2>Where to begin</h2>
          <p>
            <small>
              From the pack you are learning, in its order — the plan below carries the buttons.
            </small>
          </p>
          <ol className="first-run-list">
            {firstRun.map((step) => (
              <li key={step.goal_id ?? step.content_id ?? step.label}>
                <span className="plan-reason">{KIND_LABELS[step.kind]}</span>
                <span className="first-run-label">{step.label}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
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
        PLAN_KIND_ORDER.map((kind) => {
          const items = p.plan.items.filter((item) => item.kind === kind);
          if (items.length === 0) return null;
          return (
            <section key={kind} className="plan-group" aria-label={KIND_LABELS[kind]}>
              <h2>{KIND_LABELS[kind]}</h2>
              {kind === "introduction" ? (
                <p>
                  <small>Nothing is recorded until you do one of these.</small>
                </p>
              ) : null}
              <ul className="plan-list">
                {items.map((item) => {
                  const verb = RUNNABLE_MODALITIES[item.modality];
                  const label = (
                    <>
                      <span className="plan-reason">{REASON_LABELS[item.reason]}</span>
                      {item.surface ? (
                        <strong className="plan-surface" lang="ja">
                          {item.surface}
                        </strong>
                      ) : (
                        <code>{item.content_id}</code>
                      )}
                      {item.gloss && <span className="plan-gloss">{item.gloss}</span>}
                    </>
                  );
                  return (
                    <li key={item.item_id}>
                      {p.onStart && verb ? (
                        <button
                          type="button"
                          className="plan-item"
                          onClick={() => p.onStart!(item)}
                        >
                          {label}
                          <span className="meta">
                            {verb} · ~{item.est_seconds}s
                          </span>
                        </button>
                      ) : (
                        <>
                          {label}
                          <span className="meta">
                            {item.modality}, ~{item.est_seconds}s
                            {p.onStart ? " — no practice runner for this yet" : ""}
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
      {p.nextGoal === undefined ? null : p.nextGoal === null ? (
        <p className="empty next-goal-none">
          This pack declares no learning path yet. Choose one under Settings → Language packs.
        </p>
      ) : (
        <p className="meta next-goal" data-goal={p.nextGoal.goal_id}>
          Next up: <strong>{p.nextGoal.description}</strong>
          {goalBand ? (
            <span className="meta band-gloss">
              {goalBand.label} — {goalBand.gloss}
            </span>
          ) : null}
        </p>
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
 * K-47: packs band goals with CEFR-style tokens (`A1`, `on-ramp`) because the
 * engine is data-driven (ADR-0002); the tokens themselves are framework
 * vocabulary, so the UI glosses them. The wording paraphrases the CEFR
 * Companion Volume (2020) global scale and reproduces no restricted descriptor
 * text. `on-ramp` is this project's pre-CEFR band and has no CEFR equivalent.
 * An unknown token renders verbatim with its own gloss: a pack must not be
 * able to hide a goal by using a band we have not met.
 *
 * No JLPT equivalence is claimed here — docs/14 forbids implying official JLPT
 * preparation. The JLPT links its own scores to CEFR bands (pass N5 -> A1,
 * pass N4 -> A2) for linguistic/reception skills only; that crosswalk and its
 * source live in docs/assessment/RELEASE_COVERAGE.yaml.
 */
const BAND_HEADERS: Record<string, { label: string; gloss: string }> = {
  "on-ramp": { label: "Getting started", gloss: "first words and routines, with support" },
  a1: { label: "A1", gloss: "familiar everyday expressions, very simple exchanges" },
  a2: { label: "A2", gloss: "familiar routines, everyday exchanges, simple past" },
  b1: { label: "B1", gloss: "most everyday situations, opinions, plans, experiences" },
  b2: { label: "B2", gloss: "complex text, argument, fluent interaction" },
  c1: { label: "C1", gloss: "flexible, well-structured use of the language" },
  c2: { label: "C2", gloss: "precise, nuanced, near-native use" },
  other: { label: "Unlabelled", gloss: "this pack does not band these goals" },
};

function bandHeader(band: string): { label: string; gloss: string } {
  return (
    BAND_HEADERS[band.trim().toLowerCase()] ?? { label: band, gloss: `banded ${band} by the pack` }
  );
}

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
          speaking. Goals open as their prerequisites are met. Band names are reference levels, not
          certificates or exam claims.
        </small>
      </p>
      {goals.length === 0 ? (
        <p className="empty">
          No goals are available yet. Install a language pack to see its goal map.
        </p>
      ) : (
        bands.map((band) => {
          const header = bandHeader(band);
          return (
            <section key={band} data-band={band} aria-label={`Band ${header.label}`}>
              <h2>{header.label}</h2>
              <p className="meta band-gloss">{header.gloss}</p>
              <ul className="goal-list">
                {goals
                  .filter((g) => (g.band ?? "other") === band)
                  // K-79: open-before-locked within a band (stable, so the
                  // pack's own order otherwise stands). Adjacency must never
                  // imply a parent/child relation the pack data does not
                  // declare — every viewer reads a flat list as a tree.
                  .sort((a, b) => Number(a.locked) - Number(b.locked))
                  .map((g) => (
                    <li key={g.id} data-locked={g.locked ? "yes" : "no"}>
                      <strong>{g.description}</strong>
                      {g.locked ? (
                        <span className="badge">locked</span>
                      ) : (
                        <span className="badge badge--open">open</span>
                      )}
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
                          {(() => {
                            const hard = g.prerequisites.filter((p) => p.strength === "hard");
                            const missing = hard.filter((p) => !p.satisfied);
                            const done = hard.length - missing.length;
                            return (
                              <>
                                Grows with ({done} of {hard.length} met):{" "}
                                {missing
                                  .map((p) => `${p.target} (${p.dimension} → ${p.required_state})`)
                                  .join(", ")}
                              </>
                            );
                          })()}
                        </p>
                      )}
                      {!g.assessed && (
                        <p className="meta">No assessment defined for this goal yet.</p>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}
