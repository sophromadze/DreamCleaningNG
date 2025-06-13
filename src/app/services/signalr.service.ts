// src/app/services/signalr.service.ts
import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface UserNotification {
  message: string;
  timestamp: Date;
  type: 'blocked' | 'unblocked' | 'roleChanged' | 'forceLogout';
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private apiUrl = environment.apiUrl;
  private hubConnection?: HubConnection;
  private connectionState = new BehaviorSubject<boolean>(false);
  private notifications = new BehaviorSubject<UserNotification | null>(null);

  public connectionState$ = this.connectionState.asObservable();
  public notifications$ = this.notifications.asObservable();

  constructor(private authService: AuthService) {
    console.log('SignalRService initialized');
    
    // Auto-connect when user logs in
    this.authService.currentUser.subscribe(user => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      if (user && !this.hubConnection) {
        console.log('Attempting to connect to SignalR...');
        this.connect();
      } else if (!user && this.hubConnection) {
        console.log('Disconnecting from SignalR...');
        this.disconnect();
      }
    });
  }

  public async connect(): Promise<void> {
    if (this.hubConnection) {
      console.log('SignalR connection already exists');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for SignalR connection');
      return;
    }

    console.log('Token for SignalR:', token.substring(0, 50) + '...');

    // Use this.apiUrl just like other services, but remove /api for SignalR hub
    const baseUrl = this.apiUrl.replace('/api', '');
    const hubUrl = `${baseUrl}/userManagementHub`;
    console.log('Connecting to SignalR hub:', hubUrl);
    console.log('Base API URL:', this.apiUrl);

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          console.log('Token factory called');
          return token;
        }
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    // Set up event handlers
    this.setupEventHandlers();

    try {
      await this.hubConnection.start();
      console.log('✅ SignalR connection established successfully!');
      this.connectionState.next(true);
    } catch (error) {
      console.error('❌ Error establishing SignalR connection:', error);
      this.connectionState.next(false);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        console.log('SignalR connection closed');
      } catch (error) {
        console.error('Error closing SignalR connection:', error);
      } finally {
        this.hubConnection = undefined;
        this.connectionState.next(false);
      }
    }
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    console.log('Setting up SignalR event handlers...');

    // Handle user blocked notification - FIXED CASE SENSITIVITY
    this.hubConnection.on('UserBlocked', (data: any) => {
      console.log('🚫 User blocked notification received:', data);
      this.notifications.next({
        message: data.message,
        timestamp: new Date(data.timestamp),
        type: 'blocked',
        data: data
      });

      if (data.shouldLogout) {
        // Force logout after a short delay to show the modal
        setTimeout(() => {
          console.log('Forcing logout due to block...');
          this.authService.logout();
        }, 3000);
      }
    });

    // Handle user unblocked notification - FIXED CASE SENSITIVITY
    this.hubConnection.on('UserUnblocked', (data: any) => {
      console.log('✅ User unblocked notification received:', data);
      this.notifications.next({
        message: data.message,
        timestamp: new Date(data.timestamp),
        type: 'unblocked',
        data: data
      });
    });

    // Handle role changed notification - SIMPLIFIED WITH PAGE REFRESH
    this.hubConnection.on('RoleChanged', (data: any) => {
      console.log('👤 Role changed notification received:', data);
      
      // Show notification message
      this.notifications.next({
        message: `Your role has been updated to ${data.newRole}. Refreshing your interface...`,
        timestamp: new Date(data.timestamp),
        type: 'roleChanged',
        data: { ...data, updating: true }
      });

      if (data.shouldRefresh) {
        // First refresh the JWT token with new role
        this.authService.refreshUserToken().subscribe({
          next: (response) => {
            console.log('✅ JWT token refreshed with new role:', response.user.role);
            
            // Check if user was downgraded to Customer and is in admin panel
            const currentUrl = window.location.pathname;
            const isInAdminPanel = currentUrl.startsWith('/admin');
            const newRole = data.newRole;
            const isDowngradedToCustomer = newRole === 'Customer';
            
            if (isDowngradedToCustomer && isInAdminPanel) {
              // User downgraded to Customer while in admin panel - redirect to home
              setTimeout(() => {
                this.clearNotifications();
                window.location.href = '/';
              }, 1500);
            } else {
              // For all other role changes, refresh the page to ensure clean UI
              setTimeout(() => {
                this.clearNotifications();
                window.location.reload();
              }, 1500);
            }
          },
          error: (error) => {
            console.error('❌ Failed to refresh JWT token:', error);
            
            // Show error message and force logout
            this.notifications.next({
              message: 'Your role has been updated, but there was an issue refreshing your session. Please log out and log in again.',
              timestamp: new Date(),
              type: 'forceLogout',
              data: data
            });
            
            setTimeout(() => {
              this.authService.logout();
            }, 3000);
          }
        });
      }
    });

    // Handle force logout - FIXED CASE SENSITIVITY
    this.hubConnection.on('ForceLogout', (data: any) => {
      console.log('⚠️ Force logout received:', data);
      this.notifications.next({
        message: data.reason,
        timestamp: new Date(data.timestamp),
        type: 'forceLogout',
        data: data
      });

      // Force logout immediately
      setTimeout(() => {
        this.authService.logout();
      }, 1000);
    });

    // Handle reconnection
    this.hubConnection.onreconnected(() => {
      console.log('🔄 SignalR reconnected');
      this.connectionState.next(true);
    });

    this.hubConnection.onreconnecting(() => {
      console.log('🔄 SignalR reconnecting...');
      this.connectionState.next(false);
    });

    this.hubConnection.onclose(() => {
      console.log('❌ SignalR connection closed');
      this.connectionState.next(false);
    });

    console.log('✅ SignalR event handlers set up');
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === 'Connected';
  }

  public getConnectionState(): Observable<boolean> {
    return this.connectionState$;
  }

  public clearNotifications(): void {
    this.notifications.next(null);
  }

  // Add method to manually test connection
  public testConnection(): void {
    if (this.hubConnection) {
      console.log('Testing SignalR connection...');
      console.log('Connection state:', this.hubConnection.state);
      console.log('Connection ID:', this.hubConnection.connectionId);
    } else {
      console.log('No SignalR connection available');
    }
  }
}