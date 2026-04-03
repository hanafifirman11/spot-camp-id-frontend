import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../layout/navbar.component';
import { RouterLink } from '@angular/router';
import { NotificationService, UserNotification } from './notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);

  notifications: UserNotification[] = [];
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.notificationService.listNotifications().subscribe({
      next: (list) => {
        this.notifications = list ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load notifications.';
        this.isLoading = false;
      }
    });
  }

  markAsRead(notification: UserNotification): void {
    if (!notification.id || notification.read) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: (updated) => {
        const index = this.notifications.findIndex((item) => item.id === updated.id);
        if (index >= 0) {
          this.notifications[index] = updated;
        }
      }
    });
  }
}
