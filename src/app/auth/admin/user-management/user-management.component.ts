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
    if (this.currentUserRole === 'SuperAdmin') return true;
    if (this.currentUserRole === 'Admin' && user.role !== 'SuperAdmin') return true;
    return false;
  }

  updateUserRole(user: UserAdmin, newRole: string) {
    if (!this.canChangeUserRole(user, newRole)) {
      return;
    }

    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        user.role = newRole;
        this.roleDropdownUserId = null;
      },
      error: (error) => {
        console.error('Failed to update user role', error);
      }
    });
  }

  updateUserStatus(user: UserAdmin, isActive: boolean) {
    this.adminService.updateUserStatus(user.id, isActive).subscribe({
      next: () => {
        user.isActive = isActive;
      },
      error: (error) => {
        console.error('Failed to update user status', error);
      }
    });
  }
} 