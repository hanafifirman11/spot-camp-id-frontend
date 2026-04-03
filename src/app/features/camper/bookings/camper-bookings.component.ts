import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CamperBooking, BookingListResponse, BookingStatus, CamperBookingService } from '../services/camper-booking.service';
import { NavbarComponent } from '../../../layout/navbar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';
import { BOOKING_STATUS_OPTIONS } from '../../../shared/constants/booking-status-options.const';

@Component({
  selector: 'app-camper-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NavbarComponent,
    EmptyStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
    CurrencyIdrPipe
  ],
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

  statusOptions = BOOKING_STATUS_OPTIONS;

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

  trackById(_index: number, booking: CamperBooking) {
    return booking.id ?? _index;
  }
}
