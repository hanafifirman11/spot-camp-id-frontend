import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ProductType = 'RENTAL_SPOT' | 'RENTAL_ITEM' | 'SALE';
export type ProductCategory = 'RENTAL' | 'SALE' | 'PACKAGE';
export type ProductItemType = 'SPOT' | 'TENT' | 'EQUIPMENT' | 'GOODS' | 'FNB' | 'PACKAGE';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface ProductDetails {
  stockTotal?: number;
  bufferTime?: number;
  dailyRate?: number;
}

export interface SaleDetails {
  currentStock?: number;
  reorderLevel?: number;
  unitPrice?: number;
}

export interface MerchantProduct {
  id?: number;
  campsiteId?: number;
  name?: string;
  description?: string;
  type?: ProductType;
  category?: ProductCategory;
  itemType?: ProductItemType;
  basePrice?: number;
  status?: ProductStatus;
  images?: string[];
  rentalDetails?: ProductDetails;
  saleDetails?: SaleDetails;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductListResponse {
  content?: MerchantProduct[];
  page?: ProductPageMeta;
}

export interface ProductRequestPayload {
  name: string;
  type: ProductType;
  category?: ProductCategory;
  itemType?: ProductItemType;
  price: number;
  description?: string | null;
  stockTotal?: number | null;
  bufferTimeMinutes?: number | null;
  dailyRate?: number | null;
  currentStock?: number | null;
  reorderLevel?: number | null;
  unitPrice?: number | null;
  images?: string[];
  status?: ProductStatus;
}

@Injectable({ providedIn: 'root' })
export class MerchantProductService {
  private http = inject(HttpClient);

  listProducts(
    campsiteId: number,
    type?: ProductType,
    status?: ProductStatus,
    query?: string,
    page = 0,
    size = 12
  ): Observable<ProductListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (type) {
      params = params.set('type', type);
    }
    if (status) {
      params = params.set('status', status);
    }
    if (query) {
      params = params.set('query', query);
    }

    return this.http.get<ProductListResponse>(`/api/v1/campsites/${campsiteId}/products`, { params });
  }

  getProduct(productId: number): Observable<MerchantProduct> {
    return this.http.get<MerchantProduct>(`/api/v1/products/${productId}`);
  }

  createProduct(campsiteId: number, payload: ProductRequestPayload): Observable<MerchantProduct> {
    return this.http.post<MerchantProduct>(`/api/v1/campsites/${campsiteId}/products`, payload);
  }

  updateProduct(productId: number, payload: ProductRequestPayload): Observable<MerchantProduct> {
    return this.http.put<MerchantProduct>(`/api/v1/products/${productId}`, payload);
  }

  deleteProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/products/${productId}`);
  }

  adjustStock(campsiteId: number, productId: number, adjustment: number, reason?: string): Observable<any> {
    return this.http.patch(`/api/v1/campsites/${campsiteId}/products/${productId}/stock`, {
      adjustment,
      reason
    });
  }
}
