import { AmenityItem } from '../../services/merchant-campsite.service';

export interface AmenityGroup {
  category: string;
  items: AmenityItem[];
}

export interface CampsiteFormValue {
  name: string | null;
  description: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  basePrice: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}
