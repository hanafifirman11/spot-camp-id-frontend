import { Routes } from '@angular/router';
import { adminChildGuard, adminGuard } from './core/guards/admin.guard';
import { merchantChildGuard, merchantGuard } from './core/guards/merchant.guard';

export class AppRoutes {
    public static readonly routes: Routes = [
        {
            path: '',
            loadComponent: () => import('./features/public-market/public-market.component').then(m => m.PublicMarketComponent)
        },
        {
            path: 'public-market',
            redirectTo: '',
            pathMatch: 'full'
        },
        {
            path: 'campsites/:campsiteId',
            loadComponent: () => import('./features/visual-map/visual-map.component').then(m => m.VisualMapComponent)
        },
        {
            path: 'bookings',
            loadComponent: () => import('./features/camper/bookings/camper-bookings.component')
                .then(m => m.CamperBookingsComponent)
        },
        {
            path: 'bookings/:id',
            loadComponent: () => import('./features/camper/booking-detail/camper-booking-detail.component')
                .then(m => m.CamperBookingDetailComponent)
        },
        {
            path: 'bookings/:id/checkout',
            loadComponent: () => import('./features/camper/booking-checkout/camper-booking-checkout.component')
                .then(m => m.CamperBookingCheckoutComponent)
        },
        {
            path: 'notifications',
            loadComponent: () => import('./features/notifications/notifications.component')
                .then(m => m.NotificationsComponent)
        },
        {
            path: 'auth',
            children: [
                {
                    path: 'login',
                    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
                },
                {
                    path: 'register',
                    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
                },
                {
                    path: 'forgot-password',
                    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
                }
            ]
        },
        {
            path: 'profile-management',
            loadComponent: () => import('./features/profile-management/profile-management.component')
                .then(m => m.ProfileManagementComponent)
        },
        {
            path: 'qna',
            loadComponent: () => import('./features/qna/qna.component').then(m => m.QnaComponent)
        },
        {
            path: 'merchant',
            canActivate: [merchantGuard],
            canActivateChild: [merchantChildGuard],
            loadComponent: () => import('./layout/merchant-layout.component')
                .then(m => m.MerchantLayoutComponent),
            children: [
                {
                    path: '',
                    redirectTo: 'dashboard',
                    pathMatch: 'full'
                },
                {
                    path: 'dashboard',
                    loadComponent: () => import('./features/merchant/merchant-dashboard/merchant-dashboard.component')
                        .then(m => m.MerchantDashboardComponent)
                },
                {
                    path: 'campsites',
                    loadComponent: () => import('./features/merchant/campsites/merchant-campsites.component')
                        .then(m => m.MerchantCampsitesComponent)
                },
                {
                    path: 'campsites/new',
                    loadComponent: () => import('./features/merchant/campsites/merchant-campsite-editor.component')
                        .then(m => m.MerchantCampsiteEditorComponent)
                },
                {
                    path: 'campsites/:id',
                    loadComponent: () => import('./features/merchant/campsites/merchant-campsite-editor.component')
                        .then(m => m.MerchantCampsiteEditorComponent)
                },
                {
                    path: 'campsites/:id/products',
                    loadComponent: () => import('./features/merchant/campsites/merchant-products.component')
                        .then(m => m.MerchantProductsComponent)
                },
                {
                    path: 'campsites/:id/products/new',
                    loadComponent: () => import('./features/merchant/campsites/merchant-product-editor.component')
                        .then(m => m.MerchantProductEditorComponent)
                },
                {
                    path: 'campsites/:id/products/:productId',
                    loadComponent: () => import('./features/merchant/campsites/merchant-product-editor.component')
                        .then(m => m.MerchantProductEditorComponent)
                },
                {
                    path: 'campsites/:id/bundles',
                    loadComponent: () => import('./features/merchant/campsites/merchant-bundles.component')
                        .then(m => m.MerchantBundlesComponent)
                },
                {
                    path: 'campsites/:id/bundles/new',
                    loadComponent: () => import('./features/merchant/campsites/merchant-bundle-editor.component')
                        .then(m => m.MerchantBundleEditorComponent)
                },
                {
                    path: 'campsites/:id/bundles/:bundleId',
                    loadComponent: () => import('./features/merchant/campsites/merchant-bundle-editor.component')
                        .then(m => m.MerchantBundleEditorComponent)
                },
                {
                    path: 'campsites/:id/map',
                    loadComponent: () => import('./features/merchant/campsites/merchant-map-editor.component')
                        .then(m => m.MerchantMapEditorComponent)
                },
                {
                    path: 'bookings',
                    loadComponent: () => import('./features/merchant/bookings/merchant-bookings.component')
                        .then(m => m.MerchantBookingsComponent)
                },
                {
                    path: 'bookings/:id',
                    loadComponent: () => import('./features/merchant/bookings/merchant-booking-detail.component')
                        .then(m => m.MerchantBookingDetailComponent)
                },
                {
                    path: 'reports',
                    loadComponent: () => import('./features/merchant/reports/merchant-reports.component')
                        .then(m => m.MerchantReportsComponent)
                },
                {
                    path: 'bank-accounts',
                    loadComponent: () => import('./features/merchant/bank-accounts/merchant-bank-accounts.component')
                        .then(m => m.MerchantBankAccountsComponent)
                },
                {
                    path: 'profile',
                    loadComponent: () => import('./features/profile-management/profile-management.component')
                        .then(m => m.ProfileManagementComponent),
                    data: {
                        embedded: true,
                        title: 'Profile settings',
                        subtitle: 'Update merchant profile and security settings.'
                    }
                },
                {
                    path: 'users',
                    loadComponent: () => import('./features/merchant/merchant-users/merchant-users.component')
                        .then(m => m.MerchantUsersComponent)
                }
            ]
        },
        {
            path: 'admin',
            canActivate: [adminGuard],
            canActivateChild: [adminChildGuard],
            loadComponent: () => import('./layout/admin-layout.component')
                .then(m => m.AdminLayoutComponent),
            children: [
                {
                    path: '',
                    redirectTo: 'dashboard',
                    pathMatch: 'full'
                },
                {
                    path: 'dashboard',
                    loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component')
                        .then(m => m.AdminDashboardComponent)
                },
                {
                    path: 'businesses',
                    loadComponent: () => import('./features/admin/admin-businesses/admin-businesses.component')
                        .then(m => m.AdminBusinessesComponent)
                },
                {
                    path: 'businesses/:id',
                    loadComponent: () => import('./features/admin/admin-business-detail/admin-business-detail.component')
                        .then(m => m.AdminBusinessDetailComponent)
                },
                {
                    path: 'campsites',
                    loadComponent: () => import('./features/admin/admin-campsites/admin-campsites.component')
                        .then(m => m.AdminCampsitesComponent)
                },
                {
                    path: 'bookings',
                    loadComponent: () => import('./features/admin/admin-bookings/admin-bookings.component')
                        .then(m => m.AdminBookingsComponent)
                },
                {
                    path: 'reports',
                    loadComponent: () => import('./features/admin/admin-reports/admin-reports.component')
                        .then(m => m.AdminReportsComponent)
                },
                {
                    path: 'users',
                    loadComponent: () => import('./features/admin/admin-users/admin-users.component')
                        .then(m => m.AdminUsersComponent)
                },
                {
                    path: 'logs',
                    loadComponent: () => import('./features/admin/admin-logs/admin-logs.component')
                        .then(m => m.AdminLogsComponent)
                },
                {
                    path: 'themes',
                    loadComponent: () => import('./features/admin/admin-themes/admin-themes.component')
                        .then(m => m.AdminThemesComponent)
                }
            ]
        }
    ];
}
