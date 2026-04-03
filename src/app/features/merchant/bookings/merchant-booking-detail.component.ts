import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BookingItem,
  MerchantBooking,
  MerchantBookingService
} from '../services/merchant-booking.service';
import { GroupedItem } from './models/merchant-booking-detail.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-merchant-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadgeComponent, CurrencyIdrPipe],
  templateUrl: './merchant-booking-detail.component.html',
  styleUrl: './merchant-booking-detail.component.scss'
})
export class MerchantBookingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bookingService = inject(MerchantBookingService);

  booking?: MerchantBooking;
  groupedItems: GroupedItem[] = [];
  campsiteId?: number;
  bookingId?: number;
  showProofModal = false;
  showVerifyModal = false;
  verifyNote = '';
  pendingApproval = true;
  actionInProgress = false;

  isLoading = false;
  errorMessage = '';
  actionMessage = '';

  ngOnInit() {
    const bookingParam = this.route.snapshot.paramMap.get('id');
    const campsiteParam = this.route.snapshot.queryParamMap.get('campsiteId');

    if (bookingParam) {
      const parsed = Number(bookingParam);
      if (!Number.isNaN(parsed)) {
        this.bookingId = parsed;
      }
    }

    if (campsiteParam) {
      const parsed = Number(campsiteParam);
      if (!Number.isNaN(parsed)) {
        this.campsiteId = parsed;
      }
    }

    if (!this.bookingId || !this.campsiteId) {
      this.errorMessage = 'Missing campsite or booking information.';
      return;
    }

    this.loadBooking();
  }

  loadBooking() {
    if (!this.bookingId || !this.campsiteId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.actionMessage = '';

    this.bookingService.getBookingDetail(this.campsiteId, this.bookingId).subscribe({
      next: (response) => {
        this.booking = response;
        this.groupedItems = this.buildGroupedItems(response);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load booking detail.';
        this.isLoading = false;
      }
    });
  }

  formatGuest(): string {
    return this.booking?.contactName || this.booking?.contactEmail || 'Guest';
  }

  getSpotLabel(): string {
    return this.booking?.spotName || this.booking?.spotId || '-';
  }

  getDateRange(): string {
    if (!this.booking?.checkInDate || !this.booking?.checkOutDate) {
      return '-';
    }
    return `${this.booking.checkInDate} → ${this.booking.checkOutDate}`;
  }

  trackByItem(_index: number, item: BookingItem) {
    return item.id ?? _index;
  }

  trackByGroupedItem(_index: number, item: GroupedItem) {
    return item.key;
  }

  canVerifyPayment(): boolean {
    if (!this.booking) return false;
    return this.booking.status === 'PAYMENT_PENDING' && this.booking.paymentProofStatus === 'UPLOADED';
  }

  getProofUrl(): string | null {
    const url = this.booking?.paymentProofUrl;
    if (!url) return null;
    const normalized = url.replace(/\\/g, '/');
    const uploadsIndex = normalized.indexOf('/uploads/');
    if (uploadsIndex >= 0) {
      return `/api/v1${normalized.slice(uploadsIndex)}`;
    }
    if (url.startsWith('http') || url.startsWith('/uploads') || url.startsWith('/api')) {
      return url.startsWith('/uploads') ? `/api/v1${url}` : url;
    }
    if (url.startsWith('uploads/')) {
      return `/api/v1/${url}`;
    }
    return `/api/v1/uploads/${url}`;
  }

  verifyPayment(approved: boolean) {
    if (!this.bookingId) return;
    this.actionMessage = '';
    this.actionInProgress = true;
    this.bookingService.verifyPayment(this.bookingId, approved, this.verifyNote || undefined).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.groupedItems = this.buildGroupedItems(booking);
        this.actionMessage = approved ? 'Payment verified.' : 'Payment marked for re-upload.';
        this.actionInProgress = false;
        this.closeVerifyModal();
      },
      error: () => {
        this.actionMessage = 'Failed to verify payment.';
        this.actionInProgress = false;
      }
    });
  }

  completeBooking() {
    if (!this.bookingId) return;
    this.actionMessage = '';
    this.actionInProgress = true;
    this.bookingService.completeBooking(this.bookingId).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.groupedItems = this.buildGroupedItems(booking);
        this.actionMessage = 'Booking marked as completed.';
        this.actionInProgress = false;
      },
      error: () => {
        this.actionMessage = 'Failed to complete booking.';
        this.actionInProgress = false;
      }
    });
  }

  openProofModal() {
    if (!this.getProofUrl()) return;
    this.showProofModal = true;
  }

  closeProofModal() {
    this.showProofModal = false;
  }

  openVerifyModal(approved: boolean) {
    this.pendingApproval = approved;
    this.verifyNote = '';
    this.showVerifyModal = true;
  }

  closeVerifyModal() {
    this.showVerifyModal = false;
  }

  confirmVerify() {
    this.verifyPayment(this.pendingApproval);
  }

  downloadInvoice() {
    if (!this.bookingId) return;
    this.bookingService.downloadInvoice(this.bookingId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${this.bookingId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.actionMessage = 'Failed to download invoice.';
      }
    });
  }

  private buildGroupedItems(booking: MerchantBooking): GroupedItem[] {
    const items = booking.items ?? [];
    const grouped = new Map<string, GroupedItem>();
    const nightsLabel = this.buildNightsLabel(booking.nights);

    items.forEach((item) => {
      const key = `${item.productId ?? item.productName ?? 'item'}-${item.productType ?? 'product'}`;
      const subtotal = Number(item.subtotal ?? 0);
      const quantity = Number(item.quantity ?? 0);
      const name = item.productName || `Product #${item.productId}`;
      const type = item.productType || 'Product';

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          name,
          type,
          quantity,
          subtotal,
          nightsLabel: type === 'RENTAL_SPOT' ? nightsLabel : undefined
        });
      } else {
        const existing = grouped.get(key)!;
        existing.quantity += quantity;
        existing.subtotal += subtotal;
      }
    });

    return Array.from(grouped.values());
  }

  private buildNightsLabel(nights?: number | null): string | undefined {
    if (!nights || nights <= 0) return undefined;
    const days = nights + 1;
    return `${days} hari ${nights} malam`;
  }
}
