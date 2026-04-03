import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminBusinessSummary, AdminService, PageMeta, UserStatus } from '../services/admin.service';

@Component({
  selector: 'app-admin-businesses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-businesses.component.html',
  styleUrl: './admin-businesses.component.scss'
})
export class AdminBusinessesComponent implements OnInit {
  businesses: AdminBusinessSummary[] = [];
  page: PageMeta = { number: 0, size: 10, totalElements: 0, totalPages: 0 };
  query = '';
  statusFilter: UserStatus | '' = '';
  isLoading = false;
  errorMessage = '';

  private adminService = inject(AdminService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadBusinesses();
  }

  loadBusinesses(page = 0): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService
      .listBusinesses({
        query: this.query.trim() || undefined,
        status: this.statusFilter || undefined,
        page,
        size: this.page.size
      })
      .subscribe({
        next: (response) => {
          this.businesses = response.content ?? [];
          this.page = response.page;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load businesses.';
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    this.loadBusinesses(0);
  }

  clearFilters(): void {
    this.query = '';
    this.statusFilter = '';
    this.loadBusinesses(0);
  }

  goToDetail(business: AdminBusinessSummary): void {
    if (!business.id) return;
    this.router.navigate(['/admin/businesses', business.id]);
  }

  nextPage(): void {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadBusinesses(this.page.number + 1);
  }

  prevPage(): void {
    if (this.page.number <= 0) return;
    this.loadBusinesses(this.page.number - 1);
  }
}
