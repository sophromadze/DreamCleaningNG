import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { NotificationModalComponent } from './notification-modal/notification-modal.component';
import { SignalRService } from './services/signalr.service';
import { AuthService } from './services/auth.service';

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

  constructor(
    private signalRService: SignalRService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Monitor connection status
    this.signalRService.getConnectionState().subscribe(connected => {
      this.isConnected = connected;
      this.showConnectionStatus = this.authService.isLoggedIn();
    });

    // Show/hide connection status based on login status
    this.authService.currentUser.subscribe(user => {
      this.showConnectionStatus = !!user;
    });
  }
}
