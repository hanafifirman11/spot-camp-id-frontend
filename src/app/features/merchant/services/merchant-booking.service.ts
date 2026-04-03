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

export interface MerchantBooking {
  id?: number;
  userId?: number;
  campsiteId?: number;
  spotId?: string;
  spotName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  status?: BookingStatus;
  totalAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  invoiceNumber?: string;
  paymentBank?: string;
  paymentUniqueCode?: number;
  paymentAmount?: number;
  paymentProofUrl?: string;
  paymentProofStatus?: string;
  paymentProofUploadedAt?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: number;
  paymentVerificationNote?: string;
  paymentBankName?: string;
  paymentBankAccountNumber?: string;
  paymentBankAccountName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  specialRequests?: string;
  expiresAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  items?: BookingItem[];
  canBeCancelled?: boolean;
  refundAmount?: number;
}

export interface BookingPageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BookingListResponse {
  content?: MerchantBooking[];
  page?: BookingPageMeta;
}

@Injectable({ providedIn: 'root' })
export class MerchantBookingService {
  private http = inject(HttpClient);

  listBookings(
    campsiteId: number,
    status?: BookingStatus,
    checkInFrom?: string,
    checkInTo?: string,
    page = 0,
    size = 12
  ): Observable<BookingListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (status) {
      params = params.set('status', status);
    }
    if (checkInFrom) {
      params = params.set('checkInFrom', checkInFrom);
    }
    if (checkInTo) {
      params = params.set('checkInTo', checkInTo);
    }

    return this.http
      .get<any>(`/api/v1/bookings/campsites/${campsiteId}`, { params })
      .pipe(map((response) => this.normalizeListResponse(response, page, size)));
  }

  getBookingDetail(campsiteId: number, bookingId: number): Observable<MerchantBooking> {
    return this.http.get<MerchantBooking>(`/api/v1/bookings/campsites/${campsiteId}/${bookingId}`);
  }

  verifyPayment(bookingId: number, approved: boolean, note?: string): Observable<MerchantBooking> {
    return this.http.post<MerchantBooking>(`/api/v1/bookings/${bookingId}/verify-payment`, { approved, note });
  }

  completeBooking(bookingId: number): Observable<MerchantBooking> {
    return this.http.post<MerchantBooking>(`/api/v1/bookings/${bookingId}/complete`, {});
  }

  downloadInvoice(bookingId: number): Observable<Blob> {
    return this.http.get(`/api/v1/bookings/${bookingId}/invoice`, { responseType: 'blob' });
  }

  private normalizeListResponse(response: any, pageNumber: number, size: number): BookingListResponse {
    const content = response?.content ?? [];
    const page = response?.page ?? {
      number: response?.number ?? pageNumber,
      size: response?.size ?? size,
      totalElements: response?.totalElements ?? content.length,
      totalPages: response?.totalPages ?? 1
    };

    return { content, page };
  }
}
