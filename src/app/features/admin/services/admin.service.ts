import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AdminDashboardSummary {
  totalBusinesses: number;
  activeBusinesses: number;
  totalCampsites: number;
  activeCampsites: number;
  totalCampers: number;
  totalBookings: number;
  
  // Observability
  systemCpuUsage?: number;
  processCpuUsage?: number;
  totalMemory?: number;
  freeMemory?: number;
  uptimeSeconds?: number;
  diskTotal?: number;
  diskFree?: number;
  httpRequestCount?: number;
  httpErrorCount?: number;
  httpAverageLatencyMs?: number;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type CampsiteStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type UserRole = 'CAMPER' | 'MERCHANT' | 'MERCHANT_ADMIN' | 'MERCHANT_MEMBER' | 'SUPERADMIN' | 'ADMIN';

export interface AdminBusinessSummary {
  id: number;
  businessName?: string;
  businessCode?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  totalCampsites?: number;
  activeCampsites?: number;
  createdAt?: string;
}

export interface AdminBusinessDetail {
  id: number;
  businessName?: string;
  businessCode?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  totalCampsites?: number;
  activeCampsites?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminBusinessCampsite {
  id: number;
  code?: string;
  name?: string;
  location?: string;
  address?: string;
  status?: CampsiteStatus;
  minPrice?: number;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
}

export interface AdminCampsiteSummary {
  id: number;
  code?: string;
  name?: string;
  location?: string;
  address?: string;
  status?: CampsiteStatus;
  minPrice?: number;
  rating?: number;
  reviewCount?: number;
  businessId?: number;
  businessName?: string;
  businessCode?: string;
  createdAt?: string;
}

export interface AdminUserSummary {
  id: number;
  email?: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  businessName?: string;
  businessCode?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface PageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminBusinessListResponse {
  content: AdminBusinessSummary[];
  page: PageMeta;
}

export interface AdminBusinessCampsiteListResponse {
  content: AdminBusinessCampsite[];
  page: PageMeta;
}

export interface AdminCampsiteListResponse {
  content: AdminCampsiteSummary[];
  page: PageMeta;
}

export interface AdminUserListResponse {
  content: AdminUserSummary[];
  page: PageMeta;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  thread: string;
  logger: string;
  message: string;
  raw?: string;
}

export interface LogListResponse {
  content: LogEntry[];
  page: number;
  size: number;
  totalElements: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  getDashboardSummary(): Observable<AdminDashboardSummary> {
    return this.http.get<AdminDashboardSummary>('/api/v1/admin/dashboard/summary');
  }

  getLogs(params: {
    page?: number;
    size?: number;
    level?: string;
    search?: string;
  }): Observable<LogListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 50);

    if (params.level) {
      httpParams = httpParams.set('level', params.level);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<LogListResponse>('/api/v1/admin/logs', { params: httpParams });
  }

  listBusinesses(params: {
    query?: string;
    status?: UserStatus | '';
    page?: number;
    size?: number;
  }): Observable<AdminBusinessListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 10);

    if (params.query) {
      httpParams = httpParams.set('query', params.query);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<AdminBusinessListResponse>('/api/v1/admin/businesses', { params: httpParams });
  }

  getBusiness(businessId: number): Observable<AdminBusinessDetail> {
    return this.http.get<AdminBusinessDetail>(`/api/v1/admin/businesses/${businessId}`);
  }

  listBusinessCampsites(params: {
    businessId: number;
    status?: CampsiteStatus | '';
    page?: number;
    size?: number;
  }): Observable<AdminBusinessCampsiteListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 10);

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<AdminBusinessCampsiteListResponse>(
      `/api/v1/admin/businesses/${params.businessId}/campsites`,
      { params: httpParams }
    );
  }

  listCampsites(params: {
    query?: string;
    status?: CampsiteStatus | '';
    businessId?: number;
    page?: number;
    size?: number;
  }): Observable<AdminCampsiteListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 10);

    if (params.query) {
      httpParams = httpParams.set('query', params.query);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.businessId) {
      httpParams = httpParams.set('businessId', params.businessId);
    }

    return this.http.get<AdminCampsiteListResponse>('/api/v1/admin/campsites', { params: httpParams });
  }

  listUsers(params: {
    query?: string;
    role?: UserRole | '';
    status?: UserStatus | '';
    page?: number;
    size?: number;
  }): Observable<AdminUserListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 10);

    if (params.query) {
      httpParams = httpParams.set('query', params.query);
    }
    if (params.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<AdminUserListResponse>('/api/v1/admin/users', { params: httpParams });
  }
}
