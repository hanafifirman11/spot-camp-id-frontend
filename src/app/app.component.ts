import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LoadingBarComponent } from './core/ui/loading-bar/loading-bar.component';
import { filter } from 'rxjs';
import { UserPreferenceService } from './core/services/user-preference.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LoadingBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private preferenceService = inject(UserPreferenceService);

  title = 'spot-camp-id-frontend';
  showBackToTop = false;

  ngOnInit() {
    this.checkTokenExpiry();
    this.preferenceService.initFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('session-updated', () => this.preferenceService.initFromStorage());
    }
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.checkTokenExpiry();
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showBackToTop = window.scrollY > 300;
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  private checkTokenExpiry() {
    const token = this.getToken();
    if (!token) return;
    if (!this.isTokenExpired(token)) {
      return;
    }

    this.clearSession();
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/auth/')) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: currentUrl }
      });
    }
  }

  private isTokenExpired(token: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return true;
      }
      const json = this.decodeBase64Url(payload);
      const data = JSON.parse(json) as { exp?: number };
      if (!data.exp) {
        return false;
      }
      const nowSeconds = Math.floor(Date.now() / 1000);
      return nowSeconds >= data.exp;
    } catch {
      return true;
    }
  }

  private decodeBase64Url(value: string): string {
    let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    if (pad) {
      normalized += '='.repeat(4 - pad);
    }
    return atob(normalized);
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  }

  private clearSession() {
    if (typeof window === 'undefined') {
      return;
    }
    const keys = ['accessToken', 'userInfo', 'refreshToken'];
    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
}
