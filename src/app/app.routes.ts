import { Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';
import { adminGuard } from './guards/admin.guard';
import { CleanerCabinetComponent } from './auth/cleaner-cabinet/cleaner-cabinet.component';

export const routes: Routes = [
  {
    path: '',
    component: MainComponent
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'service-page',
    loadComponent: () => import('./service-page/service-page.component').then(m => m.ServicePageComponent)
  },
  {
    path: 'booking',
    loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent)
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/change-password/change-password.component').then(m => m.ChangePasswordComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./auth/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'profile/orders',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/profile/order-history/order-history.component').then(m => m.OrderHistoryComponent)
  },
  {
    path: 'order/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/profile/order-details/order-details.component').then(m => m.OrderDetailsComponent)
  },
  {
    path: 'order/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/profile/order-edit/order-edit.component').then(m => m.OrderEditComponent)
  },
  {
    path: 'booking-confirmation',
    canActivate: [authGuard],
    loadComponent: () => import('./booking/booking-confirmation/booking-confirmation.component').then(m => m.BookingConfirmationComponent)
  },
  {
    path: 'gift-cards',
    canActivate: [authGuard],
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
    canActivate: [noAuthGuard],
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'cleaner/cabinet',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/cleaner-cabinet/cleaner-cabinet.component').then(m => m.CleanerCabinetComponent)
  },
  {
    path: 'change-email',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/change-email/change-email.component').then(m => m.ChangeEmailComponent)
  }
];