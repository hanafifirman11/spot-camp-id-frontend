import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MerchantBankAccount, MerchantBankAccountService, BankOption } from '../services/merchant-bank-account.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-merchant-bank-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './merchant-bank-accounts.component.html',
  styleUrl: './merchant-bank-accounts.component.scss'
})
export class MerchantBankAccountsComponent implements OnInit {
  private bankService = inject(MerchantBankAccountService);
  private roleService = inject(RoleService);

  accounts: MerchantBankAccount[] = [];
  banks: BankOption[] = [];

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  form: MerchantBankAccount = {
    bankCode: '',
    accountName: '',
    accountNumber: '',
    isActive: true
  };

  editingId: number | null = null;
  canEdit = this.roleService.isMerchantAdmin();

  ngOnInit(): void {
    this.loadBanks();
    this.loadAccounts();
  }

  loadBanks(): void {
    this.bankService.listBanks().subscribe({
      next: (banks) => {
        this.banks = banks;
      },
      error: () => {
        this.errorMessage = 'Failed to load bank list.';
      }
    });
  }

  loadAccounts(): void {
    this.isLoading = true;
    this.bankService.listAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load bank accounts.';
      }
    });
  }

  startEdit(account: MerchantBankAccount): void {
    if (!this.canEdit || !account.id) return;
    this.editingId = account.id;
    this.form = { ...account };
    this.successMessage = '';
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.resetForm();
  }

  save(): void {
    if (!this.canEdit) return;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.bankCode || !this.form.accountName || !this.form.accountNumber) {
      this.errorMessage = 'Please complete all bank fields.';
      return;
    }

    if (this.editingId) {
      this.bankService.updateAccount(this.editingId, this.form).subscribe({
        next: () => {
          this.successMessage = 'Bank account updated.';
          this.editingId = null;
          this.resetForm();
          this.loadAccounts();
        },
        error: () => {
          this.errorMessage = 'Failed to update bank account.';
        }
      });
      return;
    }

    this.bankService.createAccount(this.form).subscribe({
      next: () => {
        this.successMessage = 'Bank account added.';
        this.resetForm();
        this.loadAccounts();
      },
      error: () => {
        this.errorMessage = 'Failed to add bank account.';
      }
    });
  }

  remove(account: MerchantBankAccount): void {
    if (!this.canEdit || !account.id) return;
    this.bankService.deleteAccount(account.id).subscribe({
      next: () => {
        this.successMessage = 'Bank account removed.';
        this.loadAccounts();
      },
      error: () => {
        this.errorMessage = 'Failed to remove bank account.';
      }
    });
  }

  resetForm(): void {
    this.form = {
      bankCode: '',
      accountName: '',
      accountNumber: '',
      isActive: true
    };
  }
}
