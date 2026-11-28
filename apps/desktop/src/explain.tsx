/**
 * G4-EXPLAIN-001: the Explain affordance on the activity card. All decisions
 * live in `app/explain-wiring.ts`; this file is the view + state glue. The
 * panel is an information surface only — it never shows a grade, and every
 * failure path is the honest "explanation unavailable" state the contract
 * demands (AI-001: the core app behaves exactly as before with AI off).
 */
import { useState } from "react";
import {
  runExplainConsentAccept,
  runExplainConsentDecline,
  runExplainPress,
  type ExplainDeps,
  type ExplainStatus,
} from "./app/explain-wiring";

export interface ExplainViewProps {
  status: ExplainStatus;
  cardText: string;
  l1: string;
  l2: string;
  onPress(): void;
  onConsentAccept(): void;
  onConsentDecline(): void;
}

/** The pure render surface — pinned statically in explain.test.tsx. */
export function ExplainView(p: ExplainViewProps) {
  return (
    <div className="explain" data-testid="explain">
      {p.status.kind === "idle" && (
        <button type="button" className="btn btn--quiet" onClick={p.onPress}>
          Explain
        </button>
      )}
      {p.status.kind === "loading" && (
        <p role="status" aria-live="polite" data-testid="explain-loading">
          Explaining…
        </p>
      )}
      {p.status.kind === "consent" && (
        <div className="card" role="dialog" aria-label="Send this card to your AI model?">
          <p>
            The explanation comes from the AI model you configured. Sending means sending exactly
            this:
          </p>
          <ul>
            <li>
              the card text you are looking at: <q>{p.cardText}</q>
            </li>
            <li>
              the learning direction: {p.l1} → {p.l2}
            </li>
          </ul>
          <p>
            <small>
              Nothing about this exchange is stored by the app: no transcript is kept, and an
              explanation is never a grade or mastery evidence. You can revoke this permission any
              time in Settings.
            </small>
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="explain-consent-accept"
              onClick={p.onConsentAccept}
            >
              Send for an explanation
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              data-testid="explain-consent-decline"
              onClick={p.onConsentDecline}
            >
              Not now
            </button>
          </div>
        </div>
      )}
      {p.status.kind === "unavailable" && (
        <p className="notice" role="status" data-testid="explain-unavailable">
          Explanation unavailable.{" "}
          <small>
            {p.status.notice} — the card above is unchanged, and nothing was stored about this.
          </small>
        </p>
      )}
      {p.status.kind === "ready" && (
        <div className="card" data-testid="explain-answer">
          <p>{p.status.text}</p>
          <p>
            <small data-testid="explain-info-only">
              This is information only. It is never a grade, it changes nothing about your plan, and
              it is not stored.
            </small>
          </p>
        </div>
      )}
    </div>
  );
}

export interface ExplainPanelProps extends Pick<
  ExplainDeps,
  "profileId" | "cardText" | "l1" | "l2"
> {
  /** Null bridge (no engine) is honest: pressing Explain reports unavailable. */
  inv: ExplainDeps["inv"] | null;
}

/** State glue: one Explain press reads the gate; the view renders the status. */
export function ExplainPanel(p: ExplainPanelProps) {
  const [status, setStatus] = useState<ExplainStatus>({ kind: "idle" });
  const deps: ExplainDeps = {
    inv:
      p.inv ??
      (async (cmd: string) => {
        throw new Error(`${cmd} is unavailable without the app engine`);
      }),
    profileId: p.profileId,
    cardText: p.cardText,
    l1: p.l1,
    l2: p.l2,
  };
  return (
    <ExplainView
      status={status}
      cardText={p.cardText}
      l1={p.l1}
      l2={p.l2}
      onPress={() => {
        setStatus({ kind: "loading" });
        void runExplainPress(deps).then(setStatus);
      }}
      onConsentAccept={() => {
        setStatus({ kind: "loading" });
        void runExplainConsentAccept(deps).then(setStatus);
      }}
      onConsentDecline={() => setStatus(runExplainConsentDecline())}
    />
  );
}
