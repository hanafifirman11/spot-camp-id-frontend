import { ProductItemType, ProductStatus, ProductType } from '../../services/merchant-product.service';

export interface ProductFormValue {
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
