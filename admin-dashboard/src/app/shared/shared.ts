import { provideAnimations } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FlexLayoutModule } from '@angular/flex-layout';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

export const sharedImports = [
  CommonModule,
  FlexLayoutModule,
  MatCardModule,
  MatIconModule,
  MatDividerModule,
  MatProgressBarModule,
  HttpClientModule,
];

export const sharedProviders = [provideAnimations()];
