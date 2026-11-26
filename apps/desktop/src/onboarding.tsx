/**
 * UX-001 onboarding flow: privacy-first explanation, local profile
 * (no account), language-pack choice (install, locate a local pack file, or
 * skip and decide later), skippable microphone
 * setup, and — when the mic is enabled — a speech-setup step for the
 * speech components (K-72). Presentational component: state and IPC
 * live in the container so every step is renderable in tests.
 */
import { useState, type FormEvent } from "react";
import { progressLine, type EngineProgress } from "./progress";
import { PackText } from "@openlang/ui";
import { postServeJson } from "./ipc";
import type { InstalledPack } from "./language";

export interface PrivacyNotice {
  title: string;
  points: string[];
}

export interface PackCandidate {
  pack_id: string;
  display_name: string;
  locale: string;
  maturity: string;
  /** `capabilities.rtl` from the pack manifest (ADR-0029). */
  rtl: boolean;
  /**
   * What the pack catalogue currently offers for this pack, when a catalogue read
   * succeeded. `available_packs` itself carries no version (lib.rs), so App joins
   * it from `catalog_packs`; null means the app has no listed version to compare
   * against and must say nothing about versions.
   */
  available_version?: string | null;
}

export type OnboardingStep =
  "resume" | "welcome" | "packs" | "microphone" | "speech-setup" | "done";

/**
 * UX-PERSONA-001: the pack-list maturity tag is written in learner language.
 * The engine's trust-state words (experimental / community / validated /
 * verified / reference) name a policy the learner has no referent for; the
 * label below says what the learner gets, and MATURITY_MEANINGS keeps the
 * exact policy meaning one expander away. An unknown value falls back to the
 * raw tag — the row never invents a claim the pack did not make.
 */
export const MATURITY_LABELS: Record<string, string> = {
  experimental: "made by us, still being checked",
  community: "volunteer-made, we have not checked it",
  validated: "checked by language reviewers",
  verified: "fully reviewed and tested",
  reference: "our own maintained full course",
};

const MATURITY_MEANINGS: [string, string][] = [
  [
    "experimental",
    "Built by us; the content may still have mistakes because the checking is not finished.",
  ],
  [
    "community",
    "Made by volunteers; the automatic checks pass, but we have not checked the content ourselves.",
  ],
  ["validated", "Passed structure audits, and a human reviewer has sampled the content."],
  ["verified", "A defined amount of the content has been reviewed, and the speech checks pass."],
  ["reference", "Our own maintained course for this language."],
];

/**
 * One part of the speech stack (K-72): the sherpa runtime, the Japanese
 * voice, and recognition. Names are container-chosen; sizes are the
 * catalog's pinned bytes, so the download cost is honest up front.
 */
export interface SpeechComponent {
  id: string;
  name: string;
  installed: boolean;
  installable: boolean;
  size_bytes: number;
  /// "recognition" (learner's speech -> text) or "synthesis" (text -> voice).
  /// The start gate is about recognition; synthesis absence only changes what
  /// feedback the activities can give.
  role: "recognition" | "synthesis";
}

export interface ProfileSummary {
  id: string;
  display_name: string;
  /// UI-HYGIENE-001 (market audit U13): the chooser renders aligned
  /// cards, so the listing carries the pack studied, that pack's entry
  /// band, the due count and the last studied stamp. Any of them can be
  /// null when the engine could not read it — the card omits that line
  /// rather than inventing a state.
  pack?: string | null;
  band?: string | null;
  due_count?: number | null;
  last_studied?: string | null;
  hidden?: boolean;
}

/// The card initials for a profile name (U13: avatars, no names alone).
function profileInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join("") || "?";
}

/// A short, honest "last studied" line from the newest evidence stamp.
function lastStudiedLine(stamp: string | null | undefined): string {
  if (!stamp) return "No practice recorded yet";
  const when = new Date(stamp);
  if (Number.isNaN(when.getTime())) return "No practice recorded yet";
  const days = Math.floor((Date.now() - when.getTime()) / 86_400_000);
  if (days <= 0) return "Studied today";
  if (days === 1) return "Studied yesterday";
  if (days < 7) return `Studied ${days} days ago`;
  return `Studied ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(when)}`;
}

