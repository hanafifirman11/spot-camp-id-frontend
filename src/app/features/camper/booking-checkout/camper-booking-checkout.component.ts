import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar.component';
import { CamperBookingService, CamperBooking } from '../services/camper-booking.service';

@Component({
  selector: 'app-camper-booking-checkout',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './camper-booking-checkout.component.html',
  styleUrl: './camper-booking-checkout.component.scss'
})
export class CamperBookingCheckoutComponent implements OnInit {
  private bookingService = inject(CamperBookingService);
  private route = inject(ActivatedRoute);

  booking?: CamperBooking;
  bookingId?: number;
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isUploading = false;
  showProofModal = false;

  ngOnInit(): void {
    const bookingParam = this.route.snapshot.paramMap.get('id');
    if (bookingParam) {
      const parsed = Number(bookingParam);
      if (!Number.isNaN(parsed)) {
        this.bookingId = parsed;
      }
    }

    if (this.bookingId) {
      this.loadBooking();
    }
  }

  loadBooking(): void {
    if (!this.bookingId) return;
    this.isLoading = true;
    this.bookingService.getBooking(this.bookingId).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load checkout info.';
        this.isLoading = false;
      }
    });
  }

  uploadProof(fileInput: HTMLInputElement): void {
    if (!this.bookingId || !fileInput.files?.length) {
      this.errorMessage = 'Select a file to upload.';
      return;
    }
    const file = fileInput.files[0];
    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bookingService.uploadPaymentProof(this.bookingId, file).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.isUploading = false;
        fileInput.value = '';
        this.successMessage = 'Payment proof uploaded. Waiting for verification.';
      },
      error: () => {
        this.errorMessage = 'Failed to upload proof.';
        this.isUploading = false;
      }
    });
  }

  formatCurrency(value?: number | null): string {
    if (value === null || value === undefined) {
      return 'Rp -';
    }
    return `Rp ${Number(value).toLocaleString('id-ID')}`;
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

  openProofModal() {
    if (!this.getProofUrl()) return;
    this.showProofModal = true;
  }

  closeProofModal() {
    this.showProofModal = false;
  }
}
