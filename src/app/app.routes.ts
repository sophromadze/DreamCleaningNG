import { Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';
import { adminGuard } from './guards/admin.guard';
import { maintenanceGuard } from './guards/maintenance.guard';
import { clientOnlyGuard } from './guards/client-only.guard';
import { cleanerGuard } from './guards/cleaner.guard';
import { CleanerCabinetComponent } from './auth/cleaner-cabinet/cleaner-cabinet.component';

export const routes: Routes = [
  {
    path: 'maintenance',
    loadComponent: () => import('./maintenance-mode/maintenance-mode.component').then(m => m.MaintenanceModeComponent)
  },
  {
    path: '',
    component: MainComponent,
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about.component').then(m => m.AboutComponent),
  },
  {
    path: 'service-page',
    loadComponent: () => import('./service-page/service-page.component').then(m => m.ServicePageComponent),
  },
  // Service routes
  {
    path: 'services/residential-cleaning',
    loadComponent: () => import('./service-page/services/residential-cleaning/residential-cleaning.component').then(m => m.ResidentialCleaningComponent),
  },
  {
    path: 'services/residential-cleaning/kitchen',
    loadComponent: () => import('./service-page/services/residential-cleaning/kitchen-cleaning/kitchen-cleaning.component').then(m => m.KitchenCleaningComponent)
  },
  {
    path: 'services/residential-cleaning/bathroom',
    loadComponent: () => import('./service-page/services/residential-cleaning/bathroom-cleaning/bathroom-cleaning.component').then(m => m.BathroomCleaningComponent)
  },
  {
    path: 'services/residential-cleaning/general',
    loadComponent: () => import('./service-page/services/residential-cleaning/general-cleaning/general-cleaning.component').then(m => m.GeneralCleaningComponent)
  },
  {
    path: 'services/deep-cleaning',
    loadComponent: () => import('./service-page/services/deep-cleaning/deep-cleaning.component').then(m => m.DeepCleaningComponent)
  },
  {
    path: 'services/office-cleaning',
    loadComponent: () => import('./service-page/services/office-cleaning/office-cleaning.component').then(m => m.OfficeCleaningComponent)
  },
  {
    path: 'services/custom-cleaning',
    loadComponent: () => import('./service-page/services/custom-cleaning/custom-cleaning.component').then(m => m.CustomCleaningComponent)
  },
  {
    path: 'services/move-in-out-cleaning',
    loadComponent: () => import('./service-page/services/move-in-out-cleaning/move-in-out-cleaning.component').then(m => m.MoveInOutCleaningComponent)
  },
  {
    path: 'services/filthy-cleaning',
    loadComponent: () => import('./service-page/services/filthy-cleaning/filthy-cleaning.component').then(m => m.FilthyCleaningComponent)
  },
  {
    path: 'services/post-construction-cleaning',
    loadComponent: () => import('./service-page/services/post-construction-cleaning/post-construction-cleaning.component').then(m => m.PostConstructionCleaningComponent)
  },
  {
    path: 'booking',
    loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent),
    canActivate: [maintenanceGuard]
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent),
    canActivate: [maintenanceGuard]
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent)
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () => import('./terms-and-conditions/terms-and-conditions.component').then(m => m.TermsAndConditionsComponent)
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/login',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'profile',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./auth/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'change-password',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./auth/change-password/change-password.component').then(m => m.ChangePasswordComponent)
  },
  {
    path: 'admin',
    canActivate: [clientOnlyGuard, adminGuard],
    loadComponent: () => import('./auth/admin/admin.component').then(m => m.AdminComponent)
  },

  {
    path: 'profile/orders',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./auth/profile/order-history/order-history.component').then(m => m.OrderHistoryComponent)
  },
  {
    path: 'order/:id',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./auth/profile/order-details/order-details.component').then(m => m.OrderDetailsComponent)
  },
  {
    path: 'order/:id/edit',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./auth/profile/order-edit/order-edit.component').then(m => m.OrderEditComponent)
  },
  {
    path: 'booking-confirmation',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./booking/booking-confirmation/booking-confirmation.component').then(m => m.BookingConfirmationComponent)
  },
  {
    path: 'gift-cards',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./gift-cards/gift-cards.component').then(m => m.GiftCardsComponent)
  },
  {
    path: 'auth/verify-email',
    loadComponent: () => import('./auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'auth/verify-email-notice',
    loadComponent: () => import('./auth/verify-email-notice/verify-email-notice.component').then(m => m.VerifyEmailNoticeComponent)
  },
  {
    path: 'auth/forgot-password',
    canActivate: [noAuthGuard, maintenanceGuard],
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    canActivate: [noAuthGuard, maintenanceGuard],
    loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'cleaner/cabinet',
    canActivate: [clientOnlyGuard, authGuard, cleanerGuard],
    loadComponent: () => import('./auth/cleaner-cabinet/cleaner-cabinet.component').then(m => m.CleanerCabinetComponent)
  },
  {
    path: 'change-email',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => import('./auth/change-email/change-email.component').then(m => m.ChangeEmailComponent)
  },
  {
    path: 'poll-success',
    loadComponent: () => import('./booking/poll-success/poll-success.component').then(m => m.PollSuccessComponent),
    canActivate: [maintenanceGuard]
  },
  {
    path: 'gift-card-confirmation',
    canActivate: [clientOnlyGuard, authGuard, maintenanceGuard],
    loadComponent: () => {
      return import('./gift-cards/gift-card-confirmation/gift-card-confirmation.component')
        .then(m => {
          return m.GiftCardConfirmationComponent;
        })
        .catch(error => {
          console.error('Failed to load component:', error);
          throw error;
        });
    }
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];