/// UI-HYGIENE-001: band tokens are framework vocabulary, so the chooser
/// glosses them the way the goal map does; `on-ramp` is this project's
/// pre-CEFR band. An unknown token is kept verbatim — a pack must not be
/// able to hide its band.
function bandShort(band: string): string {
  const key = band.trim().toLowerCase();
  if (key === "on-ramp") return "getting started";
  return key === "other" ? "unbanded" : key.toUpperCase();
}

export interface OnboardingProps {
  step: OnboardingStep;
  notice: PrivacyNotice;
  packs: PackCandidate[];
  selectedPack: string | null;
  installed: InstalledPack[];
  /** Set when the launch-time `installed_packs` read failed: installed
   * state is genuinely unknown, and the step says so rather than
   * rendering a confident-but-wrong Install button (sweep-ts-dup-install). */
  installedUnknown?: boolean;
  profileName: string;
  onProfileName(value: string): void;
  onCreateProfile(): void;
  onSelectPack(id: string): void;
  onInstall(id: string): void;
  /** Choose a `.lpk` file that is already on this device (owner 2026-10-12:
   * locating a downloaded pack belongs on the same page as choosing one). */
  onLocatePack(file: File): void;
  /** Finish setup with no active pack; the language is picked later in
   * Settings. The profile exists either way. */
  onSkipPack(): void;
  onEnableMic(): void;
  onSkipMic(): void;
  onInstallSpeech(): void;
  onSkipSpeech(): void;
  onStartSpeech(): void;
  speechComponents: SpeechComponent[];
  speechInstalling?: boolean;
  /** True once the learner answered "yes" to the microphone; adds the
   * Speech step to the progress stepper (K-72). */
  micChosen?: boolean;
  onContinue(): void;
  profiles?: ProfileSummary[];
  onResume(id: string): void;
  onCreateNew(): void;
  /// UI-HYGIENE-001: archived (hidden) profiles stay out of the chooser;
  /// this reveals them for un-hiding. `onToggleHidden` archives a profile
  /// back and forth — data is kept, the profile just leaves the list.
  showHiddenProfiles?: boolean;
  onShowHiddenProfiles?(show: boolean): void;
  onToggleHidden?(id: string, hidden: boolean): void;
  error?: string | null;
  progress?: EngineProgress | null;
  installing?: string | null;
  /**
   * Update an already-installed pack to the catalogue version. Required, not
   * optional: a row that can be stale must always render a working control.
   */
  onUpdatePack(packId: string): void;
}

// FEEL-ONBOARD-001: the wizard sequence, so completed steps can be derived.
// `resume` never joins the stepper (existing pin), and the Speech step only
// exists once the mic was chosen (K-72).
const STEP_LABELS: Record<Exclude<OnboardingStep, "resume">, string> = {
  welcome: "Welcome",
  packs: "Language",
  microphone: "Microphone",
  "speech-setup": "Speech",
  done: "Start",
};

const STEP_ORDER: Exclude<OnboardingStep, "resume">[] = [
  "welcome",
  "packs",
  "microphone",
  "speech-setup",
  "done",
];

const AVATAR_VARIANTS = 4;

/**
 * FEEL-ONBOARD-001: deterministic color variation for initials avatars.
 * FNV-1a over the profile id — the same person keeps the same color across
 * renders, restarts and machines; the palette pairs (styles.css) reuse
 * pinned token pairs only.
 */
export function avatarVariant(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % AVATAR_VARIANTS;
}

