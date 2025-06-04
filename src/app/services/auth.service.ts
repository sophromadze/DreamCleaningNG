import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  firstTimeOrder: boolean;
  subscriptionId?: number;
  authProvider?: string;
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
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
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private isBrowser: boolean;
  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  public isInitialized$ = this.isInitializedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    let storedUser = null;
    if (this.isBrowser) {
      const userStr = localStorage.getItem('currentUser');
      storedUser = userStr ? JSON.parse(userStr) : null;
    }
    
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Mark as initialized after loading from storage
    setTimeout(() => this.isInitializedSubject.next(true), 0);
  }

  public get currentUserValue(): User | null {
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

  logout(): void {
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
}