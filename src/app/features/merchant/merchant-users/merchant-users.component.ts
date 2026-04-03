import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MerchantUser, MerchantUserService, CreateUserRequest } from '../services/merchant-user.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-merchant-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './merchant-users.component.html',
  styleUrl: './merchant-users.component.scss'
})
export class MerchantUsersComponent implements OnInit {
  users: MerchantUser[] = [];
  isLoading = false;
  errorMessage = '';

  showCreateModal = false;
  newUser: CreateUserRequest = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'MERCHANT_MEMBER'
  };
  createLoading = false;
  createError = '';

  private merchantUserService = inject(MerchantUserService);
  private roleService = inject(RoleService);

  canManageUsers = this.roleService.canManageUsers();

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.merchantUserService.listUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.errorMessage = 'Failed to load user list.';
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.newUser = { email: '', firstName: '', lastName: '', role: 'MERCHANT_MEMBER' };
    this.createError = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createUser(): void {
    if (!this.newUser.email || !this.newUser.firstName || !this.newUser.lastName) {
      this.createError = 'Please fill all fields.';
      return;
    }
    
    this.createLoading = true;
    this.createError = '';
    
    this.merchantUserService.createUser(this.newUser).subscribe({
      next: (user) => {
        this.users.push(user);
        this.createLoading = false;
        this.closeCreateModal();
      },
      error: (err) => {
        console.error('Failed to create user', err);
        this.createError = err.error?.message || 'Failed to create user.';
        this.createLoading = false;
      }
    });
  }

  toggleStatus(user: MerchantUser): void {
    if (confirm(`Are you sure you want to ${user.status === 'ACTIVE' ? 'deactivate' : 'activate'} this user?`)) {
      this.merchantUserService.toggleUserStatus(user.id).subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
        },
        error: (err) => console.error('Failed to update status', err)
      });
    }
  }

  changeRole(user: MerchantUser, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as 'MERCHANT_ADMIN' | 'MERCHANT_MEMBER';
    
    if (confirm(`Change role to ${newRole}?`)) {
      this.merchantUserService.updateUserRole(user.id, newRole).subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
        },
        error: (err) => {
          console.error('Failed to update role', err);
          select.value = user.role; // Revert
        }
      });
    } else {
      select.value = user.role; // Revert
    }
  }
}
