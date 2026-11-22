/**
 * WEB-HISTORY-001 journey: the browser back/forward walk over the app's
 * own state machine.
 *
 * The history shim (src/history-nav.ts) only installs when the serve
 * marker or the explicit __LTS_HISTORY flag is on — this journey turns
 * the flag on and drives the shipped <App/> exactly like the session
 * journey does, with one addition: a fake-browser over history. pushState
 * and replaceState are wrapped to mirror the entry stack; fakeBack() /
 * fakeForward() move the mirror pointer, set the live history state to
 * the entry being landed on, and dispatch popstate — the same three
 * facts a real traversal gives the page. (The real-browser mechanics —
 * the confirm flow's history.go walk and site exit — are proven in the
 * Chromium acceptance script under state/evidence/WEB-HISTORY-001/.)
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

interface FakeHistory {
  stack: (string | null)[];
  pos: number;
  fakeBack: () => Promise<void>;
  fakeForward: () => Promise<void>;
  top: () => string | null;
  restore: () => void;
}

/** Wrap history BEFORE the app mounts so the shim's own calls are the
 * mirrored ones. The stack starts as one unlabeled entry — the entry the
 * browser landed on. */
function installFakeHistory(): FakeHistory {
  const h = window.history;
  const realPush = h.pushState.bind(h);
  const realReplace = h.replaceState.bind(h);
  const fake: FakeHistory = {
    stack: [null],
    pos: 0,
    top: () => fake.stack[fake.pos] ?? null,
    fakeBack: async () => {
      if (fake.pos <= 0) throw new Error("fakeBack past the arrival entry — the app must exit here");
      fake.pos -= 1;
      realReplace(fake.top() === null ? null : { lts: fake.top() }, "");
      window.dispatchEvent(new Event("popstate"));
      await new Promise((r) => setTimeout(r, 0));
    },
    fakeForward: async () => {
      if (fake.pos >= fake.stack.length - 1) throw new Error("no forward entry");
      fake.pos += 1;
      realReplace(fake.top() === null ? null : { lts: fake.top() }, "");
      window.dispatchEvent(new Event("popstate"));
      await new Promise((r) => setTimeout(r, 0));
    },
    restore: () => {
      h.pushState = realPush;
      h.replaceState = realReplace;
    },
  };
  h.pushState = ((state: unknown, title: string, url?: string | URL | null) => {
    fake.stack = fake.stack.slice(0, fake.pos + 1);
    fake.stack.push((state as { lts?: string } | null)?.lts ?? null);
    fake.pos = fake.stack.length - 1;
    realPush(state, title, url);
  }) as typeof h.pushState;
  h.replaceState = ((state: unknown, title: string, url?: string | URL | null) => {
    const enc = (state as { lts?: string } | null)?.lts;
    if (enc !== undefined) fake.stack[fake.pos] = enc;
    realReplace(state, title, url);
  }) as typeof h.replaceState;
  return fake;
}

describe("browser history walk (WEB-HISTORY-001)", () => {
  let app: Mounted;
  let fake: FakeHistory;

  afterEach(async () => {
    fake?.restore();
    delete (window as unknown as Record<string, unknown>).__LTS_HISTORY;
    await app?.unmount();
  });

  async function mountWithHistory(): Promise<Mounted> {
    fake = installFakeHistory();
    (window as unknown as Record<string, unknown>).__LTS_HISTORY = true;
    const m = await mountApp(
      new LearnerEngine({
        profiles: [{ id: "dana", display_name: "Dana", active: JA }],
        installed: [JA],
      }),
    );
    await m.click(m.button(m.section("Profiles"), "Dana"));
    return m;
  }

  it("one entry per level, Back walks stage->session, guardrail asks before leaving the session", async () => {
    app = await mountWithHistory();

    // Arrived on Today: no entries were added, only the arrival entry is
    // labeled with the root location.
    expect(fake.stack).toEqual([""]);

    // Starting the session opens its first activity in one action, but
    // history still learns both levels: session, then stage.
    await app.click(app.button(app.section("Practice"), "Start today's plan"));
    await app.settle();
    expect(fake.stack).toEqual(["", "session", "session/stage"]);
    expect(fake.pos).toBe(2);

    // Back #1: stage -> session. The runner closes, the session stays
    // alive paused with its Resume control — the state machine's own
    // pause path, not a new one.
    await fake.fakeBack();
    await app.settle();
    expect(fake.pos).toBe(1);
    expect(app.text('[aria-label="Practice"]')).toContain("Session paused");
    app.button(app.section("Practice"), "Resume session");

    // Back #2 would leave the ACTIVE session: the guardrail asks instead.
    await fake.fakeBack();
    await app.settle();
    const ask = document.querySelector("[data-testid='history-exit-ask']");
    expect(ask).toBeTruthy();
    expect(ask?.textContent).toContain("middle of a session");
    // The session was NOT destroyed and the learner's position was
    // restored on top of the intercepted destination.
    expect(app.text('[aria-label="Practice"]')).toContain("Session paused");

    // "Keep working": the question goes away and the session survives.
    await app.click(app.button(ask as HTMLElement, "Keep working"));
    await app.settle();
    expect(document.querySelector("[data-testid='history-exit-ask']")).toBeNull();
    expect(app.text('[aria-label="Practice"]')).toContain("Session paused");
  });

  it("forward re-enters the SAME activity the session is on — never the next one", async () => {
    app = await mountWithHistory();
    await app.click(app.button(app.section("Practice"), "Start today's plan"));
    await app.settle();

    // Remember what the running activity shows, then pause via Back.
    const before = app.text('[aria-label="Practice"]');
    await fake.fakeBack();
    await app.settle();

    // Forward (mobile recents) re-opens the stage destination: the same
    // activity comes back and the session queue did not move.
    await fake.fakeForward();
    await app.settle();
    const after = app.text('[aria-label="Practice"]');
    expect(after).toBe(before);
    expect(fake.top()).toBe("session/stage");
  });

  it("tab changes get one entry each and Back re-lands the previous tab", async () => {
    app = await mountWithHistory();
    await app.click(app.button(app.section("Routes"), "Progress"));
    await app.settle();
    expect(fake.top()).toBe("progress");
    expect(fake.stack.slice(1)).toEqual(["progress"]);

    await fake.fakeBack();
    await app.settle();
    expect(fake.top()).toBe("");
    expect(app.text('[aria-label="Practice"]')).toContain("Start today's plan");
  });

  it("without the serve/harness flag nothing touches history (desktop unchanged)", async () => {
    // No __LTS_HISTORY here: the shim must not install at all.
    fake = installFakeHistory();
    app = await mountApp(
      new LearnerEngine({
        profiles: [{ id: "dana", display_name: "Dana", active: JA }],
        installed: [JA],
      }),
    );
    await app.click(app.button(app.section("Profiles"), "Dana"));
    await app.click(app.button(app.section("Practice"), "Start today's plan"));
    await app.settle();
    // Only the unlabeled arrival entry — no replaceState label, no pushes.
    expect(fake.stack).toEqual([null]);
  });
});
