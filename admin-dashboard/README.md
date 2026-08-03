# Atlas — SaaS Analytics Dashboard

A zoneless **Angular 20** analytics workspace: 50,000 accounts filtered and sorted
in the browser, 730 days of revenue history, and streaming KPIs — rendered at 60 fps
with a **78.8 kB** initial payload.

**[Live demo](#)** · **[Source](#)**

---

## What it demonstrates

| | |
|---|---|
| **Zoneless change detection** | `provideZonelessChangeDetection()`. zone.js is not loaded at all — reactivity comes from signals. |
| **Virtualised data grid** | 50,000 rows in memory, **30** in the DOM. Filter + sort runs synchronously in under 15 ms. |
| **Canvas charting** | Apache ECharts, tree-shaken to the five chart types actually used, in a lazy chunk. |
| **Signal-first state** | Every derived value is a `computed`. Changing the date range recalculates exactly the slices that depend on it. |
| **Measured, not claimed** | Frame rate, DOM node count, dataset build time and filter cost are displayed live in the sidebar. |

## Runtime budget

Measured on the production build:

```
Initial total          276.33 kB raw  →   78.80 kB transfer
  main                  96.92 kB      →   24.96 kB
  angular runtime      164.74 kB      →   48.70 kB
  styles                 6.44 kB      →    1.92 kB

Lazy chunks
  echarts              602.39 kB      →  169.74 kB   (charting routes only)
  customers-component   37.84 kB      →   10.10 kB
  overview-component    11.95 kB      →    3.68 kB
  revenue-component      6.28 kB      →    2.40 kB
```

The customers route — the heaviest interaction in the app — never downloads ECharts.

Live figures you can read off the running app:

| Metric | Typical |
|---|---|
| Frame rate while streaming | 60 fps |
| Rows rendered in DOM (of 50,000) | 30 |
| Total DOM nodes on the grid route | ~640 |
| Dataset build (50k accounts + 730 days) | ~25 ms |
| Filter + sort across 50,000 rows | 3–15 ms |
| Slowest chart initialisation | ~40 ms |

## Architecture

```
src/app/
  core/
    data/dataset.factory.ts     Seeded generator — deterministic, swappable for HTTP
    models/analytics.model.ts   Domain types; no `any` anywhere in the app
    services/analytics.store.ts Signal store: range, live feed, derived KPIs
    services/perf.service.ts    Passive runtime sampling (rAF, PerformanceObserver)
    services/theme.service.ts   Theme signal → single DOM effect
  shared/
    charts/                     ECharts registration, CSS-token bridge, wrapper component
    ui/                         Icon set, KPI tile
  features/
    overview/  revenue/  customers/     Lazy-loaded routes
```

### Decisions worth explaining

**One timer, not twenty-three.** The live feed advances a single signal on one
`setInterval`. Every KPI, chart and sparkline is a `computed` downstream of it.

**Charts read the CSS design tokens.** `readChartTokens()` pulls `--fg`, `--grid-line`
and the `--viz-*` palette out of the document, so the canvas and the DOM can never
drift apart, and a theme flip re-themes charts without recreating them.

**Series colours are theme-independent.** A chart must not change meaning when
the theme changes — only the chrome around it adapts.

**Filter and sort are synchronous over all 50,000 records on every keystroke.**
That is the point: with the data in memory and rendering virtualised, the work is
cheap enough not to need debouncing or a worker. The measured cost is printed
next to the result count rather than asserted in a README.

**No `@angular/animations`.** Route transitions use the native View Transitions
API via `withViewTransitions()`; entrances are CSS keyframes that respect
`prefers-reduced-motion` for free.

**No icon font.** ~2 kB of inline SVG paths, `currentColor`-themed, zero requests.

**Scroll reset is explicit.** The shell scrolls an inner element, so
`withInMemoryScrolling` would have looked correct and silently done nothing;
`App` resets the container on `NavigationEnd` instead.

## Accessibility

- Skip link, landmark regions, and a focus-visible ring on every interactive control.
- Charts are `aria-hidden`; the numbers they visualise are always available as text.
- Sortable headers are real `<button>`s with `aria-pressed` state on the filters.
- Full keyboard operation; no hover-only affordances.
- Both themes meet WCAG AA for body and secondary text.

## Getting started

```bash
npm install
npm start
```

Then open <http://localhost:4200>.

```bash
npm run build    # production build with budgets enforced
npm test         # 12 unit specs, zoneless TestBed
```

## Swapping in a real API

`AnalyticsStore` depends on the `Dataset` shape, not on where it came from.
Replace the `createDataset()` call with an HTTP resource and nothing downstream
changes:

```ts
private readonly data = signal<Dataset>(createDataset());
// becomes
private readonly data = httpResource<Dataset>(() => '/api/analytics');
```

## Licensing

All runtime dependencies are permissively licensed and free for commercial use —
Angular and the CDK (MIT) and Apache ECharts (Apache 2.0). No chart watermark is
suppressed and no paid licence is required to deploy this.

## Tech

Angular 20 · TypeScript 5.8 (strict) · Apache ECharts 5 · Angular CDK · SCSS
