import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MerchantUser, MerchantUserService, CreateUserRequest } from '../services/merchant-user.service';
import { RoleService } from '../../../core/services/role.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-merchant-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, StatusBadgeComponent],
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
  confirmInProgress = false;
  pendingConfirm: {
    user: MerchantUser;
    action: 'toggle-status' | 'change-role';
    title: string;
    message: string;
    confirmText: string;
    tone: 'default' | 'danger';
    nextRole?: 'MERCHANT_ADMIN' | 'MERCHANT_MEMBER';
    selectElement?: HTMLSelectElement;
  } | null = null;

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

  requestToggleStatus(user: MerchantUser): void {
    const nextAction = user.status === 'ACTIVE' ? 'Deactivate' : 'Activate';
    this.pendingConfirm = {
      user,
      action: 'toggle-status',
      title: `${nextAction} user`,
      message: `${nextAction} ${user.firstName} ${user.lastName}?`,
      confirmText: nextAction,
      tone: user.status === 'ACTIVE' ? 'danger' : 'default'
    };
  }

  requestRoleChange(user: MerchantUser, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as 'MERCHANT_ADMIN' | 'MERCHANT_MEMBER';
    if (newRole === user.role) {
      return;
    }
    this.pendingConfirm = {
      user,
      action: 'change-role',
      title: 'Change user role',
      message: `Change role for ${user.firstName} ${user.lastName} to ${newRole}?`,
      confirmText: 'Change role',
      tone: 'default',
      nextRole: newRole,
      selectElement: select
    };
  }

  closeConfirmDialog(): void {
    if (this.confirmInProgress) {
      return;
    }
    if (this.pendingConfirm?.action === 'change-role' && this.pendingConfirm.selectElement) {
      this.pendingConfirm.selectElement.value = this.pendingConfirm.user.role;
    }
    this.pendingConfirm = null;
  }

  confirmPendingAction(): void {
    const pending = this.pendingConfirm;
    if (!pending) {
      return;
    }

    this.confirmInProgress = true;

    if (pending.action === 'toggle-status') {
      this.merchantUserService.toggleUserStatus(pending.user.id).subscribe({
        next: (updatedUser) => {
          this.replaceUser(updatedUser);
          this.pendingConfirm = null;
          this.confirmInProgress = false;
        },
        error: (err) => {
          console.error('Failed to update status', err);
          this.confirmInProgress = false;
        }
      });
      return;
    }

    if (!pending.nextRole) {
      this.confirmInProgress = false;
      this.closeConfirmDialog();
      return;
    }

    this.merchantUserService.updateUserRole(pending.user.id, pending.nextRole).subscribe({
      next: (updatedUser) => {
        this.replaceUser(updatedUser);
        this.pendingConfirm = null;
        this.confirmInProgress = false;
      },
      error: (err) => {
        console.error('Failed to update role', err);
        if (pending.selectElement) {
          pending.selectElement.value = pending.user.role;
        }
        this.confirmInProgress = false;
      }
    });
  }

  private replaceUser(updatedUser: MerchantUser): void {
    const index = this.users.findIndex((user) => user.id === updatedUser.id);
    if (index !== -1) {
      this.users[index] = updatedUser;
    }
  }
}
