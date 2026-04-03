import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserNotification {
  id?: number;
  type?: string;
  title?: string;
  message?: string;
  priority?: string;
  read?: boolean;
  createdAt?: string;
  referenceType?: string;
  referenceId?: number;
  data?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);

  listNotifications(): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>('/api/v1/notifications');
  }

  markAsRead(id: number): Observable<UserNotification> {
    return this.http.post<UserNotification>(`/api/v1/notifications/${id}/read`, {});
  }
}
