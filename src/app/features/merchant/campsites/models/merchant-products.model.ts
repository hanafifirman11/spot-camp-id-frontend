import { ProductStatus, ProductType } from '../../services/merchant-product.service';
import { FilterOption } from '../../../../shared/models/filter-option.model';

export type StatusFilter = 'ALL' | ProductStatus;
export type TypeFilter = 'ALL' | ProductType;
export { FilterOption };
