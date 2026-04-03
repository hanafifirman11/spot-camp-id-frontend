import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthUtilityService } from '../services/auth-utility.service';

interface StoredUserInfo {
  role?: string;
}

const allowedRoles = new Set(['MERCHANT_ADMIN', 'MERCHANT_MEMBER']);

function getStoredUserInfoValue(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem('userInfo') || localStorage.getItem('userInfo');
}

function resolveAccess(): StoredUserInfo | null {
  const userInfoRaw = getStoredUserInfoValue();
  if (!userInfoRaw) {
    return null;
  }
  try {
    return JSON.parse(userInfoRaw) as StoredUserInfo;
  } catch {
    return null;
  }
}

function merchantAccessGuard(url: string) {
  const router = inject(Router);
  const authUtilityService = inject(AuthUtilityService);
  const token = authUtilityService.getToken();

  if (!token || authUtilityService.isTokenExpired()) {
    authUtilityService.clearSession();
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: url }
    });
  }

  const userInfo = resolveAccess();
  const role = (userInfo?.role || '').replace(/^ROLE_/, '');
  if (!userInfo || !allowedRoles.has(role)) {
    return router.createUrlTree(['/']);
  }

  return true;
}

export const merchantGuard: CanActivateFn = (_route, state) => {
  return merchantAccessGuard(state.url);
};

export const merchantChildGuard: CanActivateChildFn = (_route, state) => {
  return merchantAccessGuard(state.url);
};
