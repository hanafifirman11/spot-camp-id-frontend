import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserPreferenceService {
  private readonly darkClass = 'dark-mode';

  initFromStorage(): void {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('userInfo') || localStorage.getItem('userInfo');
    if (!raw) {
      this.applyDarkMode(false);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { darkMode?: boolean };
      this.applyDarkMode(!!parsed?.darkMode);
    } catch {
      this.applyDarkMode(false);
    }
  }

  applyDarkMode(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle(this.darkClass, enabled);
  }
}
