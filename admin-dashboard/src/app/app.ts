import { Component, signal } from '@angular/core';
import { DashboardAdministrateComponent } from '../components/admin/dashboard/dashboard-administrate.component';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardAdministrateComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('admin-dashboard');

  isDark = false;

  constructor(private themeService: ThemeService) {
    this.toggleTheme();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    this.themeService.setDarkTheme(this.isDark);

    const body = document.body;
    body.classList.toggle('dark-theme', this.isDark);
    body.classList.toggle('light-theme', !this.isDark);
  }
}
