import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUserSummary, PageMeta, UserRole, UserStatus } from '../services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  users: AdminUserSummary[] = [];
  page: PageMeta = { number: 0, size: 10, totalElements: 0, totalPages: 0 };
  query = '';
  roleFilter: UserRole | '' = '';
  statusFilter: UserStatus | '' = '';
  isLoading = false;
  errorMessage = '';

  private adminService = inject(AdminService);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(page = 0): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService
      .listUsers({
        query: this.query.trim() || undefined,
        role: this.roleFilter || undefined,
        status: this.statusFilter || undefined,
        page,
        size: this.page.size
      })
      .subscribe({
        next: (response) => {
          this.users = response.content ?? [];
          this.page = response.page;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load users.';
          this.isLoading = false;
        }
      });
  }

  onSearch(): void {
    this.loadUsers(0);
  }

  clearFilters(): void {
    this.query = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.loadUsers(0);
  }

  nextPage(): void {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadUsers(this.page.number + 1);
  }

  prevPage(): void {
    if (this.page.number <= 0) return;
    this.loadUsers(this.page.number - 1);
  }
}
