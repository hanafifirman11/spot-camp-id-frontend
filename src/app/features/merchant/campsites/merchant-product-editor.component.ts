import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  MerchantProduct,
  MerchantProductService,
  ProductRequestPayload,
  ProductStatus,
  ProductItemType,
  ProductType
} from '../services/merchant-product.service';
import { RoleService } from '../../../core/services/role.service';

interface ProductFormValue {
  name: string | null;
  type: ProductType | null;
  itemType: ProductItemType | null;
  status: ProductStatus | null;
  description: string | null;
  bufferTimeMinutes: number | null;
  dailyRate: number | null;
  stockTotal: number | null;
  basePrice: number | null;
  currentStock: number | null;
  reorderLevel: number | null;
  unitPrice: number | null;
  images: string | null;
}

@Component({
  selector: 'app-merchant-product-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './merchant-product-editor.component.html',
  styleUrl: './merchant-product-editor.component.scss'
})
export class MerchantProductEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private productService = inject(MerchantProductService);
  private roleService = inject(RoleService);

  campsiteId = 0;
  productId?: number;
  isEditMode = false;

  isLoading = false;
  isSaving = false;
  loadError = '';
  saveError = '';
  saveMessage = '';
  validationMessage = '';
  lockedStockTotal = 1;
  canEdit = this.roleService.canEditMasterData();
  stockAdjustment: number | null = null;
  stockReason = '';
  stockMessage = '';
  stockError = '';
  currentProduct?: MerchantProduct;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    type: ['RENTAL_SPOT' as ProductType, Validators.required],
    itemType: [null as ProductItemType | null],
    status: ['ACTIVE' as ProductStatus],
    description: [''],
    bufferTimeMinutes: [120 as number | null],
    dailyRate: [null as number | null],
    stockTotal: [null as number | null],
    basePrice: [null as number | null],
    currentStock: [null as number | null],
    reorderLevel: [10 as number | null],
    unitPrice: [null as number | null],
    images: ['']
  });

  typeOptions: { label: string; value: ProductType }[] = [
    { label: 'Rental (map spot)', value: 'RENTAL_SPOT' },
    { label: 'Rental (equipment)', value: 'RENTAL_ITEM' },
    { label: 'Sale (consumable)', value: 'SALE' }
  ];

  rentalItemTypeOptions: { label: string; value: ProductItemType }[] = [
    { label: 'Tent', value: 'TENT' },
    { label: 'Equipment', value: 'EQUIPMENT' }
  ];

  saleItemTypeOptions: { label: string; value: ProductItemType }[] = [
    { label: 'Goods', value: 'GOODS' },
    { label: 'Food & beverage', value: 'FNB' }
  ];

  statusOptions: { label: string; value: ProductStatus }[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Archived', value: 'ARCHIVED' }
  ];

  ngOnInit() {
    const campsiteParam = this.route.snapshot.paramMap.get('id');
    this.campsiteId = campsiteParam ? Number(campsiteParam) : 0;
    const productParam = this.route.snapshot.paramMap.get('productId');
    if (productParam) {
      const parsed = Number(productParam);
      if (!Number.isNaN(parsed)) {
        this.productId = parsed;
        this.isEditMode = true;
      }
    }

    this.form.get('type')?.valueChanges.subscribe((value) => {
      if (value) {
        this.configureValidators(value);
      }
    });
    this.configureValidators(this.form.get('type')?.value ?? 'RENTAL_SPOT');

    if (this.isEditMode && this.productId) {
      this.loadProduct();
    }
  }

  loadProduct() {
    if (!this.productId) return;
    this.isLoading = true;
    this.loadError = '';
    this.productService.getProduct(this.productId).subscribe({
      next: (product) => {
        this.currentProduct = product;
        this.patchForm(product);
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'Failed to load product details.';
        this.isLoading = false;
      }
    });
  }

  saveProduct() {
    if (!this.canEdit) {
      this.saveError = 'You do not have permission to edit product details.';
      return;
    }
    this.validationMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidFields = this.getInvalidFieldLabels();
      this.validationMessage = invalidFields.length
        ? `Please check: ${invalidFields.join(', ')}.`
        : 'Please fill in required fields.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.saveMessage = '';
    const payload = this.buildPayload();

    if (this.isEditMode && this.productId) {
      this.productService.updateProduct(this.productId, payload).subscribe({
        next: () => {
          this.saveMessage = 'Product updated.';
          this.isSaving = false;
        },
        error: (error) => {
          this.saveError = this.extractErrorMessage(error, 'Failed to update product.');
          this.isSaving = false;
        }
      });
      return;
    }

    this.productService.createProduct(this.campsiteId, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/merchant/campsites', this.campsiteId, 'products']);
      },
      error: (error) => {
        this.saveError = this.extractErrorMessage(error, 'Failed to create product.');
        this.isSaving = false;
      }
    });
  }

  canSave(): boolean {
    return this.form.valid;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  private configureValidators(type: ProductType) {
    const dailyRate = this.form.get('dailyRate');
    const stockTotal = this.form.get('stockTotal');
    const basePrice = this.form.get('basePrice');
    const currentStock = this.form.get('currentStock');
    const unitPrice = this.form.get('unitPrice');
    const itemType = this.form.get('itemType');

    dailyRate?.clearValidators();
    stockTotal?.clearValidators();
    basePrice?.clearValidators();
    currentStock?.clearValidators();
    unitPrice?.clearValidators();
    itemType?.clearValidators();

    if (type === 'RENTAL_SPOT') {
      dailyRate?.setValidators([Validators.required, Validators.min(0.01)]);
    } else if (type === 'RENTAL_ITEM') {
      dailyRate?.setValidators([Validators.required, Validators.min(0.01)]);
      stockTotal?.setValidators([Validators.required, Validators.min(0)]);
      itemType?.setValidators([Validators.required]);
    } else {
      basePrice?.setValidators([Validators.required, Validators.min(0)]);
      currentStock?.setValidators([Validators.required, Validators.min(0)]);
      unitPrice?.setValidators([Validators.required, Validators.min(0.01)]);
      itemType?.setValidators([Validators.required]);
    }

    this.ensureItemType(type);

    dailyRate?.updateValueAndValidity();
    stockTotal?.updateValueAndValidity();
    basePrice?.updateValueAndValidity();
    currentStock?.updateValueAndValidity();
    unitPrice?.updateValueAndValidity();
    itemType?.updateValueAndValidity();
  }

  private ensureItemType(type: ProductType) {
    const control = this.form.get('itemType');
    if (!control) return;
    const current = control.value;
    if (type === 'RENTAL_SPOT') {
      if (current !== 'SPOT') {
        control.setValue('SPOT', { emitEvent: false });
      }
      return;
    }
    if (type === 'RENTAL_ITEM') {
      if (current !== 'TENT' && current !== 'EQUIPMENT') {
        control.setValue('EQUIPMENT', { emitEvent: false });
      }
      return;
    }
    if (current !== 'GOODS' && current !== 'FNB') {
      control.setValue('GOODS', { emitEvent: false });
    }
  }

  private patchForm(product: MerchantProduct) {
    const images = product.images?.join('\n') ?? '';
    this.validationMessage = '';
    this.saveError = '';
    this.lockedStockTotal = product.rentalDetails?.stockTotal ?? 1;
    this.form.patchValue({
      name: product.name ?? '',
      type: product.type ?? 'RENTAL_SPOT',
      itemType: product.itemType ?? null,
      status: product.status ?? 'ACTIVE',
      description: product.description ?? '',
      bufferTimeMinutes: product.rentalDetails?.bufferTime ?? 120,
      dailyRate: product.rentalDetails?.dailyRate ?? null,
      stockTotal: product.rentalDetails?.stockTotal ?? null,
      basePrice: product.basePrice ?? product.rentalDetails?.dailyRate ?? product.saleDetails?.unitPrice ?? null,
      currentStock: product.saleDetails?.currentStock ?? null,
      reorderLevel: product.saleDetails?.reorderLevel ?? 10,
      unitPrice: product.saleDetails?.unitPrice ?? null,
      images
    });

    this.form.get('type')?.disable();
    if (this.isEditMode) {
      this.form.get('stockTotal')?.disable();
      this.form.get('currentStock')?.disable();
    }
    if (!this.canEdit) {
      this.form.disable();
    }
    this.ensureItemType(product.type ?? 'RENTAL_SPOT');
    this.configureValidators(product.type ?? 'RENTAL_SPOT');
  }

  private buildPayload(): ProductRequestPayload {
    const raw = this.form.getRawValue() as ProductFormValue;
    const type = raw.type ?? 'RENTAL_SPOT';
    const itemType = raw.itemType ?? undefined;
    const category = type === 'SALE' ? 'SALE' : 'RENTAL';
    const images = raw.images
      ? raw.images.split('\n').map((entry) => entry.trim()).filter((entry) => entry.length > 0)
      : undefined;

    const basePrice = this.toNumberOrNull(raw.basePrice);
    const price =
      type === 'RENTAL_SPOT' || type === 'RENTAL_ITEM'
        ? this.toNumberOrNull(raw.dailyRate) ?? 0
        : basePrice ?? 0;

    const stockTotal =
      this.isEditMode
        ? null
        : type === 'RENTAL_ITEM'
          ? this.toNumberOrNull(raw.stockTotal)
          : type === 'RENTAL_SPOT'
            ? this.lockedStockTotal || 1
            : null;

    const payload: ProductRequestPayload = {
      name: raw.name?.trim() ?? '',
      type,
      category,
      itemType,
      price,
      description: raw.description?.trim() || null,
      stockTotal,
      bufferTimeMinutes: type === 'RENTAL_SPOT' || type === 'RENTAL_ITEM'
        ? this.toNumberOrNull(raw.bufferTimeMinutes)
        : null,
      dailyRate: type === 'RENTAL_SPOT' || type === 'RENTAL_ITEM'
        ? this.toNumberOrNull(raw.dailyRate)
        : null,
      currentStock: this.isEditMode ? null : type === 'SALE' ? this.toNumberOrNull(raw.currentStock) : null,
      reorderLevel: type === 'SALE' ? this.toNumberOrNull(raw.reorderLevel) : null,
      unitPrice: type === 'SALE' ? this.toNumberOrNull(raw.unitPrice) : null,
      images,
      status: this.isEditMode ? raw.status ?? 'ACTIVE' : undefined
    };

    return payload;
  }

  applyStockAdjustment() {
    if (!this.isEditMode || !this.productId || this.stockAdjustment === null) {
      this.stockError = 'Adjustment value is required.';
      return;
    }
    this.stockError = '';
    this.stockMessage = '';

    this.productService.adjustStock(this.campsiteId, this.productId, this.stockAdjustment, this.stockReason).subscribe({
      next: () => {
        this.stockMessage = 'Stock updated.';
        this.stockAdjustment = null;
        this.stockReason = '';
        this.loadProduct();
      },
      error: (error) => {
        this.stockError = this.extractErrorMessage(error, 'Failed to update stock.');
      }
    });
  }

  private toNumberOrNull(value: number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private getInvalidFieldLabels(): string[] {
    const labels: Record<string, string> = {
      name: 'Name',
      type: 'Type',
      itemType: 'Item type',
      dailyRate: 'Daily rate',
      stockTotal: 'Stock total',
      basePrice: 'Base price',
      currentStock: 'Current stock',
      unitPrice: 'Unit price'
    };

    return Object.keys(this.form.controls)
      .filter((key) => this.form.get(key)?.invalid)
      .map((key) => labels[key] ?? key);
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const anyError = error as { error?: { message?: string; error?: string }; message?: string };
    const detail = anyError?.error?.message || anyError?.error?.error || anyError?.message;
    if (detail && typeof detail === 'string') {
      return detail;
    }
    return fallback;
  }
}
