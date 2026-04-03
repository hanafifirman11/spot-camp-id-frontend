import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, forkJoin, from, last, of } from 'rxjs';
import { NavbarComponent } from '../../../layout/navbar.component';
import { BankAccountOption, CamperBookingService, CamperBooking, CartItemRequest } from '../services/camper-booking.service';
import {
  GroupedItem,
  ProductListResponse,
  RentalItem,
  SaleItem
} from './models/camper-booking-detail.model';

@Component({
  selector: 'app-camper-booking-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './camper-booking-detail.component.html',
  styleUrl: './camper-booking-detail.component.scss'
})
export class CamperBookingDetailComponent implements OnInit {
  private bookingService = inject(CamperBookingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  booking?: CamperBooking;
  groupedItems: GroupedItem[] = [];
  bookingId?: number;
  bankAccounts: BankAccountOption[] = [];
  selectedBankCode = '';
  contactName = '';
  contactEmail = '';
  contactPhone = '';
  specialRequests = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isSubmitting = false;
  isUpdatingItems = false;
  showProofModal = false;
  showItemModal = false;

  tentMode: 'OWN' | 'RENTAL' = 'OWN';
  rentalItems: RentalItem[] = [];
  tentItems: RentalItem[] = [];
  rentalAddOns: RentalItem[] = [];
  saleItems: SaleItem[] = [];
  selectedTentId: number | null = null;
  selectedTentQuantity = 1;
  selectedRentalAddOns = new Map<number, number>();
  selectedSaleItems = new Map<number, number>();
  campsiteName = '';
  mapName = '';

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
        this.groupedItems = this.buildGroupedItems(booking);
        this.contactName = booking.contactName || '';
        this.contactEmail = booking.contactEmail || '';
        this.contactPhone = booking.contactPhone || '';
        this.specialRequests = booking.specialRequests || '';
        if (booking.campsiteId) {
          this.loadBankAccounts(booking.campsiteId);
          this.loadProductOptions(booking.campsiteId);
          this.loadCampsiteInfo(booking.campsiteId);
        }
        this.syncSelectionsFromBooking();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load booking detail.';
        this.isLoading = false;
      }
    });
  }

  loadProductOptions(campsiteId: number): void {
    const rentalItems$ = this.http.get<ProductListResponse<RentalItem>>(`/api/v1/campsites/${campsiteId}/products`, {
      params: {
        type: 'RENTAL_ITEM',
        status: 'ACTIVE',
        page: '0',
        size: '200'
      }
    }).pipe(
      catchError(() => of({ content: [] }))
    );

    const saleItems$ = this.http.get<ProductListResponse<SaleItem>>(`/api/v1/campsites/${campsiteId}/products`, {
      params: {
        type: 'SALE',
        status: 'ACTIVE',
        page: '0',
        size: '200'
      }
    }).pipe(
      catchError(() => of({ content: [] }))
    );

    forkJoin([rentalItems$, saleItems$]).subscribe({
      next: ([rental, sale]) => {
        this.rentalItems = rental.content ?? [];
        this.saleItems = sale.content ?? [];
        this.tentItems = this.rentalItems.filter((item) => item.itemType === 'TENT');
        this.rentalAddOns = this.rentalItems.filter((item) => item.itemType !== 'TENT');
        this.syncSelectionsFromBooking();
      },
      error: () => {
        this.rentalItems = [];
        this.saleItems = [];
        this.tentItems = [];
        this.rentalAddOns = [];
      }
    });
  }

  loadCampsiteInfo(campsiteId: number): void {
    this.http.get<{ name?: string }>(`/api/v1/public/campsites/${campsiteId}`).subscribe({
      next: (data) => {
        this.campsiteName = data?.name ?? '';
      },
      error: () => {
        this.campsiteName = '';
      }
    });

    this.http.get<Array<{ mapName?: string; mapCode?: string; productIds?: number[] }>>(`/api/v1/public/maps/${campsiteId}/configs`).subscribe({
      next: (maps) => {
        if (!Array.isArray(maps) || maps.length === 0) {
          this.mapName = '';
          return;
        }
        const spotProductId = this.booking?.spotProductId;
        const matched = spotProductId
          ? maps.find((map) => Array.isArray(map.productIds) && map.productIds.includes(spotProductId))
          : undefined;
        if (matched) {
          this.mapName = matched.mapName || matched.mapCode || '';
          return;
        }
        if (maps.length === 1) {
          this.mapName = maps[0].mapName || maps[0].mapCode || '';
          return;
        }
        this.mapName = '';
      },
      error: () => {
        this.mapName = '';
      }
    });
  }

  private syncSelectionsFromBooking(): void {
    if (!this.booking?.items?.length) return;
    const spotProductId = this.booking.spotProductId;
    const rentalIds = new Set(this.rentalItems.map((item) => item.id).filter(Boolean) as number[]);
    const saleIds = new Set(this.saleItems.map((item) => item.id).filter(Boolean) as number[]);
    const tentIds = new Set(this.tentItems.map((item) => item.id).filter(Boolean) as number[]);

    this.selectedRentalAddOns.clear();
    this.selectedSaleItems.clear();

    this.booking.items.forEach((item) => {
      if (!item.productId || item.productId === spotProductId) return;
      if (tentIds.has(item.productId)) {
        this.tentMode = 'RENTAL';
        this.selectedTentId = item.productId;
        this.selectedTentQuantity = item.quantity ?? 1;
        return;
      }
      if (rentalIds.has(item.productId)) {
        this.selectedRentalAddOns.set(item.productId, item.quantity ?? 1);
        return;
      }
      if (saleIds.has(item.productId)) {
        this.selectedSaleItems.set(item.productId, item.quantity ?? 1);
      }
    });
  }

  setAddOnQuantity(productId: number, quantity: number | null | undefined): void {
    if (!productId) return;
    const normalized = Math.max(0, Number(quantity ?? 0));
    if (normalized === 0) {
      this.selectedRentalAddOns.delete(productId);
      return;
    }
    this.selectedRentalAddOns.set(productId, normalized);
  }

  setSaleQuantity(productId: number, quantity: number | null | undefined): void {
    if (!productId) return;
    const normalized = Math.max(0, Number(quantity ?? 0));
    if (normalized === 0) {
      this.selectedSaleItems.delete(productId);
      return;
    }
    this.selectedSaleItems.set(productId, normalized);
  }

  setTentSelection(productId: number | null): void {
    this.selectedTentId = productId;
    if (!productId) {
      this.selectedTentQuantity = 1;
    }
  }

  applySelections(closeModalOnSuccess = false): void {
    if (!this.booking) return;
    if (!this.booking.checkInDate || !this.booking.checkOutDate) {
      this.errorMessage = 'Booking dates are missing.';
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';

    const desiredItems: CartItemRequest[] = [];
    if (this.tentMode === 'RENTAL' && this.selectedTentId) {
      if ((this.selectedTentQuantity || 0) <= 0) {
        this.errorMessage = 'Quantity must be at least 1.';
        return;
      }
      desiredItems.push({
        productId: this.selectedTentId,
        spotId: this.booking.spotId ?? undefined,
        checkInDate: this.booking.checkInDate,
        checkOutDate: this.booking.checkOutDate,
        quantity: Math.max(1, this.selectedTentQuantity || 1)
      });
    }

    this.selectedRentalAddOns.forEach((qty, productId) => {
      if (qty <= 0) {
        this.errorMessage = 'Quantity must be at least 1.';
        return;
      }
      desiredItems.push({
        productId,
        spotId: this.booking!.spotId ?? undefined,
        checkInDate: this.booking!.checkInDate!,
        checkOutDate: this.booking!.checkOutDate!,
        quantity: Math.max(1, qty || 1)
      });
    });

    this.selectedSaleItems.forEach((qty, productId) => {
      if (qty <= 0) {
        this.errorMessage = 'Quantity must be at least 1.';
        return;
      }
      desiredItems.push({
        productId,
        spotId: this.booking!.spotId ?? undefined,
        checkInDate: this.booking!.checkInDate!,
        checkOutDate: this.booking!.checkOutDate!,
        quantity: Math.max(1, qty || 1)
      });
    });

    const spotProductId = this.booking.spotProductId;
    const existingItems = (this.booking.items ?? []).filter((item) => item.productId && item.productId !== spotProductId);
    const existingMap = new Map<number, typeof existingItems[number]>();
    existingItems.forEach((item) => {
      if (item.productId) existingMap.set(item.productId, item);
    });

    const desiredMap = new Map<number, CartItemRequest>();
    desiredItems.forEach((item) => desiredMap.set(item.productId, item));

    const operations: Array<ReturnType<CamperBookingService['addCartItem']>> = [];

    existingItems.forEach((item) => {
      if (!item.productId || !item.id) return;
      const desired = desiredMap.get(item.productId);
      if (!desired || desired.quantity !== item.quantity) {
        operations.push(this.bookingService.removeCartItem(item.id));
      }
    });

    desiredItems.forEach((item) => {
      const existing = existingMap.get(item.productId);
      if (!existing || existing.quantity !== item.quantity) {
        operations.push(this.bookingService.addCartItem(item));
      }
    });

    if (operations.length === 0) {
      this.successMessage = 'Booking items are already up to date.';
      return;
    }

    this.isUpdatingItems = true;
    from(operations)
      .pipe(concatMap((operation) => operation), last())
      .subscribe({
        next: (booking) => {
          this.booking = booking ?? this.booking;
          if (this.booking) {
            this.groupedItems = this.buildGroupedItems(this.booking);
          }
          this.syncSelectionsFromBooking();
          this.isUpdatingItems = false;
          this.successMessage = 'Booking items updated.';
          if (closeModalOnSuccess) {
            this.showItemModal = false;
          }
          if (this.bookingId) {
            this.bookingService.getBooking(this.bookingId).subscribe({
              next: (refreshed) => {
                this.booking = refreshed;
                this.groupedItems = this.buildGroupedItems(refreshed);
                this.syncSelectionsFromBooking();
              },
              error: () => {
                // Keep optimistic UI if refresh fails.
              }
            });
          }
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update booking items.';
          this.isUpdatingItems = false;
        }
      });
  }

  loadBankAccounts(campsiteId: number): void {
    this.bookingService.listCampsiteBankAccounts(campsiteId).subscribe({
      next: (accounts) => {
        this.bankAccounts = accounts ?? [];
        if (!this.selectedBankCode && this.bankAccounts.length > 0) {
          this.selectedBankCode = this.bankAccounts[0].bankCode;
        }
      },
      error: () => {
        this.bankAccounts = [];
      }
    });
  }

  proceedToCheckout(): void {
    if (!this.booking) return;
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.contactName || !this.contactEmail || !this.contactPhone) {
      this.errorMessage = 'Please fill contact name, email, and phone.';
      return;
    }
    if (!this.selectedBankCode) {
      this.errorMessage = 'Please select a bank account.';
      return;
    }
    this.isSubmitting = true;
    this.bookingService
      .checkout({
        contactName: this.contactName,
        contactEmail: this.contactEmail,
        contactPhone: this.contactPhone,
        specialRequests: this.specialRequests || null,
        paymentMethod: 'MANUAL_TRANSFER',
        paymentChannel: this.selectedBankCode
      })
      .subscribe({
        next: (booking) => {
          this.booking = booking;
          this.groupedItems = this.buildGroupedItems(booking);
          this.isSubmitting = false;
          this.router.navigate(['/bookings', booking.id, 'checkout']);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to proceed to checkout.';
          this.isSubmitting = false;
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

  private buildGroupedItems(booking: CamperBooking): GroupedItem[] {
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

  openProofModal() {
    if (!this.getProofUrl()) return;
    this.showProofModal = true;
  }

  closeProofModal() {
    this.showProofModal = false;
  }

  openItemModal() {
    this.showItemModal = true;
  }

  closeItemModal() {
    this.showItemModal = false;
  }

  downloadInvoice(): void {
    if (!this.booking?.id) return;
    this.bookingService.downloadInvoice(this.booking.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `invoice-${this.booking?.id}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = 'Failed to download invoice.';
      }
    });
  }

  isRentalSelected(id?: number): boolean {
    if (!id) return false;
    return this.selectedRentalAddOns.has(id);
  }

  isSaleSelected(id?: number): boolean {
    if (!id) return false;
    return this.selectedSaleItems.has(id);
  }

  toggleRentalSelection(id: number | undefined, event: Event) {
    if (!id) return;
    const target = event.target as HTMLInputElement | null;
    const checked = !!target?.checked;
    if (checked) {
      this.selectedRentalAddOns.set(id, this.selectedRentalAddOns.get(id) || 1);
    } else {
      this.selectedRentalAddOns.delete(id);
    }
  }

  toggleSaleSelection(id: number | undefined, event: Event) {
    if (!id) return;
    const target = event.target as HTMLInputElement | null;
    const checked = !!target?.checked;
    if (checked) {
      this.selectedSaleItems.set(id, this.selectedSaleItems.get(id) || 1);
    } else {
      this.selectedSaleItems.delete(id);
    }
  }
}
