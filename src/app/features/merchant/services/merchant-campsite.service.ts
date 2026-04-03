import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type CampsiteStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface MerchantCampsiteRequest {
  name: string;
  description?: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  basePrice: number;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface MerchantCampsiteResponse {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  basePrice?: number;
  coverImageUrl?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: CampsiteStatus;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampsiteImage {
  id?: number;
  url?: string;
  caption?: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface AmenityItem {
  id: number;
  code: string;
  name: string;
  icon?: string;
  category?: string;
}

export interface MerchantCampsiteDetail extends MerchantCampsiteResponse {
  images?: CampsiteImage[];
  amenities?: AmenityItem[];
  rules?: string[];
}

export interface PageMetadata {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CampsiteListResponse {
  content?: MerchantCampsiteResponse[];
  page?: PageMetadata;
}

export interface AmenityResponse {
  amenities: AmenityItem[];
}

export interface RulesResponse {
  rules: string[];
}

export interface CampsiteSummaryResponse {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
}

@Injectable({
  providedIn: 'root'
})
export class MerchantCampsiteService {
  private readonly baseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  listCampsites(page = 0, size = 10, status?: CampsiteStatus): Observable<CampsiteListResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<CampsiteListResponse>(`${this.baseUrl}/campsites`, {
      headers: this.authHeaders(),
      params
    });
  }

  getCampsite(campsiteId: number): Observable<MerchantCampsiteDetail> {
    return this.http.get<MerchantCampsiteDetail>(`${this.baseUrl}/campsites/${campsiteId}`, {
      headers: this.authHeaders()
    });
  }

  createCampsite(payload: MerchantCampsiteRequest): Observable<MerchantCampsiteResponse> {
    return this.http.post<MerchantCampsiteResponse>(`${this.baseUrl}/campsites`, payload, {
      headers: this.authHeaders()
    });
  }

  updateCampsite(campsiteId: number, payload: MerchantCampsiteRequest): Observable<MerchantCampsiteResponse> {
    return this.http.put<MerchantCampsiteResponse>(`${this.baseUrl}/campsites/${campsiteId}`, payload, {
      headers: this.authHeaders()
    });
  }

  deleteCampsite(campsiteId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/campsites/${campsiteId}`, {
      headers: this.authHeaders()
    });
  }

  updateCampsiteStatus(campsiteId: number, status: CampsiteStatus): Observable<MerchantCampsiteResponse> {
    return this.http.patch<MerchantCampsiteResponse>(`${this.baseUrl}/campsites/${campsiteId}/status`, { status }, {
      headers: this.authHeaders()
    });
  }

  getCampsiteSummary(): Observable<CampsiteSummaryResponse> {
    return this.http.get<CampsiteSummaryResponse>(`${this.baseUrl}/campsites/summary`, {
      headers: this.authHeaders()
    });
  }

  uploadImage(campsiteId: number, file: File, caption?: string, isPrimary?: boolean): Observable<CampsiteImage> {
    const formData = new FormData();
    formData.append('image', file);
    if (caption) {
      formData.append('caption', caption);
    }
    if (isPrimary !== undefined) {
      formData.append('isPrimary', String(isPrimary));
    }
    return this.http.post<CampsiteImage>(`${this.baseUrl}/campsites/${campsiteId}/images`, formData, {
      headers: this.authHeaders()
    });
  }

  setPrimaryImage(campsiteId: number, imageId: number): Observable<CampsiteImage> {
    return this.http.put<CampsiteImage>(`${this.baseUrl}/campsites/${campsiteId}/images/${imageId}/primary`, {}, {
      headers: this.authHeaders()
    });
  }

  listAmenities(): Observable<AmenityResponse> {
    return this.http.get<AmenityResponse>(`${this.baseUrl}/campsites/amenities`, {
      headers: this.authHeaders()
    });
  }

  updateAmenities(campsiteId: number, amenityIds: number[]): Observable<AmenityResponse> {
    return this.http.put<AmenityResponse>(`${this.baseUrl}/campsites/${campsiteId}/amenities`, { amenityIds }, {
      headers: this.authHeaders()
    });
  }

  updateRules(campsiteId: number, rules: string[]): Observable<RulesResponse> {
    return this.http.put<RulesResponse>(`${this.baseUrl}/campsites/${campsiteId}/rules`, { rules }, {
      headers: this.authHeaders()
    });
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  }
}
