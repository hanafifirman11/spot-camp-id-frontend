import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MerchantCampsiteService } from '../services/merchant-campsite.service';
import {
  MerchantProduct,
  MerchantProductService,
  ProductListResponse,
  ProductType
} from '../services/merchant-product.service';
import { RoleService } from '../../../core/services/role.service';
import { FilterOption, StatusFilter, TypeFilter } from './models/merchant-products.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-merchant-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EmptyStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './merchant-products.component.html',
  styleUrl: './merchant-products.component.scss'
})
export class MerchantProductsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private campsiteService = inject(MerchantCampsiteService);
  private productService = inject(MerchantProductService);
  private roleService = inject(RoleService);
  private currencyIdrPipe = new CurrencyIdrPipe();

  campsiteId = 0;
  campsiteName = '';

  products: MerchantProduct[] = [];
  page = { number: 0, size: 12, totalElements: 0, totalPages: 0 };
  statusFilter: StatusFilter = 'ALL';
  typeFilter: TypeFilter = 'ALL';

  canEdit = this.roleService.canEditMasterData();
  searchQuery = '';
  showAdvancedSearch = false;

  isLoading = false;
  errorMessage = '';
  pendingArchiveProduct: MerchantProduct | null = null;
  archiveInProgress = false;

  statusOptions: FilterOption<StatusFilter>[] = [
    { label: 'All statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Archived', value: 'ARCHIVED' }
  ];

  typeOptions: FilterOption<TypeFilter>[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Map spots', value: 'RENTAL_SPOT' },
    { label: 'Rental items', value: 'RENTAL_ITEM' },
    { label: 'Sale items', value: 'SALE' }
  ];

  ngOnInit() {
    const campsiteParam = this.route.snapshot.paramMap.get('id');
    this.campsiteId = campsiteParam ? Number(campsiteParam) : 0;
    this.loadCampsiteName();
    this.loadProducts(0);
  }

  loadCampsiteName() {
    if (!this.campsiteId) return;
    this.campsiteService.getCampsite(this.campsiteId).subscribe({
      next: (detail) => {
        this.campsiteName = detail.name ?? '';
      }
    });
  }

  applyFilters() {
    this.loadProducts(0);
  }

  toggleAdvancedSearch() {
    this.showAdvancedSearch = !this.showAdvancedSearch;
  }

  resetFilters() {
    this.searchQuery = '';
    this.statusFilter = 'ALL';
    this.loadProducts(0);
  }

  setTypeFilter(type: TypeFilter) {
    if (this.typeFilter === type) return;
    this.typeFilter = type;
    this.loadProducts(0);
  }

  loadProducts(page: number) {
    if (!this.campsiteId) return;
    this.isLoading = true;
    this.errorMessage = '';

    const status = this.statusFilter === 'ALL' ? undefined : this.statusFilter;
    const type = this.typeFilter === 'ALL' ? undefined : this.typeFilter;
    const query = this.searchQuery.trim() ? this.searchQuery.trim() : undefined;

    this.productService.listProducts(this.campsiteId, type, status, query, page, this.page.size).subscribe({
      next: (response: ProductListResponse) => {
        const nextPage = response.page ?? { number: page, size: this.page.size, totalElements: 0, totalPages: 0 };
        if (nextPage.totalPages > 0 && nextPage.number >= nextPage.totalPages) {
          this.loadProducts(Math.max(0, nextPage.totalPages - 1));
          return;
        }
        this.products = response.content ?? [];
        this.page = nextPage;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load products. Please try again.';
        this.isLoading = false;
      }
    });
  }

  openArchiveDialog(product: MerchantProduct) {
    if (!product.id) return;
    this.pendingArchiveProduct = product;
  }

  closeArchiveDialog() {
    if (this.archiveInProgress) return;
    this.pendingArchiveProduct = null;
  }

  confirmArchiveProduct() {
    const product = this.pendingArchiveProduct;
    if (!product?.id) return;
    this.archiveInProgress = true;

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.pendingArchiveProduct = null;
        this.archiveInProgress = false;
        this.loadProducts(this.page.number);
      },
      error: () => {
        this.errorMessage = 'Unable to archive product. Please try again.';
        this.archiveInProgress = false;
      }
    });
  }

  formatType(type?: ProductType | null): string {
    if (!type) return 'Unknown';
    if (type === 'RENTAL_SPOT') return 'Rental (map)';
    if (type === 'RENTAL_ITEM') return 'Rental (equipment)';
    return 'Sale (consumable)';
  }

  getPriceLabel(product: MerchantProduct): string {
    const price =
      product.type === 'RENTAL_SPOT' || product.type === 'RENTAL_ITEM'
        ? product.rentalDetails?.dailyRate ?? product.basePrice
        : product.saleDetails?.unitPrice ?? product.basePrice;

    if (price === undefined || price === null) {
      return 'Rp -';
    }
    return this.currencyIdrPipe.transform(price);
  }

  getStockLabel(product: MerchantProduct): string {
    if (product.type === 'RENTAL_SPOT') {
      return 'Map spot';
    }
    if (product.type === 'RENTAL_ITEM') {
      return `Stock ${product.rentalDetails?.stockTotal ?? 0}`;
    }
    return `Stock ${product.saleDetails?.currentStock ?? 0}`;
  }

  trackById(_index: number, product: MerchantProduct) {
    return product.id ?? _index;
  }
}
