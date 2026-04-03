import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LoadingBarComponent } from './core/ui/loading-bar/loading-bar.component';
import { filter } from 'rxjs';
import { UserPreferenceService } from './core/services/user-preference.service';
import { AuthUtilityService } from './core/services/auth-utility.service';

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
  private authUtilityService = inject(AuthUtilityService);

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
    const token = this.authUtilityService.getToken();
    if (!token) return;
    if (!this.authUtilityService.isTokenExpired()) {
      return;
    }

    this.authUtilityService.clearSession();
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/auth/')) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: currentUrl }
      });
    }
  }
}
