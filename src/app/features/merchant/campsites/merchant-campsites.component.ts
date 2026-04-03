import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MerchantCampsiteResponse,
  MerchantCampsiteService,
  PageMetadata
} from '../services/merchant-campsite.service';
import { RoleService } from '../../../core/services/role.service';
import { StatusFilter, StatusOption } from './models/merchant-campsites.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-merchant-campsites',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EmptyStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
    ConfirmDialogComponent,
    CurrencyIdrPipe
  ],
  templateUrl: './merchant-campsites.component.html',
  styleUrl: './merchant-campsites.component.scss'
})
export class MerchantCampsitesComponent implements OnInit {
  private campsiteService = inject(MerchantCampsiteService);
  private roleService = inject(RoleService);

  campsites: MerchantCampsiteResponse[] = [];
  page: PageMetadata = { number: 0, size: 10, totalElements: 0, totalPages: 0 };
  statusFilter: StatusFilter = 'ALL';
  isLoading = false;
  errorMessage = '';
  pendingStatusChange: { campsite: MerchantCampsiteResponse; nextStatus: 'ACTIVE' | 'INACTIVE' } | null = null;
  statusChangeInProgress = false;

  canEdit = this.roleService.canEditMasterData();

  statusOptions: StatusOption[] = [
    { label: 'All statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' }
  ];

  ngOnInit() {
    this.loadCampsites(0);
  }

  applyFilters() {
    this.loadCampsites(0);
  }

  loadCampsites(page: number) {
    this.isLoading = true;
    this.errorMessage = '';

    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;
    this.campsiteService.listCampsites(page, this.page.size, status).subscribe({
      next: (response) => {
        this.campsites = response.content ?? [];
        this.page = response.page ?? { number: page, size: this.page.size, totalElements: 0, totalPages: 0 };
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load campsites. Please try again.';
        this.isLoading = false;
      }
    });
  }

  openDeactivateDialog(campsite: MerchantCampsiteResponse) {
    if (!campsite.id) return;
    this.pendingStatusChange = { campsite, nextStatus: 'INACTIVE' };
  }

  openActivateDialog(campsite: MerchantCampsiteResponse) {
    if (!campsite.id) return;
    this.pendingStatusChange = { campsite, nextStatus: 'ACTIVE' };
  }

  closeStatusDialog() {
    if (this.statusChangeInProgress) return;
    this.pendingStatusChange = null;
  }

  confirmStatusChange() {
    const pending = this.pendingStatusChange;
    if (!pending?.campsite?.id) return;

    this.statusChangeInProgress = true;
    this.campsiteService.updateCampsiteStatus(pending.campsite.id, pending.nextStatus).subscribe({
      next: () => {
        this.pendingStatusChange = null;
        this.statusChangeInProgress = false;
        this.loadCampsites(this.page.number);
      },
      error: () => {
        this.errorMessage = 'Unable to update campsite status. Please try again.';
        this.statusChangeInProgress = false;
      }
    });
  }

  getImageStyle(imageUrl?: string | null): string {
    const url = this.resolveImageUrl(imageUrl);
    return url ? `url("${encodeURI(url)}")` : 'none';
  }

  resolveImageUrl(imageUrl?: string | null): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const normalized = imageUrl.replace(/^\/+/, '');
    if (normalized.startsWith('assets/')) {
      return `/${normalized}`;
    }
    if (normalized.startsWith('api/v1/')) {
      return `/${normalized}`;
    }
    return `/api/v1/${normalized}`;
  }

  trackById(_index: number, campsite: MerchantCampsiteResponse) {
    return campsite.id ?? _index;
  }
}
