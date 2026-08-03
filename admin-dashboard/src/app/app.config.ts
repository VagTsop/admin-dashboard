import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // Zoneless. zone.js is no longer loaded as a polyfill at all, which removes
    // ~35 KB from the initial bundle and stops every rAF inside ECharts from
    // scheduling a change-detection pass. Reactivity comes from signals only.
    provideZonelessChangeDetection(),

    provideRouter(
      routes,
      withComponentInputBinding(),
      // Native cross-fade between routes — no @angular/animations dependency.
      withViewTransitions({ skipInitialTransition: true })
      //
      // Note: `withInMemoryScrolling` is deliberately absent. It drives the
      // *document* scroller, but this shell scrolls an inner element so the
      // sidebar and topbar can stay fixed. Resetting scroll on navigation is
      // handled explicitly in `App` instead — wiring up the option here would
      // look correct and quietly do nothing.
    ),
  ],
};
