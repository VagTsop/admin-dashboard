import { Routes } from '@angular/router';

/**
 * Every feature is lazily loaded, so the initial navigation downloads the shell
 * plus one route chunk. ECharts lands in a shared chunk pulled in by whichever
 * charting route the user opens first; the customers table never loads it.
 */
export const routes: Routes = [
  {
    path: 'overview',
    title: 'Overview · Atlas',
    loadComponent: () =>
      import('./features/overview/overview.component').then(
        (m) => m.OverviewComponent
      ),
  },
  {
    path: 'revenue',
    title: 'Revenue · Atlas',
    loadComponent: () =>
      import('./features/revenue/revenue.component').then(
        (m) => m.RevenueComponent
      ),
  },
  {
    path: 'customers',
    title: 'Customers · Atlas',
    loadComponent: () =>
      import('./features/customers/customers.component').then(
        (m) => m.CustomersComponent
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '**', redirectTo: 'overview' },
];
