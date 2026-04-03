import { ProductStatus, ProductType } from '../../services/merchant-product.service';

export type StatusFilter = 'ALL' | ProductStatus;
export type TypeFilter = 'ALL' | ProductType;

export interface FilterOption<T> {
  label: string;
  value: T;
}
