import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isBrowser: boolean;
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private useCookieAuth = environment.useCookieAuth || false;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private authService: AuthService,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth checks for auth endpoints
    const isAuthEndpoint = request.url.includes('/auth/login') || 
                          request.url.includes('/auth/register') || 
                          request.url.includes('/auth/refresh-token') ||
                          request.url.includes('/auth/google');

    // Skip for SignalR endpoints
    const isSignalREndpoint = request.url.includes('/userManagementHub') || 
                             request.url.includes('/negotiate') ||
                             (request.url.includes('?id=') && request.url.includes('access_token='));

    if (!isAuthEndpoint && !isSignalREndpoint) {
      // Check if user has been inactive for 24 hours (only for non-auth/non-SignalR endpoints)
      if (this.isBrowser && !this.useCookieAuth && this.checkInactivity()) {
        this.authService.logout();
        return throwError(() => new Error('Session expired due to inactivity'));
      }

      // Update last activity time
      if (this.isBrowser && !this.useCookieAuth) {
        localStorage.setItem('lastActivity', Date.now().toString());
      }
    }

    // Handle based on auth method
    if (this.useCookieAuth) {
      // For cookie auth, always include credentials
      request = request.clone({
        withCredentials: true
      });
    } else {
      // For localStorage auth, add bearer token
      let token: string | null = null;
      
      if (this.isBrowser) {
        try {
          token = localStorage.getItem('token');
        } catch (error) {
          // Handle any localStorage access errors
          console.warn('Error accessing localStorage:', error);
          token = null;
        }
      }

      // Clone the request and add the authorization header
      // Don't add auth header to SignalR requests (they use query string)
      if (token && !isAuthEndpoint && !isSignalREndpoint) {
        request = this.addToken(request, token);
      }
    }

    return next.handle(request).pipe(
      catchError(error => {
        // Don't handle 401 for SignalR endpoints
        if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint && !isSignalREndpoint) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private checkInactivity(): boolean {
    try {
      // Only check inactivity if user is logged in
      const token = localStorage.getItem('token');
      if (!token) {
        // No token means not logged in, so no inactivity check needed
        return false;
      }

      const lastActivity = localStorage.getItem('lastActivity');
      if (!lastActivity) {
        // User is logged in but no activity recorded yet, set it now
        localStorage.setItem('lastActivity', Date.now().toString());
        return false;
      }
      
      const lastActivityTime = parseInt(lastActivity);
      const currentTime = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      return (currentTime - lastActivityTime) > twentyFourHours;
    } catch (error) {
      console.warn('Error checking inactivity:', error);
      return false;
    }
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Don't try to refresh for auth endpoints
    if (request.url.includes('/auth/')) {
      this.authService.logout();
      return throwError(() => new Error('Authentication failed'));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          
          if (this.useCookieAuth) {
            // For cookie auth, just retry the request
            return next.handle(request);
          } else {
            // For localStorage auth, add new token
            this.refreshTokenSubject.next(response.token);
            return next.handle(this.addToken(request, response.token));
          }
        }),
        catchError((err) => {
          this.isRefreshing = false;
          
          // If refresh token fails, logout the user
          this.authService.logout();
          return throwError(() => err);
        })
      );
    } else {
      // If already refreshing, wait for the new token
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => {
          if (this.useCookieAuth) {
            // For cookie auth, just retry
            return next.handle(request);
          } else {
            // For localStorage auth, add token
            return next.handle(this.addToken(request, token));
          }
        })
      );
    }
  }
}