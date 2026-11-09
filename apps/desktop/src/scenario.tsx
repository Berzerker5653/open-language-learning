/**
 * K-01: scenario sessions in the UI. Presentational: the dialogue graph,
 * accepted intents, recovery branches, support ladder, and transfer
 * variants all come from pack data through the native runtime; the UI
 * never branches on language content.
 */

import { useState } from "react";
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

/** U07: one respond button. `intent` is the internal pack token the
 * runtime matches; `label` is the learner-facing wording from the pack
 * (never the token). */
export interface ScenarioActionView {
  intent: string;
  label: string;
}

/** U07: the help a support-ladder rung actually delivered — the rung
 * button is a promise, and this is the payload behind it. */
export interface ScenarioHelpView {
  kind: "hint" | "model" | "gloss" | "choices";
  text: string;
  options: string[];
}

export interface ScenarioNodeView {
  id: string;
  prompt: string;
  actions: ScenarioActionView[];
  recovery: { id: string; prompt: string }[];
}

export interface ScenarioView {
  scenario_id: string;
  title: string;
  situation?: string | null;
  node: ScenarioNodeView;
  /** One support-ladder rung. `delivered` is false when the current
   * node carries no help payload at this level. SCENARIO-VIEW-
   * CONSISTENCY-001 (finding S-07): the level-0 rung ("No supports" —
   * answer unaided) is never a request and never carries a payload, so
   * it renders as an info line, not a disabled button. An undelivered
   * rung above level 0 (pre-2026-10-19 packs) is disabled and says why. */
  ladder: { support_level: number; description: string; delivered: boolean }[];
  /** SCENARIO-TRANSFER-001 (finding S-04): one declared transfer variant.
   * `has_payload` is false when the pack ships no completable practice
   * behind the variant: it is display-only, the button is disabled and
   * says why — there is no checkbox completion path anymore. `done` only
   * ever arrives from the engine after the payload was performed. */
  transfers: {
    id: string;
    description: string;
    done: boolean;
    has_payload?: boolean;
  }[];
  transfers_required: number;
  support_used: number[];
  /** U07: set only by the support command, from the rung's payload. */
  delivered_help?: ScenarioHelpView | null;
  /** SCENARIO-TRANSFER-001: the transfer practice currently open.
   * "recall" renders a free-text answer, "walk" renders the step's
   * respond buttons. Present only while the practice is being done. */
  active_transfer?: {
    variant_id: string;
    mode: "recall" | "walk";
    prompt: string;
    actions: ScenarioActionView[];
  } | null;
}

export interface ScenarioStepResult {
  result: "advanced" | "completed" | "partial-accepted" | "not-satisfied";
  recovery: string[];
  completed: boolean;
}

export interface ScenarioOutcomeView {
  nodes_completed: number;
  /** U08: exchange nodes the scenario declares — the denominator of a
   * partial walk, so an early end is never labelled completion. */
  exchanges_total: number;
  /** U08: true only when the chain reached its terminal node and the
   * transfer requirement was met; never set by the button press itself. */
  completed: boolean;
  transfers_completed: number;
  /** U08: pack-declared requirement (0 = none), so the transfer line can
   * state the actual number instead of a bare "at least". */
  transfers_required: number;
  transfer_requirement_met: boolean;
}

export interface ScenarioPanelProps {
  scenarios: ScenarioSummaryView[];
  active: ScenarioView | null;
  lastStep: ScenarioStepResult | null;
  outcome: ScenarioOutcomeView | null;
  error: string | null;
  /** SCENARIO-TRANSFER-001: the verdict of the last answer to the open
   * transfer practice ("not-satisfied" | "partial-accepted" |
   * "advanced"); null when no answer has been given yet. */
  transferResult?: string | null;
  onStart(id: string): void;
  onAttempt(intent: string): void;
  onSupport(level: number): void;
  onRecovery(id: string): void;
  onTransfer(id: string): void;
  onTransferAnswer(answer: string): void;
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

/** U07: heading for a delivered help card. The kind comes from the
 * pack's schema-enum, so every payload announces what it is. */
const HELP_HEADINGS: Record<ScenarioHelpView["kind"], string> = {
  hint: "A hint",
  model: "Model you can read first",
  gloss: "Meaning support",
  choices: "Possible replies",
};

/** SCENARIO-TRANSFER-001: the free-text answer form for a recall
 * payload. Submitting hands the words to the engine — the UI never
 * decides whether a transfer was done, and the answer box alone is not
 * a done: the ✓ arrives only when the rebuilt view says so. */
function TransferAnswerForm({ onAnswer }: { onAnswer: (answer: string) => void }) {
  const [answer, setAnswer] = useState("");
  return (
    <form
      className="btn-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (answer.trim() !== "") onAnswer(answer);
      }}
    >
      <input
        type="text"
        aria-label="Your answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <button type="submit" className="btn btn--primary">
        Answer
      </button>
    </form>
  );
}

