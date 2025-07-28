import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { NotificationModalComponent } from './notification-modal/notification-modal.component';
import { FloatingActionButtonsComponent } from './floating-action-buttons/floating-action-buttons.component';
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
    NotificationModalComponent,
    FloatingActionButtonsComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'DreamCleaning';
  isAuthInitialized = false;
  private subscriptions: Subscription = new Subscription();
  private servicesInitialized = false;

  constructor(
    private authService: AuthService,
    private tokenRefreshService: TokenRefreshService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Platform check at the beginning
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }



    // Wait for auth to be initialized
    const authInitSub = this.authService.isInitialized$.subscribe(isInit => {
      this.isAuthInitialized = isInit;
      
      // Only initialize other services after auth is ready
      if (isInit && !this.servicesInitialized) { // This will only run once when isInit becomes true
        this.servicesInitialized = true;
        // Initialize token refresh service
        this.tokenRefreshService.startTokenRefresh();

        // Listen for auth state changes to manage token refresh
        const authSub = this.authService.currentUser.subscribe(user => {
          if (user) {
            // User logged in, token refresh is already running from above
            // Just update last activity time
            localStorage.setItem('lastActivity', Date.now().toString());
          } else {
            // User logged out, stop token refresh
            this.tokenRefreshService.stopTokenRefresh();
          }
        });
        this.subscriptions.add(authSub);

        // Set initial activity time if user is already logged in
        if (this.authService.isLoggedIn()) {
          localStorage.setItem('lastActivity', Date.now().toString());
        }
      }
    });
    this.subscriptions.add(authInitSub);
  }

  ngOnDestroy() {
    // Clean up all subscriptions
    this.subscriptions.unsubscribe();
    
    // Stop token refresh
    this.tokenRefreshService.stopTokenRefresh();
  }
}