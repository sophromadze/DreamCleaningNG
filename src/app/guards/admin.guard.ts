import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.currentUserValue;
  
  // Allow access for SuperAdmin, Admin, and Moderator
  if (currentUser && 
      (currentUser.role === 'SuperAdmin' || 
       currentUser.role === 'Admin' || 
       currentUser.role === 'Moderator')) {
    return true;
  }
  
  // Not logged in or not admin, redirect to home page
  router.navigate(['/']);
  return false;
};