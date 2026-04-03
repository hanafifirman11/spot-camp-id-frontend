import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MerchantCampsiteResponse,
  MerchantCampsiteService
} from '../services/merchant-campsite.service';
import {
  BookingListResponse,
  BookingStatus,
  MerchantBooking,
  MerchantBookingService
} from '../services/merchant-booking.service';
import { FilterOption, StatusFilter } from './models/merchant-bookings.model';

@Component({
  selector: 'app-merchant-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './merchant-bookings.component.html',
  styleUrl: './merchant-bookings.component.scss'
})
export class MerchantBookingsComponent implements OnInit {
  private campsiteService = inject(MerchantCampsiteService);
  private bookingService = inject(MerchantBookingService);

  campsites: MerchantCampsiteResponse[] = [];
  selectedCampsiteId: number | null = null;

  bookings: MerchantBooking[] = [];
  page = { number: 0, size: 12, totalElements: 0, totalPages: 0 };

  statusFilter: StatusFilter = 'ALL';
  checkInFrom = '';
  checkInTo = '';

  isLoading = false;
  isLoadingCampsites = false;
  errorMessage = '';

  statusOptions: FilterOption<StatusFilter>[] = [
    { label: 'All statuses', value: 'ALL' },
    { label: 'Payment pending', value: 'PAYMENT_PENDING' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Completed', value: 'COMPLETED' }
  ];

  ngOnInit() {
    this.loadCampsites();
  }

  loadCampsites() {
    this.isLoadingCampsites = true;
    this.campsiteService.listCampsites(0, 50).subscribe({
      next: (response) => {
        this.campsites = response.content ?? [];
        if (!this.selectedCampsiteId && this.campsites.length > 0) {
          this.selectedCampsiteId = this.campsites[0].id ?? null;
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

  applyFilters() {
    this.loadBookings(0);
  }

  loadBookings(page: number) {
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
          this.errorMessage = 'Failed to load bookings. Please try again.';
          this.isLoading = false;
        }
      });
  }

  nextPage() {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadBookings(this.page.number + 1);
  }

  prevPage() {
    if (this.page.number <= 0) return;
    this.loadBookings(this.page.number - 1);
  }

  getCampsiteName(): string {
    if (!this.selectedCampsiteId) return 'Select a campsite';
    const campsite = this.campsites.find((item) => item.id === this.selectedCampsiteId);
    return campsite?.name ?? `Campsite #${this.selectedCampsiteId}`;
  }

  formatStatus(status?: BookingStatus | null): string {
    if (!status) return 'Unknown';
    return status.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }

  statusClass(status?: BookingStatus | null): string {
    if (!status) return 'status-unknown';
    return `status-${status.toLowerCase()}`;
  }

  formatCurrency(value?: number | null): string {
    if (value === null || value === undefined) {
      return 'Rp -';
    }
    return `Rp ${Number(value).toLocaleString('id-ID')}`;
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
