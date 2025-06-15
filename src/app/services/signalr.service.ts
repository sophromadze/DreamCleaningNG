import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { filter, skip } from 'rxjs/operators';

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
  private static instanceCount = 0;
  private static authSubscriptionSetup = false;
  private static globalConnectionState = new BehaviorSubject<boolean>(false);
  private static globalNotifications = new BehaviorSubject<UserNotification | null>(null);
  
  private apiUrl = environment.apiUrl;
  private static hubConnection?: HubConnection;
  private isInitialized = false;
  private isBrowser: boolean;

  public connectionState$ = SignalRService.globalConnectionState.asObservable();
  public notifications$ = SignalRService.globalNotifications.asObservable();

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Only initialize in browser context
    if (!this.isBrowser) {
      return;
    }
    
    SignalRService.instanceCount++;

    // Only setup auth subscription once for the first browser instance
    if (!SignalRService.authSubscriptionSetup) {
      SignalRService.authSubscriptionSetup = true;
      this.initializeOnce();
    }
  }

  private initializeOnce(): void {    
    // Wait for auth service to be fully initialized before setting up subscriptions
    this.authService.isInitialized$.subscribe(isInitialized => {
      if (isInitialized && !this.isInitialized) {
        this.isInitialized = true;
        this.setupAuthSubscription();
      }
    });
  }

  private setupAuthSubscription(): void {   
    // Check current user state first
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.connect();
    }

    // Subscribe to future auth state changes, but skip the initial emission
    // since we've already handled the current state above
    this.authService.currentUser.pipe(
      skip(1) // Skip the first emission to avoid duplicate connection attempts
    ).subscribe(user => {      
      if (user && !SignalRService.hubConnection) {
        this.connect();
      } else if (!user && SignalRService.hubConnection) {
        this.disconnect();
      }
    });
  }

  public async connect(): Promise<void> {
    if (SignalRService.hubConnection) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for SignalR connection');
      return;
    }

    // Use this.apiUrl just like other services, but remove /api for SignalR hub
    const baseUrl = this.apiUrl.replace('/api', '');
    const hubUrl = `${baseUrl}/userManagementHub`;

    SignalRService.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          return token;
        }
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    // Set up event handlers
    this.setupEventHandlers();

    try {
      await SignalRService.hubConnection.start();
      SignalRService.globalConnectionState.next(true);
    } catch (error) {
      SignalRService.globalConnectionState.next(false);
    }
  }

  public async disconnect(): Promise<void> {
    if (SignalRService.hubConnection) {
      try {
        await SignalRService.hubConnection.stop();
      } catch (error) {
        console.error('Error closing SignalR connection:', error);
      } finally {
        SignalRService.hubConnection = undefined;
        SignalRService.globalConnectionState.next(false);
      }
    }
  }

  private setupEventHandlers(): void {
    if (!SignalRService.hubConnection) return;
  
    // Handle user blocked notification
    SignalRService.hubConnection.on('UserBlocked', (data: any) => {
      console.log('UserBlocked event received:', data);
      
      // Show the notification modal
      SignalRService.globalNotifications.next({
        message: data.message || 'Your account has been blocked by an administrator.',
        timestamp: new Date(data.timestamp || new Date()),
        type: 'blocked',
        data: data
      });
  
      // Wait for user to see the message before logging out
      if (data.shouldLogout !== false) {
        setTimeout(() => {
          this.authService.logout();
        }, 3000);
      }
    });
  
    // Handle user unblocked notification
    SignalRService.hubConnection.on('UserUnblocked', (data: any) => {
      console.log('UserUnblocked event received:', data);
      
      SignalRService.globalNotifications.next({
        message: data.message || 'Your account has been unblocked.',
        timestamp: new Date(data.timestamp || new Date()),
        type: 'unblocked',
        data: data
      });
    });
  
    // Handle role changed notification
    SignalRService.hubConnection.on('RoleChanged', (data: any) => {
      console.log('RoleChanged event received:', data);
      
      // Show notification with the new role
      SignalRService.globalNotifications.next({
        message: `Your role has been updated to ${data.newRole}. Please log in again to access your new permissions.`,
        timestamp: new Date(),
        type: 'roleChanged',
        data: data
      });
      
      // Wait for modal to be shown, then logout
      setTimeout(() => {
        this.authService.logout();
      }, 4000);
    });
  
    // Handle force logout
    SignalRService.hubConnection.on('ForceLogout', (data: any) => {
      console.log('ForceLogout event received:', data);
      
      SignalRService.globalNotifications.next({
        message: data.reason || 'Your session has been terminated.',
        timestamp: new Date(data.timestamp || new Date()),
        type: 'forceLogout',
        data: data
      });
  
      // Force logout after short delay
      setTimeout(() => {
        this.authService.logout();
      }, 2000);
    });
  
    // Connection event handlers
    SignalRService.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected');
      SignalRService.globalConnectionState.next(true);
    });
  
    SignalRService.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      SignalRService.globalConnectionState.next(false);
    });
  
    SignalRService.hubConnection.onclose(() => {
      console.log('SignalR connection closed');
      SignalRService.globalConnectionState.next(false);
    });
  }

  public isConnected(): boolean {
    return SignalRService.hubConnection?.state === 'Connected';
  }

  public getConnectionState(): Observable<boolean> {
    return SignalRService.globalConnectionState.asObservable();
  }

  public clearNotifications(): void {
    SignalRService.globalNotifications.next(null);
  }
}