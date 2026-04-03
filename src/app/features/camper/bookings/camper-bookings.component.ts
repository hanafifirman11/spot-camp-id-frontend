import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CamperBooking, BookingListResponse, BookingStatus, CamperBookingService } from '../services/camper-booking.service';
import { NavbarComponent } from '../../../layout/navbar.component';

@Component({
  selector: 'app-camper-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './camper-bookings.component.html',
  styleUrl: './camper-bookings.component.scss'
})
export class CamperBookingsComponent implements OnInit {
  private bookingService = inject(CamperBookingService);

  bookings: CamperBooking[] = [];
  page = { number: 0, size: 12, totalElements: 0, totalPages: 0 };

  statusFilter: 'ALL' | BookingStatus = 'ALL';
  checkInFrom = '';
  checkInTo = '';

  isLoading = false;
  errorMessage = '';

  statusOptions = [
    { label: 'All statuses', value: 'ALL' },
    { label: 'Payment pending', value: 'PAYMENT_PENDING' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Completed', value: 'COMPLETED' }
  ];

  ngOnInit(): void {
    this.loadBookings(0);
  }

  applyFilters(): void {
    this.loadBookings(0);
  }

  loadBookings(page: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;

    this.bookingService
      .listBookings(status, this.checkInFrom || undefined, this.checkInTo || undefined, page, this.page.size)
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

  nextPage(): void {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadBookings(this.page.number + 1);
  }

  prevPage(): void {
    if (this.page.number <= 0) return;
    this.loadBookings(this.page.number - 1);
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

  trackById(_index: number, booking: CamperBooking) {
    return booking.id ?? _index;
  }
}
