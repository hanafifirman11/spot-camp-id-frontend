# Changelog

All notable changes to the `spot-camp-id-frontend` project will be documented in this file.

## [Unreleased]

### Added
- **API Simulator**: Added `json-server` setup for offline development.
    - Added `mock/db.json` with sample data (campsites, users, map configs).
    - Added `mock/routes.json` for custom route mapping.
    - Added `mock/auth-middleware.js` to simulate Login & Register endpoints.
    - Added `proxy.conf.json` to proxy API requests to port 3000.
    - Added `npm run mock` script.
- **Feature Modules**:
    - **Visual Map**: Implemented `VisualMapComponent` using `Konva.js` for interactive campsite maps (polygons, background image, selection logic).
    - **Authentication**: Implemented `LoginComponent` and `RegisterComponent` with reactive forms, API integration, and basic validation.
    - **Public Market**: Created landing page (`PublicMarketComponent`) with search, hero section, and featured campsites list.
    - **Layout**: Created `NavbarComponent` for main navigation.
- **Unit Testing**:
    - **LoginComponent**: Added comprehensive tests for form validation, success/error submission scenarios.
    - **PublicMarketComponent**: Added tests for initialization and mock data fallback.
    - **AppComponent**: Smoke tests passing.
    - **Status**: 10/10 tests passed across all modules.
- **Testing Infrastructure**:
    - Added `src/test.ts` and `src/app/app.component.spec.ts`.
    - Added `karma.conf.js`, `tsconfig.spec.json`.
    - Restored `tsconfig.json` and `tsconfig.app.json`.
    - Verified `npm test` passes (3/3).
- **App Shell Initialization**: Re-initialized the Angular application structure.
    - Created `src/index.html`, `src/styles.scss`, `src/polyfills.ts`.
    - Created `src/main.ts`, `app.component.ts`, `app.config.ts`, `app.routes.ts`.
- **Configuration**: Updated `angular.json` to default to Standalone Components.
- **OpenAPI**: Generated API Client in `src/app/core/api-v1`.