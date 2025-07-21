import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, UserPermissions } from '../../services/admin.service';
import { MaintenanceModeService, MaintenanceModeStatus, ToggleMaintenanceModeRequest } from '../../services/maintenance-mode.service';
import { OrdersComponent } from './orders/orders.component';
import { PromoCodesComponent } from './promo-codes/promo-codes.component';
import { SubscriptionsComponent } from './subscriptions/subscriptions.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { BookingServicesComponent } from './booking-services/booking-services.component';
import { AdminGiftCardsComponent } from './admin-gift-cards/admin-gift-cards.component';
import { AuditHistoryComponent } from './audit-history/audit-history.component';
import { SpecialOffersComponent } from './special-offers/special-offers.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    OrdersComponent,
    PromoCodesComponent,
    SubscriptionsComponent,
    UserManagementComponent,
    BookingServicesComponent,
    AdminGiftCardsComponent,
    AuditHistoryComponent,
    SpecialOffersComponent
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  // Permissions
  userRole: string = '';
  userPermissions: any = {
    role: '',
    permissions: {
      canView: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canActivate: false,
      canDeactivate: false
    }
  };

  // UI State
  activeTab: string = 'orders';
  errorMessage = '';
  successMessage = '';

  // Maintenance Mode
  maintenanceStatus: MaintenanceModeStatus | null = null;
  isTogglingMaintenance = false;

  constructor(
    private adminService: AdminService,
    private maintenanceModeService: MaintenanceModeService
  ) {}

  ngOnInit() {
    // Restore last active tab from sessionStorage if available
    const savedTab = sessionStorage.getItem('adminActiveTab');
    if (savedTab) {
      this.activeTab = savedTab;
    }
    this.loadUserPermissions();
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (response) => {
        this.userRole = response.role;
        this.userPermissions = response;
        
        // Load maintenance status if user is SuperAdmin
        if (response.role === 'SuperAdmin') {
          this.loadMaintenanceStatus();
        }
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.errorMessage = 'Failed to load permissions. Please try again.';
      }
    });
  }

  loadMaintenanceStatus() {
    this.maintenanceModeService.getStatus().subscribe({
      next: (status) => {
        this.maintenanceStatus = status;
      },
      error: (error) => {
        console.error('Error loading maintenance status:', error);
      }
    });
  }

  confirmToggleMaintenance() {
    const action = this.maintenanceStatus?.isEnabled ? 'stop' : 'start';
    const message = this.maintenanceStatus?.isEnabled 
      ? 'Are you sure you want to stop maintenance mode? This will allow customers to access the site again.'
      : 'Are you sure you want to start maintenance mode? This will block all customers from accessing the site.';
    
    if (confirm(message)) {
      this.toggleMaintenanceMode();
    }
  }

  toggleMaintenanceMode() {
    if (!this.maintenanceStatus) return;

    this.isTogglingMaintenance = true;
    const request: ToggleMaintenanceModeRequest = {
      isEnabled: !this.maintenanceStatus.isEnabled,
      message: this.maintenanceStatus.isEnabled ? undefined : 'Scheduled maintenance in progress. We apologize for any inconvenience.'
    };

    this.maintenanceModeService.toggleMaintenanceMode(request).subscribe({
      next: (status) => {
        this.maintenanceStatus = status;
        this.isTogglingMaintenance = false;
        this.successMessage = `Maintenance mode ${status.isEnabled ? 'enabled' : 'disabled'} successfully`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error toggling maintenance mode:', error);
        this.errorMessage = 'Failed to toggle maintenance mode';
        this.isTogglingMaintenance = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    sessionStorage.setItem('adminActiveTab', tab);
  }
}