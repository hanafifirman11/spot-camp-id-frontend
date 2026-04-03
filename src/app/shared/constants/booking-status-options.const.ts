import { FilterOption } from '../models/filter-option.model';

export const BOOKING_STATUS_OPTIONS: FilterOption[] = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Payment pending', value: 'PAYMENT_PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Completed', value: 'COMPLETED' },
];
