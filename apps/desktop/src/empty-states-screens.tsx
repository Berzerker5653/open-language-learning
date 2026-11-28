/**
 * EMPTY-STATES-001 evidence entry (dev-only; never shipped — vite builds it
 * only through apps/desktop/vite.empty-states-capture.config.ts).
 *
 * Mounts the real empty-state surfaces at 390px with zero learner data and
 * prints the measured audit (overflow + the empty-state contract) as JSON in
 * <pre id="audit-json"> so the capture script can extract it.
 *
 * Screens (URL hash): hub-empty | mywords-empty | progress-zero |
 *                     today-no-plan | path-empty
 */
import { createRoot } from "react-dom/client";
import "@openlang/ui/styles.css";
import { PracticeHub } from "./hub";
import { MyWordsPanel } from "./words";
import { ProgressZeroState } from "./memory-stats";
import { Home } from "./home";

const screen =
  (new URLSearchParams(window.location.search).get("shot") ??
    window.location.hash.replace(/^#/, "")) ||
  "hub-empty";
const noop = () => undefined;

const emptyPlan = { items: [], total_seconds: 0, budget_minutes: 5, seed: 1, planner_version: "v" };

function renderScreen() {
  switch (screen) {
    case "hub-empty":
      return <PracticeHub onOpen={noop} noPack onOpenLanguagePacks={noop} />;
    case "mywords-empty":
      return (
        <MyWordsPanel
          items={[]}
          loading={false}
          flashId={null}
          review={null}
          intervalPreview={null}
          error={null}
          notice={null}
          draft={{ surface: "", reading: "", gloss: "", source: "" }}
          onDraftChange={noop}
          onAdd={noop}
          onRemove={noop}
          onGrade={noop}
          onStartReview={noop}
          onReviewNow={noop}
          onStartNewReview={noop}
          onReveal={noop}
        />
      );
    case "progress-zero":
      return (
        <section aria-label="Progress">
          <h1>Progress</h1>
          <ProgressZeroState onStart={noop} />
        </section>
      );
    case "today-no-plan":
      return (
        <Home
          displayName="Hunter"
          plan={emptyPlan}
          activeBudget={5}
          onBudget={noop}
          onExplore={noop}
          onChooseLanguage={noop}
        />
      );
    case "path-empty":
      return (
        <Home
          displayName="Hunter"
          plan={emptyPlan}
          activeBudget={5}
          onBudget={noop}
          onExplore={noop}
          nextGoal={null}
          onChooseLanguage={noop}
        />
      );
    default:
      return <p>unknown screen {screen}</p>;
  }
}

const host = document.createElement("div");
host.id = "root";
document.body.appendChild(host);
createRoot(host).render(renderScreen());

// Audit: overflow + the designed empty-state contract, after first paint.
const SEL: Record<string, string> = {
  "hub-empty": "[data-testid=hub-empty]",
  "mywords-empty": "[data-testid=mywords-empty]",
  "progress-zero": ".progress-zero",
  "today-no-plan": "[data-testid=no-due-empty]",
  "path-empty": "[data-testid=path-empty]",
};
setTimeout(() => {
  const el = document.querySelector(SEL[screen] ?? ".empty-state");
  const glyph = el?.querySelector(".empty-glyph");
  const title = el?.querySelector(".empty-state-title, .progress-zero-lead");
  const copy = el?.querySelector(".empty-state-copy");
  const action = el?.querySelector(".empty-state-action, .progress-zero-action");
  const audit = {
    screen,
    overflow: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    },
    emptyState: Boolean(el),
    glyph: Boolean(glyph),
    title: title?.textContent?.trim() ?? null,
    copy: copy?.textContent?.trim() ?? null,
    action: action
      ? { tag: action.tagName.toLowerCase(), text: action.textContent?.trim() ?? null }
      : null,
    tapTarget: action ? action.getBoundingClientRect().height : null,
  };
  const pre = document.createElement("pre");
  pre.id = "audit-json";
  pre.style.display = "none";
  pre.textContent = JSON.stringify(audit);
  document.body.appendChild(pre);
}, 700);
