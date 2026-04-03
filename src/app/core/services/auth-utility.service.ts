import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthUtilityService {
  private readonly accessTokenKey = 'accessToken';
  private readonly sessionKeys = [this.accessTokenKey, 'userInfo', 'refreshToken'];

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(this.accessTokenKey) || localStorage.getItem(this.accessTokenKey);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    return this.isExpired(token);
  }

  clearSession(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.sessionKeys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  private isExpired(token: string): boolean {
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
}
