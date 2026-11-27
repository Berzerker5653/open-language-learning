/**
 * G4-EXPLAIN-001 (AI-001 first slice): the explain wiring — every decision
 * the Explain affordance makes, as a pure function over an injected `inv`,
 * per the app/ wiring style. The owner-locked posture (2026-11-23):
 * explanations are INFORMATION ONLY — never a grade, never mastery or
 * scheduler evidence — and the provider is off unless the learner typed an
 * endpoint AND granted consent.
 */

export interface ExplainSettingsView {
  ai_enabled: boolean;
  ai_base_url: string;
  ai_model: string;
  consent_granted: boolean;
}

export type ExplainStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "consent" }
  | { kind: "unavailable"; reason: string }
  | { kind: "ready"; text: string };

export interface ExplainDeps {
  inv(cmd: string, args?: Record<string, unknown>): Promise<unknown>;
  profileId: string | null;
  /** The card text that the learner consents to sending. */
  cardText: string;
  /** Learner-side language code (what the explanation will be written in). */
  l1: string;
  /** The language being learned. */
  l2: string;
}

/**
 * G4-EXPLAIN-001 contract test support: the ONLY commands the explain path
 * may ever invoke. Anything outside this whitelist — especially every
 * scheduler/progress/mastery command the app knows — is a contract breach,
 * and `explain-wiring.test.ts` pins that the flow never leaves the set.
 */
export const EXPLAIN_ALLOWED_COMMANDS = [
  "explain_settings",
  "set_explain_consent",
  "explain_card",
] as const;

async function fetchSettings(d: ExplainDeps): Promise<ExplainSettingsView | null> {
  if (!d.profileId) return null;
  try {
    return (await d.inv("explain_settings", { profileId: d.profileId })) as ExplainSettingsView;
  } catch {
    return null;
  }
}

async function request(d: ExplainDeps): Promise<ExplainStatus> {
  try {
    const out = await d.inv("explain_card", {
      profileId: d.profileId,
      cardText: d.cardText,
      l1: d.l1,
      l2: d.l2,
    });
    const text = typeof out === "string" ? out.trim() : "";
    if (!text) {
      return { kind: "unavailable", reason: "the provider returned an empty explanation" };
    }
    return { kind: "ready", text };
  } catch (e) {
    // Honest and quiet: the core app behaves exactly as it did before AI.
    return { kind: "unavailable", reason: String(e) };
  }
}

/** Pressing Explain: read the gate, then either consent-gate, request, or say unavailable. */
export async function runExplainPress(d: ExplainDeps): Promise<ExplainStatus> {
  if (!d.cardText.trim()) {
    return { kind: "unavailable", reason: "there is nothing on this card to explain" };
  }
  const settings = await fetchSettings(d);
  if (!settings) {
    return { kind: "unavailable", reason: "the explanation settings could not be read" };
  }
  if (!settings.ai_enabled || settings.ai_base_url.trim() === "") {
    return {
      kind: "unavailable",
      reason: "AI explanations are off — the app is not configured with an explanation model",
    };
  }
  if (!settings.consent_granted) {
    // First-ever explain asks; the notice names exactly what is sent.
    return { kind: "consent" };
  }
  return request(d);
}

/** Accepting the consent notice stores the consent, then runs the request. */
export async function runExplainConsentAccept(d: ExplainDeps): Promise<ExplainStatus> {
  if (!d.profileId) return { kind: "unavailable", reason: "no profile is active" };
  try {
    await d.inv("set_explain_consent", { profileId: d.profileId, granted: true });
  } catch (e) {
    return { kind: "unavailable", reason: `consent could not be stored: ${String(e)}` };
  }
  return request(d);
}

/** Declining sends nothing at all — no provider call, no consent write. */
export function runExplainConsentDecline(): ExplainStatus {
  return { kind: "idle" };
}

/** The human-readable direction line the consent notice must name. */
export function explainDirection(d: { l1: string; l2: string }): string {
  return `${d.l1} → ${d.l2}`;
}
