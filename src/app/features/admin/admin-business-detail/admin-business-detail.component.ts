import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AdminBusinessCampsite,
  AdminBusinessDetail,
  AdminService,
  CampsiteStatus,
  PageMeta
} from '../services/admin.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-admin-business-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PaginationComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    CurrencyIdrPipe
  ],
  templateUrl: './admin-business-detail.component.html',
  styleUrl: './admin-business-detail.component.scss'
})
export class AdminBusinessDetailComponent implements OnInit {
  business: AdminBusinessDetail | null = null;
  campsites: AdminBusinessCampsite[] = [];
  page: PageMeta = { number: 0, size: 10, totalElements: 0, totalPages: 0 };
  statusFilter: CampsiteStatus | '' = '';
  isLoadingBusiness = false;
  isLoadingCampsites = false;
  errorMessage = '';
  campsiteError = '';

  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const businessId = idParam ? Number(idParam) : NaN;
    if (Number.isNaN(businessId)) {
      this.errorMessage = 'Invalid business id.';
      return;
    }
    this.loadBusiness(businessId);
    this.loadCampsites(businessId, 0);
  }

  loadBusiness(businessId: number): void {
    this.isLoadingBusiness = true;
    this.errorMessage = '';
    this.adminService.getBusiness(businessId).subscribe({
      next: (business) => {
        this.business = business;
        this.isLoadingBusiness = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load business detail.';
        this.isLoadingBusiness = false;
      }
    });
  }

  loadCampsites(businessId: number, page = 0): void {
    this.isLoadingCampsites = true;
    this.campsiteError = '';
    this.adminService
      .listBusinessCampsites({
        businessId,
        status: this.statusFilter || undefined,
        page,
        size: this.page.size
      })
      .subscribe({
        next: (response) => {
          this.campsites = response.content ?? [];
          this.page = response.page;
          this.isLoadingCampsites = false;
        },
        error: () => {
          this.campsiteError = 'Failed to load campsites.';
          this.isLoadingCampsites = false;
        }
      });
  }

  changeStatusFilter(status: CampsiteStatus | ''): void {
    if (!this.business) return;
    this.statusFilter = status;
    this.loadCampsites(this.business.id, 0);
  }

  changePage(pageNumber: number): void {
    if (!this.business) return;
    this.loadCampsites(this.business.id, pageNumber);
  }
}
