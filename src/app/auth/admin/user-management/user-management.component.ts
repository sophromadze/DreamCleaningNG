import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserAdmin, UserPermissions } from '../../../services/admin.service';

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

  constructor(private adminService: AdminService) {}

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

  // Add this method to show online status
  getUserOnlineStatus(userId: number): void {
    this.adminService.getUserOnlineStatus(userId).subscribe({
      next: (response) => {
        console.log(`User ${userId} online status:`, response.isOnline);
        // You can update the UI to show online/offline status
      },
      error: (error) => {
        console.error('Failed to get user online status:', error);
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

  canModifyUserStatus(user: any): boolean {
    // Admins cannot modify SuperAdmin status
    if (this.currentUserRole === 'Admin' && user.role === 'SuperAdmin') {
      return false;
    }
    return true;
  }

  canBanUser(user: any): boolean {
    // Don't allow banning yourself
    const currentUserId = this.getCurrentUserId(); // You'll need to implement this
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
} 