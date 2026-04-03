# Features Folder Notes

This project keeps feature code under role-based modules that are already implemented.

## Removed placeholder folders

The following empty folders are intentionally removed because the functionality already exists in other modules:

- `src/app/features/booking/` -> use `src/app/features/camper/bookings/` and `src/app/features/camper/booking-checkout/`
- `src/app/features/dashboard/` -> use role dashboards under `src/app/features/merchant/merchant-dashboard/` and `src/app/features/admin/admin-dashboard/`
- `src/app/features/inventory/` -> use merchant inventory/product flows under `src/app/features/merchant/campsites/`

## `shared/` folder policy

Reusable cross-feature UI building blocks now live in `src/app/shared/`.
Current shared modules are implemented in Issue #4:

- `src/app/shared/components/status-badge/`
- `src/app/shared/components/pagination/`
- `src/app/shared/components/empty-state/`
- `src/app/shared/components/confirm-dialog/`
- `src/app/shared/pipes/currency-idr.pipe.ts`
- `src/app/shared/models/filter-option.model.ts`
- `src/app/shared/models/grouped-item.model.ts`
- `src/app/shared/constants/booking-status-options.const.ts`
- `src/app/shared/services/item-grouping.service.ts`
