import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminCampsiteSummary, AdminService, CampsiteStatus, PageMeta } from '../services/admin.service';

@Component({
  selector: 'app-admin-campsites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-campsites.component.html',
  styleUrl: './admin-campsites.component.scss'
})
export class AdminCampsitesComponent implements OnInit {
  campsites: AdminCampsiteSummary[] = [];
  page: PageMeta = { number: 0, size: 10, totalElements: 0, totalPages: 0 };
  query = '';
  statusFilter: CampsiteStatus | '' = '';
  businessId: number | null = null;
  isLoading = false;
  errorMessage = '';

  private adminService = inject(AdminService);

  ngOnInit(): void {
    this.loadCampsites();
  }

  loadCampsites(page = 0): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService
      .listCampsites({
        query: this.query.trim() || undefined,
        status: this.statusFilter || undefined,
        businessId: this.businessId ?? undefined,
        page,
        size: this.page.size
      })
      .subscribe({
        next: (response) => {
          this.campsites = response.content ?? [];
          this.page = response.page;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load campsites.';
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    this.loadCampsites(0);
  }

  clearFilters(): void {
    this.query = '';
    this.statusFilter = '';
    this.businessId = null;
    this.loadCampsites(0);
  }

  nextPage(): void {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadCampsites(this.page.number + 1);
  }

  prevPage(): void {
    if (this.page.number <= 0) return;
    this.loadCampsites(this.page.number - 1);
  }
}
