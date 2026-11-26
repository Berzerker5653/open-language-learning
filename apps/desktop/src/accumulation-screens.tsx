/**
 * ACCUMULATION-METERS-001 evidence entry (dev-only; never shipped — vite
 * builds it only through apps/desktop/vite.accumulation-capture.config.ts).
 *
 * Mounts the real Home with the pack settled, a kept-words count and a
 * worlds read, and prints the measured audit (overflow + the meters' own
 * one-line geometry) as JSON in <pre id="audit-json"> so the capture script
 * can extract it.
 */
import { createRoot } from "react-dom/client";
import "@openlang/ui/styles.css";
import { Home } from "./home";

const noop = () => undefined;

const plan = {
  items: [],
  total_seconds: 0,
  budget_minutes: 5,
  seed: 1,
  planner_version: "v",
};

const ui = (
  <Home
    displayName="Hunter"
    plan={plan}
    activeBudget={5}
    onBudget={noop}
    activePack={{ name: "Japanese Reference Pack (Draft)", posture: "AI-generated" }}
    myWordsCount={7}
    worlds={{ unlocked: 2, total: 5 }}
  />
);

const host = document.createElement("div");
host.id = "root";
document.body.appendChild(host);
createRoot(host).render(ui);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Audit: overflow + the meters' geometry, after first paint.
void (async () => {
  await sleep(700);
  const strip = document.querySelector("[data-testid=accumulation-meters]");
  const myWords = document.querySelector("[data-testid=meter-my-words]");
  const worlds = document.querySelector("[data-testid=meter-worlds]");
  const r = (el: Element | null) =>
    el ? { top: Math.round(el.getBoundingClientRect().top), height: Math.round(el.getBoundingClientRect().height) } : null;
  const audit = {
    screen: "today-meters",
    overflow: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    stripRendered: Boolean(strip),
    myWords: myWords ? { text: myWords.textContent?.trim() ?? null, ...r(myWords) } : null,
    worlds: worlds ? { text: worlds.textContent?.trim() ?? null, ...r(worlds) } : null,
    stripHeight: strip ? Math.round(strip.getBoundingClientRect().height) : null,
    stripScrollW: strip ? strip.scrollWidth : null,
    stripClientW: strip ? strip.clientWidth : null,
  };
  const pre = document.createElement("pre");
  pre.id = "audit-json";
  pre.style.display = "none";
  pre.textContent = JSON.stringify(audit);
  document.body.appendChild(pre);
})();
