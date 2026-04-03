import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDashboardSummary, AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  summary: AdminDashboardSummary | null = null;
  isLoading = false;
  errorMessage = '';

  private adminService = inject(AdminService);

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getDashboardSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load admin summary.';
        this.isLoading = false;
      }
    });
  }

  formatBytes(bytes?: number): string {
    if (!bytes && bytes !== 0) return '-';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(0) + ' MB';
  }

  formatUptime(seconds?: number): string {
    if (!seconds && seconds !== 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  formatLatency(ms?: number): string {
    if (!ms && ms !== 0) return '-';
    if (ms < 1000) {
      return `${ms.toFixed(0)} ms`;
    }
    return `${(ms / 1000).toFixed(2)} s`;
  }

  getDiskUsed(summary: AdminDashboardSummary): number | null {
    if (summary.diskTotal === undefined || summary.diskFree === undefined) {
      return null;
    }
    return summary.diskTotal - summary.diskFree;
  }

  formatErrorRate(summary: AdminDashboardSummary): string {
    if (!summary.httpRequestCount || summary.httpRequestCount === 0) return '-';
    const errorCount = summary.httpErrorCount ?? 0;
    return `${((errorCount / summary.httpRequestCount) * 100).toFixed(1)}%`;
  }
}