export function Onboarding(p: OnboardingProps) {
  // Continue needs a pack the engine can actually read: a selected pack that
  // is already on the device (bundled, catalog-installed, or located from a
  // file) unlocks it with no install click. Choosing a pack is not mandatory —
  // "Skip for now" finishes setup with no active pack, which the store and
  // every pack-scoped read already resolve to "nothing yet". After a failed
  // install the actionable paths are retry, another pack, or a local file;
  // Continue is explained, never silently disabled.
  const canContinue =
    p.selectedPack !== null && p.installed.some((i) => i.pack_id === p.selectedPack);
  // Sweep finding 22 (2026-10-26): "Start with speech" is disabled unless an
  // installed component can LISTEN (recognition). Synthesis alone produces the
  // pack's media but cannot hear an answer, so it does not unlock the button —
  // and that reason must be shown, not left as a dead button. Computed once
  // for both the button and the note that explains it.
  const canStartSpeech = p.speechComponents.some((c) => c.installed && c.role === "recognition");
  return (
    <section aria-label="Onboarding">
      {p.step !== "resume" &&
        (() => {
          const order = p.micChosen ? STEP_ORDER : STEP_ORDER.filter((s) => s !== "speech-setup");
          const current = order.indexOf(p.step as (typeof order)[number]);
          const isDone = (i: number) => current >= 0 && i < current;
          return (
            <ol aria-label="Progress" className="stepper">
              {order.map((s, i) => (
                <li
                  key={s}
                  aria-current={p.step === s ? "step" : undefined}
                  className={isDone(i) ? "stepper-done" : undefined}
                >
                  {/* FEEL-ONBOARD-001: completed steps carry a drawn stroke
                      check (check-draw) inside the ok-filled dot; the
                      connector behind them fills left→right (link-fill). */}
                  {isDone(i) ? (
                    <svg
                      className="step-check"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M5 10.5l3.4 3.4L15 7.3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                  {STEP_LABELS[s]}
                </li>
              ))}
            </ol>
          );
        })()}
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}
      {p.progress && (
        // K-62: installing a full language pack is not instant. The line names
        // the stage the engine reported; it never implies a percentage the
        // engine did not send. FEEL-ONBOARD-001 adds the bar the audit asked
        // for: it shows ONLY what EngineProgress carries — an eased fill when
        // a percent arrived, an honest indeterminate sweep (no aria value)
        // when it did not. No invented byte counts.
        <div className="install-progress" data-testid="install-progress">
          <p
            role="status"
            aria-live="polite"
            className="notice"
            data-testid="install-progress-line"
          >
            {progressLine(p.progress)}
          </p>
          {(() => {
            const pct =
              typeof p.progress!.percent === "number" && p.progress!.percent >= 0
                ? Math.min(100, p.progress!.percent)
                : null;
            return (
              <div
                className={pct === null ? "install-bar install-bar--unknown" : "install-bar"}
                data-testid="install-progress-bar"
                role="progressbar"
                aria-label={progressLine(p.progress)}
                aria-valuemin={pct === null ? undefined : 0}
                aria-valuemax={pct === null ? undefined : 100}
                aria-valuenow={pct === null ? undefined : pct}
                aria-valuetext={pct === null ? undefined : progressLine(p.progress)}
              >
                <span
                  className="install-bar-fill"
                  style={pct === null ? undefined : { width: `${pct}%` }}
                />
              </div>
            );
          })()}
        </div>
      )}

      {p.step === "resume" && (
        <div className="card">
          <h1>Welcome back</h1>
          <p>These profiles live on this device. Pick one to continue.</p>
          {(() => {
            const all = p.profiles ?? [];
            const visible = p.showHiddenProfiles ? all : all.filter((pr) => !pr.hidden);
            // U13: duplicate names read as duplicate people only when both
            // entries are contentless shells — no pack, no due count, no
            // practice stamp, which is exactly what automated test runs and
            // abandoned experiments leave behind. A profile that carries
            // recorded state is a real history and stays visible even when
            // it shares a name: restoring a backup deliberately creates a
            // second same-name profile the learner must be able to resume.
            const contentless = (pr: ProfileSummary) =>
              !pr.pack && typeof pr.due_count !== "number" && !pr.last_studied;
            const seen = new Set<string>();
            const deduped = visible.filter((pr) => {
              if (!contentless(pr)) return true;
              const key = pr.display_name.trim().toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            const hiddenCount = all.length - all.filter((pr) => !pr.hidden).length;
            return (
              <>
                <div role="group" aria-label="Profiles" className="profile-grid">
                  {deduped.map((profile) => (
                    <div key={profile.id} className="profile-card">
                      <span
                        className={`profile-avatar profile-avatar--v${avatarVariant(profile.id)}`}
                        aria-hidden="true"
                      >
                        {profileInitials(profile.display_name)}
                      </span>
                      <strong className="profile-name">{profile.display_name}</strong>
                      {profile.pack ? (
                        <span className="meta">
                          <PackText tag="span">{profile.pack}</PackText>
                          {profile.band ? ` · ${bandShort(profile.band)}` : ""}
                        </span>
                      ) : null}
                      <span className="meta">{lastStudiedLine(profile.last_studied)}</span>
                      <span className="meta">
                        {typeof profile.due_count === "number"
                          ? `${profile.due_count} ${profile.due_count === 1 ? "item" : "items"} due`
                          : "Due counts not loaded"}
                      </span>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="btn btn--primary"
                          aria-label={`Continue ${profile.display_name}`}
                          onClick={() => p.onResume(profile.id)}
                        >
                          Continue
                        </button>
                        {p.onToggleHidden ? (
                          <button
                            type="button"
                            className="btn btn--quiet"
                            onClick={() => void p.onToggleHidden?.(profile.id, !profile.hidden)}
                          >
                            {profile.hidden ? "Unhide" : "Hide"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                {deduped.length === 0 ? (
                  <div className="empty empty--warm" role="status" data-testid="profiles-empty">
                    {/* FEEL-ONBOARD-001: the first-run empty state gets calm
                      visual warmth — a line-art ring echoing the serif
                      identity — never confetti, sentence unchanged. */}
                    <svg
                      className="empty-glyph"
                      viewBox="0 0 32 32"
                      aria-hidden="true"
                      focusable="false"
                    >
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
                      <circle
                        cx="16"
                        cy="16"
                        r="3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <p>No profiles on this device yet.</p>
                  </div>
                ) : null}
                {hiddenCount > 0 && !p.showHiddenProfiles ? (
                  <p className="meta">
                    {hiddenCount} archived {hiddenCount === 1 ? "profile is" : "profiles are"}{" "}
                    hidden.{" "}
                    {p.onShowHiddenProfiles ? (
                      <button
                        type="button"
                        className="btn btn--quiet"
                        onClick={() => p.onShowHiddenProfiles?.(true)}
                      >
                        Show archived profiles
                      </button>
                    ) : null}
                  </p>
                ) : null}
                {p.showHiddenProfiles && p.onShowHiddenProfiles ? (
                  <p className="meta">
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => p.onShowHiddenProfiles?.(false)}
                    >
                      Hide archived profiles
                    </button>
                  </p>
                ) : null}
              </>
            );
          })()}
          <div className="btn-row">
            <button type="button" className="btn btn--quiet" onClick={p.onCreateNew}>
              Create a new profile
            </button>
          </div>
        </div>
      )}

      {p.step === "welcome" && (
        <div className="card card--step">
          <h1>{p.notice.title}</h1>
          <p>No account required. Everything stays on this device.</p>
          <ul>
            {p.notice.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="field">
            <label htmlFor="profile-name">Your name (local only)</label>
            <input
              id="profile-name"
              type="text"
              placeholder="e.g. Alex"
              value={p.profileName}
              onChange={(e) => p.onProfileName(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={p.onCreateProfile}
            disabled={p.profileName.trim() === ""}
            aria-describedby={p.profileName.trim() === "" ? "profile-create-note" : undefined}
          >
            Create local profile
          </button>
          {p.profileName.trim() === "" ? (
            <p className="notice" id="profile-create-note" role="status">
              Type a name for the profile on this device, then Create unlocks it. The name stays on
              this machine.
            </p>
          ) : null}
        </div>
      )}

      {p.step === "packs" && (
        <div className="card card--step">
          <h1>Choose a language pack</h1>
          {p.installedUnknown && (
            <p role="status" aria-live="polite" className="notice">
              The app could not check which packs are already installed. If a pack is already on
              this device, installing it again does nothing.
            </p>
          )}
          <fieldset>
            <legend>Available packs</legend>
            {p.packs.map((pack) => {
              const onDevice = p.installed.find((i) => i.pack_id === pack.pack_id);
              const listed = pack.available_version ?? null;
              const stale =
                onDevice !== undefined && listed !== null && listed !== onDevice.version;
              const versionLine =
                onDevice === undefined
                  ? null
                  : listed === null
                    ? `Version ${onDevice.version} is on this device.`
                    : listed === onDevice.version
                      ? `Version ${onDevice.version} is on this device. That matches the version the catalogue lists.`
                      : `Version ${onDevice.version} is on this device. The pack catalogue lists version ${listed}.`;
              return (
                <div key={pack.pack_id} className="radio-row">
                  <label>
                    <input
                      type="radio"
                      name="pack"
                      checked={p.selectedPack === pack.pack_id}
                      onChange={() => p.onSelectPack(pack.pack_id)}
                    />
                    <PackText rtl={pack.rtl} locale={pack.locale} tag="span">
                      {pack.display_name}
                    </PackText>{" "}
                    {/* F-04: the locale/maturity tag is already part of the
                        radio's accessible name via the label text; exposing
                        it again as child text made it read twice. */}
                    <span aria-hidden="true">
                      ({pack.locale}, {MATURITY_LABELS[pack.maturity] ?? pack.maturity})
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => p.onInstall(pack.pack_id)}
                    disabled={
                      onDevice !== undefined ||
                      (p.installing !== null && p.installing !== undefined)
                    }
                    aria-busy={p.installing === pack.pack_id}
                    aria-label={
                      onDevice !== undefined
                        ? `Installed: ${pack.display_name} (${pack.locale})`
                        : p.installing === pack.pack_id
                          ? `Installing ${pack.display_name}`
                          : `Install ${pack.display_name} (${pack.locale})`
                    }
                  >
                    {onDevice !== undefined
                      ? "Installed"
                      : p.installing === pack.pack_id
                        ? "Installing…"
                        : "Install"}
                  </button>
                  {stale ? (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => p.onUpdatePack(pack.pack_id)}
                      disabled={p.installing !== null && p.installing !== undefined}
                      aria-busy={p.installing === pack.pack_id}
                    >
                      Update to v{listed}
                    </button>
                  ) : null}
                  {versionLine ? (
                    <p className={stale ? "notice pack-version" : "meta pack-version"}>
                      {versionLine}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </fieldset>
          {/* UX-PERSONA-001: the learner-facing label on each row is the plain
              outcome; the exact policy meaning stays one expander away. The
              import/change-later guidance folds into the same disclosure —
              a second always-visible block pushed the footer below the fold
              at 1366x768 (fold acceptance, acceptance item 3). */}
          <details className="maturity-meanings">
            <summary>What the labels on the pack rows mean</summary>
            <ul>
              {MATURITY_MEANINGS.map(([tag, meaning]) => (
                <li key={tag}>
                  <strong>{MATURITY_LABELS[tag]}</strong> — {meaning}
                </li>
              ))}
            </ul>
            <p>
              <small>
                A pack you already downloaded can be located here: it goes through the same
                validation as a catalog install, and once it is on this device you can select it
                without installing anything else. You can also import packs or change the language
                you are learning later from the Language packs section of Settings. This never
                changes the app&apos;s own interface language.
              </small>
            </p>
          </details>
          <input
            type="file"
            accept=".lpk"
            aria-label="Locate a language pack file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.onLocatePack(f);
            }}
          />
          {!canContinue ? (
            <p
              className="notice"
              id="packs-continue-note"
              data-testid="packs-continue-note"
              role="status"
            >
              {p.error
                ? "The install did not complete, so nothing was changed. Press Install again to retry this pack, select a different pack, or locate a pack file from this device — Continue unlocks once a pack is installed."
                : "Select an installed pack to continue, or skip this and choose the language later in Settings."}
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            onClick={p.onContinue}
            disabled={!canContinue}
            aria-describedby={canContinue ? undefined : "packs-continue-note"}
          >
            Continue
          </button>
          <button type="button" className="btn btn--quiet" onClick={p.onSkipPack}>
            Skip for now
          </button>
        </div>
      )}

      {p.step === "microphone" && (
        <div className="card card--step">
          <h1>Microphone (optional)</h1>
          <p>
            Speaking activities need a microphone, but it is never required. Skip it and everything
            stays text-only — you can turn the microphone on later in Settings, and skipping never
            blocks progress. If you turn it on, the next step offers the speech downloads for you,
            so there is nothing to hunt for yourself.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={p.onEnableMic}>
              Enable microphone
            </button>
            <button type="button" className="btn btn--quiet" onClick={p.onSkipMic}>
              Skip for now
            </button>
          </div>
        </div>
      )}
      {p.step === "speech-setup" && (
        <div className="card card--step">
          <h1>Speech setup</h1>
          <p>
            Speech components are downloaded once to this computer and shared by every language.
            Installing them now is optional — skipping is a clean choice and the app will offer the
            download wherever an activity needs it — but without them those activities stay
            text-only.
          </p>
          {p.selectedPack === null ? (
            // The components install independently of any pack, but the
            // activities they serve read content from the profile's language.
            // Saying so here is the difference between a deferral and a dead
            // end (owner 2026-10-12: skipping the pack left this step looking
            // like it had nothing to switch on).
            <p className="notice" role="status">
              This profile has no language chosen yet, so speaking activities stay unavailable until
              one is set under Settings → Language packs. Installing these components does not
              change that, and skipping here never blocks setup.
            </p>
          ) : null}
          <ul className="speech-components">
            {p.speechComponents.map((c) => (
              <li key={c.id}>
                {c.name}{" "}
                <span className="meta">({c.role === "recognition" ? "listens" : "speaks"})</span>:{" "}
                {c.installed ? (
                  <span>installed</span>
                ) : (
                  <span>
                    not installed ({Math.round(c.size_bytes / 1e6)} MB
                    {c.installable ? "" : ", not downloadable in this build"})
                  </span>
                )}
              </li>
            ))}
          </ul>
          {p.speechComponents.length === 0 ? (
            // An empty list must never read as two dead buttons: name the
            // state and the clean way out.
            <p className="notice" role="status">
              No speech components could be listed in this build, so there is nothing to install
              from here. Speaking and listening stay text-only for now; skip this step and Settings
              retries the listing later.
            </p>
          ) : null}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={p.onInstallSpeech}
              disabled={
                p.speechInstalling === true ||
                p.speechComponents.every((c) => c.installed || !c.installable)
              }
              aria-busy={p.speechInstalling === true || undefined}
            >
              {p.speechInstalling === true ? "Installing…" : "Install speech components"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={p.onStartSpeech}
              // Speaking needs a recognition model; K-90 made pack media the
              // only spoken audio, and it rides on top of these activities —
              // a pack with no recording still runs them honestly.
              disabled={!canStartSpeech}
              aria-describedby={!canStartSpeech ? "speech-start-note" : undefined}
            >
              Start with speech
            </button>
            {!canStartSpeech && p.speechComponents.length > 0 ? (
              // A dead primary button with no cause mapping is the a11y defect:
              // name exactly what is missing and how the button unlocks. The
              // list above prints each component's role so "listens" ties back.
              <p className="notice" id="speech-start-note" role="status">
                Speaking needs a speech component that can listen (recognition), and none installed
                here can yet. Install one above to unlock Start with speech, or skip for now and
                everything stays text-only.
              </p>
            ) : null}
            <button type="button" className="btn btn--quiet" onClick={p.onSkipSpeech}>
              Skip for now
            </button>
          </div>
        </div>
      )}

      {p.step === "done" && (
        <div className="card card--step">
          <h1>Ready</h1>
          <p>
            {p.selectedPack
              ? "Profile created locally, with the language pack installed. Microphone and speech can be enabled anytime."
              : "Profile created locally with no language chosen yet, so there is nothing to practice from until you set one under Settings → Language packs."}
          </p>
          <button type="button" className="btn btn--primary" onClick={p.onContinue}>
            Start learning
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * SERVE-PAIR-ONBOARD-001: the serve mode's first-contact pairing card.
 *
 * An unpaired device opens the served page and can reach neither the
 * profile chooser (every /api call is gated, `pairing required`) nor
 * Settings — so this card lives on the static onboarding screen. It renders
 * before any session exists, names where the PIN comes from (the computer
 * running LTS), and never claims a capability the serve bridge does not
 * have: the copy names only local-network pairing. The submit is disabled
 * until a PIN is entered — a button that cannot do anything is worse than
 * a visibly disabled one. The pair flow posts to the bridge's own `/pair`
 * endpoint (same shape as LanAccessCard); the live flow is verified against
 * a real serve, not the SSR suite.
 */
export function ServePairingCard() {
  const [pin, setPin] = useState("");
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = pin.trim().length > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pairing) return;
    setPairing(true);
    setError(null);
    try {
      await postServeJson("/pair", { pin });
      // Success — the pairing cookie is set. A fresh boot re-enters the
      // normal flow, which passes the gate.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pairing failed.");
      setPairing(false);
    }
  }

  return (
    <div className="card card--step" data-testid="serve-pairing-card" id="serve-pair-card">
      <h1>Local network access</h1>
      <p>
        This screen is shared over the local network. To pair this device, get the 6-digit pairing
        PIN from the computer running LTS — Settings → Local network access — then enter it here.
      </p>
      <form onSubmit={onSubmit}>
        <label htmlFor="serve-pair-pin">Pairing PIN</label>{" "}
        <input
          id="serve-pair-pin"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />{" "}
        <button
          type="submit"
          data-testid="serve-pair-submit"
          disabled={!ready || pairing}
          aria-busy={pairing || undefined}
        >
          Pair this device
        </button>
      </form>
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}
      <p className="meta">
        Pairing happens on the local network only — nothing leaves it. A PIN is spent on the first
        successful device.
      </p>
    </div>
  );
}
