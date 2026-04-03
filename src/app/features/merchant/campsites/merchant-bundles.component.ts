import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MerchantCampsiteService } from '../services/merchant-campsite.service';
import {
  BundleListResponse,
  MerchantBundle,
  MerchantBundleService
} from '../services/merchant-bundle.service';
import { RoleService } from '../../../core/services/role.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-merchant-bundles',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    CurrencyIdrPipe
  ],
  templateUrl: './merchant-bundles.component.html',
  styleUrl: './merchant-bundles.component.scss'
})
export class MerchantBundlesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private campsiteService = inject(MerchantCampsiteService);
  private bundleService = inject(MerchantBundleService);
  private roleService = inject(RoleService);

  campsiteId = 0;
  campsiteName = '';

  bundles: MerchantBundle[] = [];
  page = { number: 0, size: 12, totalElements: 0, totalPages: 0 };

  isLoading = false;
  errorMessage = '';
  pendingArchiveBundle: MerchantBundle | null = null;
  archiveInProgress = false;

  canEdit = this.roleService.canEditMasterData();

  ngOnInit() {
    const campsiteParam = this.route.snapshot.paramMap.get('id');
    this.campsiteId = campsiteParam ? Number(campsiteParam) : 0;
    this.loadCampsiteName();
    this.loadBundles(0);
  }

  loadCampsiteName() {
    if (!this.campsiteId) return;
    this.campsiteService.getCampsite(this.campsiteId).subscribe({
      next: (detail) => {
        this.campsiteName = detail.name ?? '';
      }
    });
  }

  loadBundles(page: number) {
    if (!this.campsiteId) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.bundleService.listBundles(this.campsiteId, page, this.page.size).subscribe({
      next: (response: BundleListResponse) => {
        this.bundles = response.content ?? [];
        this.page = response.page ?? { number: page, size: this.page.size, totalElements: 0, totalPages: 0 };
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load bundles. Please try again.';
        this.isLoading = false;
      }
    });
  }

  openArchiveDialog(bundle: MerchantBundle) {
    if (!bundle.id) return;
    this.pendingArchiveBundle = bundle;
  }

  closeArchiveDialog() {
    if (this.archiveInProgress) return;
    this.pendingArchiveBundle = null;
  }

  confirmArchiveBundle() {
    const bundle = this.pendingArchiveBundle;
    if (!bundle?.id) return;

    this.archiveInProgress = true;
    this.bundleService.deleteBundle(bundle.id).subscribe({
      next: () => {
        this.pendingArchiveBundle = null;
        this.archiveInProgress = false;
        this.loadBundles(this.page.number);
      },
      error: () => {
        this.errorMessage = 'Unable to archive bundle. Please try again.';
        this.archiveInProgress = false;
      }
    });
  }

  getComponentSummary(bundle: MerchantBundle): string {
    const components = bundle.components ?? [];
    if (components.length === 0) return 'No components yet.';

    const names = components.map((component) => {
      if (component.productName) {
        return component.productName;
      }
      return component.productId ? `Product #${component.productId}` : 'Product';
    });

    if (names.length <= 2) {
      return names.join(', ');
    }
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  }

  getComponentCount(bundle: MerchantBundle): string {
    const count = bundle.components?.length ?? 0;
    return `${count} item${count === 1 ? '' : 's'}`;
  }

  trackById(_index: number, bundle: MerchantBundle) {
    return bundle.id ?? _index;
  }
}
