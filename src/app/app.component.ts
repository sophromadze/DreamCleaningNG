import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { NotificationModalComponent } from './notification-modal/notification-modal.component';
import { SignalRService } from './services/signalr.service';
import { AuthService } from './services/auth.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    HeaderComponent, 
    FooterComponent,
    NotificationModalComponent 
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'DreamCleaning';
  isConnected = false;
  showConnectionStatus = false;
  isAuthInitialized = false;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private signalRService: SignalRService,
    private authService: AuthService,
    private tokenRefreshService: TokenRefreshService
  ) {}

  ngOnInit() {
    // Preserve all existing logic
    // Wait for auth to be initialized before showing connection status
    const connectionSub = combineLatest([
      this.authService.isInitialized$,
      this.authService.currentUser,
      this.signalRService.getConnectionState()
    ]).subscribe(([isAuthInitialized, user, connected]) => {
      this.isAuthInitialized = isAuthInitialized;
      this.isConnected = connected;
      
      // Only show connection status if:
      // 1. Auth is initialized
      // 2. User is logged in
      this.showConnectionStatus = isAuthInitialized && !!user;
    });
    this.subscriptions.add(connectionSub);

    console.log('App initialized');
    
    const authInitSub = this.authService.isInitialized$.subscribe(isInit => {
      console.log('Auth service initialized:', isInit);
    });
    this.subscriptions.add(authInitSub);

    // Check if social login libraries are loaded
    setTimeout(() => {
      console.log('=== Social Login Debug Info ===');
      console.log('Google SDK:', typeof (window as any).google !== 'undefined');
      console.log('Facebook SDK:', typeof (window as any).FB !== 'undefined');
      console.log('Auth service:', this.authService);
      console.log('==============================');
    }, 1000);

    // NEW: Initialize token refresh service
    this.tokenRefreshService.startTokenRefresh();

    // NEW: Listen for auth state changes to manage token refresh
    const authSub = this.authService.currentUser.subscribe(user => {
      if (user) {
        // User logged in, ensure token refresh is running
        this.tokenRefreshService.startTokenRefresh();
      } else {
        // User logged out, stop token refresh
        this.tokenRefreshService.stopTokenRefresh();
      }
    });
    this.subscriptions.add(authSub);

    // NEW: Set initial activity time
    if (this.authService.isLoggedIn()) {
      localStorage.setItem('lastActivity', Date.now().toString());
    }
  }

  ngOnDestroy() {
    // Clean up all subscriptions
    this.subscriptions.unsubscribe();
    
    // Stop token refresh
    this.tokenRefreshService.stopTokenRefresh();
  }
}