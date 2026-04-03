import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MerchantUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'MERCHANT_ADMIN' | 'MERCHANT_MEMBER';
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'MERCHANT_ADMIN' | 'MERCHANT_MEMBER';
}

@Injectable({
  providedIn: 'root'
})
export class MerchantUserService {
  private http = inject(HttpClient);

  listUsers(): Observable<MerchantUser[]> {
    return this.http.get<MerchantUser[]>('/api/v1/merchant/users');
  }

  createUser(request: CreateUserRequest): Observable<MerchantUser> {
    return this.http.post<MerchantUser>('/api/v1/merchant/users', request);
  }

  updateUserRole(userId: number, role: 'MERCHANT_ADMIN' | 'MERCHANT_MEMBER'): Observable<MerchantUser> {
    return this.http.patch<MerchantUser>(`/api/v1/merchant/users/${userId}/role`, { role });
  }

  toggleUserStatus(userId: number): Observable<MerchantUser> {
    return this.http.patch<MerchantUser>(`/api/v1/merchant/users/${userId}/status`, {});
  }
}
