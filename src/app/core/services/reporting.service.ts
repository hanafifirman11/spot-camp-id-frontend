import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface RevenueSummary {
  totalRevenue: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalBookings: number;
  conversionRate: number;
}

export interface CustomerAnalytics {
  uniqueCustomers: number;
  averageBookingValue: number;
  averageAdvanceDays: number;
  weekendBookings: number;
}

export interface DashboardData {
  revenueSummary?: RevenueSummary;
  customerAnalytics?: CustomerAnalytics;
  topSpots?: any[];
  statusDistribution?: Record<string, number>;
  recentBookings?: BookingReport[];
  weekendVsWeekday?: any;
  revenueBreakdown?: any;
}

export interface BookingReport {
  bookingId?: number;
  campsiteId?: number;
  campsiteName?: string;
  userId?: number;
  userEmail?: string;
  spotId?: string;
  spotName?: string;
  bookingDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  status?: string;
  totalAmount?: number;
  paymentMethod?: string;
  bookingMonth?: string;
  bookingYear?: number;
  createdAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  totalItems?: number;
}

export interface ReportPageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BookingReportListResponse {
  content: BookingReport[];
  page: ReportPageMeta;
}

@Injectable({ providedIn: 'root' })
export class ReportingService {
  private http = inject(HttpClient);

  getDashboard(params: {
    campsiteId?: number;
    fromDate?: string;
    toDate?: string;
  }): Observable<DashboardData> {
    let httpParams = new HttpParams();
    if (params.campsiteId) {
      httpParams = httpParams.set('campsiteId', params.campsiteId);
    }
    if (params.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }

    return this.http.get<DashboardData>('/api/v1/reports/dashboard', { params: httpParams });
  }

  listBookingReports(params: {
    campsiteId?: number;
    businessId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Observable<BookingReportListResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);

    if (params.campsiteId) {
      httpParams = httpParams.set('campsiteId', params.campsiteId);
    }
    if (params.businessId) {
      httpParams = httpParams.set('businessId', params.businessId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }

    return this.http
      .get<any>('/api/v1/reports/bookings', { params: httpParams })
      .pipe(map((response) => this.normalizeResponse(response, params.page ?? 0, params.size ?? 20)));
  }

  exportBookingReports(params: {
    campsiteId?: number;
    businessId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
    format: 'csv' | 'xlsx' | 'pdf';
  }): Observable<Blob> {
    let httpParams = new HttpParams().set('format', params.format);
    if (params.campsiteId) {
      httpParams = httpParams.set('campsiteId', params.campsiteId);
    }
    if (params.businessId) {
      httpParams = httpParams.set('businessId', params.businessId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    return this.http.get('/api/v1/reports/bookings/export', { params: httpParams, responseType: 'blob' });
  }

  private normalizeResponse(response: any, pageNumber: number, size: number): BookingReportListResponse {
    const content = response?.content ?? [];
    const page = {
      number: response?.number ?? pageNumber,
      size: response?.size ?? size,
      totalElements: response?.totalElements ?? content.length,
      totalPages: response?.totalPages ?? 1
    };

    return { content, page };
  }
}
