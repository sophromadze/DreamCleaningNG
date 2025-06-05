import { Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';
import { adminGuard } from './guards/admin.guard';

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
    path: 'booking-confirmation/:orderId',
    canActivate: [authGuard],
    loadComponent: () => import('./booking/booking-confirmation/booking-confirmation.component').then(m => m.BookingConfirmationComponent)
  },
];