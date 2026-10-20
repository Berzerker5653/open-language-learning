// PERF-002: app-side measurement for the two budget lines the CLI benchmarks
// cannot answer — `app.ui_responsiveness_during_inference.main_thread_max_block_ms`
// and `..._p95.input_to_paint_ms` (docs/performance/BUDGETS.yaml). It runs
// only inside the headless smoke walkthrough (LTS_SMOKE_FILE + LTS_SMOKE_PERF
// are both set); a normal learner session never loads this code path.
//
// What it measures, honestly labelled:
// - rafmax: worst gap between animation frames inside a window. In a webview
//   that is the main-thread blocking proxy the budget names.
// - inp:  time from a synthetic key event to the next double-frame paint —
//   the input-to-paint the budget names, without pretending a human typed.
// - longtasks: PerformanceObserver long-task entries; if the webview does not
//   support them the probe says so in a marker instead of reporting zero.
//
// Cancellation (`app.cancellation.asr_cancel_effect_ms`) is NOT measured: the
// shipped whisper-cli invocation has no cancel path, so the App side emits an
// explicit abstention marker rather than a number from a fake seam.

export type PerfAck = (note: string) => Promise<unknown>;

export interface PerfWindowAgg {
  rafMaxMs: number;
  longTasks: number;
  inputToPaintMaxMs: number;
  windows: number;
}

/// Pure aggregation + marker grammar. The DOM glue below feeds it; the unit
/// test drives it directly with fake frames.
export class PerfProbeCore {
  private readonly agg = new Map<string, PerfWindowAgg>();
  longTasksSupported = true;

  openWindow(label: string): void {
    const a = this.agg.get(label);
    if (a) a.windows += 1;
    else
      this.agg.set(label, {
        rafMaxMs: 0,
        longTasks: 0,
        inputToPaintMaxMs: 0,
        windows: 1,
      });
  }

  frame(label: string, gapMs: number): void {
    const a = this.agg.get(label);
    if (a && gapMs > a.rafMaxMs) a.rafMaxMs = gapMs;
  }

  longTask(label: string): void {
    const a = this.agg.get(label);
    if (a) a.longTasks += 1;
  }

  inputToPaint(label: string, ms: number): void {
    const a = this.agg.get(label);
    if (a && ms > a.inputToPaintMaxMs) a.inputToPaintMaxMs = ms;
  }

  async flush(ack: PerfAck): Promise<void> {
    if (!this.longTasksSupported) await ack("perf:note:longtasks-unsupported");
    for (const [label, a] of this.agg) {
      await ack(`perf:rafmax:${label}:${Math.round(a.rafMaxMs)}`);
      await ack(`perf:longtasks:${label}:${a.longTasks}`);
      await ack(`perf:inp:${label}:${Math.round(a.inputToPaintMaxMs)}`);
      await ack(`perf:windows:${label}:${a.windows}`);
    }
  }
}

export class PerfProbe {
  readonly core = new PerfProbeCore();
  private current: string | null = null;
  private lastFrame = 0;
  private rafId = 0;
  private timer = 0;
  private observer?: PerformanceObserver;

  constructor(private readonly ack: PerfAck) {}

  start(label: string): void {
    this.core.openWindow(label);
    this.current = label;
    this.lastFrame = performance.now();
    const tick = () => {
      const now = performance.now();
      if (this.current) this.core.frame(this.current, now - this.lastFrame);
      this.lastFrame = now;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
    if (!this.observer && typeof PerformanceObserver !== "undefined") {
      try {
        this.observer = new PerformanceObserver((list) => {
          if (!this.current) return;
          const label = this.current;
          for (const _e of list.getEntries()) this.core.longTask(label);
        });
        this.observer.observe({ entryTypes: ["longtask"] });
      } catch {
        this.core.longTasksSupported = false;
      }
    }
    if (!this.timer) {
      // Synthetic input only: a keydown the walk itself dispatches. It
      // measures the pipeline (event -> handler -> paint), never pretends
      // to be a human interaction.
      this.timer = window.setInterval(() => void this.sampleInputToPaint(), 300);
    }
  }

  stop(): void {
    this.current = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }

  async flush(): Promise<void> {
    this.stop();
    this.observer?.disconnect();
    this.observer = undefined;
    await this.core.flush(this.ack);
  }

  private async sampleInputToPaint(): Promise<void> {
    const label = this.current;
    if (!label) return;
    const t0 = performance.now();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
    await new Promise<void>((res) =>
      requestAnimationFrame(() => requestAnimationFrame(() => res())),
    );
    this.core.inputToPaint(label, performance.now() - t0);
  }
}
