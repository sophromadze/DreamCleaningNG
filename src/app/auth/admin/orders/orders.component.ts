import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserPermissions } from '../../../services/admin.service';
import { OrderService, Order, OrderList } from '../../../services/order.service';

// Extended interface for admin orders with additional properties
export interface AdminOrderList extends OrderList {
  userId: number;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
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
  
  // Store customer names
  customerNames: Map<number, string> = new Map();
  // Store customer details
  customerDetails: Map<number, {id: number, email: string}> = new Map();
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  constructor(
    private adminService: AdminService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.loadUserPermissions();
    // Wait for permissions to load before loading orders
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (response) => {
        this.userRole = response.role;
        this.userPermissions = response;
        // Load orders after permissions are loaded
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.errorMessage = 'Failed to load permissions. Please try again.';
      }
    });
  }

  loadOrders() {
    // Use AdminService to get all orders for admin users
    if (this.userRole && this.userRole !== 'Customer') {
      // For admin roles, get ALL orders
      this.adminService.getAllOrders().subscribe({
        next: (orders) => {
          this.orders = orders as AdminOrderList[];
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.errorMessage = 'Failed to load orders. Please try again.';
        }
      });
    } else {
      // For customers, get only their orders
      this.orderService.getUserOrders().subscribe({
        next: (orders) => {
          this.orders = orders as AdminOrderList[];
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.errorMessage = 'Failed to load orders. Please try again.';
        }
      });
    }
  }

  viewOrderDetails(orderId: number) {
    if (this.viewingOrderId === orderId) {
      this.viewingOrderId = null;
      this.selectedOrder = null;
      return;
    }
    
    this.viewingOrderId = orderId;
    
    // Use admin endpoint for admin users, regular endpoint for customers
    if (this.userRole && this.userRole !== 'Customer') {
      // Admin users - use admin endpoint
      this.adminService.getOrderDetails(orderId).subscribe({
        next: (order) => {
          this.selectedOrder = order;
          // Store customer name for display in the list
          this.customerNames.set(orderId, `${order.contactFirstName} ${order.contactLastName}`);
          // Store customer details
          this.customerDetails.set(orderId, {
            id: order.userId,
            email: order.contactEmail
          });
        },
        error: (error) => {
          console.error('Error loading order details:', error);
          this.errorMessage = 'Failed to load order details.';
        }
      });
    } else {
      // Regular customers - use their own endpoint
      this.orderService.getOrderById(orderId).subscribe({
        next: (order) => {
          this.selectedOrder = order;
        },
        error: (error) => {
          console.error('Error loading order details:', error);
          this.errorMessage = 'Failed to load order details.';
        }
      });
    }
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

  updateOrderStatus(order: AdminOrderList, newStatus: string) {
    this.adminService.updateOrderStatus(order.id, newStatus).subscribe({
      next: () => {
        order.status = newStatus;
        this.successMessage = `Order #${order.id} status updated to ${newStatus}`;
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
      // Check if user has permission to cancel (Update permission)
      if (!this.userPermissions.permissions.canUpdate) {
        this.errorMessage = 'You do not have permission to cancel orders.';
        return;
      }
      
      this.adminService.cancelOrder(order.id, 'Cancelled by admin').subscribe({
        next: () => {
          order.status = 'Cancelled';  // Use capital C to match backend enum
          this.successMessage = `Order #${order.id} has been cancelled.`;
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
    // Format date as MM/DD/YY (two-digit year)
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(-2); // last two digits
    const dateStr = `${month}/${day}/${year}`;
    let timeStr = '';
    if (time) {
      // If time is provided as a string (e.g., '14:30:00'), format it to 12-hour with AM/PM
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
      // Use the date object's time, but format to 12-hour with AM/PM and no seconds
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
    const hours = Math.floor(minutes / 60);
    let mins = minutes % 60;
    // Rounding logic: if mins >= 15, round to 30; if less, round to 0
    if (mins >= 15) {
      mins = 30;
    } else {
      mins = 0;
    }
    if (hours === 0 && mins === 0) {
      return '0 minutes';
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

  hasCleanersService(): boolean {
    return this.selectedOrder?.services?.some(s => s.serviceName && s.serviceName.toLowerCase().includes('cleaner')) ?? false;
  }
}