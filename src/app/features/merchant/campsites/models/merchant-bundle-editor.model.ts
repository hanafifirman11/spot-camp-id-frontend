import { ProductType } from '../../services/merchant-product.service';

export interface BundleComponentDraft {
  productId: number;
  quantity: number;
  productName?: string;
  productType?: ProductType;
}
