import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export type BookingStatus = 'IN_CART' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface BookingItem {
  id?: number;
  productId?: number;
  productName?: string;
  productType?: string;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface CamperBooking {
  id?: number;
  campsiteId?: number;
  spotId?: string;
  spotName?: string;
  spotProductId?: number;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  status?: BookingStatus;
  totalAmount?: number;
  paymentMethod?: string;
  paymentBank?: string;
  paymentBankName?: string;
  paymentBankAccountNumber?: string;
  paymentBankAccountName?: string;
  paymentUniqueCode?: number;
  paymentAmount?: number;
  paymentProofUrl?: string;
  paymentProofStatus?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  specialRequests?: string;
  expiresAt?: string;
  items?: BookingItem[];
}

export interface BookingPageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BookingListResponse {
  content?: CamperBooking[];
  page?: BookingPageMeta;
}

export interface CheckoutRequest {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  specialRequests?: string | null;
  paymentMethod: string;
  paymentChannel: string;
}

export interface CartItemRequest {
  productId: number;
  spotId?: string;
  checkInDate: string;
  checkOutDate: string;
  quantity: number;
}

export interface BankAccountOption {
  id: number;
  bankCode: string;
  bankName?: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class CamperBookingService {
  private http = inject(HttpClient);

  getCart(): Observable<CamperBooking> {
    return this.http.get<CamperBooking>('/api/v1/bookings/cart');
  }

  addCartItem(payload: CartItemRequest): Observable<CamperBooking> {
    return this.http.post<CamperBooking>('/api/v1/bookings/cart/items', payload);
  }

  removeCartItem(itemId: number): Observable<CamperBooking> {
    return this.http.delete<CamperBooking>(`/api/v1/bookings/cart/items/${itemId}`);
  }

  checkout(payload: CheckoutRequest): Observable<CamperBooking> {
    return this.http.post<CamperBooking>('/api/v1/bookings/checkout', payload);
  }

  listBookings(status?: BookingStatus, checkInFrom?: string, checkInTo?: string, page = 0, size = 12): Observable<BookingListResponse> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    if (checkInFrom) params = params.set('checkInFrom', checkInFrom);
    if (checkInTo) params = params.set('checkInTo', checkInTo);
    return this.http.get<any>('/api/v1/bookings', { params }).pipe(
      map((response) => ({
        content: response?.content ?? [],
        page: response?.page ?? {
          number: response?.number ?? page,
          size: response?.size ?? size,
          totalElements: response?.totalElements ?? (response?.content?.length ?? 0),
          totalPages: response?.totalPages ?? 1
        }
      }))
    );
  }

  getBooking(id: number): Observable<CamperBooking> {
    return this.http.get<CamperBooking>(`/api/v1/bookings/${id}`);
  }

  uploadPaymentProof(bookingId: number, file: File): Observable<CamperBooking> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CamperBooking>(`/api/v1/bookings/${bookingId}/payment-proof`, formData);
  }

  downloadInvoice(bookingId: number): Observable<Blob> {
    return this.http.get(`/api/v1/bookings/${bookingId}/invoice`, { responseType: 'blob' });
  }

  listCampsiteBankAccounts(campsiteId: number): Observable<BankAccountOption[]> {
    return this.http.get<BankAccountOption[]>(`/api/v1/public/campsites/${campsiteId}/bank-accounts`);
  }
}
