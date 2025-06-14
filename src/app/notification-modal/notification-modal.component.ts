import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalRService, UserNotification } from '../services/signalr.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-modal.component.html',
  styleUrls: ['./notification-modal.component.scss']
})
export class NotificationModalComponent implements OnInit, OnDestroy {
  showModal = false;
  currentNotification: UserNotification | null = null;
  private subscription?: Subscription;
  private signalRService: SignalRService;

  constructor() {
    // Get the already created instance instead of creating a new one
    this.signalRService = (globalThis as any).signalRServiceInstance;
  }

  ngOnInit() {
    if (this.signalRService) {
      this.subscription = this.signalRService.notifications$.subscribe(notification => {
        if (notification) {
          this.currentNotification = notification;
          this.showModal = true;
        }
      });
    }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  closeModal() {
    this.showModal = false;
    this.signalRService.clearNotifications();
  }

  getTitle(): string {
    switch (this.currentNotification?.type) {
      case 'blocked':
        return 'Account Blocked';
      case 'unblocked':
        return 'Account Unblocked';
      case 'roleChanged':
        if (this.currentNotification?.data?.updating) {
          return 'Updating Role...';
        } else if (this.currentNotification?.data?.redirecting) {
          return 'Access Removed';
        } else if (this.currentNotification?.data?.success) {
          return 'Role Updated Successfully';
        } else {
          return 'Role Updated';
        }
      case 'forceLogout':
        return 'Session Terminated';
      default:
        return 'Notification';
    }
  }

  getHeaderClass(): string {
    return this.currentNotification?.type || '';
  }

  getIconClass(): string {
    return this.currentNotification?.type || '';
  }

  getIcon(): string {
    switch (this.currentNotification?.type) {
      case 'blocked':
        return '🚫';
      case 'unblocked':
        return '✅';
      case 'roleChanged':
        if (this.currentNotification?.data?.updating) {
          return '⏳';
        } else if (this.currentNotification?.data?.redirecting) {
          return '🔄';
        } else if (this.currentNotification?.data?.success) {
          return '🎉';
        } else {
          return '👤';
        }
      case 'forceLogout':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  }

  hasAction(): boolean {
    // No action buttons - everything is automatic now
    return false;
  }

  getActionText(): string {
    // No action text needed
    return '';
  }

  handleAction() {
    // No action needed - everything is automatic
  }
}