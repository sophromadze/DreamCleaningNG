import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { 
  SocialAuthService, 
  GoogleLoginProvider, 
  FacebookLoginProvider,
  SocialUser 
} from '@abacritt/angularx-social-login';

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  firstTimeOrder: boolean;
  subscriptionId?: number;
  authProvider?: string;
  role: string;
}

interface AuthResponse {
  user: UserDto;
  token: string;
  refreshToken: string;
  requiresEmailVerification?: boolean;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject: BehaviorSubject<UserDto | null>;
  public currentUser: Observable<UserDto | null>;
  private isBrowser: boolean;
  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  public isInitialized$ = this.isInitializedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    private socialAuthService: SocialAuthService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    let storedUser = null;
    if (this.isBrowser) {
      try {
        const userStr = localStorage.getItem('currentUser');
        storedUser = userStr ? JSON.parse(userStr) : null;
      } catch (error) {
        console.warn('Error parsing stored user:', error);
        // Clear corrupted data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        storedUser = null;
      }
    }
    
    this.currentUserSubject = new BehaviorSubject<UserDto | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Mark as initialized immediately
    this.isInitializedSubject.next(true);
  }

  ngOnInit() {
    // This method will be called when the service is hydrated in the browser
    if (this.isBrowser && !this.isInitializedSubject.value) {      
      try {
        const userStr = localStorage.getItem('currentUser');
        const storedUser = userStr ? JSON.parse(userStr) : null;
        
        if (storedUser) {
          this.currentUserSubject.next(storedUser);
        }
      } catch (error) {
        console.warn('🔧 Error during hydration:', error);
      }
      
      this.isInitializedSubject.next(true);

      // Listen to social auth state changes
      this.socialAuthService.authState.subscribe((user) => {
        if (user) {
          console.log('Social user logged in:', user);
        }
      });
    }
  }

  public get currentUserValue(): UserDto | null {
    return this.currentUserSubject.value;
  }

  login(loginData: LoginData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginData)
      .pipe(map(response => {
        // Store user details and token in local storage
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        this.currentUserSubject.next(response.user);
        return response;
      }));
  }

  register(registerData: RegisterData): Observable<AuthResponse> {
    // Clean up the data before sending
    const dataToSend: any = { ...registerData };
    
    // Remove phone if it's empty
    if (!dataToSend.phone || dataToSend.phone.trim() === '') {
      delete dataToSend.phone;
    }
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, dataToSend)
      .pipe(map(response => {
        // Store user details and token in local storage
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        this.currentUserSubject.next(response.user);
        return response;
      }));
  }

  // Email verification methods
  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/verify-email`, { token });
  }

  resendVerification(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/resend-verification`, {});
  }

  // Password recovery methods
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/reset-password`, { token, newPassword });
  }

  // Google login
  async googleLogin(): Promise<void> {
    try {
      const user = await this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
      
      // Send the ID token to your backend
      this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/google-login`, { 
        idToken: user.idToken 
      }).subscribe({
        next: (response) => this.handleAuthResponse(response),
        error: (error) => {
          console.error('Google login failed:', error);
          throw error;
        }
      });
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }

  // Facebook login
  async facebookLogin(): Promise<void> {
    try {
      const user = await this.socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID);
      
      // Send the access token to your backend
      this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/facebook-login`, { 
        accessToken: user.authToken 
      }).subscribe({
        next: (response) => this.handleAuthResponse(response),
        error: (error) => {
          console.error('Facebook login failed:', error);
          throw error;
        }
      });
    } catch (error) {
      console.error('Facebook sign-in failed:', error);
      throw error;
    }
  }

  // Social logout
  async socialSignOut(): Promise<void> {
    try {
      await this.socialAuthService.signOut();
    } catch (error) {
      console.error('Social sign out error:', error);
    }
  }

  private handleAuthResponse(response: AuthResponse): void {
    if (response.requiresEmailVerification) {
      // Redirect to email verification notice
      this.router.navigate(['/auth/verify-email-notice']);
    } else {
      // Normal login flow
      if (this.isBrowser) {
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      this.currentUserSubject.next(response.user);
      
      // Navigate to dashboard or home
      const returnUrl = this.isBrowser ? localStorage.getItem('returnUrl') || '/' : '/';
      if (this.isBrowser) {
        localStorage.removeItem('returnUrl');
      }
      this.router.navigateByUrl(returnUrl);
    }
  }

  logout(): void {
    this.socialSignOut();
    // Remove user from local storage
    if (this.isBrowser) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  checkEmailExists(email: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/auth/check-email/${email}`);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('token');
    }
    return null;
  }

  refreshToken(): Observable<AuthResponse> {
    const token = this.getToken();
    const refreshToken = this.isBrowser ? localStorage.getItem('refreshToken') : null;
    
    if (!token || !refreshToken) {
      throw new Error('No tokens available');
    }
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh-token`, {
      token,
      refreshToken
    }).pipe(map(response => {
      if (this.isBrowser) {
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      this.currentUserSubject.next(response.user);
      return response;
    }));
  }
  
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  // Update the current user in memory and localStorage
  updateCurrentUser(user: UserDto): void {
    if (this.isBrowser) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
  }

  // Refresh user data from the profile endpoint
  refreshUserProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      tap(profile => {
        if (profile && this.currentUserValue) {
          // Update the current user with the profile data
          const updatedUser: UserDto = {
            ...this.currentUserValue,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phone: profile.phone,
            firstTimeOrder: profile.firstTimeOrder
          };
          this.updateCurrentUser(updatedUser);
        }
      }),
      catchError(error => {
        console.error('Failed to refresh user profile:', error);
        return of(null);
      })
    );
  }

  refreshUserDataAndToken(): Observable<any> {
    const currentUser = this.currentUserValue;
    if (!currentUser) {
      return new Observable(observer => observer.error('No current user'));
    }
  
    // Get fresh user data from the profile endpoint
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      switchMap(profile => {
        // Update the current user with fresh data
        const updatedUser: UserDto = {
          ...currentUser,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          role: profile.role, // This is the key - get fresh role from server
          firstTimeOrder: profile.firstTimeOrder
        };
  
        // Update local storage and subject
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        this.currentUserSubject.next(updatedUser);
  
        return of(updatedUser);
      }),
      catchError(error => {
        console.error('Failed to refresh user data:', error);
        return throwError(() => error);
      })
    );
  }

  refreshUserToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh-user-token`, {})
      .pipe(map(response => {
        // Store new token and user details
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        this.currentUserSubject.next(response.user);
        return response;
      }));
  }
}