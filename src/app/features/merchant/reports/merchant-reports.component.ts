import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MerchantCampsiteResponse, MerchantCampsiteService } from '../services/merchant-campsite.service';
import {
  BookingReport,
  BookingReportListResponse,
  DashboardData,
  ReportingService
} from '../../../core/services/reporting.service';
import { FilterOption } from './models/merchant-reports.model';
import { BOOKING_STATUS_OPTIONS } from '../../../shared/constants/booking-status-options.const';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-merchant-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmptyStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
    CurrencyIdrPipe
  ],
  templateUrl: './merchant-reports.component.html',
  styleUrl: './merchant-reports.component.scss'
})
export class MerchantReportsComponent implements OnInit {
  private campsiteService = inject(MerchantCampsiteService);
  private reportingService = inject(ReportingService);

  campsites: MerchantCampsiteResponse[] = [];
  selectedCampsiteId: number | null = null;

  fromDate = '';
  toDate = '';
  statusFilter = 'ALL';

  dashboard: DashboardData | null = null;
  reports: BookingReport[] = [];
  page = { number: 0, size: 12, totalElements: 0, totalPages: 0 };
  exportFormat: 'csv' | 'xlsx' | 'pdf' = 'csv';
  isExporting = false;

  isLoadingCampsites = false;
  isLoading = false;
  errorMessage = '';

  statusOptions: FilterOption[] = BOOKING_STATUS_OPTIONS;

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadCampsites();
  }

  loadCampsites(): void {
    this.isLoadingCampsites = true;
    this.campsiteService.listCampsites(0, 50).subscribe({
      next: (response) => {
        this.campsites = response.content ?? [];
        if (!this.selectedCampsiteId && this.campsites.length > 0) {
          this.selectedCampsiteId = this.campsites[0].id ?? null;
        }
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
    if (!this.selectedCampsiteId) {
      this.dashboard = null;
      return;
    }

    this.reportingService
      .getDashboard({
        campsiteId: this.selectedCampsiteId,
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
    if (!this.selectedCampsiteId) {
      this.reports = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;

    this.reportingService
      .listBookingReports({
        campsiteId: this.selectedCampsiteId,
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
    if (!this.selectedCampsiteId) return;
    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;
    this.isExporting = true;
    this.reportingService
      .exportBookingReports({
        campsiteId: this.selectedCampsiteId,
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

  getCampsiteName(): string {
    if (!this.selectedCampsiteId) return 'Select a campsite';
    const campsite = this.campsites.find((item) => item.id === this.selectedCampsiteId);
    return campsite?.name ?? `Campsite #${this.selectedCampsiteId}`;
  }

  formatPercent(value?: number | null): string {
    if (value === null || value === undefined) {
      return '0%';
    }
    return `${Number(value).toFixed(2)}%`;
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
