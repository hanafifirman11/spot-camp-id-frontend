import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminBusinessSummary,
  AdminBusinessCampsite,
  AdminService
} from '../services/admin.service';
import {
  BookingListResponse,
  BookingStatus,
  MerchantBooking,
  MerchantBookingService
} from '../../merchant/services/merchant-booking.service';
import { FilterOption } from './models/admin-bookings.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmptyStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
    CurrencyIdrPipe
  ],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.scss'
})
export class AdminBookingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private bookingService = inject(MerchantBookingService);

  businesses: AdminBusinessSummary[] = [];
  campsites: AdminBusinessCampsite[] = [];

  selectedBusinessId: number | null = null;
  selectedCampsiteId: number | null = null;

  bookings: MerchantBooking[] = [];
  page = { number: 0, size: 12, totalElements: 0, totalPages: 0 };

  statusFilter: 'ALL' | BookingStatus = 'ALL';
  checkInFrom = '';
  checkInTo = '';

  isLoading = false;
  isLoadingBusinesses = false;
  isLoadingCampsites = false;
  errorMessage = '';

  statusOptions: FilterOption[] = [
    { label: 'All statuses', value: 'ALL' },
    { label: 'Payment pending', value: 'PAYMENT_PENDING' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Completed', value: 'COMPLETED' }
  ];

  ngOnInit(): void {
    this.loadBusinesses();
  }

  loadBusinesses(): void {
    this.isLoadingBusinesses = true;
    this.adminService
      .listBusinesses({ page: 0, size: 100, status: '' })
      .subscribe({
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
            this.loadBookings(0);
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
          if (this.campsites.length > 0) {
            this.selectedCampsiteId = this.campsites[0].id ?? null;
          } else {
            this.selectedCampsiteId = null;
          }
          this.isLoadingCampsites = false;
          this.loadBookings(0);
        },
        error: () => {
          this.isLoadingCampsites = false;
          this.errorMessage = 'Failed to load campsites.';
        }
      });
  }

  applyFilters(): void {
    this.loadBookings(0);
  }

  loadBookings(page: number): void {
    if (!this.selectedCampsiteId) {
      this.bookings = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;

    this.bookingService
      .listBookings(this.selectedCampsiteId, status, this.checkInFrom || undefined, this.checkInTo || undefined, page, this.page.size)
      .subscribe({
        next: (response: BookingListResponse) => {
          this.bookings = response.content ?? [];
          this.page = response.page ?? { number: page, size: this.page.size, totalElements: 0, totalPages: 0 };
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load bookings.';
          this.isLoading = false;
        }
      });
  }

  getCampsiteName(): string {
    if (!this.selectedCampsiteId) return 'Select a campsite';
    const campsite = this.campsites.find((item) => item.id === this.selectedCampsiteId);
    return campsite?.name ?? `Campsite #${this.selectedCampsiteId}`;
  }

  getGuestLabel(booking: MerchantBooking): string {
    return booking.contactName || booking.contactEmail || 'Guest';
  }

  getSpotLabel(booking: MerchantBooking): string {
    return booking.spotName || booking.spotId || '-';
  }

  trackById(_index: number, booking: MerchantBooking) {
    return booking.id ?? _index;
  }
}
