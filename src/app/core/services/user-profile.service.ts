import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserProfile {
  id?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  businessName?: string;
  businessCode?: string;
  createdAt?: string;
  emailVerified?: boolean;
  darkMode?: boolean;
}

export interface UpdateProfilePayload {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  darkMode?: boolean | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface MessageResponse {
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private readonly baseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/users/me`, {
      headers: this.authHeaders()
    });
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/users/me`, payload, {
      headers: this.authHeaders()
    });
  }

  changePassword(payload: ChangePasswordPayload): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/users/me/password`, payload, {
      headers: this.authHeaders()
    });
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  }
}
