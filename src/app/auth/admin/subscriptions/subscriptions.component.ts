import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, CreateSubscription, UpdateSubscription, UserPermissions } from '../../../services/admin.service';
import { Subscription } from '../../../services/booking.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrls: ['./subscriptions.component.scss']
})
export class SubscriptionsComponent implements OnInit {
  subscriptions: Subscription[] = [];
  isAddingSubscription = false;
  editingSubscriptionId: number | null = null;
  newSubscription: CreateSubscription = {
    name: '',
    description: '',
    discountPercentage: 0,
    subscriptionDays: 30,
    displayOrder: 0
  };

  // Permissions
  userRole: string = '';
  userPermissions: UserPermissions = {
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
  errorMessage = '';
  successMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUserPermissions();
    this.loadSubscriptions();
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

  loadSubscriptions() {
    this.adminService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        // Sort by displayOrder
        this.subscriptions = subscriptions.sort((a, b) => 
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );
      },
      error: (error) => {
        console.error('Error loading subscriptions:', error);
        this.errorMessage = 'Failed to load subscriptions. Please try again.';
      }
    });
  }

  startAddingSubscription() {
    this.isAddingSubscription = true;
    this.editingSubscriptionId = null;
    this.newSubscription = {
      name: '',
      description: '',
      discountPercentage: 0,
      subscriptionDays: 30,
      displayOrder: 0
    };
  }

  cancelAddSubscription() {
    this.isAddingSubscription = false;
    this.newSubscription = {
      name: '',
      description: '',
      discountPercentage: 0,
      subscriptionDays: 30,
      displayOrder: 0
    };
  }

  addSubscription() {
    this.adminService.createSubscription(this.newSubscription).subscribe({
      next: (response) => {
        this.loadSubscriptions(); // Change from push to reload
        this.isAddingSubscription = false;
        this.newSubscription = {
          name: '',
          description: '',
          discountPercentage: 0,
          subscriptionDays: 30,
          displayOrder: 0
        };
        this.successMessage = 'Subscription added successfully.';
      },
      error: (error) => {
        console.error('Error creating subscription:', error);
        this.errorMessage = 'Failed to create subscription. Please try again.';
      }
    });
  }

  editSubscription(subscription: Subscription) {
    this.editingSubscriptionId = subscription.id;
  }

  cancelEditSubscription() {
    this.editingSubscriptionId = null;
  }

  saveSubscription(subscription: Subscription) {
    const updateData: UpdateSubscription = {
      name: subscription.name,
      description: subscription.description,
      discountPercentage: subscription.discountPercentage,
      subscriptionDays: subscription.subscriptionDays,
      displayOrder: subscription.displayOrder || 0 
    };
  
    this.adminService.updateSubscription(subscription.id, updateData).subscribe({
      next: (response) => {
        this.loadSubscriptions(); // Add this line to reload and re-sort
        this.editingSubscriptionId = null;
        this.successMessage = 'Subscription updated successfully.';
      },
      error: (error) => {
        console.error('Error updating subscription:', error);
        this.errorMessage = 'Failed to update subscription. Please try again.';
      }
    });
  }

  deleteSubscription(subscription: Subscription) {
    if (confirm('Are you sure you want to delete this subscription?')) {
      this.adminService.deleteSubscription(subscription.id).subscribe({
        next: () => {
          this.subscriptions = this.subscriptions.filter(s => s.id !== subscription.id);
          this.successMessage = 'Subscription deleted successfully.';
        },
        error: (error) => {
          console.error('Error deleting subscription:', error);
          this.errorMessage = 'Failed to delete subscription. Please try again.';
        }
      });
    }
  }

  deactivateSubscription(subscription: Subscription) {
    this.adminService.deactivateSubscription(subscription.id).subscribe({
      next: (response) => {
        const index = this.subscriptions.findIndex(s => s.id === subscription.id);
        if (index !== -1) {
          this.subscriptions[index] = { ...this.subscriptions[index], isActive: false };
        }
        this.successMessage = 'Subscription deactivated successfully.';
      },
      error: (error) => {
        console.error('Error deactivating subscription:', error);
        this.errorMessage = 'Failed to deactivate subscription. Please try again.';
      }
    });
  }

  activateSubscription(subscription: Subscription) {
    this.adminService.activateSubscription(subscription.id).subscribe({
      next: (response) => {
        const index = this.subscriptions.findIndex(s => s.id === subscription.id);
        if (index !== -1) {
          this.subscriptions[index] = { ...this.subscriptions[index], isActive: true };
        }
        this.successMessage = 'Subscription activated successfully.';
      },
      error: (error) => {
        console.error('Error activating subscription:', error);
        this.errorMessage = 'Failed to activate subscription. Please try again.';
      }
    });
  }
}
