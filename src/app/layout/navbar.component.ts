import { Component, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { NotificationService } from '../features/notifications/notifications.service';
import { StoredUserInfo } from './models/layout.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnDestroy {
  isScrolled = false;
  isAuthenticated = false;
  isUserMenuOpen = false;
  userInfo: StoredUserInfo | null = null;
  unreadCount = 0;
  bellActive = false;

  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private notificationService = inject(NotificationService);
  private sessionListener = () => this.loadSession();
  private notificationSub?: Subscription;
  private lastUserId?: number;

  constructor() {
    // Basic scroll listener
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.isScrolled = window.scrollY > 20;
      });
      window.addEventListener('session-updated', this.sessionListener);
    }

    this.loadSession();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isUserMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.isUserMenuOpen = false;
  }

  toggleUserMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  logout() {
    this.clearSession();
    this.isAuthenticated = false;
    this.userInfo = null;
    this.isUserMenuOpen = false;
    this.router.navigate(['/']);
  }

  get displayName(): string {
    if (!this.userInfo) return 'Account';
    const firstName = this.userInfo.firstName?.trim();
    const lastName = this.userInfo.lastName?.trim();
    if (firstName) {
      return lastName ? `${firstName} ${lastName}` : firstName;
    }
    return this.userInfo.email || 'Account';
  }

  get initials(): string {
    if (!this.userInfo) return 'U';
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
    return 'U';
  }

  get isMerchant(): boolean {
    const role = (this.userInfo?.role || '').replace(/^ROLE_/, '');
    return role === 'MERCHANT' || role === 'MERCHANT_ADMIN' || role === 'MERCHANT_MEMBER';
  }

  private loadSession() {
    const token = this.getStoredValue('accessToken');
    this.isAuthenticated = !!token;

    const userInfoRaw = this.getStoredValue('userInfo');
    if (userInfoRaw) {
      try {
        this.userInfo = JSON.parse(userInfoRaw) as StoredUserInfo;
      } catch {
        this.userInfo = null;
      }
    } else {
      this.userInfo = null;
    }

    const userId = this.userInfo?.id;
    if (this.isAuthenticated && !this.isMerchant && userId) {
      if (this.lastUserId !== userId) {
        this.unreadCount = 0;
      }
      this.lastUserId = userId;
      this.startNotificationPolling();
    } else {
      this.stopNotificationPolling();
      this.unreadCount = 0;
      this.bellActive = false;
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
    this.stopNotificationPolling();
  }

  get unreadBadge(): string {
    if (this.unreadCount <= 0) return '';
    return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
  }

  private startNotificationPolling() {
    if (this.notificationSub) return;
    const updateNotifications = () =>
      this.notificationService.listNotifications().pipe(catchError(() => of([])));

    this.notificationSub = interval(5000)
      .pipe(switchMap(() => updateNotifications()))
      .subscribe((notifications) => {
        const unread = notifications.filter((item) => !item.read).length;
        this.unreadCount = unread;
        this.bellActive = unread > 0;
      });

    updateNotifications().subscribe((notifications) => {
      const unread = notifications.filter((item) => !item.read).length;
      this.unreadCount = unread;
      this.bellActive = unread > 0;
    });
  }

  private stopNotificationPolling() {
    if (!this.notificationSub) return;
    this.notificationSub.unsubscribe();
    this.notificationSub = undefined;
  }
}
