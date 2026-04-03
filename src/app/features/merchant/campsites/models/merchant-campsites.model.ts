import { CampsiteStatus } from '../../services/merchant-campsite.service';

export type StatusFilter = 'ALL' | CampsiteStatus;

export interface StatusOption {
  label: string;
  value: StatusFilter;
}
