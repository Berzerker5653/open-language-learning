// Per-surface extraction (APP-SPLIT-001): the serve-mode probe slice.
// Pure move out of App() — the App keeps owning every hook and the render;
// this module owns the serve-mode probe wiring only:
//  - SERVE-PAIR-ONBOARD-001: unpaired device probe (pairing-required reject)
//  - K-62 / WEB-PROGRESS-001: engine-progress state (desktop listener or the
//    serve bridge transport, feeding the SAME state whichever transport)
//  - WEB-SERVE-001 / SERVE-BANNER-001 / SETTINGS-SCOPE-001: capability report
//    → serve notice lines, the one-line degraded badge, mic-names availability
// Zero behavior change: identical state names, identical effect bodies.
import { useEffect, useState } from "react";
import {
  fetchCapabilities,
  inLtsServeMode,
  subscribeServeProgress,
} from "../ipc";
import type { EngineProgress } from "../progress";
import { serveDegradedBadge, type Invoke } from "./primitives";
import { progressStages } from "./walkthrough";

export function useServeProbe(inv: Invoke | null) {
  // SERVE-PAIR-ONBOARD-001: an unpaired device in serve mode can reach
  // neither the profile chooser nor Settings — every engine call is gated.
  // Probe once on entry; a "pairing required" rejection swaps the whole
  // wizard for the first-contact pairing card instead of a dead welcome
  // step. Paired devices and desktop mode are unaffected.
  const [serveUnpaired, setServeUnpaired] = useState(false);
  useEffect(() => {
    if (!inLtsServeMode()) return;
    if (serveUnpaired) return;
    let alive = true;
    (async () => {
      if (!inv) return;
      try {
        await inv("list_profiles");
      } catch (e) {
        if (alive && /pairing required/i.test(String(e))) setServeUnpaired(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [inv, serveUnpaired]);

  // K-62: one status line driven by what the engine reports, never by a timer
  // the UI invents. Stages are pushed to a module-level witness as well so the
  // headless walkthrough can prove the channel actually delivered them.
  const [engineProgress, setEngineProgress] = useState<EngineProgress | null>(null);

  // WEB-SERVE-001 scope 4: in browser-serve mode the app states honestly
  // what the serve bridge cannot do (install-progress events, and mic
  // capture where the browser blocks it). The text comes from the server's
  // capability report, never invented locally; nothing here changes a
  // stored privacy mode.
  // SERVE-BANNER-001 (market meta rule): these lines no longer stack above
  // every screen — they live in Settings > About this build, where the
  // build identity already lives. The App keeps them only to hand to the
  // Settings panel; Today may carry AT MOST the one-line degraded badge.
  const [serveNotice, setServeNotice] = useState<string[] | null>(null);
  const [serveBadge, setServeBadge] = useState<string | null>(null);
  // SETTINGS-SCOPE-001: the same capability report also decides whether the
  // Settings "Detect microphones" button can do anything: in an insecure
  // context the browser reveals no input names, so the button renders gray
  // with the server's own reason — the availability truth lives at exactly
  // one source (/api/capabilities), never in a local guess.
  const [serveMicNamesAvailable, setServeMicNamesAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!inLtsServeMode()) return;
    void fetchCapabilities().then((caps) => {
      if (!caps) {
        setServeNotice(["Browser mode: the serve bridge is unreachable right now."]);
        return;
      }
      if (typeof caps.microphone_names_available === "boolean") {
        setServeMicNamesAvailable(caps.microphone_names_available);
      }
      // SESSION-FLOW-COPY-001 (third dogfood repro): the capability lines
      // were JOINED into one sentence — "...labeled unavailable unchanged —
      // serve mode never rewrites..." read as word-salad. Each line rides as
      // its own notice row; the one line that floats without context
      // (privacy_modes starts "unchanged —") gets a plain-language lead-in.
      const parts = [
        // WEB-PROGRESS-001: whether progress streams is the server's report,
        // not a local assumption — an older serve build still says the truth.
        caps.install_progress_events
          ? "Browser mode: install progress streams live, the same stages the desktop shows."
          : "Browser mode: install progress is not streamed — results appear when the call lands.",
        caps.microphone_capture ?? "",
        caps.privacy_modes ? `Privacy settings: ${caps.privacy_modes}` : "",
      ].filter((s) => s.length > 0);
      setServeNotice(parts);
      setServeBadge(serveDegradedBadge(caps));
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // WEB-PROGRESS-001: in serve mode the stages arrive over the bridge
    // (`GET /api/progress/events`) and feed the SAME state the desktop
    // listener feeds — one progress UI, whichever transport carried the stage.
    if (inLtsServeMode())
      return subscribeServeProgress((p) => {
        progressStages.push(p);
        setEngineProgress(p);
      });
    // No bridge (plain browser tab, test DOM) means no event source: importing
    // the Tauri event API there would fail, so the listener is not registered.
    if (!("__TAURI_INTERNALS__" in window)) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<EngineProgress>("engine-progress", (e) => {
          progressStages.push(e.payload);
          setEngineProgress(e.payload);
        }),
      )
      .then((un) => {
        if (cancelled) un();
        else unlisten = un;
      })
      .catch(() => {
        // Progress is a nicety: losing it must never turn into an error the
        // learner sees, and the operation itself still reports its own failure.
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return { serveUnpaired, engineProgress, setEngineProgress, serveNotice, serveBadge, serveMicNamesAvailable };
}
