import { BookingStatus } from '../../services/merchant-booking.service';

export type StatusFilter = 'ALL' | BookingStatus;

export interface FilterOption<T> {
  label: string;
  value: T;
}
