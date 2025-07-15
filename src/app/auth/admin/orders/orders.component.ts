import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserPermissions } from '../../../services/admin.service';
import { OrderService, Order, OrderList } from '../../../services/order.service';
import { CleanerService, AvailableCleaner } from '../../../services/cleaner.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// Extended interface for admin orders with additional properties
export interface AdminOrderList extends OrderList {
  userId: number;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
}

interface AssignedCleaner {
  id: number;
  name: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: AdminOrderList[] = [];
  selectedOrder: Order | null = null;
  viewingOrderId: number | null = null;
  
  // Filtering and search
  searchTerm: string = '';
  statusFilter: string = 'all';
  dateFilter: string = 'all';
  
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
  
  // Store customer names and details
  customerNames: Map<number, string> = new Map();
  customerDetails: Map<number, {id: number, email: string}> = new Map();
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  // New properties for cleaner assignment
  showCleanerModal = false;
  availableCleaners: AvailableCleaner[] = [];
  selectedCleaners: number[] = [];
  tipsForCleaner = '';
  assigningOrderId: number | null = null;
  assignedCleanersCache: Map<number, AssignedCleaner[]> = new Map();

  loadingStates = {
    orders: false,
    orderDetails: false,
    assignedCleaners: false,
    assigningCleaners: false,
    removingCleaner: false
  };

