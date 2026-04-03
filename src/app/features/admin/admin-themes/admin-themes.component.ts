import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme, ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-admin-themes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-themes.component.html',
  styleUrl: './admin-themes.component.scss'
})
export class AdminThemesComponent implements OnInit {
  themes: Theme[] = [];
  isLoading = false;
  activatingId: number | null = null;

  private themeService = inject(ThemeService);

  ngOnInit(): void {
    this.loadThemes();
  }

  loadThemes(): void {
    this.isLoading = true;
    this.themeService.getAllThemes().subscribe({
      next: (themes) => {
        this.themes = themes;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load themes', err);
        this.isLoading = false;
      }
    });
  }

  activateTheme(theme: Theme): void {
    if (theme.isActive) return;
    
    this.activatingId = theme.id;
    this.themeService.activateTheme(theme.id).subscribe({
      next: (updatedTheme) => {
        // Update local state to reflect change without full reload
        this.themes.forEach(t => t.isActive = (t.id === updatedTheme.id));
        this.activatingId = null;
      },
      error: (err) => {
        console.error('Failed to activate theme', err);
        this.activatingId = null;
      }
    });
  }

  getPreviewStyle(theme: Theme): any {
    try {
      const tokens = JSON.parse(theme.tokensJson || '{}');
      return {
        '--preview-primary': tokens['--primary'],
        '--preview-secondary': tokens['--secondary'],
        '--preview-bg': tokens['--background'] || '#ffffff'
      };
    } catch {
      return {};
    }
  }
}
