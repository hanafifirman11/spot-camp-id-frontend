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

@Component({
  selector: 'app-merchant-campsites',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

  nextPage() {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadCampsites(this.page.number + 1);
  }

  prevPage() {
    if (this.page.number <= 0) return;
    this.loadCampsites(this.page.number - 1);
  }

  deactivateCampsite(campsite: MerchantCampsiteResponse) {
    if (!campsite.id) return;
    const confirmMessage = `Deactivate ${campsite.name || 'this campsite'}?`;
    if (!window.confirm(confirmMessage)) return;

    this.campsiteService.updateCampsiteStatus(campsite.id, 'INACTIVE').subscribe({
      next: () => this.loadCampsites(this.page.number),
      error: () => {
        this.errorMessage = 'Unable to deactivate campsite. Please try again.';
      }
    });
  }

  activateCampsite(campsite: MerchantCampsiteResponse) {
    if (!campsite.id) return;
    const confirmMessage = `Activate ${campsite.name || 'this campsite'}?`;
    if (!window.confirm(confirmMessage)) return;

    this.campsiteService.updateCampsiteStatus(campsite.id, 'ACTIVE').subscribe({
      next: () => this.loadCampsites(this.page.number),
      error: () => {
        this.errorMessage = 'Unable to activate campsite. Please try again.';
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

  formatStatus(status?: string | null): string {
    if (!status) return 'Unknown';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  trackById(_index: number, campsite: MerchantCampsiteResponse) {
    return campsite.id ?? _index;
  }
}
