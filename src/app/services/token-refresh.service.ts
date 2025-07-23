import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { interval, Subscription, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {
  private refreshSubscription?: Subscription;
  private inactivityCheckSubscription?: Subscription;
  private isBrowser: boolean;
  private isInitialized = false; // Add flag to prevent multiple initializations
  private readonly TOKEN_REFRESH_INTERVAL = 23 * 60 * 60 * 1000; // 23 hours (refresh before 24 hour expiry)
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

    // Prevent multiple initializations
    if (this.isInitialized) {
      console.log('Token refresh service already initialized, skipping...');
      return;
    }

    console.log('Starting token refresh service');

    // Stop any existing refresh timer
    this.stopTokenRefresh();

    // Only start if user is logged in
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, skipping token refresh setup');
      return;
    }

    console.log('Setting up token refresh for logged in user');

    // Delay the first check to avoid conflicts during page load
    setTimeout(() => {
      console.log('Initializing token refresh timers');
      
      // Set up periodic token refresh
      this.refreshSubscription = interval(this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
        console.log('Token refresh interval triggered');
        this.performTokenRefresh();
      });

      // Set up periodic inactivity check (every hour)
      this.inactivityCheckSubscription = interval(this.INACTIVITY_CHECK_INTERVAL).subscribe(() => {
        console.log('Inactivity check triggered');
        if (this.checkInactivity()) {
          console.log('User inactive for 24 hours, logging out');
          this.authService.logout();
        }
      });

      // Also check token expiry on startup (only for localStorage auth)
      if (!environment.useCookieAuth) {
        console.log('Checking token expiry on startup');
        this.checkTokenExpiry();
      }

      // Mark as initialized
      this.isInitialized = true;
    }, 1000); // 1 second delay
  }

  stopTokenRefresh(): void {
    console.log('Stopping token refresh service');
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }

    if (this.inactivityCheckSubscription) {
      this.inactivityCheckSubscription.unsubscribe();
      this.inactivityCheckSubscription = undefined;
    }

    // Reset initialization flag
    this.isInitialized = false;
  }

  private checkInactivity(): boolean {
    if (!this.isBrowser) return false;

    // For cookie auth, we can't track inactivity via localStorage
    // The server will handle session expiry
    if (environment.useCookieAuth) {
      return false;
    }

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
    if (!this.isBrowser || environment.useCookieAuth) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Validate token format before decoding
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.warn('Invalid JWT token format');
        return;
      }

      // Decode JWT token with proper error handling
      const payload = JSON.parse(atob(tokenParts[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      // If token expires in less than 1 hour, refresh immediately
      if (timeUntilExpiry < 60 * 60 * 1000) {
        this.authService.refreshToken().subscribe({
          next: (response) => {
            // Token refreshed successfully
          },
          error: (error) => {
            console.error('Token refresh failed on startup:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
      // Clear invalid token from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    }
  }

  // Proactive refresh token validation
  private validateRefreshToken(): Observable<boolean> {
    if (!this.isBrowser) {
      return of(true);
    }

    if (environment.useCookieAuth) {
      // For cookie auth, validate by checking current user session
      return this.authService.checkCurrentUserSession().pipe(
        map(user => {
          const isValid = !!user;
          console.log('Cookie auth validation result:', isValid);
          return isValid;
        }),
        catchError(error => {
          console.log('Cookie auth validation failed:', error);
          return of(false);
        })
      );
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.log('No refresh token found, user needs to log in');
      return of(false);
    }

    // Try to validate the refresh token by attempting a token refresh
    return this.authService.refreshToken().pipe(
      map(() => {
        console.log('Refresh token validation successful');
        return true;
      }),
      catchError(error => {
        console.log('Refresh token validation failed:', error);
        // The auth service will handle automatic recovery
        return of(false);
      })
    );
  }

  // Enhanced token refresh with proactive validation
  private performTokenRefresh(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, skipping token refresh');
      return;
    }

    // Check for inactivity before refreshing
    if (this.checkInactivity()) {
      console.log('User inactive for 24 hours, logging out');
      this.authService.logout();
      return;
    }

    // First validate the refresh token proactively
    this.validateRefreshToken().subscribe(isValid => {
      if (isValid) {
        // Refresh token is valid, proceed with normal refresh
        this.authService.refreshToken().subscribe({
          next: (response) => {
            console.log('Token refresh completed successfully');
            // Update last activity on successful refresh
            if (!environment.useCookieAuth) {
              localStorage.setItem('lastActivity', Date.now().toString());
            }
          },
          error: (error) => {
            console.error('Token refresh failed:', error);
            // The auth service will handle automatic recovery
          }
        });
      } else {
        console.log('Refresh token validation failed, user may need to log in again');
        // The auth service should have already handled the recovery or logout
      }
    });
  }

  // Manual token refresh for testing
  manualRefreshToken(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('Cannot refresh token - user not logged in');
      return;
    }

    console.log('Manually triggering token refresh...');
    this.performTokenRefresh();
  }

  // Comprehensive authentication health check
  checkAuthHealth(): Observable<{
    isLoggedIn: boolean;
    hasToken: boolean;
    hasRefreshToken: boolean;
    tokenExpiry: string | null;
    refreshTokenValid: boolean;
    sessionValid: boolean;
  }> {
    const health: {
      isLoggedIn: boolean;
      hasToken: boolean;
      hasRefreshToken: boolean;
      tokenExpiry: string | null;
      refreshTokenValid: boolean;
      sessionValid: boolean;
    } = {
      isLoggedIn: this.authService.isLoggedIn(),
      hasToken: false,
      hasRefreshToken: false,
      tokenExpiry: null,
      refreshTokenValid: false,
      sessionValid: false
    };

    if (!this.isBrowser) {
      return of(health);
    }

    if (environment.useCookieAuth) {
      // For cookie auth, check if user session is valid
      return this.authService.checkCurrentUserSession().pipe(
        map(user => {
          health.sessionValid = !!user;
          health.hasToken = !!user; // If session is valid, we have a token
          health.hasRefreshToken = !!user; // If session is valid, we have refresh token
          health.refreshTokenValid = !!user;
          return health;
        }),
        catchError(() => {
          health.sessionValid = false;
          health.hasToken = false;
          health.hasRefreshToken = false;
          health.refreshTokenValid = false;
          return of(health);
        })
      );
    }

    // For localStorage auth
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    health.hasToken = !!token;
    health.hasRefreshToken = !!refreshToken;

    // Check token expiry
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiryTime = new Date(payload.exp * 1000);
          health.tokenExpiry = expiryTime.toISOString();
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }

    // Check refresh token validity
    if (refreshToken) {
      return this.authService.refreshToken().pipe(
        map(() => {
          health.refreshTokenValid = true;
          return health;
        }),
        catchError(() => {
          health.refreshTokenValid = false;
          return of(health);
        })
      );
    }

    return of(health);
  }

  // Debug method to check token status
  debugTokenStatus(): void {
    if (!this.isBrowser || environment.useCookieAuth) return;

    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const lastActivity = localStorage.getItem('lastActivity');

    console.log('=== Token Status Debug ===');
    console.log('Has token:', !!token);
    console.log('Has refresh token:', !!refreshToken);
    console.log('Last activity:', lastActivity ? new Date(parseInt(lastActivity)).toISOString() : 'None');
    
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiryTime = new Date(payload.exp * 1000);
          const currentTime = new Date();
          const timeUntilExpiry = expiryTime.getTime() - currentTime.getTime();
          
          console.log('Token expiry:', expiryTime.toISOString());
          console.log('Current time:', currentTime.toISOString());
          console.log('Time until expiry (hours):', Math.round(timeUntilExpiry / (1000 * 60 * 60)));
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    console.log('========================');
  }

  // Debug method to check refresh token
  debugRefreshToken(): void {
    if (!this.isBrowser || environment.useCookieAuth) return;

    const refreshToken = localStorage.getItem('refreshToken');
    
    console.log('=== Refresh Token Debug ===');
    console.log('Has refresh token:', !!refreshToken);
    if (refreshToken) {
      console.log('Refresh token length:', refreshToken.length);
      console.log('Refresh token preview:', refreshToken.substring(0, 20) + '...');
    }
    console.log('==========================');
  }
}