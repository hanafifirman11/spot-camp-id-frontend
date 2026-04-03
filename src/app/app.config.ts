import { ApplicationConfig, importProvidersFrom, LOCALE_ID, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ApiModule, Configuration } from './core/api-v1';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { LoadingBarInterceptor } from './core/interceptors/loading-bar.interceptor';
import { ThemeService } from './core/services/theme.service';
import { firstValueFrom } from 'rxjs';

import { AppRoutes } from './app.routes';

registerLocaleData(localeId);

const resolveAccessToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken') || '';
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(AppRoutes.routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'id' },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingBarInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: (themeService: ThemeService) => () =>
        firstValueFrom(themeService.loadActiveTheme()).catch(() => null),
      deps: [ThemeService],
      multi: true
    },
    importProvidersFrom(
      ApiModule.forRoot(() => new Configuration({
        basePath: '/api/v1', // Configure Base Path for API Client
        accessToken: resolveAccessToken
      }))
    )
  ]
};
