/**
 * UX-002 home + progress views. Presentational: the plan comes from the
 * scheduler-backed planner (due reviews, weak skills, progression), and
 * every item carries the engine's own `kind` so Home can introduce new
 * material before maintenance without deriving anything itself
 * (docs/adr/0020-derived-guidance.md). Never a trivial queue, and no
 * streak/attendance surface anywhere (ADR-0002).
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LatinText, PackText } from "@openlang/ui";
export interface PlannedItem {
  item_id: string;
  content_id: string;
  modality: string;
  reason: "due-review" | "saved-review" | "weak-skill" | "progression";
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

/**
 * One bounded session over the plan. Presentational contract only: App owns
 * the loop, Home renders what it is told. `total` is fixed when the session
 * begins, so "N of M" stays honest even when the plan refreshes underneath.
 */
export type SessionStatus = "running" | "paused";

export interface SessionView {
  status: SessionStatus;
  total: number;
  done: number;
  /** Planned activities this build cannot run; never counted as done. */
  notRunnable: number;
  /// SESSION-CHROME-001: the engine's own estimate (summed `est_seconds`
  /// over the items still to work, including the open one). Null means the
  /// estimate is unavailable and the chrome shows no time figure.
  remainingSeconds?: number | null;
}

export interface SessionOutcomeView {
  done: number;
  total: number;
  reason: "finished" | "stopped";
  notRunnable: number;
  /// SESSION-CHROME-001 (U3): whole minutes actually spent in the session,
  /// measured from wall time — not an estimate. Null when nothing ran.
  minutes?: number | null;
  /// Pack surfaces (word/phrase forms) the session put in front of the
  /// learner, in the order they were shown. Presentation only: seeing a
  /// form is not evidence of knowing it.
  forms?: string[];
}

export const BUDGET_PRESETS = [5, 10, 20, 30];

/**
 * SESSION-TIMER-001 (owner dogfood 2026-11-21): a session's price must
 * never read as "0 minutes" at the start — that reads as expired. An
 * unpriceable plan (no seconds known) gets NO time figure rather than a
 * fabricated one; a plan the engine prices under half a minute says
 * "under a minute"; anything else rounds to whole minutes.
 */
export function planMinutesLabel(totalSeconds: number): string | null {
  if (totalSeconds <= 0) return null;
  if (totalSeconds < 30) return "under a minute";
  const minutes = Math.round(totalSeconds / 60);
  return minutes === 1 ? "about 1 minute" : `about ${minutes} minutes`;
}

const REASON_LABELS: Record<PlannedItem["reason"], string> = {
  "due-review": "Due for review",
  // R02: a card the learner saved from a text, scheduled by its own
  // (mined) scheduler. It never touches pack mastery.
  "saved-review": "Review a saved word",
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
  // UX-PERSONA-001: "First look" read as a cryptic item title in the
  // persona walk; the label now says what the group is, in the ADR-0020
  // §2 words the grouping already follows.
  introduction: "Meet something new",
  review: "Keep it sticking",
  practice: "Practice it",
};

/** ADR-0020 §2: introduce, then maintain. */
const PLAN_KIND_ORDER: PlannedItem["kind"][] = ["introduction", "review"];

/** ADR-0020 §4: first-run guidance is the first three steps, no more. */
const FIRST_RUN_MAX = 3;

/**
 * SESSION-CHROME-001: the end-of-session summary lists the forms the
 * session surfaced. Long sessions are capped so the card stays a card;
 * the cap is stated honestly rather than the list silently truncating.
 */
const FORMS_CAP = 12;

export function summarizeForms(forms: string[]): string {
  const head = forms.slice(0, FORMS_CAP).join(", ");
  return forms.length > FORMS_CAP ? `${head}, … (${forms.length} in all)` : head;
}

/**
 * D2: every modality the engine has a typed practice runner for must be
 * startable from the plan list, or the training the plan schedules is
 * unreachable. Keep in step with the `matches!` guard in `practice_build`
 * (apps/desktop/src-tauri/src/lib.rs); the verb is what the learner will
 * actually do, so the button says so instead of a generic "Start".
 */
export const RUNNABLE_MODALITIES: Record<string, string> = {
  "recall-meaning": "Recall",
  "comprehension-listening": "Listen",
  "phonological-discrimination": "Hear the difference",
  "orthography-recognition": "Recognize the script",
  "production-writing": "Write it",
  "orthographic-encoding": "Type what you hear",
  // RU-MODALITY-PRACTICE-001: mirrors the gate's speaking pass — the
  // guided-speaking runner is startable, but formative only: its card
  // offers speak-along, never a score, submit, or mastery.
  "production-speaking": "Say it aloud",
};

/**
 * UI-HYGIENE-001 (visual-ui-audit U2): engine dimension names are
 * implementation vocabulary; every learner-facing surface shows a human
 * label. An unrecognised dimension is still readable — the kebab is
 * spaced out rather than shown as a token, so a pack can never put raw
 * jargon on screen by naming a modality we have not met.
 */
const MODALITY_LABELS: Record<string, string> = {
  ...RUNNABLE_MODALITIES,
  "comprehension-reading": "Reading",
  "recall-form": "Recall the form",
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  interaction: "Interaction",
};

export function modalityLabel(modality: string): string {
  return MODALITY_LABELS[modality.trim().toLowerCase()] ?? modality.replace(/[-_]/g, " ");
}

/**
 * UI-HYGIENE-001: content ids (pack/lexicon tokens) must not render raw.
 * When the engine could not resolve a human label, the token's own name
 * segment is shown spaced out — a readable word, never the id.
 */
const TOKEN_NOISE_SEGMENTS = new Set([
  "lex",
  "gram",
  "grammar",
  "orth",
  "kana",
  "hira",
  "kata",
  "kanji",
  "demo",
  "vocab",
  "phon",
  "morph",
  "cur",
  "scene",
  "story",
]);

