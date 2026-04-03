import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface BankOption {
  code: string;
  name: string;
}

export interface MerchantBankAccount {
  id?: number;
  bankCode: string;
  bankName?: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class MerchantBankAccountService {
  private http = inject(HttpClient);

  listBanks(): Observable<BankOption[]> {
    return this.http.get<BankOption[]>('/api/v1/public/banks');
  }

  listAccounts(): Observable<MerchantBankAccount[]> {
    return this.http.get<MerchantBankAccount[]>('/api/v1/merchant/bank-accounts');
  }

  createAccount(payload: MerchantBankAccount): Observable<MerchantBankAccount> {
    return this.http.post<MerchantBankAccount>('/api/v1/merchant/bank-accounts', payload);
  }

  updateAccount(id: number, payload: MerchantBankAccount): Observable<MerchantBankAccount> {
    return this.http.put<MerchantBankAccount>(`/api/v1/merchant/bank-accounts/${id}`, payload);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/merchant/bank-accounts/${id}`);
  }
}
