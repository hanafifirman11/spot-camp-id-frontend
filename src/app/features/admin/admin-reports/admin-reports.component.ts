import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminBusinessCampsite, AdminBusinessSummary, AdminService } from '../services/admin.service';
import {
  BookingReport,
  BookingReportListResponse,
  DashboardData,
  ReportingService
} from '../../../core/services/reporting.service';
import { FilterOption } from './models/admin-reports.model';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss'
})
export class AdminReportsComponent implements OnInit {
  private adminService = inject(AdminService);
  private reportingService = inject(ReportingService);

  businesses: AdminBusinessSummary[] = [];
  campsites: AdminBusinessCampsite[] = [];

  selectedBusinessId: number | null = null;
  selectedCampsiteId: number | null = null;

  fromDate = '';
  toDate = '';
  statusFilter = 'ALL';

  dashboard: DashboardData | null = null;
  reports: BookingReport[] = [];
  page = { number: 0, size: 12, totalElements: 0, totalPages: 0 };
  exportFormat: 'csv' | 'xlsx' | 'pdf' = 'csv';
  isExporting = false;

  isLoadingBusinesses = false;
  isLoadingCampsites = false;
  isLoading = false;
  errorMessage = '';

  statusOptions: FilterOption[] = [
    { label: 'All statuses', value: 'ALL' },
    { label: 'Payment pending', value: 'PAYMENT_PENDING' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Completed', value: 'COMPLETED' }
  ];

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadBusinesses();
  }

  loadBusinesses(): void {
    this.isLoadingBusinesses = true;
    this.adminService.listBusinesses({ page: 0, size: 100, status: '' }).subscribe({
      next: (response) => {
        this.businesses = response.content ?? [];
        this.isLoadingBusinesses = false;
        this.loadCampsites();
      },
      error: () => {
        this.isLoadingBusinesses = false;
        this.errorMessage = 'Failed to load merchants.';
      }
    });
  }

  loadCampsites(): void {
    this.isLoadingCampsites = true;
    this.errorMessage = '';

    if (this.selectedBusinessId) {
      this.adminService
        .listBusinessCampsites({ businessId: this.selectedBusinessId, page: 0, size: 100 })
        .subscribe({
          next: (response) => {
            this.campsites = response.content ?? [];
            if (this.campsites.length > 0) {
              this.selectedCampsiteId = this.campsites[0].id ?? null;
            } else {
              this.selectedCampsiteId = null;
            }
            this.isLoadingCampsites = false;
            this.applyFilters();
          },
          error: () => {
            this.isLoadingCampsites = false;
            this.errorMessage = 'Failed to load campsites.';
          }
        });
      return;
    }

    this.adminService
      .listCampsites({ page: 0, size: 100, status: '' })
      .subscribe({
        next: (response) => {
          this.campsites = response.content ?? [];
          this.isLoadingCampsites = false;
          this.applyFilters();
        },
        error: () => {
          this.isLoadingCampsites = false;
          this.errorMessage = 'Failed to load campsites.';
        }
      });
  }

  applyFilters(): void {
    this.loadDashboard();
    this.loadReports(0);
  }

  loadDashboard(): void {
    this.reportingService
      .getDashboard({
        campsiteId: this.selectedCampsiteId ?? undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined
      })
      .subscribe({
        next: (response) => {
          this.dashboard = response;
        },
        error: () => {
          this.dashboard = null;
          this.errorMessage = 'Failed to load report summary.';
        }
      });
  }

  loadReports(page: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;

    this.reportingService
      .listBookingReports({
        campsiteId: this.selectedCampsiteId ?? undefined,
        businessId: this.selectedBusinessId ?? undefined,
        status,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        page,
        size: this.page.size
      })
      .subscribe({
        next: (response: BookingReportListResponse) => {
          this.reports = response.content ?? [];
          this.page = response.page ?? { number: page, size: this.page.size, totalElements: 0, totalPages: 0 };
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load booking reports.';
          this.reports = [];
          this.isLoading = false;
        }
      });
  }

  downloadReport(): void {
    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;
    this.isExporting = true;
    this.reportingService
      .exportBookingReports({
        campsiteId: this.selectedCampsiteId ?? undefined,
        businessId: this.selectedBusinessId ?? undefined,
        status,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        format: this.exportFormat
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `booking-reports.${this.exportFormat}`;
          anchor.click();
          window.URL.revokeObjectURL(url);
          this.isExporting = false;
        },
        error: () => {
          this.errorMessage = 'Failed to export report.';
          this.isExporting = false;
        }
      });
  }

  nextPage(): void {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadReports(this.page.number + 1);
  }

  prevPage(): void {
    if (this.page.number <= 0) return;
    this.loadReports(this.page.number - 1);
  }

  formatCurrency(value?: number | null): string {
    if (value === null || value === undefined) {
      return 'Rp -';
    }
    return `Rp ${Number(value).toLocaleString('id-ID')}`;
  }

  formatPercent(value?: number | null): string {
    if (value === null || value === undefined) {
      return '0%';
    }
    return `${Number(value).toFixed(2)}%`;
  }

  formatStatus(status?: string | null): string {
    if (!status) return 'Unknown';
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  statusClass(status?: string | null): string {
    if (!status) return 'status-unknown';
    return `status-${status.toLowerCase()}`;
  }

  private setDefaultDates(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);

    this.fromDate = this.toInputDate(past);
    this.toDate = this.toInputDate(today);
  }

  private toInputDate(date: Date): string {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60000);
    return adjusted.toISOString().split('T')[0];
  }
}