function humanizeToken(id: string): string {
  const segments = id.split(/[.:#/]+/).filter(Boolean);
  const named = segments.filter(
    (s) => !TOKEN_NOISE_SEGMENTS.has(s.toLowerCase()) && !/^[a-z]{2}$/.test(s),
  );
  const word = (named.length > 0 ? named[named.length - 1] : segments.pop()) ?? id;
  return word.replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export interface WorldMissing {
  /// Raw content id of the driving item. It stays a lookup target for the
  /// word/goal card; it is never rendered inline (U14 acceptance 2).
  target: string;
  modality: string;
  /// The pack's human label when the engine resolved one; null falls back
  /// to the readable token segment — never the raw id.
  label: string | null;
}

export interface WorldEnvironment {
  id: string;
  display_name: string;
  unlocked: boolean;
  missing: WorldMissing[];
}

/// PACK-UPDATE-UX-001: an installed pack the pack catalogue lists at a different
/// version. Built in App.tsx from the same `catalog_packs` read the Settings
/// panel renders, so Home, the hub and Settings cannot disagree about whether an
/// update exists. Both versions are carried because the app may itself be
/// packaged against an older reference pack than the catalogue lists.
export interface PackUpdate {
  pack_id: string;
  display_name: string;
  installed_version: string;
  available_version: string;
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
  /// Owner 2026-10-12: the profile genuinely has no language chosen yet —
  /// the wizard's "Skip for now" path. Home then names the gap and points at
  /// the one control that fixes it, instead of showing an empty plan under a
  /// "what to practice now" heading that promises nothing.
  noPack?: boolean;
  /// Sweep finding 19 (2026-10-26): the active-pack read FAILED, so the app
  /// does not know whether a pack is active. Home attributes the failure
  /// instead of claiming "no language is set" — an unknown is not a none.
  packsUnknown?: boolean;
  onChooseLanguage?(): void;
  /// PACK-UPDATE-UX-001: stale packs on this device. Empty means the engine and
  /// the catalogue agree on every version, and Home then says nothing about
  /// versions at all.
  updates?: PackUpdate[];
  /// K-66: the next reachable goal from the active pack's goal map, as
  /// `home_state` reports it. `undefined` while that call has not
  /// answered; `null` when the pack declares no goal map — Home then
  /// says so plainly rather than inventing a goal (ADR-0020 §4).
  nextGoal?: NextGoalView | null;
  /// K-66: the first-run steps from `first_run_steps`: pack-declared
  /// labels only. Empty, or not loaded yet, renders no section.
  firstRunSteps?: FirstRunStep[];
  /// One begin action for the whole plan; the per-activity buttons below it
  /// stay available but secondary.
  onStartSession?(): void;
  session?: SessionView | null;
  sessionOutcome?: SessionOutcomeView | null;
  onPauseSession?(): void;
  onResumeSession?(): void;
  onStopSession?(): void;
  onDismissSessionSummary?(): void;
  /// U02: a language change clears the pack-scoped displays before the new
  /// pack re-answers; Home says so while that settles instead of showing a
  /// plan that belongs to the language being left.
  packSwitching?: boolean;
  pathNodes?: UnitPathNode[];
  /// PATH-WHATSNEXT-001: the single current offer from `current_offer` —
  /// the Today strip's line + review-due chip and the after-session card's
  /// answer. Undefined while loading, null when the engine abstains.
  nextOffer?: NextOffer | null;
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
      {p.packSwitching ? (
        <p className="notice" role="status">
          Switching languages — the plan, goal and places below update as the new pack answers.
        </p>
      ) : null}
      {p.noPack || p.packsUnknown ? null : <p className="prompt">what to practice now</p>}
      {p.activePack ? (
        // UI-HYGIENE-001 (U2): the AI-honesty line is a designed badge,
        // not greeting prose — the posture is a standing fact about the
        // material, and the tooltip carries the full policy in one line.
        <p className="meta pack-posture">
          <PackText tag="strong">{p.activePack.name}</PackText>{" "}
          <span
            className="badge badge--mono pack-posture-badge"
            title="Content in this pack is machine-drafted. The posture states how far human review has actually gone; it never affects your practice or progress."
          >
            {p.activePack.posture}
          </span>
        </p>
      ) : p.packsUnknown ? (
        <p className="notice" role="status">
          The app could not read which language pack this profile uses, so it cannot say what to
          practice. Nothing was changed — this is a failed read, not a missing language.{" "}
          {p.onChooseLanguage ? (
            <button type="button" className="btn btn--quiet" onClick={p.onChooseLanguage}>
              Check Language packs
            </button>
          ) : null}
        </p>
      ) : p.noPack ? (
        <p className="notice" role="status">
          No language is set for this profile yet, so there is nothing to practice from. Choose a
          language pack first.{" "}
          {p.onChooseLanguage ? (
            <button type="button" className="btn btn--quiet" onClick={p.onChooseLanguage}>
              Choose a language
            </button>
          ) : null}
        </p>
      ) : null}
      {(p.updates ?? []).length > 0 ? (
        <div className="notice pack-updates" role="status">
          {(p.updates ?? []).map((u) => (
            <p key={u.pack_id} className="pack-version">
              <PackText tag="strong">{u.display_name}</PackText> version {u.installed_version} is on
              this device. The pack catalogue lists version {u.available_version}.
            </p>
          ))}
          {p.onChooseLanguage ? (
            <button type="button" className="btn btn--quiet" onClick={p.onChooseLanguage}>
              Review pack updates
            </button>
          ) : null}
        </div>
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
                <PackText tag="span" className="first-run-label">
                  {step.label}
                </PackText>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {p.noPack ? null : (
        <>
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
            {p.plan.items.length} activities
            {planMinutesLabel(p.plan.total_seconds)
              ? ` · ${planMinutesLabel(p.plan.total_seconds)}`
              : ""}
          </p>
        </>
      )}
      {p.sessionOutcome ? (
        <section aria-label="Session summary" className="session-summary">
          <p role="status">
            {p.sessionOutcome.reason === "stopped"
              ? `Session stopped after ${p.sessionOutcome.done} of ${p.sessionOutcome.total} activities.`
              : `Session finished — ${p.sessionOutcome.done} of ${p.sessionOutcome.total} activities.`}
          </p>
          <p className="meta">
            {p.sessionOutcome.reason === "stopped"
              ? "What you finished is saved. The rest is still on your plan."
              : "Everything the session could run, it ran."}
            {p.sessionOutcome.notRunnable > 0
              ? ` ${p.sessionOutcome.notRunnable} planned activity has no practice screen in this build yet.`
              : ""}
          </p>
          {p.sessionOutcome.minutes != null ? (
            <p className="meta session-time">
              {p.sessionOutcome.minutes < 1
                ? "Under a minute on the activities."
                : `About ${p.sessionOutcome.minutes} minutes on the activities.`}
            </p>
          ) : null}
          {p.nextOffer ? (
            <p className="next-offer next-offer--outcome" data-testid="next-offer-card">
              {offerLabel(p.nextOffer)}
            </p>
          ) : null}
          {(p.sessionOutcome.forms ?? []).length > 0 ? (
            <p className="meta session-forms">
              Forms you saw: {summarizeForms(p.sessionOutcome.forms!)}
            </p>
          ) : null}
          {p.onDismissSessionSummary ? (
            <div className="btn-row">
              <button type="button" className="btn btn--quiet" onClick={p.onDismissSessionSummary}>
                Back to the plan
              </button>
            </div>
          ) : null}
        </section>
      ) : p.session ? (
        <section aria-label="Today's session" className="session-panel">
          <p role="status">
            {p.session.status === "running"
              ? `Session in progress — ${p.session.done} of ${p.session.total} done.`
              : `Session paused — ${p.session.total - p.session.done} left to do.`}
          </p>
          <div className="btn-row">
            {p.onResumeSession ? (
              <button type="button" className="btn btn--primary" onClick={p.onResumeSession}>
                {p.session.status === "running" ? "Go back to it" : "Resume session"}
              </button>
            ) : null}
            {p.onStopSession ? (
              <button type="button" className="btn btn--quiet" onClick={p.onStopSession}>
                Stop session
              </button>
            ) : null}
          </div>
        </section>
      ) : p.plan.items.length > 0 && p.onStartSession ? (
        <div className="session-begin">
          <button
            type="button"
            className="btn btn--primary"
            data-session-begin
            onClick={p.onStartSession}
          >
            Start today&apos;s plan — {p.plan.items.length} activities
            {planMinutesLabel(p.plan.total_seconds)
              ? `, ${planMinutesLabel(p.plan.total_seconds)}`
              : ""}
          </button>
          <p className="meta">
            One activity at a time. You can stop at any point: what you finish is saved, and the
            rest stays on your plan.
          </p>
        </div>
      ) : null}
      {p.plan.items.length === 0 ? (
        p.noPack ? null : (
          <p className="empty">
            Nothing is due right now. Come back when reviews are due, or explore new material.
          </p>
        )
      ) : (
        <>
          <p className="meta plan-secondary">
            <small>Or do one activity on its own:</small>
          </p>
          {PLAN_KIND_ORDER.map((kind) => {
            const items = p.plan.items.filter((item) => item.kind === kind);
            if (items.length === 0) return null;
            return (
              <section key={kind} className="plan-group" aria-label={KIND_LABELS[kind]}>
                <h2>{KIND_LABELS[kind]}</h2>
                {kind === "review" ? (
                  // U6 (SESSION-CHROME-001): dues as a time budget, from the
                  // engine's own per-item estimates — the same numbers the
                  // session plan prices, not a new guess.
                  <p className="meta plan-due-budget">
                    {items.length} due · about{" "}
                    {Math.max(1, Math.round(items.reduce((s, it) => s + it.est_seconds, 0) / 60))}{" "}
                    min
                  </p>
                ) : null}
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
                          <PackText tag="strong" className="plan-surface">
                            {item.surface}
                          </PackText>
                        ) : (
                          // UI-HYGIENE-001: a plan row with no surface word
                          // still never shows the raw content id — the id's
                          // readable name segment stands in.
                          <span className="plan-surface">{humanizeToken(item.content_id)}</span>
                        )}
                        {item.gloss && <LatinText>{item.gloss}</LatinText>}
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
                              {modalityLabel(item.modality)} · ~{item.est_seconds}s
                              {p.onStart ? " — nothing to practice here yet" : ""}
                            </span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </>
      )}
      {p.nextOffer ? (
        <p className="next-offer" data-testid="next-offer">
          {offerLabel(p.nextOffer)}
          {p.nextOffer.total_due > 0 ? (
            <span className="review-due-chip" data-testid="review-due-chip">
              Review due ({p.nextOffer.total_due})
            </span>
          ) : null}
        </p>
      ) : null}
      {p.pathNodes && p.pathNodes.length > 0 ? (
        <PathView
          nodes={p.pathNodes}
          scrollToUnit={p.sessionOutcome && p.nextOffer ? p.nextOffer.unit_id : null}
          nextOffer={p.nextOffer ?? null}
        />
      ) : null}
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
                    <span className="meta">
                      grows with:{" "}
                      {e.missing
                        .map(
                          (m) =>
                            // U14 acceptance 2: the note names the driving
                            // item by its human label; the raw id lives on
                            // the word/goal card lookup, never inline.
                            `${modalityLabel(m.modality)} in “${m.label ?? humanizeToken(m.target)}”`,
                        )
                        .join(", ")}
                    </span>
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
  /// UI-HYGIENE-001: the human label the engine resolved for this content
  /// (the word itself) when it lives in the active pack's lexicon. Null
  /// when unresolvable; the table then shows the token's readable name
  /// segment, never the raw id.
  label?: string | null;
  dimension: string;
  state: string;
  confidence: number;
  needs_refresh: boolean;
}
/**
 * Progress answers three questions before it shows any numbers: what the
 * learner can do now, what changed, and what to do next. Every line is derived
 * from what the engine already reports — the pack's own goal text, the
 * per-modality capability states, and the scheduler's own `needs_refresh` flag
 * — and the panel abstains rather than inventing a narrative the engine cannot
 * support (ADR-0020 §1). Ids, confidence, and mastery labels stay below it, as
 * detail.
 */
const CAN_DO_STATES = ["independent", "supported"];

export function CanDoSummary(p: {
  goals: GoalCard[];
  rows: ProgressRow[];
  nextGoal?: NextGoalView | null;
}) {
  const canDo = p.goals
    .map((g) => ({
      goal: g,
      modalities: g.dimensions
        .filter((d) => CAN_DO_STATES.includes(d.best_state))
        .map((d) => RUNNABLE_MODALITIES[d.modality] ?? d.modality),
    }))
    .filter((entry) => entry.modalities.length > 0);
  const fading = p.rows.filter((row) => row.needs_refresh);
  return (
    <section aria-label="What you can do now" className="cando">
      <h1>What you can do now</h1>
      {canDo.length === 0 ? (
        <p className="empty">
          Nothing has been used well enough yet for this app to say you can do it. That claim comes
          from practice, not from time spent here.
        </p>
      ) : (
        <ul className="cando-list">
          {canDo.map(({ goal, modalities }) => (
            <li key={goal.id} data-goal={goal.id}>
              <PackText tag="strong">{goal.description}</PackText>
              <span className="meta">
                {" "}
                used in practice: {modalities.map(modalityLabel).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <h2>What changed</h2>
      {fading.length === 0 ? (
        <p className="meta">Nothing you have learned is close to being forgotten.</p>
      ) : (
        <p className="meta">
          {fading.length} {fading.length === 1 ? "skill is" : "skills are"} getting old — the
          scheduler wants them reviewed before they fade.
        </p>
      )}
      <p className="meta">
        <small>
          This is what the recorded evidence says today; the app keeps capability state, not an
          activity diary.
        </small>
      </p>
      <h2>What to do next</h2>
      {p.nextGoal === undefined ? null : p.nextGoal === null ? (
        <p className="meta">
          This pack declares no learning path yet, so there is no next step to name. Choose one
          under Settings → Language packs.
        </p>
      ) : (
        <p className="meta next-goal" data-goal={p.nextGoal.goal_id}>
          Next up: <strong>{p.nextGoal.description}</strong> — the plan names the activities that
          lead there.
        </p>
      )}
    </section>
  );
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
      <h2>Recorded detail</h2>
      <p>
        The numbers behind those answers: what you practiced, which skill it trains, the state on
        record, and how sure the record is. Each skill grows independently — reading does not imply
        speaking.
      </p>
      {rows.length === 0 ? (
        <p className="empty">No evidence yet. Practice to see capability differences here.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>What you practiced</th>
                <th>Skill</th>
                <th>State</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {[...byContent.entries()].map(([content, list]) =>
                list.map((row) => (
                  <tr key={`${content}#${row.dimension}`}>
                    <td>
                      <strong>{row.label ?? humanizeToken(row.content_id)}</strong>
                    </td>
                    <td>{modalityLabel(row.dimension)}</td>
                    <td>
                      {STATE_LABELS[row.state] ?? row.state}{" "}
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
  concepts_total: number;
  concepts_seen: number;
  exemplar: string | null;
  best_state: string;
  /// PROGRESS-STATS-001 (U14): 0-100 of the modality gate, derived by the
  /// engine from the per-concept mastery ladder (mean of ladder weights,
  /// unseen concepts counting 0). An instrument, never a grade.
  progress_pct: number;
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
const BAND_HEADERS: Record<
  string,
  { label: string; gloss: string; friendly?: string; cefr?: string }
> = {
  "on-ramp": {
    label: "Getting started",
    gloss: "first words and routines, with support",
    cefr: "Pre-A1",
  },
  a1: {
    label: "A1",
    gloss: "familiar everyday expressions, very simple exchanges",
    friendly: "Beginner",
    cefr: "A1",
  },
  a2: {
    label: "A2",
    gloss: "familiar routines, everyday exchanges, simple past",
    friendly: "Elementary",
    cefr: "A2",
  },
  b1: {
    label: "B1",
    gloss: "most everyday situations, opinions, plans, experiences",
    friendly: "Intermediate",
    cefr: "B1",
  },
  b2: {
    label: "B2",
    gloss: "complex text, argument, fluent interaction",
    friendly: "Upper-intermediate",
    cefr: "B2",
  },
  c1: {
    label: "C1",
    gloss: "flexible, well-structured use of the language",
    friendly: "Advanced",
    cefr: "C1",
  },
  c2: { label: "C2", gloss: "precise, nuanced, near-native use", friendly: "Mastery", cefr: "C2" },
  other: { label: "Unlabeled", gloss: "this pack does not band these goals" },
};

export function bandHeader(band: string): {
  label: string;
  gloss: string;
  friendly?: string;
  cefr?: string;
} {
  return (
    BAND_HEADERS[band.trim().toLowerCase()] ?? { label: band, gloss: `banded ${band} by the pack` }
  );
}

/**
 * PATH-VIEW-001 (PROGRESS-PATH-DESIGN-001.md phase 1): one unit node on the
 * Today tab's path, exactly as the `unit_path` command reports it. The view
 * derives NOTHING: locked/done/current/review-due all come from the engine's
 * existing gating, mastery, plan and scheduler state (no new engine, and
 * `done` is evidence-backed by construction — the red test for attendance-
 * only lives on the Rust side where the flag is computed).
 */
export interface UnitPathNode {
  pack_id: string;
  unit_id: string;
  title: string;
  summary: string;
  band: string | null;
  /** PATH-NODE-TYPES-001: the engine-derived activity kind — letters |
   * listening | speaking | words — computed from pack activity data only
   * (`unit_kind` in lib.rs; review stays a STATE, never a kind). The ring
   * center shows the kind pictogram; state stays in ring/fill/captions. */
  kind: string;
  locked: boolean;
  done: boolean;
  current: boolean;
  review_due: boolean;
  due_count: number;
  /** PATH-VISUAL-001: started but unproven — the learner has MET at
   * least one ref (completed encounter) or already holds evidence on one.
   * The ring renders partially filled; `done` stays evidence-only. */
  in_progress: boolean;
  /** PATH-VISUAL-001: evidence-backed proven refs over scheduled refs —
   * the ring's fill fraction, and the reason the section counter can say
   * "0 done" honestly while a visited unit still LOOKS visited. */
  refs_done: number;
  refs_total: number;
  unlock_hint: string | null;
}

/**
 * PATH-WHATSNEXT-001 (the Codemm rule): exactly ONE current offer, computed
 * engine-side by `current_offer` — a due review first, otherwise the next
 * ready unit's introduction step. The UI composes the sentence; the engine
 * owns the answer, so the after-session card, the Today strip and the path
 * pin can never disagree.
 */
export interface NextOffer {
  kind: "review" | "introduction";
  unit_id: string;
  title: string;
  minutes: number;
  total_due: number;
}

/** "Next: <what, roughly how long>" — the phase-2 sentence, pack words for
 * the unit title, honest shape-names only. */
export function offerLabel(o: NextOffer): string {
  return o.kind === "review"
    ? `Next: review ${o.title} · about ${o.minutes} minutes`
    : `Next: ${o.title} — new material · about ${o.minutes} minutes`;
}

/** PATH-SECTIONS-DEDUP-001 (owner dogfood 2026-11-22 complaint 09a): path
 * sections are the CANONICAL band ladder — every band appears exactly once
 * and every unit maps INTO its band, never beside it. The old rule grouped
 * CONSECUTIVE nodes of one band, so the nine late-appended journey units
 * (pack files 810–818: A2 past-events, B1 practical-problems, B2
 * style-register — all honestly banded, all at the tail of file order)
 * spawned a second A2/B1/B2 row under the main ladder. Grouping is now by
 * band with a fixed section order: the BAND_HEADERS ladder (on-ramp → C2 →
 * unlabeled), then any custom pack band in first-occurrence order.
 * Nodes inside a section keep engine/curriculum order. The section `band`
 * stays the pack's own raw string (first occurrence) so data-band selectors
 * and the pinned-section logic are unchanged. */
export function pathSections(nodes: UnitPathNode[]): { band: string; nodes: UnitPathNode[] }[] {
  const ladder = Object.keys(BAND_HEADERS);
  const byKey = new Map<string, { band: string; nodes: UnitPathNode[]; rank: number }>();
  for (const n of nodes) {
    const raw = n.band && n.band.trim() ? n.band : "other";
    const key = raw.trim().toLowerCase();
    let section = byKey.get(key);
    if (!section) {
      const rung = ladder.indexOf(key);
      section = {
        band: raw,
        nodes: [],
        // Canonical ladder first; unknown pack bands follow it in
        // first-occurrence order ("other", a known rung, still sorts last).
        rank: rung >= 0 ? rung : ladder.length + byKey.size,
      };
      byKey.set(key, section);
    }
    section.nodes.push(n);
  }
  return [...byKey.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => ({ band: s.band, nodes: s.nodes }));
}

/** One honest state per node for styling and the mobile audit. Locked wins
 * over everything (a locked node is never clickable), the pin over done.
 * PATH-VISUAL-001: `in-progress` (started but unproven) ranks below the
 * pin — a pinned unit that was also visited still shows its fill ring,
 * because the ring fraction rides refs_done/refs_total in the markup,
 * not this label. */
export function pathNodeState(n: UnitPathNode): string {
  if (n.locked) return "locked";
  if (n.current) return "current";
  if (n.done) return n.review_due ? "review-due" : "done";
  if (n.in_progress) return "in-progress";
  return "ready";
}

/** PATH-NODE-TYPES-001 (the market sheet: Duolingo's pictogram grammar):
 * the ring center carries WHAT the unit teaches — a drawn SVG pictogram
 * for the engine-derived `kind` — while the state layer (ring fill,
 * color, halo, pin, lock, check, captions) stays the ONLY thing that says
 * where the learner is. The identical `•/○/◉/⟳` text dots are gone. */
export const PATH_KIND_NAMES: Record<string, string> = {
  letters: "Letters",
  listening: "Listening",
  speaking: "Speaking",
  words: "Words",
};

/** The pictograms — drawn (never emoji), currentColor like PathLockGlyph
 * so the state color rules keep painting them, aria-hidden because the
 * row spells the kind in words (the sr-only word in the node body).
 * `review` is a STATE glyph and rides the same drawer. */
function PathGlyph({ glyph }: { glyph: string }) {
  return (
    <svg viewBox="0 0 16 16" className="path-node-glyph" data-glyph={glyph} aria-hidden="true">
      {glyph === "listening" ? (
        <>
          <path
            d="M3.2 11.4v-2.9a4.8 4.8 0 0 1 9.6 0v2.9"
            fill="none"
            strokeWidth="1.5"
            stroke="currentColor"
          />
          <rect x="2" y="10" width="2.6" height="4.4" rx="1.1" fill="currentColor" />
          <rect x="11.4" y="10" width="2.6" height="4.4" rx="1.1" fill="currentColor" />
        </>
      ) : glyph === "speaking" ? (
        <>
          <rect x="6.4" y="1.8" width="3.2" height="7.4" rx="1.6" fill="currentColor" />
          <path
            d="M4.3 8a3.7 3.7 0 0 0 7.4 0M8 11.7v2.1M6 13.8h4"
            fill="none"
            strokeWidth="1.4"
            stroke="currentColor"
          />
        </>
      ) : glyph === "letters" ? (
        <path
          d="M3.4 13.2 8 2.8l4.6 10.4M5.3 9.7h5.4"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
        />
      ) : glyph === "review" ? (
        <>
          <path
            d="M12.8 8a4.8 4.8 0 1 1-1.9-3.8"
            fill="none"
            strokeWidth="1.5"
            stroke="currentColor"
          />
          <path d="M13.4 2 11.4 4.6l2.7.6z" fill="currentColor" />
        </>
      ) : (
        // words, and any kind we do not know yet: the open book.
        <>
          <path
            d="M8 4.3C6.9 3.4 4.9 3 2.6 3.2v9c2.3-.2 4.3.2 5.4 1.1 1.1-.9 3.1-1.3 5.4-1.1v-9c-2.3-.2-4.3.2-5.4 1.1z"
            fill="none"
            strokeWidth="1.4"
            stroke="currentColor"
          />
          <path d="M8 4.3v9" fill="none" strokeWidth="1.4" stroke="currentColor" />
        </>
      )}
    </svg>
  );
}

/** PATH-VISUAL-001 winding track: node sway follows a smooth wave down
 * the column (Duolingo's grammar), never random jitter — deterministic
 * from the node index so the mobile audit and the vitest contract see
 * the same geometry every run. */
export const PATH_SWAY_AMP_PX = 34;
/** Nominal row pitch the connector stub angles are computed against.
 * The stubs hang off the ring itself, so when a row grows (a long title
 * or an unlock hint) the wave still reads continuous. */
export const PATH_ROW_PITCH_PX = 76;
export function pathSway(index: number): number {
  return Math.round(PATH_SWAY_AMP_PX * Math.sin((index * 2 * Math.PI) / 6));
}

/** The lock on a locked node — drawn, never an emoji (the ring itself
 * is the state; this just names WHY the node is inert). */
function PathLockGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="path-node-lock" aria-hidden="true">
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" strokeWidth="1.6" stroke="currentColor" />
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.4" fill="currentColor" />
    </svg>
  );
}

/**
 * The path itself: a scrolling journey of unit nodes. Only the section that
 * holds the pin is open by default — the pack carries 818 units and the
 * design's rule is "the screen never shows 818 dots" — every other section
 * collapses to its header with a done-count and opens on tap (a real
 * control, 44px+ tall). Locked-ahead units stay VISIBLE and dim, each naming
 * what unlocks it in the pack's own words; done units re-light with a
 * review-due count; scrolling up is the visible history of what was learned.
 */
export function PathView({
  nodes,
  scrollToUnit,
  nextOffer,
}: {
  nodes: UnitPathNode[];
  /// PATH-WHATSNEXT-001: when set (the after-session moment), the path
  /// brings THIS unit's node into view — the offer and the map are one
  /// answer, never two.
  scrollToUnit?: string | null;
  /// PATH-PIN-CONSISTENCY-001 (owner dogfood 2026-11-22 complaint 10):
  /// the single current offer from `current_offer`. When it names a unit
  /// OTHER than the pinned one, it rides a "next up" chip in the path
  /// header — the market pattern (pin on the trail, action chip in the
  /// header strip) — never as the track pin.
  nextOffer?: NextOffer | null;
}) {
  const sections = pathSections(nodes);
  // PATH-PIN-CONSISTENCY-001: the pin is WHERE THE LEARNER IS, not what
  // the plan suggests next. Two contradictory markers on one track (the
  // owner's screenshot: node 1 honestly "In progress (3/4 learned)"
  // while "You are here" sat three nodes later on the next NEW-material
  // suggestion) read as "the course starts mid-branch". Rule: exactly
  // one pin, on the first IN-PROGRESS unit in rendered (ladder) order,
  // else the first not-done unlocked unit. A node the engine marks
  // current keeps its engine-honest current ring (never hidden — the
  // FIX-PATH-VISUAL-001-1 single-caption precedent stands) but never a
  // pin; the offer itself rides the header chip below.
  // Policy rationale lives in state/notes/PATH-PIN-CONSISTENCY-001.md.
  const openUnits = sections.flatMap((s) => s.nodes).filter((n) => !n.locked && !n.done);
  const pinTarget = openUnits.find((n) => n.in_progress)?.unit_id ?? openUnits[0]?.unit_id ?? null;
  const pinnedBand = pinTarget
    ? sections.find((s) => s.nodes.some((n) => n.unit_id === pinTarget))?.band
    : undefined;
  // undefined = nobody has tapped yet, so the pinned section opens by
  // default; an explicit null collapses everything, an override re-opens
  // the tapped band even after the pack data refreshes underneath.
  const [bandOverride, setBandOverride] = useState<string | null | undefined>(undefined);
  // PATH-FEEL-MOTION-001 (Duolingo parity for the ROAD; ADR-0002 safe —
  // motion is not a reward mechanic):
  // - closingBand keeps the collapsing band's list MOUNTED for one short
  //   exit animation, then it unmounts: the collapse is seen, not just
  //   done. The timing matches the .path-nodes--closing keyframe (180ms)
  //   with slack; reduced-motion users pay at most this same 200ms.
  // - pressedUnit drives the node press on touch (browsers only honor
  //   :active on elements with handlers, and serve mode runs on phones).
  const [closingBand, setClosingBand] = useState<string | null>(null);
  const [pressedUnit, setPressedUnit] = useState<string | null>(null);
  useEffect(() => {
    if (closingBand === null) return;
    const t = setTimeout(() => setClosingBand(null), 200);
    return () => clearTimeout(t);
  }, [closingBand]);
  if (sections.length === 0) return null;
  const openBand =
    bandOverride === undefined ? (pinnedBand ?? sections[0]?.band ?? "") : bandOverride;

  const rootRef = useRef<HTMLElement | null>(null);
  // Two phases, because a collapsed section's node is NOT in the DOM yet:
  // open the offered node's section first, then scroll once it renders.
  // PATH-PIN-CONSISTENCY-001: one focus pipeline for both jump sources —
  // the after-session scroll (the scrollToUnit prop) and a next-up chip
  // tap (internal state) — so a tap opens a collapsed band then lands.
  const [focusUnit, setFocusUnit] = useState<string | null>(null);
  useEffect(() => {
    if (scrollToUnit) setFocusUnit(scrollToUnit);
  }, [scrollToUnit]);
  useEffect(() => {
    if (!focusUnit) return;
    const target = nodes.find((n) => n.unit_id === focusUnit);
    if (target) setBandOverride(target.band ?? "other");
  }, [focusUnit, nodes]);
  useEffect(() => {
    if (!focusUnit) return;
    const el = rootRef.current?.querySelector(`[data-unit="${focusUnit}"]`);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center" });
  }, [focusUnit, openBand, nodes]);
  // PATH-PIN-CONSISTENCY-001: auto-scroll on load lands a little BEFORE
  // the pin (the pin centered, never glued to the top edge) so the
  // completed/started context above the pin stays visible — the learner
  // reads their history INTO the pin instead of arriving at a bare node.
  const autoScrolled = useRef<string | null>(null);
  useEffect(() => {
    if (scrollToUnit) return; // the after-session jump owns the scroll
    if (!pinTarget || autoScrolled.current === pinTarget) return;
    autoScrolled.current = pinTarget;
    const el = rootRef.current?.querySelector(`[data-unit="${pinTarget}"]`);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center" });
  }, [pinTarget, scrollToUnit]);
  // PATH-FEEL-SCROLL-001 (Duolingo parity for the viewport): the journey
  // opens centered on the pin (the auto-scroll above) AND once the learner
  // scrolls their spot away, a floating "jump to my spot" arrow fades in,
  // pointing back toward it. The IntersectionObserver watches the pinned
  // node against the VIEWPORT — it works whether the page or a container
  // scrolls — and boundingClientRect tells whether my-spot is above or
  // below the current view so the arrow points the right way. A manually
  // collapsed band unmounts the pin node: my-spot is not on screen either,
  // so the arrow re-opens the band instead of scrolling.
  const [pinOffscreen, setPinOffscreen] = useState<"above" | "below" | null>(null);
  useEffect(() => {
    if (!pinTarget || typeof IntersectionObserver === "undefined") {
      setPinOffscreen(null);
      return;
    }
    const el = rootRef.current?.querySelector(`[data-unit="${pinTarget}"]`);
    if (!el) {
      setPinOffscreen("above");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (!e) return;
        setPinOffscreen(e.isIntersecting ? null : e.boundingClientRect.top > 0 ? "below" : "above");
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pinTarget, openBand, nodes]);
  const jumpToPin = () => {
    if (!pinTarget) return;
    const el = rootRef.current?.querySelector(`[data-unit="${pinTarget}"]`);
    if (!el) {
      // The pinned band was collapsed under us: opening it puts the pin
      // back in the DOM (and the next observer pass re-arms the arrow).
      setBandOverride(pinnedBand ?? null);
      return;
    }
    const reduce =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };
  return (
    <section aria-label="Your path" className="unit-path" data-testid="unit-path" ref={rootRef}>
      <h2>Your path</h2>
      <p className="meta">
        <small>What you have completed, where you are now, and where this leads.</small>
      </p>
      {nextOffer && nextOffer.unit_id !== pinTarget ? (
        // PATH-PIN-CONSISTENCY-001: the recommendation lives in the
        // header strip, never on the track — the pin stays the single
        // "where I am" marker. Tapping the chip jumps the journey to
        // the offered unit (its band opens first if collapsed).
        <button
          type="button"
          className="path-next-up"
          data-testid="path-next-up"
          onClick={() => setFocusUnit(nextOffer.unit_id)}
        >
          Next up: {nextOffer.title} · ~{nextOffer.minutes} min
        </button>
      ) : null}
      {pinTarget ? (
        // PATH-FEEL-SCROLL-001: the market's viewport pattern — invisible
        // while my-spot is on screen, a floating circle bottom-right once
        // the observer says it is not, arrow pointing toward it (CSS
        // never display:none: opacity+visibility only, no layout shift).
        <button
          type="button"
          className="path-jump-to-pin"
          data-testid="path-jump-to-pin"
          data-visible={pinOffscreen ? "true" : "false"}
          data-dir={pinOffscreen ?? "above"}
          aria-label="Jump to my spot"
          onClick={jumpToPin}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 19V6M5.5 12.5 12 6l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
      {sections.map((s) => {
        const header = bandHeader(s.band);
        const isOpen = openBand === s.band;
        // PATH-VISUAL-001: the counter counts PROVEN-DONE only — refs the
        // learner actually proved — never visits or encounters.
        const doneCount = s.nodes.filter((n) => n.done).length;
        return (
          <div key={s.band} className="path-section" data-band={s.band}>
            <button
              type="button"
              className="path-section-toggle"
              aria-expanded={isOpen}
              onClick={() => {
                if (isOpen) {
                  setClosingBand(s.band);
                  setBandOverride(null);
                } else {
                  setClosingBand(null);
                  setBandOverride(s.band);
                }
              }}
            >
              <span className="path-section-name">{header.friendly ?? header.label}</span>
              <small className="path-section-cefr">{header.cefr ?? header.gloss}</small>
              <span className="path-section-count">
                {doneCount}/{s.nodes.length} units done
              </span>
            </button>
            {isOpen || closingBand === s.band ? (
              <ol
                className={`path-nodes${isOpen ? "" : " path-nodes--closing"}`}
                data-closing={isOpen ? undefined : "true"}
              >
                {s.nodes.map((n, i) => {
                  const state = pathNodeState(n);
                  const fill = n.refs_total > 0 ? Math.min(1, n.refs_done / n.refs_total) : 0;
                  // The winding geometry: a deterministic sway wave, and
                  // dashed connector stubs whose angle rides the sway
                  // delta to the neighbours — stubs are attached to the
                  // ring, so variable row heights never break the track.
                  const sway = pathSway(i);
                  const dy = PATH_ROW_PITCH_PX;
                  const downDeg =
                    i + 1 < s.nodes.length
                      ? (Math.atan2(pathSway(i + 1) - sway, dy) * 180) / Math.PI
                      : 0;
                  const upDeg =
                    i > 0 ? (Math.atan2(sway - pathSway(i - 1), dy) * 180) / Math.PI : 0;
                  const style = {
                    "--path-fill": String(fill),
                    "--path-sway": `${sway}px`,
                    "--path-conn-down": `${downDeg}deg`,
                    "--path-conn-up": `${upDeg}deg`,
                    // PATH-FEEL-MOTION-001: the entrance cascade index
                    // (CSS caps the stagger at 10 rows).
                    "--path-i": String(i),
                  } as CSSProperties;
                  return (
                    <li
                      key={n.unit_id}
                      data-unit={n.unit_id}
                      className={`path-node path-node--${state}${
                        pressedUnit === n.unit_id ? " path-node--pressed" : ""
                      }`}
                      data-testid={`path-node-${n.unit_id}`}
                      data-state={state}
                      data-kind={n.kind}
                      style={style}
                      onPointerDown={() => setPressedUnit(n.unit_id)}
                      onPointerUp={() => setPressedUnit((p) => (p === n.unit_id ? null : p))}
                      onPointerLeave={() => setPressedUnit((p) => (p === n.unit_id ? null : p))}
                      onPointerCancel={() => setPressedUnit((p) => (p === n.unit_id ? null : p))}
                    >
                      <span
                        className={`path-node-ring path-node-ring--${state}`}
                        data-testid={`path-ring-${n.unit_id}`}
                        data-fill={fill.toFixed(2)}
                        aria-hidden="true"
                      >
                        {i > 0 ? <span className="path-conn path-conn--up" /> : null}
                        {i + 1 < s.nodes.length ? (
                          <span className="path-conn path-conn--down" />
                        ) : null}
                        <svg viewBox="0 0 44 44" className="path-node-dial">
                          <circle className="path-node-track" cx="22" cy="22" r="18" />
                          <circle
                            className="path-node-arc"
                            cx="22"
                            cy="22"
                            r="18"
                            pathLength={100}
                            strokeDasharray={`${Math.round(fill * 100)} ${100 - Math.round(fill * 100)}`}
                          />
                        </svg>
                        <span className="path-node-marker">
                          {state === "locked" ? (
                            <PathLockGlyph />
                          ) : state === "done" ? (
                            // The market's completion mark: the kind
                            // pictogram gives way to the check, exactly as
                            // Duolingo's star does — and the sr-only word
                            // below names it in words.
                            "✓"
                          ) : state === "review-due" ? (
                            <PathGlyph glyph="review" />
                          ) : (
                            // ready / current / in-progress: the KIND
                            // pictogram replaces the old •/○/◉ text dot.
                            <PathGlyph glyph={n.kind} />
                          )}
                        </span>
                      </span>
                      <span className="path-node-body">
                        {/* PATH-NODE-TYPES-001 (a11y floor): the glyph is
                            never the only signal — every node names its
                            kind to the screen reader, and a done unit
                            (plain or review-due: both ARE completed) names
                            its completion in words too. */}
                        <span className="sr-only">{PATH_KIND_NAMES[n.kind] ?? n.kind}</span>
                        {state === "done" || state === "review-due" ? (
                          <span className="sr-only">Completed</span>
                        ) : null}
                        <span className="path-node-title">{n.title}</span>
                        {n.unit_id === pinTarget ? (
                          // PATH-PIN-CONSISTENCY-001: the ONE pin marks
                          // where the learner is (in-progress or first
                          // not-done), regardless of which unit the plan
                          // currently offers.
                          <span className="path-node-pin" data-testid="path-pin">
                            You are here
                          </span>
                        ) : null}
                        {state === "in-progress" ? (
                          <span className="path-node-progress">
                            In progress ({n.refs_done}/{n.refs_total} learned)
                          </span>
                        ) : null}
                        {state === "review-due" ? (
                          <span
                            className="path-node-review"
                            data-testid={`path-review-${n.unit_id}`}
                          >
                            Review due ({n.due_count})
                          </span>
                        ) : null}
                        {state === "locked" && n.unlock_hint ? (
                          <small className="path-node-hint">{n.unlock_hint}</small>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        );
      })}
    </section>
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
      <h2>Capabilities you are building</h2>
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
                          <li
                            key={d.modality}
                            data-coverage={`${d.concepts_seen}/${d.concepts_total}`}
                          >
                            <span className="meta">{modalityLabel(d.modality)}</span>{" "}
                            <span data-state={d.state}>{STATE_LABELS[d.state] ?? d.state}</span>
                            {/* PROGRESS-STATS-001 (U14): the same derived
                                state ladder, drawn as a bar toward the
                                modality gate. Dependency-free SVG; the
                                a11y contract matches SessionChrome's
                                progressbar semantics. */}
                            <svg
                              className="dim-progress"
                              width="120"
                              height="8"
                              role="progressbar"
                              aria-valuenow={d.progress_pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${modalityLabel(d.modality)} toward “${g.description}”: ${d.progress_pct}% of the gate`}
                              data-progress-pct={d.progress_pct}
                            >
                              <rect className="dim-progress-track" width="120" height="8" rx="4" />
                              <rect
                                className="dim-progress-fill"
                                width={(120 * Math.min(100, Math.max(0, d.progress_pct))) / 100}
                                height="8"
                                rx="2"
                              />
                            </svg>
                            {/* R09: the headline state is the weakest declared
                                concept, so a goal with one strong concept and
                                several untouched ones cannot read as achieved.
                                The furthest concept is named as an exemplar
                                and the remaining coverage is stated. */}
                            {d.concepts_total > 1 && d.state !== d.best_state ? (
                              // UI-HYGIENE-001: the furthest concept is
                              // named by its readable word (R09 kept the
                              // coverage honest); the raw pack id stays out
                              // of the learner's view.
                              <span className="meta">
                                {" "}
                                — {d.concepts_seen} of {d.concepts_total} parts have evidence; one
                                part is already {STATE_LABELS[d.best_state] ?? d.best_state}
                              </span>
                            ) : null}
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
                                  .map((pre) => {
                                    // UI-HYGIENE-001: a prerequisite names
                                    // a capability by its human description
                                    // (goals carry every goal in this
                                    // pack); never the raw goal or content
                                    // id, and never a kebab dimension.
                                    const named = goals.find((g) => g.id === pre.target);
                                    const state =
                                      STATE_LABELS[pre.required_state] ?? pre.required_state;
                                    return `${named ? `“${named.description}”` : "another capability"} — ${state} in ${modalityLabel(pre.dimension)}`;
                                  })
                                  .join("; ")}
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
