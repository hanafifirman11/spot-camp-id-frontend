export type ProductItemType = 'SPOT' | 'TENT' | 'EQUIPMENT' | 'GOODS' | 'FNB' | 'PACKAGE';

export interface ProductListResponse<T> {
  content?: T[];
}

export interface RentalItem {
  id?: number;
  name?: string;
  description?: string;
  images?: string[];
  itemType?: ProductItemType;
  rentalDetails?: {
    dailyRate?: number;
    stockTotal?: number;
  };
}

export interface SaleItem {
  id?: number;
  name?: string;
  description?: string;
  images?: string[];
  itemType?: ProductItemType;
  saleDetails?: {
    unitPrice?: number;
    currentStock?: number;
  };
}

export interface GroupedItem {
  key: string;
  name: string;
  type: string;
  quantity: number;
  subtotal: number;
  nightsLabel?: string;
}
