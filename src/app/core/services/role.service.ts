import { Injectable } from '@angular/core';

export enum UserRole {
  CAMPER = 'CAMPER',
  MERCHANT_ADMIN = 'MERCHANT_ADMIN',
  MERCHANT_MEMBER = 'MERCHANT_MEMBER',
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN'
}

interface StoredUserInfo {
  role?: string;
}

/**
 * Service for checking user roles and permissions
 */
@Injectable({
  providedIn: 'root'
})
export class RoleService {

  /**
   * Get the current user's role from storage
   */
  getCurrentRole(): string | null {
    const userInfo = this.getUserInfo();
    if (!userInfo?.role) {
      return null;
    }
    // Remove ROLE_ prefix if present
    return userInfo.role.replace(/^ROLE_/, '');
  }

  /**
   * Check if user is a Merchant Admin (has full access)
   */
  isMerchantAdmin(): boolean {
    const role = this.getCurrentRole();
    return role === UserRole.MERCHANT_ADMIN || role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
  }

  /**
   * Check if user is a Merchant Member (read-only access to master data)
   */
  isMerchantMember(): boolean {
    const role = this.getCurrentRole();
    return role === UserRole.MERCHANT_MEMBER;
  }

  /**
   * Check if user has write access to master data (campsite, products, bundles, etc.)
   */
  canEditMasterData(): boolean {
    return this.isMerchantAdmin();
  }

  /**
   * Check if user can manage merchant users
   */
  canManageUsers(): boolean {
    return this.isMerchantAdmin();
  }

  /**
   * Check if user can view reports
   */
  canViewReports(): boolean {
    const role = this.getCurrentRole();
    return role === UserRole.MERCHANT_ADMIN || role === UserRole.MERCHANT_MEMBER ||
           role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
  }

  /**
   * Check if user can manage bookings
   */
  canManageBookings(): boolean {
    const role = this.getCurrentRole();
    return role === UserRole.MERCHANT_ADMIN || role === UserRole.MERCHANT_MEMBER ||
           role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
  }

  private getUserInfo(): StoredUserInfo | null {
    const userInfoRaw = this.getStoredValue('userInfo');
    if (!userInfoRaw) {
      return null;
    }
    try {
      return JSON.parse(userInfoRaw) as StoredUserInfo;
    } catch {
      return null;
    }
  }

  private getStoredValue(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  }
}
