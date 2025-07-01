import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap, filter, take, first } from 'rxjs/operators'; 
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { 
  SocialAuthService, 
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
  private isSocialLogin = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    public socialAuthService: SocialAuthService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Initialize stored user
    let storedUser = null;
    if (this.isBrowser) {
      try {
        const userStr = localStorage.getItem('currentUser');
        storedUser = userStr ? JSON.parse(userStr) : null;
        // Check if it was a social login
        this.isSocialLogin = localStorage.getItem('isSocialLogin') === 'true';
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }

    this.currentUserSubject = new BehaviorSubject<UserDto | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();

    // Handle initialization based on platform
    if (this.isBrowser) {
      // For social auth, we need to wait for it to initialize
      this.socialAuthService.initState.subscribe((isReady) => {
        if (isReady) {
          this.isInitializedSubject.next(true);
        }
      });

      // Fallback: If social auth doesn't initialize within 2 seconds, 
      // mark as initialized anyway (for non-social login functionality)
      setTimeout(() => {
        if (!this.isInitializedSubject.value) {
          this.isInitializedSubject.next(true);
        }
      }, 2000);
    } else {
      // On server-side, mark as initialized immediately
      this.isInitializedSubject.next(true);
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
        // Check if email verification is required
        if (response.requiresEmailVerification) {
          // Don't store anything in localStorage - user must verify email first
        } else if (response.token && response.refreshToken) {
          // This case shouldn't happen with our new flow, but handle it just in case
          if (this.isBrowser) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('token', response.token);
            localStorage.setItem('refreshToken', response.refreshToken);
          }
          this.currentUserSubject.next(response.user);
        }
        return response;
      }));
  }

  // Email verification methods
  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-email`, { token });
  }

  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-verification`, { email });
  }

  // Password recovery methods
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  async handleGoogleUser(user: SocialUser): Promise<void> {  
    if (!user || !user.idToken) {
      throw new Error('No ID token received from Google');
    }
    
    return new Promise((resolve, reject) => {
      this.http.post<AuthResponse>(`${this.apiUrl}/auth/google-login`, { 
        idToken: user.idToken 
      }).subscribe({
        next: (response) => {
          this.isSocialLogin = true;
          if (this.isBrowser) {
            localStorage.setItem('isSocialLogin', 'true');
          }
          this.handleAuthResponse(response);
          resolve();
        },
        error: (error) => {
          console.error('Backend error:', error);
          reject(error);
        }
      });
    });
  }

  // Google login
  // async googleLogin(): Promise<void> {
  //   console.log('googleLogin called');
    
  //   if (!this.isBrowser) {
  //     throw new Error('Social login is only available in browser');
  //   }

  //   try {
  //     // Check if social auth service is available
  //     if (!this.socialAuthService) {
  //       throw new Error('Social auth service not available');
  //     }

  //     console.log('Calling socialAuthService.signIn for Google');
  //     const user = await this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
  //     console.log('Google user received:', user);
      
  //     if (!user || !user.idToken) {
  //       throw new Error('No ID token received from Google');
  //     }
      
  //     // Send the ID token to your backend
  //     console.log('Sending token to backend');
  //     return new Promise((resolve, reject) => {
  //       this.http.post<AuthResponse>(`${this.apiUrl}/auth/google-login`, { 
  //         idToken: user.idToken 
  //       }).subscribe({
  //         next: (response) => {
  //           console.log('Backend response received:', response);
  //           this.isSocialLogin = true;
  //           if (this.isBrowser) {
  //             localStorage.setItem('isSocialLogin', 'true');
  //           }
  //           this.handleAuthResponse(response);
  //           resolve();
  //         },
  //         error: (error) => {
  //           console.error('Backend error:', error);
  //           reject(error);
  //         }
  //       });
  //     });
  //   } catch (error: any) {
  //     console.error('Google sign-in failed:', error);
  //     // Provide more specific error messages
  //     if (error.error === 'popup_closed_by_user') {
  //       throw new Error('Login cancelled by user');
  //     } else if (error.error === 'access_denied') {
  //       throw new Error('Access denied. Please try again.');
  //     } else {
  //       throw error;
  //     }
  //   }
  // }

  // Social logout
  async socialSignOut(): Promise<void> {
    // Only sign out from social providers if it was a social login
    if (this.isSocialLogin && this.socialAuthService && this.isBrowser) {
      try {
        await this.socialAuthService.signOut();
      } catch (error) {
        console.error('Social sign out error:', error);
        // Continue with logout even if social signout fails
      }
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
        // Set initial activity timestamp when user logs in
        localStorage.setItem('lastActivity', Date.now().toString());
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
      localStorage.removeItem('isSocialLogin');
    }
    this.isSocialLogin = false;
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

  initiateEmailChange(newEmail: string, currentPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/initiate-email-change`, {
      newEmail,
      currentPassword
    });
  }
  
  confirmEmailChange(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/confirm-email-change`, { token });
  }
}