/**
 * EMPTY-STATES-001: one designed contract for every empty surface — a
 * light line-art glyph (serif-identity line, never emoji or stock icons),
 * one honest one-line title, an optional honest copy line, and one
 * action-appropriate affordance. All paint comes from the app's existing
 * tokens (--accent, --ink, --ink-faint, --surface, --line) — no inline hex.
 *
 * Honesty rules (contract): the glyph states nothing the engine didn't
 * report; the title names the state plainly; every affordance points at a
 * real control that resolves the state. Nothing here invents a capability.
 */
export type EmptyGlyphKind = "ring" | "compass" | "book" | "path" | "sprout";

function GlyphLines({ kind }: { kind: EmptyGlyphKind }) {
  // Light line-art: same weight as the onboarding empty ring (1.5 stroke),
  // all 1.5px strokes over a 32px viewBox, currentColor.
  switch (kind) {
    case "ring":
      return (
        <>
          <circle
            cx="16"
            cy="16"
            r="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            strokeLinecap="round"
          />
          <circle cx="16" cy="16" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </>
      );
    case "compass":
      return (
        <>
          <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M21.5 10.5 18 18l-7.5 3.5L14 14z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </>
      );
    case "book":
      return (
        <>
          <path
            d="M4 8.5c3.5-1.7 7-1.7 12 0 5-1.7 8.5-1.7 12 0v14.5c-3.5-1.7-7-1.7-12 0-5-1.7-8.5-1.7-12 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M16 8.5V23"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      );
    case "path":
      return (
        <>
          <path
            d="M4 26c8-2 4-10 10-13 5-2.5 4-8.5 12-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="4" cy="26" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="26" cy="5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </>
      );
    case "sprout":
      return (
        <>
          <path
            d="M16 27V14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16 16c0-5 3.5-8 9-8 0 5-3.5 8-9 8z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M16 20c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </>
      );
  }
}

export function EmptyGlyph({ kind, className }: { kind: EmptyGlyphKind; className?: string }) {
  return (
    <svg
      className={className ?? "empty-glyph"}
      viewBox="0 0 32 32"
      width="2rem"
      height="2rem"
      aria-hidden="true"
      focusable="false"
    >
      <GlyphLines kind={kind} />
    </svg>
  );
}

export function EmptyState({
  glyph,
  title,
  copy,
  actionLabel,
  onAction,
  actionHref,
  dataTestId,
  role = "status",
}: {
  glyph: EmptyGlyphKind;
  /// The one honest one-line title.
  title: string;
  /// Optional honest secondary line.
  copy?: string;
  /// One action-appropriate affordance: a real control, never a decorative
  /// stub. `actionHref` renders a link (e.g. anchor to the add form);
  /// otherwise `onAction` renders a button. Undefined renders none.
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  dataTestId?: string;
  role?: "status" | "note";
}) {
  return (
    <div className="empty empty--warm empty-state" role={role} data-testid={dataTestId}>
      <EmptyGlyph kind={glyph} />
      <p className="empty-state-title">{title}</p>
      {copy ? <p className="meta empty-state-copy">{copy}</p> : null}
      {actionLabel ? (
        actionHref ? (
          <a className="btn btn--quiet empty-state-action" href={actionHref}>
            {actionLabel}
          </a>
        ) : onAction ? (
          <button type="button" className="btn btn--quiet empty-state-action" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null
      ) : null}
    </div>
  );
}
