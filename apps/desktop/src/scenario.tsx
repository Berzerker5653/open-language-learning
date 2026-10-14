/**
 * K-01: scenario sessions in the UI. Presentational: the dialogue graph,
 * accepted intents, recovery branches, support ladder, and transfer
 * variants all come from pack data through the native runtime; the UI
 * never branches on language content.
 */

import { PackText, usePackTextAttrs } from "@openlang/ui";

/** K-75 readiness tier, derived natively from the pack goal map plus
 * derived mastery. The list arrives already ordered by it: playable, then
 * near, then later. */
export type ScenarioReadiness = "playable" | "near" | "later";

/** Why a locked scenario is locked: a capability to practice, a later
 * curriculum stage, or a goal the pack never defines. */
export type ScenarioLockKind = "capability" | "stage" | "undefined_goal";

export interface ScenarioSummaryView {
  scenario_id: string;
  title: string;
  situation?: string | null;
  goal_id: string;
  /** Goal band as the pack's goal map labels it ("on-ramp", "A1", …). */
  goal_band?: string | null;
  readiness: ScenarioReadiness;
  unlocked: boolean;
  locked_reason?: string | null;
  lock_kind?: ScenarioLockKind | null;
  /** What unlocks a locked scenario, one entry per unmet prerequisite. */
  unlocks?: string[];
  /** Set on exactly one row: the scenario to do next. */
  recommended?: boolean;
}

export interface ScenarioNodeView {
  id: string;
  prompt: string;
  actions: string[];
  recovery: { id: string; prompt: string }[];
}

export interface ScenarioView {
  scenario_id: string;
  title: string;
  situation?: string | null;
  node: ScenarioNodeView;
  ladder: { support_level: number; description: string }[];
  transfers: { id: string; description: string; done: boolean }[];
  transfers_required: number;
  support_used: number[];
}

export interface ScenarioStepResult {
  result: "advanced" | "completed" | "not-satisfied";
  recovery: string[];
  completed: boolean;
}

export interface ScenarioOutcomeView {
  nodes_completed: number;
  transfers_completed: number;
  transfer_requirement_met: boolean;
}

export interface ScenarioPanelProps {
  scenarios: ScenarioSummaryView[];
  active: ScenarioView | null;
  lastStep: ScenarioStepResult | null;
  outcome: ScenarioOutcomeView | null;
  error: string | null;
  onStart(id: string): void;
  onAttempt(intent: string): void;
  onSupport(level: number): void;
  onRecovery(id: string): void;
  onTransfer(id: string): void;
  onFinish(): void;
  onBack(): void;
}

/** Gate label for a locked scenario, chosen from the structural lock kind
 * the native side derived from the goal map — never from language content. */
function LockBadge({ kind, band }: { kind?: ScenarioLockKind | null; band?: string | null }) {
  const label =
    kind === "capability"
      ? "practice first"
      : kind === "stage"
        ? "later curriculum stage"
        : kind === "undefined_goal"
          ? "not in this pack yet"
          : null;
  return (
    <>
      {label ? <span className="badge">{label}</span> : null}
      {band ? <span className="badge">stage {band}</span> : null}
    </>
  );
}

