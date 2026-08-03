import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Measures what the dashboard actually costs at runtime.
 *
 * A dashboard demo that claims to be fast should be able to prove it, so these
 * numbers are surfaced in the UI instead of living in a README. Everything here
 * is passive sampling — no polling loops, no work when the tab is hidden.
 */
@Injectable({ providedIn: 'root' })
export class PerfService {
  private readonly destroyRef = inject(DestroyRef);

  readonly fps = signal(60);
  readonly domNodes = signal(0);
  readonly longTasks = signal(0);
  /** Slowest chart initialisation observed this session, in milliseconds. */
  readonly slowestChartMs = signal(0);
  /** Rows currently materialised in the DOM by the virtual scroller. */
  readonly renderedRows = signal(0);

  private frames = 0;
  private windowStart = performance.now();
  private rafId = 0;

  constructor() {
    this.sampleFrames();

    // `longtask` is Chromium-only; absence is not an error.
    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) =>
        this.longTasks.update((n) => n + list.getEntries().length)
      );
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      /* unsupported browser — the counter simply stays at zero */
    }

    const domTimer = setInterval(
      () => this.domNodes.set(document.getElementsByTagName('*').length),
      2_000
    );

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.rafId);
      observer?.disconnect();
      clearInterval(domTimer);
    });
  }

  recordChartInit(ms: number): void {
    this.slowestChartMs.update((current) => Math.max(current, Math.round(ms)));
  }

  /**
   * Counts frames over one-second windows. Writing the signal once per second
   * rather than once per frame keeps the meter from becoming the thing that
   * slows the page down.
   *
   * A window that overran its one-second target is discarded rather than
   * published. Browsers stop firing rAF for a backgrounded tab, so the first
   * window after the user returns would otherwise report a scary "1 fps" that
   * says nothing about how the page actually performs. The same guard keeps
   * headless captures honest, where the virtual clock jumps between frames.
   */
  private sampleFrames(): void {
    const WINDOW_MS = 1_000;
    const OVERRUN_MS = 2_000;

    const loop = () => {
      this.frames++;
      const now = performance.now();
      const elapsed = now - this.windowStart;

      if (elapsed >= WINDOW_MS) {
        if (elapsed <= OVERRUN_MS) {
          this.fps.set(Math.round((this.frames * 1_000) / elapsed));
        }
        this.frames = 0;
        this.windowStart = now;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }
}
