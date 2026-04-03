import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.shouldSkipAuth(req.url)) {
      return this.handleResponse(next.handle(req), req.url);
    }

    const token = this.getToken();
    if (token && this.isTokenExpired(token)) {
      this.handleExpiredToken();
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Token expired',
        url: req.url
      }));
    }

    if (req.headers.has('Authorization')) {
      return this.handleResponse(next.handle(req), req.url);
    }
    if (!token) {
      return this.handleResponse(next.handle(req), req.url);
    }

    return this.handleResponse(
      next.handle(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        })
      ),
      req.url
    );
  }

  private handleResponse(stream: Observable<HttpEvent<unknown>>, url: string): Observable<HttpEvent<unknown>> {
    return stream.pipe(
      catchError((error: HttpErrorResponse) => {
        if ((error.status === 401 || error.status === 403) && this.shouldRedirect(url)) {
          const token = this.getToken();
          if (!token || this.isTokenExpired(token)) {
            this.handleExpiredToken();
          }
        }
        return throwError(() => error);
      })
    );
  }

  private shouldRedirect(url: string): boolean {
    if (this.shouldSkipAuth(url)) {
      return false;
    }
    return !!this.getToken();
  }

  private shouldSkipAuth(url: string): boolean {
    return url.includes('/auth/');
  }

  private isTokenExpired(token: string): boolean {
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

  private handleExpiredToken() {
    this.clearSession();
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/auth/')) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: currentUrl }
      });
    }
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