export function ScenarioPanel(p: ScenarioPanelProps) {
  const packAttrs = usePackTextAttrs();

  if (p.outcome && !p.active) {
    return (
      <section aria-label="Scenario result">
        <h2>Scenario complete</h2>
        <p aria-live="polite">
          {p.outcome.nodes_completed} exchanges completed · {p.outcome.transfers_completed} of{" "}
          {p.outcome.transfer_requirement_met ? "" : "at least "}
          transfer variant{p.outcome.transfer_requirement_met ? "" : "s"} performed
        </p>
        {!p.outcome.transfer_requirement_met && (
          <p className="notice">
            Transfer variants show you can flex the same capability in a new setting. Try one before
            finishing next time.
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={p.onBack}>
            Back to scenarios
          </button>
        </div>
      </section>
    );
  }

  if (p.active) {
    const s = p.active;
    const failed = p.lastStep?.result === "not-satisfied";
    return (
      <section aria-label="Scenario">
        <h2 {...packAttrs}>{s.title}</h2>
        {s.situation && (
          <p className="notice" {...packAttrs}>
            {s.situation}
          </p>
        )}
        {p.error && (
          <p role="alert" className="alert">
            {p.error}
          </p>
        )}
        <p aria-live="polite" className="prompt" {...packAttrs}>
          {s.node.prompt}
        </p>
        {failed && (
          <p className="verdict verdict--retry">
            That did not fit the moment. You can try again, or take one of the recovery moves below.
          </p>
        )}
        {p.lastStep?.result === "advanced" && (
          <p aria-live="polite" className="verdict verdict--correct">
            That worked — the conversation moved on.
          </p>
        )}
        {s.node.actions.length > 0 && (
          <div role="group" aria-label="Ways to respond" className="btn-row">
            {s.node.actions.map((a) => (
              <button
                key={a}
                type="button"
                className="btn btn--quiet"
                onClick={() => p.onAttempt(a)}
              >
                <PackText>{a}</PackText>
              </button>
            ))}
          </div>
        )}
        {failed && s.node.recovery.length > 0 && (
          <div role="group" aria-label="Recovery moves" className="btn-row">
            {s.node.recovery.map((r) => (
              <button
                key={r.id}
                type="button"
                className="btn btn--quiet"
                onClick={() => p.onRecovery(r.id)}
              >
                <PackText>{r.prompt}</PackText>
              </button>
            ))}
          </div>
        )}
        <fieldset className="ladder">
          <legend>Support</legend>
          {s.ladder.map((l) => (
            <button
              key={l.support_level}
              type="button"
              className="btn btn--quiet"
              disabled={s.support_used.includes(l.support_level)}
              onClick={() => p.onSupport(l.support_level)}
            >
              {l.description}
            </button>
          ))}
        </fieldset>
        {s.transfers_required > 0 && (
          <fieldset className="transfers">
            <legend>
              Transfer variants ({s.transfers.filter((t) => t.done).length}/{s.transfers_required})
            </legend>
            {s.transfers.map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn--quiet"
                disabled={t.done}
                onClick={() => p.onTransfer(t.id)}
              >
                {t.done ? `✓ ${t.description}` : t.description}
              </button>
            ))}
          </fieldset>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={p.onFinish}>
            Finish scenario
          </button>
          <button type="button" className="btn btn--quiet" onClick={p.onBack}>
            Leave
          </button>
        </div>
      </section>
    );
  }

  // K-75: the native list arrives already ordered by readiness (playable,
  // then near, then later) with the pointer flag on the first playable row.
  // The UI never re-sorts — it labels what the pack data says.
  const recommended = p.scenarios.find((s) => s.recommended);
  return (
    <section aria-label="Scenarios">
      <h2>Scenarios</h2>
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}
      {p.scenarios.length === 0 && (
        <p className="empty">
          No scenarios in your packs yet. Larger language packs ship dialogue scenarios you can
          practice end to end.
        </p>
      )}
      {recommended ? (
        <p className="notice" data-recommended-pointer="true">
          Recommended next: <PackText>{recommended.title}</PackText>
        </p>
      ) : null}
      <ul className="scenario-list">
        {p.scenarios.map((s) => (
          <li key={s.scenario_id}>
            <h3>
              <PackText>{s.title}</PackText>
              {s.recommended ? <span className="badge badge--active">recommended next</span> : null}
            </h3>
            {s.situation && (
              <p className="notice" {...packAttrs}>
                {s.situation}
              </p>
            )}
            {s.unlocked ? (
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => p.onStart(s.scenario_id)}
                >
                  Start
                </button>
              </div>
            ) : (
              <>
                <p className="empty">
                  <LockBadge kind={s.lock_kind} band={s.goal_band} /> {s.locked_reason ?? "Locked."}
                </p>
                {s.unlocks && s.unlocks.length > 0 ? (
                  <p className="meta">Unlocks when: {s.unlocks.join("; ")}</p>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
