# Features Folder Notes

This project keeps feature code under role-based modules that are already implemented.

## Removed placeholder folders

The following empty folders are intentionally removed because the functionality already exists in other modules:

- `src/app/features/booking/` -> use `src/app/features/camper/bookings/` and `src/app/features/camper/booking-checkout/`
- `src/app/features/dashboard/` -> use role dashboards under `src/app/features/merchant/merchant-dashboard/` and `src/app/features/admin/admin-dashboard/`
- `src/app/features/inventory/` -> use merchant inventory/product flows under `src/app/features/merchant/campsites/`

## `shared/` folder policy

`src/app/shared/` is intentionally not present until reusable cross-feature modules are introduced.
Reusable shared models/components are planned to be implemented in Issue #4.
