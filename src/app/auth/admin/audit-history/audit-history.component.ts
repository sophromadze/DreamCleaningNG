import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AuditLog, UserPermissions } from '../../../services/admin.service';


@Component({
  selector: 'app-audit-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-history.component.html',
  styleUrls: ['./audit-history.component.scss']
})
export class AuditHistoryComponent implements OnInit {
  auditLogs: AuditLog[] = [];
  isLoading = false;
  errorMessage = '';
  
  // Filters
  selectedEntityType = 'all';
  selectedDays = 7;
  searchTerm = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  
  // Expanded row state
  viewingLogId: number | null = null;
  
  // User permissions
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
  
  // Available entity types
  entityTypes = [
    { value: 'all', label: 'All Changes' },
    { value: 'User', label: 'Users' },
    { value: 'Order', label: 'Orders' },
    { value: 'ServiceType', label: 'Service Types' },
    { value: 'Service', label: 'Services' },
    { value: 'ExtraService', label: 'Extra Services' },
    { value: 'Subscription', label: 'Subscriptions' },
    { value: 'PromoCode', label: 'Promo Codes' },
    { value: 'GiftCard', label: 'Gift Cards' }
  ];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUserPermissions();
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (response) => {
        this.userRole = response.role;
        this.userPermissions = response;
        // Load logs after permissions are loaded
        this.loadRecentLogs();
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.errorMessage = 'Failed to load permissions. Please try again.';
      }
    });
  }

  loadRecentLogs() {
    this.isLoading = true;
    this.adminService.getRecentAuditLogs(this.selectedDays).subscribe({
      next: (logs) => {
        this.auditLogs = this.processAuditLogs(logs);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load audit logs';
        this.isLoading = false;
      }
    });
  }

  getFieldDisplayName(field: string): string {
    const fieldMap: { [key: string]: string } = {
      'PasswordHash': 'Password',
      'PasswordSalt': 'Password Salt',
      'RefreshToken': 'Session Token',
      'RefreshTokenExpiryTime': 'Session Expiry',
      'CreatedAt': 'Created Date',
      'UpdatedAt': 'Updated',
      'IsActive': 'Active Status',
      'FirstName': 'First Name',
      'LastName': 'Last Name',
      'Email': 'Email',
      'Phone': 'Phone',
      'Role': 'Role',
      'FirstTimeOrder': 'First Time Customer',
      'SubscriptionId': 'Subscription',
      'CurrentBalance': 'Balance',
      'OriginalAmount': 'Original Amount',
      'IsPaid': 'Payment Status',
      'CancellationReason': 'Cancellation Reason',
    };
    
    return fieldMap[field] || field;
  }

  processAuditLogs(logs: any[]): any[] {   
    return logs.map((log, index) => {    
      // Create a new log object with proper property names
      const processedLog = {
        ...log,
        // Map PascalCase to camelCase
        oldValues: log.oldValues || log.OldValues,
        newValues: log.newValues || log.NewValues,
        changedFields: log.changedFields || log.ChangedFields,
        changedBy: log.changedBy || log.ChangedBy,
        changedByEmail: log.changedByEmail || log.ChangedByEmail
      };
      
      // Parse oldValues if it's a string
      if (typeof processedLog.oldValues === 'string' && processedLog.oldValues) {
        try {
          processedLog.oldValues = JSON.parse(processedLog.oldValues);
        } catch (e) {
          console.error('Failed to parse oldValues:', e);
          processedLog.oldValues = {};
        }
      } else if (!processedLog.oldValues) {
        processedLog.oldValues = {};
      }
      
      // Parse newValues if it's a string
      if (typeof processedLog.newValues === 'string' && processedLog.newValues) {
        try {
          processedLog.newValues = JSON.parse(processedLog.newValues);
        } catch (e) {
          console.error('Failed to parse newValues:', e);
          processedLog.newValues = {};
        }
      } else if (!processedLog.newValues) {
        processedLog.newValues = {};
      }
      
      // Parse changedFields if it's a string
      if (typeof processedLog.changedFields === 'string' && processedLog.changedFields) {
        try {
          processedLog.changedFields = JSON.parse(processedLog.changedFields);
        } catch (e) {
          console.error('Failed to parse changedFields:', e);
          processedLog.changedFields = [];
        }
      } else if (!processedLog.changedFields) {
        processedLog.changedFields = [];
      }
  
      return processedLog;
    });
  }

  get filteredLogs(): any[] {
    let filtered = this.auditLogs;
  
    // Filter by entity type
    if (this.selectedEntityType !== 'all') {
      filtered = filtered.filter(log => log.entityType === this.selectedEntityType);
    }
  
    // Filter by search term
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.changedBy?.toLowerCase().includes(search) ||
        log.changedByEmail?.toLowerCase().includes(search) ||
        log.entityId?.toString().includes(search)
      );
    }

    // Update pagination
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    
    // Return paginated results
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  formatDate(date: any): string {
    return new Date(date).toLocaleString();
  }

  getActionClass(action: string): string {
    switch (action.toLowerCase()) {
      case 'create': return 'action-create';
      case 'update': return 'action-update';
      case 'delete': return 'action-delete';
      default: return '';
    }
  }

  getFieldValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return new Date(value).toLocaleString();
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return value.toString();
  }

  showChangedFields(log: AuditLog): boolean {
    return log.action === 'Update' && 
           !!log.changedFields && 
           Array.isArray(log.changedFields) &&
           log.changedFields.length > 0 &&
           !!log.oldValues &&
           !!log.newValues;
  }

  getFieldDisplayValue(value: any, fieldName?: string): string {   
    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'None';
    }
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Handle Role enum (0 = Customer, 1 = Moderator, 2 = Admin, 3 = SuperAdmin)
    if (fieldName === 'Role' && typeof value === 'number') {
      const roles = ['Customer', 'SuperAdmin', 'Admin', 'Moderator'];
      return roles[value] || value.toString();
    }
    
    // Handle dates
    if (fieldName && (fieldName.includes('Date') || fieldName.includes('Time') || fieldName === 'CreatedAt' || fieldName === 'UpdatedAt')) {
      if (value === '0001-01-01T00:00:00Z' || value === '0001-01-01T00:00:00') {
        return 'Not set';
      }
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString();
        }
      } catch {
        // Fall through to return as string
      }
    }
    
    // Handle password/token fields
    if (fieldName && (fieldName.includes('Password') || fieldName.includes('Token') || fieldName === 'PasswordSalt')) {
      return '(hidden)';
    }
    
    // Handle gift card code masking for non-super admins
    if (fieldName === 'Code' && this.userRole !== 'SuperAdmin') {
      return '*'.repeat(value.length);
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return value.toString();
    }
    
    // Handle long strings
    if (typeof value === 'string') {
      if (value.length > 50) {
        return value.substring(0, 47) + '...';
      }
      return value;
    }
    
    // Default: try to convert to string
    return String(value);
  }

  shouldShowField(fieldName: string): boolean {
    // Hide these fields from display
    const hiddenFields = [
      'PasswordHash',
      'PasswordSalt',
      'RefreshToken',
      'RefreshTokenExpiryTime',
      'ExternalAuthId',
      'Apartments',
      'Orders',
      'Subscription',
      'CreatedAt',
      'Id' 
    ];
    
    return !hiddenFields.includes(fieldName);
  }

  getEntityTypeDisplayName(entityType: string): string {
    const typeMap: { [key: string]: string } = {
      'User': 'User ID',
      'Order': 'Order',
      'GiftCard': 'Gift Card',
      'GiftCardUsage': 'Gift Card Usage',
      'ServiceType': 'Service Type',
      'Service': 'Service',
      'ExtraService': 'Extra Service',
      'Subscription': 'Subscription',
      'PromoCode': 'Promo Code',
      'Apartment': 'Address'
    };
    
    return typeMap[entityType] || entityType;
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  debugLog(log: any): string {
    return JSON.stringify({
      action: log.action,
      changedFields: log.changedFields,
      oldValuesKeys: log.oldValues ? Object.keys(log.oldValues) : [],
      newValuesKeys: log.newValues ? Object.keys(log.newValues) : []
    }, null, 2);
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

  clearMessages() {
    this.errorMessage = '';
  }

  viewLogDetails(logId: number) {
    if (this.viewingLogId === logId) {
      this.viewingLogId = null;
    } else {
      this.viewingLogId = logId;
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