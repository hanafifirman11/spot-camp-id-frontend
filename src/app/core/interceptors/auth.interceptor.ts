import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthUtilityService } from '../services/auth-utility.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private authUtilityService: AuthUtilityService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.shouldSkipAuth(req.url)) {
      return this.handleResponse(next.handle(req), req.url);
    }

    const token = this.authUtilityService.getToken();
    if (token && this.authUtilityService.isTokenExpired()) {
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
          const token = this.authUtilityService.getToken();
          if (!token || this.authUtilityService.isTokenExpired()) {
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
    return !!this.authUtilityService.getToken();
  }

  private shouldSkipAuth(url: string): boolean {
    return url.includes('/auth/');
  }

  private handleExpiredToken() {
    this.authUtilityService.clearSession();
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/auth/')) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: currentUrl }
      });
    }
  }
}
