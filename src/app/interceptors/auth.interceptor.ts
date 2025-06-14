import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the auth token from localStorage only if in browser
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
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }
}