import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserAdmin, UserPermissions, DetailedUser } from '../../../services/admin.service';
import { OrderService, OrderList } from '../../../services/order.service';
import { Apartment } from '../../../services/profile.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: UserAdmin[] = [];
  userRole: string = '';
  currentUserRole: string = '';
  roleDropdownUserId: number | null = null;
  userPermissions: UserPermissions | null = null;
  canCreate = false;
  canUpdate = false;
  canDelete = false;
  canActivate = false;
  canDeactivate = false;
  searchTerm: string = '';
  statusFilter: string = 'all';
  roleFilter: string = 'all';
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  errorMessage = '';
  successMessage = '';

  // NEW: User details functionality
  selectedUser: DetailedUser | null = null;
  viewingUserId: number | null = null;
  loadingUserDetails = false;

  constructor(
    private adminService: AdminService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.loadUserPermissions();
    this.loadUsers();
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (permissions) => {
        this.userPermissions = permissions;
        this.userRole = permissions.role;
        this.currentUserRole = permissions.role;
        
        this.canCreate = permissions.permissions.canCreate;
        this.canUpdate = permissions.permissions.canUpdate;
        this.canDelete = permissions.permissions.canDelete;
        this.canActivate = permissions.permissions.canActivate;
        this.canDeactivate = permissions.permissions.canDeactivate;
      },
      error: (error) => {
        console.error('Failed to load permissions', error);
        this.userRole = '';
        this.canCreate = false;
        this.canUpdate = false;
        this.canDelete = false;
        this.canActivate = false;
        this.canDeactivate = false;
      }
    });
  }

  loadUsers() {
    this.adminService.getUsers().subscribe({
      next: (response) => {
        this.users = Array.isArray(response) ? response : response.users;
      },
      error: (error) => {
        console.error('Failed to load users', error);
      }
    });
  }

  // NEW: View user details functionality
  viewUserDetails(userId: number) {
    // Toggle behavior: if clicking the same user, close the details
    if (this.viewingUserId === userId) {
      this.viewingUserId = null;
      this.selectedUser = null;
      return;
    }
    
    this.viewingUserId = userId;
    this.loadingUserDetails = true;
    this.selectedUser = null;
    
    // Find the basic user info from the current users list
    const basicUser = this.users.find(u => u.id === userId);
    if (!basicUser) {
      this.errorMessage = 'User not found';
      this.loadingUserDetails = false;
      return;
    }

    // Create detailed user object starting with basic info
    this.selectedUser = { ...basicUser };
    
    // Load additional user details concurrently
    this.loadUserOrders(userId);
    this.loadUserApartments(userId);
  }

  private loadUserOrders(userId: number) {
    this.adminService.getUserOrders(userId).subscribe({
      next: (orders: OrderList[]) => {
        if (this.selectedUser) {
          this.selectedUser.orders = orders;
          this.selectedUser.totalOrders = orders.length;
          this.selectedUser.totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
          this.selectedUser.registrationDate = new Date(this.selectedUser.createdAt);
          
          // Find the most recent order date
          if (orders.length > 0) {
            const sortedOrders = orders.sort((a, b) => 
              new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
            );
            this.selectedUser.lastOrderDate = new Date(sortedOrders[0].orderDate);
          }
        }
        this.loadingUserDetails = false;
      },
      error: (error) => {
        console.error('Failed to load user orders', error);
        if (this.selectedUser) {
          this.selectedUser.orders = [];
          this.selectedUser.totalOrders = 0;
          this.selectedUser.totalSpent = 0;
        }
        this.loadingUserDetails = false;
      }
    });
  }

  private loadUserApartments(userId: number) {
    this.adminService.getUserApartments(userId).subscribe({
      next: (apartments: Apartment[]) => {
        if (this.selectedUser) {
          this.selectedUser.apartments = apartments;
        }
      },
      error: (error) => {
        console.error('Failed to load user apartments', error);
        if (this.selectedUser) {
          this.selectedUser.apartments = [];
        }
      }
    });
  }

  // ORIGINAL: Your existing methods preserved exactly as they were
  toggleRoleDropdown(userId: number) {
    this.roleDropdownUserId = this.roleDropdownUserId === userId ? null : userId;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.role-dropdown')) {
      this.roleDropdownUserId = null;
    }
  }

  canChangeUserRole(user: UserAdmin, newRole: string): boolean {
    // Don't allow changing your own role
    const currentUserId = this.getCurrentUserId();
    if (user.id === currentUserId) {
      return false;
    }
  
    // Existing logic
    if (this.currentUserRole === 'SuperAdmin') return true;
    if (this.currentUserRole === 'Admin' && user.role !== 'SuperAdmin') return true;
    return false;
  }

  canModifyUserRole(user: any): boolean {
    const currentUserId = this.getCurrentUserId();
    if (user.id === currentUserId) {
      return false; // Can't modify your own role
    }
    
    // Admins cannot modify SuperAdmin roles
    if (this.currentUserRole === 'Admin' && user.role === 'SuperAdmin') {
      return false;
    }
    
    return this.canUpdate;
  }

  getRoleButtonTooltip(user: any): string {
    const currentUserId = this.getCurrentUserId();
    if (user.id === currentUserId) {
      return "You cannot change your own role";
    }
    if (this.currentUserRole === 'Admin' && user.role === 'SuperAdmin') {
      return "Admins cannot modify SuperAdmin roles";
    }
    return "";
  }

  updateUserRole(user: UserAdmin, newRole: string) {
    if (!this.canChangeUserRole(user, newRole)) {
      return;
    }

    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';

    // Show loading state (optional)
    const originalRole = user.role;
    user.role = newRole; // Optimistic update

    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        this.roleDropdownUserId = null;
        this.successMessage = `User ${user.firstName} ${user.lastName}'s role has been updated to ${newRole}. The user has been notified and their interface will update automatically.`;
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        // Revert optimistic update
        user.role = originalRole;
        
        // Show user-friendly error message
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Failed to update user role. Please try again.';
        }
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  updateUserStatus(user: UserAdmin, isActive: boolean) {
    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';

    // Show loading state (optional)
    const originalStatus = user.isActive;
    user.isActive = isActive; // Optimistic update

    this.adminService.updateUserStatus(user.id, isActive).subscribe({
      next: () => {
        const action = isActive ? 'unblocked' : 'blocked';
        this.successMessage = `User ${user.firstName} ${user.lastName} has been ${action} successfully.`;
        
        // If blocking, show additional info about real-time notification
        if (!isActive) {
          this.successMessage += ' The user has been notified and will be logged out automatically.';
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        // Revert optimistic update
        user.isActive = originalStatus;
        
        // Show user-friendly error message
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Failed to update user status. Please try again.';
        }
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  canModifyUserStatus(user: any): boolean {
    // Admins cannot modify SuperAdmin status
    if (this.currentUserRole === 'Admin' && user.role === 'SuperAdmin') {
      return false;
    }
    return true;
  }

  canBanUser(user: any): boolean {
    // Don't allow banning yourself
    const currentUserId = this.getCurrentUserId();
    if (user.id === currentUserId) {
      return false;
    }
    
    return this.canDeactivate && user.isActive && this.canModifyUserStatus(user);
  }
  
  canUnbanUser(user: any): boolean {
    // Don't allow unbanning yourself (though this might be allowed)
    return this.canActivate && !user.isActive && this.canModifyUserStatus(user);
  }

  private getCurrentUserId(): number {
    // You might get this from your auth service or JWT token
    // This is just an example - implement based on your auth system
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return parseInt(payload.UserId || payload.sub);
      } catch (e) {
        return 0;
      }
    }
    return 0;
  }

  // Add this method to show online status
  getUserOnlineStatus(userId: number): void {
    this.adminService.getUserOnlineStatus(userId).subscribe({
      next: (response) => {
        // You can update the UI to show online/offline status
      },
      error: (error) => {
        console.error('Failed to get user online status:', error);
      }
    });
  }

  get filteredUsers(): UserAdmin[] {
    let filtered = this.users;
    // Search filter (by id or email)
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.id.toString().includes(search) ||
        (user.email && user.email.toLowerCase().includes(search))
      );
    }
    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(user =>
        (this.statusFilter === 'active' && user.isActive) ||
        (this.statusFilter === 'inactive' && !user.isActive)
      );
    }
    // Role filter
    if (this.roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role && user.role.toLowerCase() === this.roleFilter.toLowerCase());
    }
    // Pagination
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

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

  // NEW: Helper methods for user details
  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'status-active';
      case 'done': return 'status-done';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 3; // Number of pages to show in the middle

    if (this.totalPages <= 5) {
      // If total pages is 5 or less, show all pages
      for (let i = 2; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate the range of pages to show
      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, start + maxVisiblePages - 1);

      // Adjust start if we're near the end
      if (end === this.totalPages - 1) {
        start = Math.max(2, end - maxVisiblePages + 1);
      }

      // Add pages to the array
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }
}