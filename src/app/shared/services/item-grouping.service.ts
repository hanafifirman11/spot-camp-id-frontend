import { Injectable } from '@angular/core';
import { GroupedItem } from '../models/grouped-item.model';

export interface BookingItemLike {
  productId?: number | null;
  productName?: string | null;
  productType?: string | null;
  quantity?: number | null;
  subtotal?: number | null;
}

export interface BookingLike {
  items?: BookingItemLike[] | null;
  nights?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ItemGroupingService {

  buildGroupedItems(booking: BookingLike): GroupedItem[] {
    const items = booking.items ?? [];
    const grouped = new Map<string, GroupedItem>();
    const nightsLabel = this.buildNightsLabel(booking.nights);

    items.forEach((item) => {
      const key = `${item.productId ?? item.productName ?? 'item'}-${item.productType ?? 'product'}`;
      const subtotal = Number(item.subtotal ?? 0);
      const quantity = Number(item.quantity ?? 0);
      const name = item.productName || `Product #${item.productId}`;
      const type = item.productType || 'Product';

      if (!grouped.has(key)) {
        grouped.set(key, {
          key, name, type, quantity, subtotal,
          nightsLabel: type === 'RENTAL_SPOT' ? nightsLabel : undefined,
        });
      } else {
        const existing = grouped.get(key)!;
        existing.quantity += quantity;
        existing.subtotal += subtotal;
      }
    });

    return Array.from(grouped.values());
  }

  buildNightsLabel(nights?: number | null): string | undefined {
    if (!nights || nights <= 0) return undefined;
    const days = nights + 1;
    return `${days} hari ${nights} malam`;
  }
}
