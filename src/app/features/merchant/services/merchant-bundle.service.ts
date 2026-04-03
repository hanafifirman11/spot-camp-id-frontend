import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface BundleComponent {
  productId: number;
  productName?: string;
  quantity: number;
}

export interface MerchantBundle {
  id?: number;
  campsiteId?: number;
  name?: string;
  description?: string | null;
  bundlePrice?: number;
  components?: BundleComponent[];
  createdAt?: string;
}

export interface BundlePageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BundleListResponse {
  content?: MerchantBundle[];
  page?: BundlePageMeta;
}

export interface BundleRequestPayload {
  campsiteId: number;
  name: string;
  description?: string | null;
  bundlePrice: number;
  components: Array<{
    productId: number;
    quantity: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class MerchantBundleService {
  private http = inject(HttpClient);

  listBundles(campsiteId: number, page = 0, size = 12): Observable<BundleListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<BundleListResponse>(`/api/v1/campsites/${campsiteId}/bundles`, { params });
  }

  getBundle(bundleId: number): Observable<MerchantBundle> {
    return this.http.get<MerchantBundle>(`/api/v1/bundles/${bundleId}`);
  }

  createBundle(campsiteId: number, payload: BundleRequestPayload): Observable<MerchantBundle> {
    return this.http.post<MerchantBundle>(`/api/v1/campsites/${campsiteId}/bundles`, payload);
  }

  updateBundle(bundleId: number, payload: BundleRequestPayload): Observable<MerchantBundle> {
    return this.http.put<MerchantBundle>(`/api/v1/bundles/${bundleId}`, payload);
  }

  deleteBundle(bundleId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/bundles/${bundleId}`);
  }
}
