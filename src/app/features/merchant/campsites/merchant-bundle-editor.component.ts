import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BundleRequestPayload,
  MerchantBundle,
  MerchantBundleService
} from '../services/merchant-bundle.service';
import {
  MerchantProduct,
  MerchantProductService,
  ProductStatus,
  ProductType
} from '../services/merchant-product.service';
import { BundleComponentDraft } from './models/merchant-bundle-editor.model';
import { CurrencyIdrPipe } from '../../../shared/pipes/currency-idr.pipe';

@Component({
  selector: 'app-merchant-bundle-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './merchant-bundle-editor.component.html',
  styleUrl: './merchant-bundle-editor.component.scss'
})
export class MerchantBundleEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private bundleService = inject(MerchantBundleService);
  private productService = inject(MerchantProductService);
  private currencyIdrPipe = new CurrencyIdrPipe();

  campsiteId = 0;
  bundleId?: number;
  isEditMode = false;

  isLoading = false;
  isSaving = false;
  loadError = '';
  saveError = '';
  saveMessage = '';

  availableProducts: MerchantProduct[] = [];
  selectableProducts: MerchantProduct[] = [];
  selectedProductId: number | null = null;
  selectedComponents: BundleComponentDraft[] = [];
  productPriceMap = new Map<number, number>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    bundlePrice: [null as number | null, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  ngOnInit() {
    const campsiteParam = this.route.snapshot.paramMap.get('id');
    this.campsiteId = campsiteParam ? Number(campsiteParam) : 0;
    const bundleParam = this.route.snapshot.paramMap.get('bundleId');
    if (bundleParam) {
      const parsed = Number(bundleParam);
      if (!Number.isNaN(parsed)) {
        this.bundleId = parsed;
        this.isEditMode = true;
      }
    }

    this.loadProducts();
    if (this.isEditMode && this.bundleId) {
      this.loadBundle();
    }
  }

  loadProducts() {
    if (!this.campsiteId) return;
    this.startLoading();
    const activeStatus: ProductStatus = 'ACTIVE';

    this.productService.listProducts(this.campsiteId, undefined, activeStatus, undefined, 0, 200).subscribe({
      next: (response) => {
        this.availableProducts = (response.content ?? [])
          .filter((product) => !!product.id)
          .filter((product) => product.type === 'RENTAL_ITEM');
        this.buildPriceMap();
        this.syncComponentsWithProducts();
        this.refreshSelectableProducts();
        this.stopLoading();
      },
      error: () => {
        this.loadError = 'Failed to load products for bundle selection.';
        this.stopLoading();
      }
    });
  }

  loadBundle() {
    if (!this.bundleId) return;
    this.startLoading();
    this.bundleService.getBundle(this.bundleId).subscribe({
      next: (bundle: MerchantBundle) => {
        this.patchForm(bundle);
        this.selectedComponents = (bundle.components ?? []).map((component) => ({
          productId: component.productId,
          quantity: component.quantity ?? 1,
          productName: component.productName
        }));
        this.syncComponentsWithProducts();
        this.refreshSelectableProducts();
        this.stopLoading();
      },
      error: () => {
        this.loadError = 'Failed to load bundle details.';
        this.stopLoading();
      }
    });
  }

  saveBundle() {
    if (!this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.saveMessage = '';

    const payload = this.buildPayload();

    if (this.isEditMode && this.bundleId) {
      this.bundleService.updateBundle(this.bundleId, payload).subscribe({
        next: () => {
          this.saveMessage = 'Bundle updated.';
          this.isSaving = false;
        },
        error: (err) => {
          this.saveError = err?.error?.message || 'Failed to update bundle.';
          this.isSaving = false;
        }
      });
      return;
    }

    this.bundleService.createBundle(this.campsiteId, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/merchant/campsites', this.campsiteId, 'bundles']);
      },
      error: (err) => {
        this.saveError = err?.error?.message || 'Failed to create bundle.';
        this.isSaving = false;
      }
    });
  }

  addComponent() {
    if (!this.selectedProductId) return;
    if (this.selectedComponents.length >= 10) return;

    const exists = this.selectedComponents.some((component) => component.productId === this.selectedProductId);
    if (exists) return;

    const product = this.findProduct(this.selectedProductId);
    this.selectedComponents.push({
      productId: this.selectedProductId,
      quantity: 1,
      productName: product?.name,
      productType: product?.type
    });
    this.selectedProductId = null;
    this.refreshSelectableProducts();
  }

  removeComponent(component: BundleComponentDraft) {
    this.selectedComponents = this.selectedComponents.filter((item) => item.productId !== component.productId);
    this.refreshSelectableProducts();
  }

  normalizeQuantity(component: BundleComponentDraft) {
    const parsed = Number(component.quantity);
    if (Number.isNaN(parsed) || parsed <= 0) {
      component.quantity = 1;
    } else {
      component.quantity = Math.floor(parsed);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get componentsInvalid(): boolean {
    if (this.selectedComponents.length < 2 || this.selectedComponents.length > 10) {
      return true;
    }
    return this.selectedComponents.some((component) => !component.quantity || component.quantity < 1);
  }

  get totalComponentsPrice(): number {
    return this.selectedComponents.reduce((sum, component) => {
      const unitPrice = this.getProductPrice(component.productId);
      return sum + unitPrice * component.quantity;
    }, 0);
  }

  get minAllowedPrice(): number {
    return this.totalComponentsPrice * 0.5;
  }

  get discountPercent(): number {
    const total = this.totalComponentsPrice;
    const price = this.bundlePriceValue;
    if (total <= 0) return 0;
    const discount = ((total - price) / total) * 100;
    return Math.max(0, discount);
  }

  get discountInvalid(): boolean {
    const total = this.totalComponentsPrice;
    if (total <= 0) return false;
    return this.bundlePriceValue < this.minAllowedPrice;
  }

  get bundlePriceValue(): number {
    const raw = this.form.get('bundlePrice')?.value;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  canSave(): boolean {
    return !!(
      this.campsiteId &&
      this.form.valid &&
      !this.componentsInvalid &&
      !this.discountInvalid &&
      !this.isSaving
    );
  }

  formatPrice(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'Rp -';
    }
    return this.currencyIdrPipe.transform(value);
  }

  getComponentName(component: BundleComponentDraft): string {
    if (component.productName) {
      return component.productName;
    }
    return `Product #${component.productId}`;
  }

  getComponentMeta(component: BundleComponentDraft): string {
    const typeLabel = this.formatType(component.productType);
    const priceLabel = this.formatPrice(this.getProductPrice(component.productId));
    return `${typeLabel} • ${priceLabel}`;
  }

  trackByComponent(_index: number, component: BundleComponentDraft) {
    return component.productId;
  }

  private patchForm(bundle: MerchantBundle) {
    this.form.patchValue({
      name: bundle.name ?? '',
      description: bundle.description ?? '',
      bundlePrice: bundle.bundlePrice ?? null
    });
  }

  private buildPayload(): BundleRequestPayload {
    const rawName = this.form.get('name')?.value ?? '';
    const rawDescription = this.form.get('description')?.value ?? '';

    return {
      campsiteId: this.campsiteId,
      name: String(rawName).trim(),
      description: String(rawDescription).trim() || null,
      bundlePrice: this.bundlePriceValue,
      components: this.selectedComponents.map((component) => ({
        productId: component.productId,
        quantity: component.quantity
      }))
    };
  }

  private refreshSelectableProducts() {
    const selectedIds = new Set(this.selectedComponents.map((component) => component.productId));
    this.selectableProducts = this.availableProducts.filter((product) => {
      if (!product.id) return false;
      return !selectedIds.has(product.id);
    });

    if (this.selectedProductId && selectedIds.has(this.selectedProductId)) {
      this.selectedProductId = null;
    }
  }

  private syncComponentsWithProducts() {
    if (!this.availableProducts.length || !this.selectedComponents.length) return;
    const productMap = new Map(
      this.availableProducts
        .filter((product) => !!product.id)
        .map((product) => [product.id as number, product])
    );

    this.selectedComponents = this.selectedComponents.map((component) => {
      const product = productMap.get(component.productId);
      if (!product) return component;
      return {
        ...component,
        productName: product.name ?? component.productName,
        productType: product.type
      };
    });
  }

  private buildPriceMap() {
    this.productPriceMap.clear();
    this.availableProducts.forEach((product) => {
      if (!product.id) return;
      this.productPriceMap.set(product.id, this.getProductEffectivePrice(product));
    });
  }

  private getProductPrice(productId: number): number {
    return this.productPriceMap.get(productId) ?? 0;
  }

  private getProductEffectivePrice(product?: MerchantProduct): number {
    if (!product) return 0;
    if (product.type === 'RENTAL_SPOT' || product.type === 'RENTAL_ITEM') {
      return Number(product.rentalDetails?.dailyRate ?? product.basePrice ?? 0);
    }
    return Number(product.saleDetails?.unitPrice ?? product.basePrice ?? 0);
  }

  private findProduct(productId: number): MerchantProduct | undefined {
    return this.availableProducts.find((product) => product.id === productId);
  }

  private formatType(type?: ProductType): string {
    if (!type) return 'Unknown';
    if (type === 'RENTAL_SPOT') return 'Rental (map)';
    if (type === 'RENTAL_ITEM') return 'Rental (equipment)';
    return 'Sale (consumable)';
  }

  private startLoading() {
    this.isLoading = true;
  }

  private stopLoading() {
    this.isLoading = false;
  }
}
