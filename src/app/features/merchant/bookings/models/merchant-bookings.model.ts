import { BookingStatus } from '../../services/merchant-booking.service';
import { FilterOption } from '../../../../shared/models/filter-option.model';

export type StatusFilter = 'ALL' | BookingStatus;
export { FilterOption };
