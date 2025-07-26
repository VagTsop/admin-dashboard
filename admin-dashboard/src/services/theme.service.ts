import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  setDarkTheme(isDark: boolean): void {
    const body = document.body;
    if (isDark) {
      body.classList.add('app-dark');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }
}
