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
   */
  private sampleFrames(): void {
    const loop = () => {
      this.frames++;
      const now = performance.now();
      const elapsed = now - this.windowStart;

      if (elapsed >= 1_000) {
        this.fps.set(Math.round((this.frames * 1_000) / elapsed));
        this.frames = 0;
        this.windowStart = now;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }
}
