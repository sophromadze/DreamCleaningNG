import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, UserPermissions } from '../../services/admin.service';
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

  constructor(private adminService: AdminService) {}

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
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.errorMessage = 'Failed to load permissions. Please try again.';
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    sessionStorage.setItem('adminActiveTab', tab);
  }
}