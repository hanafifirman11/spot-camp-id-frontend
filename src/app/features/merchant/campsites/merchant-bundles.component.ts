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

@Component({
  selector: 'app-merchant-bundles',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

  nextPage() {
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.loadBundles(this.page.number + 1);
  }

  prevPage() {
    if (this.page.number <= 0) return;
    this.loadBundles(this.page.number - 1);
  }

  archiveBundle(bundle: MerchantBundle) {
    if (!bundle.id) return;
    const confirmMessage = `Archive ${bundle.name || 'this bundle'}?`;
    if (!window.confirm(confirmMessage)) return;

    this.bundleService.deleteBundle(bundle.id).subscribe({
      next: () => this.loadBundles(this.page.number),
      error: () => {
        this.errorMessage = 'Unable to archive bundle. Please try again.';
      }
    });
  }

  formatBundlePrice(bundle?: MerchantBundle): string {
    const price = bundle?.bundlePrice;
    if (price === undefined || price === null) {
      return 'Rp -';
    }
    return `Rp ${Number(price).toLocaleString('id-ID')}`;
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
