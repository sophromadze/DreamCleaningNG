import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {
  private refreshSubscription?: Subscription;
  private inactivityCheckSubscription?: Subscription;
  private isBrowser: boolean;
  private readonly TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes (refresh before 1 hour expiry)
  private readonly INACTIVITY_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
  private readonly MAX_INACTIVITY_TIME = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  startTokenRefresh(): void {
    if (!this.isBrowser) return;

    // Stop any existing refresh timer
    this.stopTokenRefresh();

    // Only start if user is logged in
    if (this.authService.isLoggedIn()) {
      // Set up periodic token refresh
      this.refreshSubscription = interval(this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
        if (this.authService.isLoggedIn()) {
          // Check for inactivity before refreshing
          if (this.checkInactivity()) {
            console.log('User inactive for 24 hours, logging out');
            this.authService.logout();
            return;
          }

          this.authService.refreshToken().subscribe({
            next: (response) => {
              console.log('Token refreshed successfully');
              // Update last activity on successful refresh
              localStorage.setItem('lastActivity', Date.now().toString());
            },
            error: (error) => {
              console.error('Token refresh failed:', error);
              // If refresh fails, the interceptor will handle logout
            }
          });
        }
      });

      // Set up periodic inactivity check (every hour)
      this.inactivityCheckSubscription = interval(this.INACTIVITY_CHECK_INTERVAL).subscribe(() => {
        if (this.checkInactivity()) {
          console.log('User inactive for 24 hours, logging out');
          this.authService.logout();
        }
      });

      // Also check token expiry on startup
      this.checkTokenExpiry();
    }
  }

  stopTokenRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
    if (this.inactivityCheckSubscription) {
      this.inactivityCheckSubscription.unsubscribe();
      this.inactivityCheckSubscription = undefined;
    }
  }

  private checkInactivity(): boolean {
    if (!this.isBrowser) return false;

    try {
      const lastActivity = localStorage.getItem('lastActivity');
      if (!lastActivity) {
        // If no activity recorded, set it now
        localStorage.setItem('lastActivity', Date.now().toString());
        return false;
      }
      
      const lastActivityTime = parseInt(lastActivity);
      const currentTime = Date.now();
      
      return (currentTime - lastActivityTime) > this.MAX_INACTIVITY_TIME;
    } catch (error) {
      console.error('Error checking inactivity:', error);
      return false;
    }
  }

  private checkTokenExpiry(): void {
    if (!this.isBrowser) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Decode JWT token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      // If token expires in less than 5 minutes, refresh immediately
      if (timeUntilExpiry < 5 * 60 * 1000) {
        this.authService.refreshToken().subscribe({
          next: (response) => {
            console.log('Token refreshed on startup');
          },
          error: (error) => {
            console.error('Token refresh failed on startup:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
    }
  }
}