import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { NotificationModalComponent } from './notification-modal/notification-modal.component';
import { AuthService } from './services/auth.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { Subscription } from 'rxjs';

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
  isAuthInitialized = false;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private tokenRefreshService: TokenRefreshService
  ) {}

  ngOnInit() {
    // Preserve all existing logic
    // Wait for auth to be initialized
    const authInitSub = this.authService.isInitialized$.subscribe(isInit => {
      this.isAuthInitialized = isInit;
      console.log('Auth service initialized:', isInit);
    });
    this.subscriptions.add(authInitSub);

    console.log('App initialized');

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