export function ScenarioPanel(p: ScenarioPanelProps) {
  const packAttrs = usePackTextAttrs();

  if (p.outcome && !p.active) {
    const o = p.outcome;
    // U08: "Scenario complete" only when the walk actually reached the
    // chain's terminal node. Ending early keeps the earned evidence and
    // says exactly that, with the real transfer requirement.
    const exchanges = `${o.nodes_completed} of ${o.exchanges_total} exchange${o.exchanges_total === 1 ? "" : "s"} completed`;
    const transfers =
      o.transfers_required > 0
        ? `${o.transfers_completed} of ${o.transfers_required} transfer exchanges`
        : null;
    const stats = [o.completed ? exchanges : null, transfers].filter((s) => s !== null);
    return (
      <section aria-label="Scenario result">
        <h2>{o.completed ? "Scenario complete" : `Practice saved — ${exchanges}`}</h2>
        {stats.length > 0 && <p aria-live="polite">{stats.join(" · ")}</p>}
        {!o.transfer_requirement_met && (
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
        {p.lastStep?.result === "partial-accepted" && (
          <p aria-live="polite" className="verdict verdict--correct">
            That fits — this moment isn&apos;t finished yet. Keep going with what is left.
          </p>
        )}
        {s.delivered_help && (
          <div aria-live="polite" data-testid="scenario-help" className="help-card">
            <h3>{HELP_HEADINGS[s.delivered_help.kind] ?? "Support"}</h3>
            <p className="help-body" {...packAttrs}>
              {s.delivered_help.text}
            </p>
            {s.delivered_help.options.length > 0 && (
              <ul className="help-options" {...packAttrs}>
                {s.delivered_help.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {s.node.actions.length > 0 && (
          <div role="group" aria-label="Ways to respond" className="btn-row">
            {s.node.actions.map((a) => (
              <button
                key={a.intent}
                type="button"
                className="btn btn--quiet"
                data-intent={a.intent}
                onClick={() => p.onAttempt(a.intent)}
              >
                <PackText>{a.label}</PackText>
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
          {s.ladder.map((l) =>
            // SCENARIO-VIEW-CONSISTENCY-001 (finding S-07): level 0
            // means "answer unaided" — it is not a request, no pack
            // can ship a payload for it, and it must never render as a
            // disabled button apologising for missing content. It is
            // stated as an info line instead.
            l.support_level === 0 ? (
              <span key={l.support_level} className="ladder-rung ladder-rung--info">
                <span className="ladder-rung-label">{l.description}</span>
                <span className="ladder-note">answer without help — nothing to press here</span>
              </span>
            ) : (
              <span key={l.support_level} className="ladder-rung">
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={!l.delivered || s.support_used.includes(l.support_level)}
                  onClick={() => p.onSupport(l.support_level)}
                >
                  {l.description}
                </button>
                {!l.delivered && (
                  <span className="ladder-note">no help content at this level in this pack</span>
                )}
              </span>
            ),
          )}
        </fieldset>
        {s.active_transfer && (
          <div aria-live="polite" data-testid="transfer-practice" className="help-card">
            <h3>Transfer practice</h3>
            <p className="help-body" {...packAttrs}>
              {s.active_transfer.prompt}
            </p>
            {p.transferResult === "not-satisfied" && (
              <p className="verdict verdict--retry">
                That didn&apos;t fit the new setting. Try again — a transfer only counts when you
                have done it.
              </p>
            )}
            {p.transferResult === "partial-accepted" && (
              <p aria-live="polite" className="verdict verdict--correct">
                That fits — this step isn&apos;t finished yet. Keep going with what is left.
              </p>
            )}
            {s.active_transfer.mode === "walk" && s.active_transfer.actions.length > 0 && (
              <div role="group" aria-label="Ways to respond (transfer)" className="btn-row">
                {s.active_transfer.actions.map((a) => (
                  <button
                    key={a.intent}
                    type="button"
                    className="btn btn--quiet"
                    data-intent={a.intent}
                    onClick={() => p.onTransferAnswer(a.intent)}
                  >
                    <PackText>{a.label}</PackText>
                  </button>
                ))}
              </div>
            )}
            {s.active_transfer.mode === "recall" && (
              <TransferAnswerForm onAnswer={p.onTransferAnswer} />
            )}
          </div>
        )}
        {s.transfers_required > 0 && (
          <fieldset className="transfers">
            <legend>
              Transfer variants ({s.transfers.filter((t) => t.done).length}/{s.transfers_required})
            </legend>
            {s.transfers.map((t) => (
              <span key={t.id} className="transfer-row">
                <button
                  type="button"
                  className="btn btn--quiet"
                  // SCENARIO-TRANSFER-001 (finding S-04): a press opens
                  // the variant's practice payload — it can no longer
                  // mark a transfer done. A variant without a payload
                  // is never pressable: the engine refuses it, and the
                  // UI says why instead of offering a dead checkbox.
                  disabled={!t.has_payload || t.done}
                  onClick={() => p.onTransfer(t.id)}
                >
                  {t.done ? `✓ ${t.description}` : t.description}
                </button>
                {!t.has_payload && !t.done && (
                  <span className="transfer-note">
                    this pack carries no practice content for that transfer
                  </span>
                )}
              </span>
            ))}
          </fieldset>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={p.onFinish}>
            End session
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
