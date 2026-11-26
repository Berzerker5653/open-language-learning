/**
 * Pure, side-effect-free helpers shared by the desktop host (App.tsx) and
 * its sibling modules. Extracted from App.tsx (APP-SPLIT-001): zero behavior
 * change — same code, same module scope semantics, relocated. App.tsx keeps
 * the walkthrough handshake state (progressStages/walkthroughRan) and the
 * App component itself.
 */
import { invoke } from "@tauri-apps/api/core";
import { httpInvoke, inLtsServeMode, type ServeCapabilities } from "../ipc";
import type { SessionPlan } from "../home";

export type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

/** Resolves with `value` after `ms`: a bounded wait, never an open-ended one. */
export function after<T>(ms: number, value: T): Promise<T> {
  const { promise, resolve } = Promise.withResolvers<T>();
  setTimeout(() => resolve(value), ms);
  return promise;
}

/** Tauri IPC when running inside the native shell; the HTTP bridge when the
 * page came from `lts-serve` (WEB-SERVE-001, single adapter in ./ipc); null
 * in plain browser/vitest runs, where the flow stays purely local. */
export function detectInvoke(): Invoke | null {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return (cmd, args) =>
      invoke(cmd, args).catch((e: unknown) => Promise.reject(explainPackAbsence(e)));
  }
  if (inLtsServeMode()) {
    return (cmd, args) =>
      httpInvoke(cmd, args).catch((e: unknown) => Promise.reject(explainPackAbsence(e)));
  }
  return null;
}

/**
 * D7: honest refusal copy for a profile with no active pack. Nothing is
 * ever built against a guessed pack id, so the message names the fix
 * (the Settings → Language packs section is where a pack becomes active).
 */
export const NO_ACTIVE_PACK =
  "No pack is active for this profile. Choose one under Settings → Language packs.";

/** The engine's fixed tokens for "this profile has no language chosen yet".
 * Every route renders its failure through `String(e)`, so translating once at
 * the IPC boundary turns a bare token into the sentence that names the fix —
 * a dead end with a way out is not a dead end (owner 2026-10-12). */
const PACK_ABSENCE_TOKENS = ["no active language pack"] as const;

export function explainPackAbsence(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return (PACK_ABSENCE_TOKENS as readonly string[]).includes(message) ? NO_ACTIVE_PACK : message;
}

/**
 * The pack a session practises with, resolved from the profile itself.
 * `active_pack` returns the ids the profile selected at onboarding: the
 * first is the active one, an empty list means none is active, and more
 * than one distinct id is a conflict the app surfaces instead of picking
 * through silently. Never falls back to a default pack id.
 */
export type SessionPack = {
  packId: string | null;
  ids: string[];
  note: string | null;
};

export async function loadSessionPack(inv: Invoke, profileId: string): Promise<SessionPack> {
  const ids = (await inv("active_pack", { profileId })) as string[];
  return { packId: ids[0] ?? null, ids, note: activePackNote(ids) };
}

/**
 * A note for the ambiguous case: the profile reports more than one
 * *different* active pack. The first one is used, and the conflict is
 * surfaced instead of guessed away. Repeats of one id are not a conflict.
 */
export function activePackNote(ids: string[]): string | null {
  const others = ids.slice(1).filter((id) => id !== ids[0]);
  return others.length > 0
    ? `This profile has more than one active pack (${ids.join(", ")}). Using ${ids[0]}; choose a single pack under Settings → Language packs.`
    : null;
}

/**
 * SERVE-BANNER-001 (market meta rule, PROGRESSION-UX-AUDIT-2026-11-22): the
 * full capability report lives in Settings > About this build — meta never
 * occupies the learner's first screen. A screen may carry AT MOST this
 * one-line badge, and only when the server's own report degrades a
 * capability for the current origin: the secure-context rule says this
 * address cannot reach the microphone, so speaking activities will say so.
 * Healthy localhost serve, an older bridge that says nothing, and an
 * unreachable bridge all render NO badge — those notes are for About.
 */
export function serveDegradedBadge(caps: ServeCapabilities | null): string | null {
  if (!caps) return null;
  if (caps.microphone_names_available === false) {
    return "Speaking here is limited: this address is not a secure context, so the browser blocks the microphone — open the app over https or localhost.";
  }
  return null;
}

/**
 * Outcome of a pack-scoped native call. `ok: false` is the refusal path:
 * no pack is active, so the command was never invoked.
 */
export type PackRequest<T> = { ok: true; packId: string; value: T } | { ok: false; error: string };

/** A pack-scoped command with the pack id at the top level of the payload
 * (the IPC spelling of the engine's `pack_id` argument). */
export async function packRequest<T>(
  inv: Invoke,
  packId: string | null,
  cmd: string,
  args: Record<string, unknown>,
): Promise<PackRequest<T>> {
  if (!packId) return { ok: false, error: NO_ACTIVE_PACK };
  return { ok: true, packId, value: (await inv(cmd, { packId, ...args })) as T };
}

/** The same guard for the speech attempts, which carry the pack id as
 * `pack_id` inside the nested `attempt` payload. */
export async function packAttemptRequest<T>(
  inv: Invoke,
  packId: string | null,
  cmd: string,
  attempt: Record<string, unknown>,
): Promise<PackRequest<T>> {
  if (!packId) return { ok: false, error: NO_ACTIVE_PACK };
  const payload = { attempt: { pack_id: packId, ...attempt } };
  return { ok: true, packId, value: (await inv(cmd, payload)) as T };
}

// SESSION-FLOW-COPY-001: how long the "Next: <what>" inter-activity bridge
// stays up before the session opens the next runner. Short enough that it
// reads as a transition, long enough to be a calm, announced one.
export const SESSION_BRIDGE_MS = 1200;

export const EMPTY_PLAN: SessionPlan = {
  items: [],
  total_seconds: 0,
  budget_minutes: 5,
  seed: 0,
  planner_version: "session-planner-0.1.0",
};

/** Mono 16-bit PCM WAV (the native command's audio envelope). */
export function toWav16(samples: Int16Array, rate: number): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const wstr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  wstr(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  wstr(8, "WAVE");
  wstr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wstr(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, samples[i] ?? 0, true);
  return new Uint8Array(buf);
}

export function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
  return btoa(bin);
}
