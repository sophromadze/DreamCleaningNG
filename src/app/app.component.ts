import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { NotificationModalComponent } from './notification-modal/notification-modal.component';
import { SignalRService } from './services/signalr.service';
import { AuthService } from './services/auth.service';
import { combineLatest } from 'rxjs';

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
export class AppComponent implements OnInit {
  title = 'DreamCleaning';
  isConnected = false;
  showConnectionStatus = false;
  isAuthInitialized = false;

  constructor(
    private signalRService: SignalRService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Wait for auth to be initialized before showing connection status
    combineLatest([
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
  }
}