import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StoredUserInfo } from './models/layout.model';

@Component({
  selector: 'app-merchant-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './merchant-layout.component.html',
  styleUrl: './merchant-layout.component.scss'
})
export class MerchantLayoutComponent implements OnDestroy {
  isNavOpen = false;
  isSettingsOpen = false;
  isNavCollapsed = false;
  userInfo: StoredUserInfo | null = null;

  private router = inject(Router);
  private sessionListener = () => this.loadSession();

  constructor() {
    this.loadSession();
    if (typeof window !== 'undefined') {
      window.addEventListener('session-updated', this.sessionListener);
    }
  }

  toggleNav() {
    this.isNavOpen = !this.isNavOpen;
  }

  toggleSidebar() {
    this.isNavCollapsed = !this.isNavCollapsed;
  }

  closeNav() {
    this.isNavOpen = false;
    this.isSettingsOpen = false;
  }

  closeSettings() {
    this.isSettingsOpen = false;
  }

  toggleSettings(event?: MouseEvent) {
    event?.stopPropagation();
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    if (!this.isSettingsOpen) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.user-menu')) {
      this.isSettingsOpen = false;
    }
  }

  get displayName(): string {
    if (!this.userInfo) return 'Merchant';
    const firstName = this.userInfo.firstName?.trim();
    const lastName = this.userInfo.lastName?.trim();
    if (firstName) {
      return lastName ? `${firstName} ${lastName}` : firstName;
    }
    return this.userInfo.email || 'Merchant';
  }

  get displayRole(): string {
    const role = (this.userInfo?.role || 'MERCHANT').replace(/^ROLE_/, '');
    return role || 'MERCHANT';
  }

  get initials(): string {
    if (!this.userInfo) return 'M';
    const first = this.userInfo.firstName?.trim();
    const last = this.userInfo.lastName?.trim();
    if (first && last) {
      return `${first[0]}${last[0]}`.toUpperCase();
    }
    if (first) {
      return first[0].toUpperCase();
    }
    if (this.userInfo.email) {
      return this.userInfo.email[0].toUpperCase();
    }
    return 'M';
  }

  get businessName(): string {
    const name = this.userInfo?.businessName?.trim();
    return name || '';
  }

  get businessCode(): string {
    const code = this.userInfo?.businessCode?.trim();
    return code || '';
  }

  get merchantTooltip(): string {
    const name = this.businessName || this.displayName;
    const code = this.businessCode;
    if (code && name) {
      return `${code} • ${name}`;
    }
    return code || name || '';
  }

  private loadSession() {
    const userInfoRaw = this.getStoredValue('userInfo');
    if (!userInfoRaw) {
      this.userInfo = null;
      return;
    }

    try {
      this.userInfo = JSON.parse(userInfoRaw) as StoredUserInfo;
    } catch {
      this.userInfo = null;
    }
  }

  private getStoredValue(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  }

  private clearSession() {
    if (typeof window === 'undefined') return;
    const keys = ['accessToken', 'userInfo', 'refreshToken'];
    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('session-updated', this.sessionListener);
    }
  }
}
