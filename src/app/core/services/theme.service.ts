import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Theme {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  tokensJson?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private http = inject(HttpClient);

  /**
   * Loads the active theme from the backend and applies it.
   * Designed to be called during app initialization.
   */
  loadActiveTheme(): Observable<Theme> {
    return this.http.get<Theme>('/api/v1/public/theme/active').pipe(
      tap(theme => this.applyTheme(theme))
    );
  }

  /**
   * Applies the theme tokens to the document root.
   */
  applyTheme(theme: Theme): void {
    if (!theme.tokensJson) return;

    try {
      const tokens = JSON.parse(theme.tokensJson);
      const root = document.documentElement;
      
      Object.entries(tokens).forEach(([key, value]) => {
        const cssVar = key.startsWith('--')
          ? key
          : '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(cssVar, String(value));
      });
      
      console.log(`Applied theme: ${theme.name}`);
    } catch (e) {
      console.error('Failed to parse theme tokens', e);
    }
  }

  /**
   * Admin: List all themes
   */
  getAllThemes(): Observable<Theme[]> {
    return this.http.get<Theme[]>('/api/v1/admin/themes');
  }

  /**
   * Admin: Activate a theme
   */
  activateTheme(id: number): Observable<Theme> {
    return this.http.post<Theme>(`/api/v1/admin/themes/${id}/activate`, {}).pipe(
      tap(theme => this.applyTheme(theme))
    );
  }
}
