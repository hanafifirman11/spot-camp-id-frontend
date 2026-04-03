export type SpotAvailabilityStatus = 'AVAILABLE' | 'BOOKED' | 'LOCKED';
export type BookingOption = 'OWN' | 'RENTAL';
export type RentalMode = 'TENT' | 'BUNDLE';
export type ProductItemType = 'SPOT' | 'TENT' | 'EQUIPMENT' | 'GOODS' | 'FNB' | 'PACKAGE';
export type PaymentProofStatus = 'WAITING_UPLOAD' | 'UPLOADED' | 'VERIFIED' | 'REJECTED';

export interface ProductListResponse<T> {
  content?: T[];
}

export interface RentalItem {
  id?: number;
  name?: string;
  description?: string;
  images?: string[];
  itemType?: ProductItemType;
  category?: 'RENTAL' | 'SALE' | 'PACKAGE';
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
  category?: 'RENTAL' | 'SALE' | 'PACKAGE';
  saleDetails?: {
    unitPrice?: number;
    currentStock?: number;
  };
}

export interface BundleListResponse {
  content?: BundleOption[];
}

export interface BundleOption {
  id?: number;
  name?: string;
  description?: string;
  bundlePrice?: number;
  components?: BundleComponent[];
}

export interface BundleComponent {
  productId?: number;
  productName?: string;
  quantity?: number;
}

export interface BookingResponse {
  id?: number;
  invoiceNumber?: string;
  status?: string;
  totalAmount?: number;
  paymentMethod?: string;
  paymentBank?: string;
  paymentBankName?: string;
  paymentBankAccountNumber?: string;
  paymentBankAccountName?: string;
  paymentUniqueCode?: number;
  paymentAmount?: number;
  paymentProofUrl?: string;
  paymentProofStatus?: PaymentProofStatus;
  expiresAt?: string;
}

export interface CartItemRequest {
  productId: number;
  spotId?: string;
  checkInDate: string;
  checkOutDate: string;
  quantity: number;
}

export interface MapSummary {
  id?: number;
  mapCode?: string;
  mapName?: string;
  imageWidth?: number;
  imageHeight?: number;
  backgroundImageUrl?: string;
}