  constructor(
    private adminService: AdminService,
    private orderService: OrderService,
    private cleanerService: CleanerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUserPermissions();
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (response) => {
        this.userRole = response.role;
        this.userPermissions = response;
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.errorMessage = 'Failed to load permissions. Please try again.';
      }
    });
  }

  loadOrders() {
    this.loadingStates.orders = true;
    this.clearMessages();

    if (this.userRole && this.userRole !== 'Customer') {
      this.adminService.getAllOrders().subscribe({
        next: (orders) => {
          this.orders = orders as AdminOrderList[];
          // Preload assigned cleaners for all orders
          this.preloadAssignedCleaners();
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.errorMessage = 'Failed to load orders. Please try again.';
        },
        complete: () => {
          this.loadingStates.orders = false;
        }
      });
    } else {
      this.orderService.getUserOrders().subscribe({
        next: (orders) => {
          this.orders = orders as AdminOrderList[];
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.errorMessage = 'Failed to load orders. Please try again.';
        },
        complete: () => {
          this.loadingStates.orders = false;
        }
      });
    }
  }

  private preloadAssignedCleaners() {
    if (this.orders.length === 0) return;
    
    this.loadingStates.assignedCleaners = true;
    
    // Create observables for all orders
    const cleanerRequests = this.orders.map(order => 
      this.adminService.getAssignedCleanersWithIds(order.id).pipe(
        catchError((error) => {
          return of([]); // Return empty array on error
        })
      )
    );

    // Execute all requests in parallel
    forkJoin(cleanerRequests).subscribe({
      next: (allCleaners) => {
        // Update cache with all results
        this.orders.forEach((order, index) => {
          this.assignedCleanersCache.set(order.id, allCleaners[index] || []);
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error preloading assigned cleaners:', error);
      },
      complete: () => {
        this.loadingStates.assignedCleaners = false;
      }
    });
  }

  // Helper method to refresh a single order's assigned cleaners
  private refreshOrderCleaners(orderId: number): void {
    this.adminService.getAssignedCleanersWithIds(orderId).subscribe({
      next: (cleaners) => {
        this.assignedCleanersCache.set(orderId, cleaners);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(`Error refreshing cleaners for order ${orderId}:`, error);
        this.assignedCleanersCache.set(orderId, []);
      }
    });
  }

  viewOrderDetails(orderId: number) {
    if (this.viewingOrderId === orderId) {
      this.viewingOrderId = null;
      this.selectedOrder = null;
      return;
    }
    
    this.viewingOrderId = orderId;
    this.loadingStates.orderDetails = true;
    
    if (this.userRole && this.userRole !== 'Customer') {
      this.adminService.getOrderDetails(orderId).subscribe({
        next: (order) => {
          this.selectedOrder = order;
          this.customerNames.set(orderId, `${order.contactFirstName} ${order.contactLastName}`);
          this.customerDetails.set(orderId, {
            id: order.userId,
            email: order.contactEmail
          });
          
          // Only load assigned cleaners if not already cached
          if (!this.assignedCleanersCache.has(orderId)) {
            this.loadSingleOrderCleaners(orderId);
          }
        },
        error: (error) => {
          console.error('Error loading order details:', error);
          this.errorMessage = 'Failed to load order details.';
        },
        complete: () => {
          this.loadingStates.orderDetails = false;
        }
      });
    } else {
      this.orderService.getOrderById(orderId).subscribe({
        next: (order) => {
          this.selectedOrder = order;
        },
        error: (error) => {
          console.error('Error loading order details:', error);
          this.errorMessage = 'Failed to load order details.';
        },
        complete: () => {
          this.loadingStates.orderDetails = false;
        }
      });
    }
  }

  // Separate method for loading individual order cleaners
  private loadSingleOrderCleaners(orderId: number) {
    this.adminService.getAssignedCleanersWithIds(orderId).subscribe({
      next: (cleaners) => {
        this.assignedCleanersCache.set(orderId, cleaners);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.assignedCleanersCache.set(orderId, []);
      }
    });
  }

  removeCleanerFromOrder(orderId: number, cleanerId: number, cleanerName: string) {
    const confirmMessage = `Are you sure you want to remove ${cleanerName} from this order? They will receive an email notification about the removal.`;
    
    if (confirm(confirmMessage)) {
      this.loadingStates.removingCleaner = true;
      
      this.cleanerService.removeCleanerFromOrder(orderId, cleanerId).subscribe({
        next: () => {
          this.successMessage = `${cleanerName} has been removed from the order and notified via email.`;
          
          // Refresh assigned cleaners from server after removal
          this.adminService.getAssignedCleanersWithIds(orderId).subscribe({
            next: (updatedCleaners) => {
              // Update cache with fresh data from server
              this.assignedCleanersCache.set(orderId, updatedCleaners);
              
              // Force change detection
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error refreshing assigned cleaners after removal:', error);
              // Fallback: update cache manually
              const currentCleaners = this.assignedCleanersCache.get(orderId) || [];
              const updatedCleaners = currentCleaners.filter(c => c.id !== cleanerId);
              this.assignedCleanersCache.set(orderId, updatedCleaners);
              this.cdr.detectChanges();
            }
          });
          
          this.clearMessagesAfterDelay();
        },
        error: (error) => {
          console.error('Error removing cleaner:', error);
          this.errorMessage = 'Failed to remove cleaner from order.';
        },
        complete: () => {
          this.loadingStates.removingCleaner = false;
        }
      });
    }
  }

  openCleanerAssignmentModal(orderId: number) {
    this.assigningOrderId = orderId;
    this.selectedCleaners = [];
    this.tipsForCleaner = '';
    
    this.cleanerService.getAvailableCleaners(orderId).subscribe({
      next: (cleaners) => {
        this.availableCleaners = cleaners;
        this.showCleanerModal = true;
      },
      error: (error) => {
        console.error('Error loading available cleaners:', error);
        this.errorMessage = 'Failed to load available cleaners.';
      }
    });
  }

  closeCleanerModal() {
    this.showCleanerModal = false;
    this.assigningOrderId = null;
    this.selectedCleaners = [];
    this.tipsForCleaner = '';
    this.availableCleaners = [];
  }

  // Method to force refresh all assigned cleaners (for debugging)
  refreshAllAssignedCleaners() {
    this.preloadAssignedCleaners();
  }

  toggleCleanerSelection(cleanerId: number) {
    const index = this.selectedCleaners.indexOf(cleanerId);
    if (index > -1) {
      this.selectedCleaners.splice(index, 1);
    } else {
      this.selectedCleaners.push(cleanerId);
    }
  }

  isCleanerSelected(cleanerId: number): boolean {
    return this.selectedCleaners.includes(cleanerId);
  }

  assignCleanersToOrder() {
    if (!this.assigningOrderId || this.selectedCleaners.length === 0) {
      this.errorMessage = 'Please select at least one cleaner.';
      return;
    }

    this.loadingStates.assigningCleaners = true;

    // Store the order ID before it gets cleared by modal close
    const orderIdToRefresh = this.assigningOrderId;
    const selectedCleanersToAssign = [...this.selectedCleaners];
  
    this.cleanerService.assignCleaners(
      orderIdToRefresh, 
      selectedCleanersToAssign, 
      this.tipsForCleaner || undefined
    ).subscribe({
      next: (response) => {
        this.successMessage = 'Cleaners assigned successfully! They will receive email notifications.';
        this.closeCleanerModal();
        
        // Refresh assigned cleaners from server to get accurate current state
        setTimeout(() => {
          this.adminService.getAssignedCleanersWithIds(orderIdToRefresh).subscribe({
            next: (updatedCleaners) => {
              // Update cache with fresh data from server
              this.assignedCleanersCache.set(orderIdToRefresh, updatedCleaners);
              
              // Force change detection
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error refreshing assigned cleaners after assignment:', error);
              // Fallback: try to update cache manually using stored data
              const newCleanerData = selectedCleanersToAssign.map(cleanerId => {
                const cleaner = this.availableCleaners.find(c => c.id === cleanerId);
                return {
                  id: cleanerId,
                  name: cleaner ? `${cleaner.firstName} ${cleaner.lastName}` : ''
                };
              }).filter(cleaner => cleaner.name !== '');
              
              const existingCleaners = this.assignedCleanersCache.get(orderIdToRefresh) || [];
              const allCleaners = [...existingCleaners];
              newCleanerData.forEach(newCleaner => {
                if (!allCleaners.some(existing => existing.id === newCleaner.id)) {
                  allCleaners.push(newCleaner);
                }
              });
              
              this.assignedCleanersCache.set(orderIdToRefresh, allCleaners);
              this.cdr.detectChanges();
            }
          });
        }, 500); // Wait 500ms for server to process
        
        this.clearMessagesAfterDelay();
      },
      error: (error) => {
        console.error('Error assigning cleaners:', error);
        this.errorMessage = 'Failed to assign cleaners. Please try again.';
      },
      complete: () => {
        this.loadingStates.assigningCleaners = false;
      }
    });
  }

  getCustomerName(orderId: number): string {
    return this.customerNames.get(orderId) || `Customer #${orderId}`;
  }

  getCustomerId(orderId: number): number | string {
    const order = this.orders.find(o => o.id === orderId);
    return order && 'userId' in order ? order.userId : 'N/A';
  }

  getCustomerEmail(orderId: number): string {
    const order = this.orders.find(o => o.id === orderId);
    return order && 'contactEmail' in order ? order.contactEmail : 'N/A';
  }

  // OPTIMIZATION: Getter methods for template (with caching) - REMOVED CONSOLE LOGS TO PREVENT INFINITE LOGGING
  getAssignedCleaners(orderId: number): string[] {
    const cleaners = this.assignedCleanersCache.get(orderId) || [];
    return cleaners.map(c => c.name);
  }

  getAssignedCleanersWithIds(orderId: number): AssignedCleaner[] {
    return this.assignedCleanersCache.get(orderId) || [];
  }

  updateOrderStatus(order: AdminOrderList, newStatus: string) {
    this.adminService.updateOrderStatus(order.id, newStatus).subscribe({
      next: () => {
        order.status = newStatus;
        this.successMessage = `Order #${order.id} status updated to ${newStatus}`;
        this.clearMessagesAfterDelay();
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.errorMessage = 'Failed to update order status.';
      }
    });
  }

  markOrderAsDone(order: AdminOrderList) {
    if (confirm(`Are you sure you want to mark order #${order.id} as done?`)) {
      this.updateOrderStatus(order, 'Done');
    }
  }

  reactivateOrder(order: AdminOrderList) {
    const previousStatus = order.status;
    if (confirm(`Are you sure you want to reactivate order #${order.id} from ${previousStatus} status?`)) {
      this.updateOrderStatus(order, 'Active');
    }
  }

  cancelOrder(order: AdminOrderList) {
    if (confirm(`Are you sure you want to cancel order #${order.id}?`)) {
      if (!this.userPermissions.permissions.canUpdate) {
        this.errorMessage = 'You do not have permission to cancel orders.';
        return;
      }
      
      this.adminService.cancelOrder(order.id, 'Cancelled by admin').subscribe({
        next: () => {
          order.status = 'Cancelled';
          this.successMessage = `Order #${order.id} has been cancelled.`;
          this.clearMessagesAfterDelay();
        },
        error: (error) => {
          console.error('Error cancelling order:', error);
          this.errorMessage = 'Failed to cancel order.';
        }
      });
    }
  }

  // Filtering methods
  get filteredOrders(): AdminOrderList[] {
    let filtered = this.orders;

    // Search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toString().includes(search) ||
        (order.contactEmail && order.contactEmail.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status && order.status.toLowerCase() === this.statusFilter.toLowerCase());
    }

    // Date filter
    if (this.dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        
        switch (this.dateFilter) {
          case 'today':
            return orderDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return orderDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Update pagination
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    
    // Return paginated results
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  // Pagination methods
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Utility methods
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  formatTime(time: string): string {
    return time || 'N/A';
  }

  formatDateTime(date: Date | string, time?: string): string {
    const dateObj = new Date(date);
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(-2);
    const dateStr = `${month}/${day}/${year}`;
    let timeStr = '';
    if (time) {
      const [h, m] = time.split(":");
      const hour = parseInt(h, 10);
      const minute = parseInt(m, 10);
      let period = 'AM';
      let hour12 = hour;
      if (hour === 0) {
        hour12 = 12;
      } else if (hour >= 12) {
        period = 'PM';
        if (hour > 12) hour12 = hour - 12;
      }
      timeStr = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    } else {
      let hours = dateObj.getHours();
      let minutes = dateObj.getMinutes();
      let period = hours >= 12 ? 'PM' : 'AM';
      let hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12;
      timeStr = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return `${dateStr} ${timeStr}`;
  }

  formatDuration(minutes: number): string {
    // Ensure minimum 1 hour (60 minutes)
    const adjustedMinutes = Math.max(minutes, 60);
    const hours = Math.floor(adjustedMinutes / 60);
    let mins = adjustedMinutes % 60;
    if (mins >= 15) {
      mins = 30;
    } else {
      mins = 0;
    }
    if (hours === 0 && mins === 0) {
      return '1h'; // Minimum 1 hour
    } else if (hours === 0) {
      return `${mins} minutes`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)}`;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'done':
        return 'status-done';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.clearMessages();
    }, 5000);
  }

  hasCleanersService(): boolean {
    return this.selectedOrder?.services?.some(s => s.serviceName && s.serviceName.toLowerCase().includes('cleaner')) ?? false;
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 3;

    if (this.totalPages <= 5) {
      for (let i = 2; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, start + maxVisiblePages - 1);

      if (end === this.totalPages - 1) {
        start = Math.max(2, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }
}