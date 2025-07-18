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
  
  // Available entity types - UPDATED to include CleanerAssignment
  entityTypes = [
    { value: 'all', label: 'All Changes' },
    { value: 'User', label: 'Users' },
    { value: 'Order', label: 'Orders' },
    { value: 'CleanerAssignment', label: 'Cleaner Assignments' },
    { value: 'OrderServicesUpdate', label: 'Order Services Updates' },
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
      'CleanerEmail': 'Cleaner Email', // NEW for cleaner assignments
    };
    
    return fieldMap[field] || field;
  }

  processAuditLogs(logs: any[]): any[] {   
    // First, process individual logs
    const processedLogs = logs.map((log, index) => {    
      const processedLog = {
        ...log,
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

    // Group related logs together
    return this.groupRelatedLogs(processedLogs);
  }

  // NEW: Group related audit logs together
  groupRelatedLogs(logs: any[]): any[] {
    const groupedLogs: any[] = [];
    const processedIds = new Set<number>();

    logs.forEach((log, index) => {
      if (processedIds.has(log.id)) {
        return; // Skip if already processed
      }

      // Check if this is an Order update that might have related OrderServicesUpdate
      if (log.entityType === 'Order' && log.action === 'Update') {
        // Look for related OrderServicesUpdate logs with same entityId and timestamp
        const relatedServiceLogs = logs.filter(otherLog => 
          otherLog.id !== log.id &&
          otherLog.entityType === 'OrderServicesUpdate' &&
          otherLog.entityId === log.entityId &&
          Math.abs(new Date(otherLog.createdAt).getTime() - new Date(log.createdAt).getTime()) < 5000 && // Within 5 seconds
          otherLog.changedBy === log.changedBy
        );

        if (relatedServiceLogs.length > 0) {
          // Merge the logs
          const mergedLog = {
            ...log,
            hasServiceChanges: true,
            serviceLogs: relatedServiceLogs,
            // Combine changed fields
            changedFields: [
              ...(log.changedFields || []),
              ...relatedServiceLogs.flatMap(serviceLog => serviceLog.changedFields || [])
            ]
          };

          groupedLogs.push(mergedLog);
          
          // Mark all related logs as processed
          processedIds.add(log.id);
          relatedServiceLogs.forEach(serviceLog => processedIds.add(serviceLog.id));
        } else {
          // No related service logs, add as is
          groupedLogs.push(log);
          processedIds.add(log.id);
        }
      } else if (log.entityType === 'OrderServicesUpdate') {
        // Check if this service log is already handled by an Order log
        const isHandled = logs.some(otherLog => 
          otherLog.entityType === 'Order' &&
          otherLog.entityId === log.entityId &&
          Math.abs(new Date(otherLog.createdAt).getTime() - new Date(log.createdAt).getTime()) < 5000 &&
          otherLog.changedBy === log.changedBy
        );

        if (!isHandled) {
          // This is a standalone service update, add as is
          groupedLogs.push(log);
          processedIds.add(log.id);
        }
      } else {
        // Other entity types, add as is
        groupedLogs.push(log);
        processedIds.add(log.id);
      }
    });

    return groupedLogs;
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
      
      // Check if search starts with # for audit log ID search
      if (search.startsWith('#')) {
        const logIdSearch = search.substring(1); // Remove the # prefix
        filtered = filtered.filter(log => 
          log.id?.toString().includes(logIdSearch)
        );
      } else if (search.startsWith('e')) {
        // Check if search starts with 'e' for entity ID search
        const entityIdSearch = search.substring(1); // Remove the E prefix
        filtered = filtered.filter(log => 
          log.entityId?.toString().includes(entityIdSearch)
        );
      } else {
        // Regular search - check email, log ID, and entity ID
        filtered = filtered.filter(log => 
          log.changedByEmail?.toLowerCase().includes(search) ||
          log.id?.toString().includes(search) ||
          log.entityId?.toString().includes(search)
        );
      }
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
      case 'assigned': return 'action-assigned'; // NEW
      case 'removed': return 'action-removed'; // NEW
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

  // UPDATED: Special handling for CleanerAssignment logs
  showChangedFields(log: AuditLog): boolean {
    // For CleanerAssignment logs, we want to show details differently
    if (log.entityType === 'CleanerAssignment') {
      return true; // Always show details for cleaner assignments
    }
    
    return log.action === 'Update' && 
           !!log.changedFields && 
           Array.isArray(log.changedFields) &&
           log.changedFields.length > 0 &&
           !!log.oldValues &&
           !!log.newValues;
  }

  // NEW: Check if there are any meaningful changed fields to display
  hasMeaningfulChangedFields(log: AuditLog): boolean {
    if (!log.changedFields || !Array.isArray(log.changedFields)) {
      return false;
    }
    
    // Check if there are any fields that should be shown
    return log.changedFields.some(field => this.shouldShowField(field));
  }

  // NEW: Get cleaner assignment details for display
  getCleanerAssignmentDetails(log: AuditLog): { cleanerEmail: string; orderId: number } | null {
    if (log.entityType !== 'CleanerAssignment' || !log.newValues) {
      return null;
    }

    try {
      const details = typeof log.newValues === 'string' ? JSON.parse(log.newValues) : log.newValues;
      return {
        cleanerEmail: details.CleanerEmail || 'Unknown',
        orderId: details.OrderId || log.entityId
      };
    } catch (e) {
      console.error('Failed to parse cleaner assignment details:', e);
      return null;
    }
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
      const roles = ['Customer', 'SuperAdmin', 'Admin', 'Moderator', 'Cleaner']; 
      return roles[value] || value.toString();
    }
  
    // Handle TotalDuration field - format as hours:minutes
    if (fieldName === 'TotalDuration' && typeof value === 'number') {
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      return `${hours}h ${minutes}m`;
    }
    
    // IMPORTANT: Handle TimeDuration and Duration fields BEFORE date handling
    if (fieldName === 'TimeDuration' || fieldName === 'Duration') {
      return `${value} minutes`;
    }
    
    // Special handling for ServiceTime field to show proper time format
    if (fieldName === 'ServiceTime') {
      // Handle TimeSpan format (HH:mm:ss or HH:mm)
      let timeString = value;
      
      // If value is an object (TimeSpan serialized as object), extract the time string
      if (typeof value === 'object' && value !== null) {
        // Handle different possible TimeSpan serialization formats
        timeString = value.Hours !== undefined ? 
          `${String(value.Hours).padStart(2, '0')}:${String(value.Minutes || 0).padStart(2, '0')}` : 
          value.toString();
      }
      
      // Convert to string if needed
      timeString = String(timeString);
      
      // Parse time parts
      const timeParts = timeString.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      }
      return timeString;
    }
    
    // Handle ServiceDate specifically to show only the date part
    if (fieldName === 'ServiceDate') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Format as MM/DD/YYYY without time
          return date.toLocaleDateString();
        }
      } catch {
        // Fall through to return as string
      }
    }
    
    // Handle other dates - this comes AFTER the specific field checks
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

  isServiceUpdateLog(log: any): boolean {
    return log.entityType === 'OrderServicesUpdate';
  }
  
  getServiceUpdateDetails(log: any): any {
    if (!log.oldValues || !log.newValues) return null;
    
    const oldValues = typeof log.oldValues === 'string' ? JSON.parse(log.oldValues) : log.oldValues;
    const newValues = typeof log.newValues === 'string' ? JSON.parse(log.newValues) : log.newValues;
    
    return {
      services: {
        old: oldValues.Services || [],
        new: newValues.Services || []
      },
      extraServices: {
        old: oldValues.ExtraServices || [],
        new: newValues.ExtraServices || []
      }
    };
  }
  
  isServiceInList(service: any, list: any[]): boolean {
    return list.some(s => s.ServiceId === service.ServiceId);
  }
  
  isServiceModified(service: any, oldList: any[]): boolean {
    const oldService = oldList.find(s => s.ServiceId === service.ServiceId);
    return oldService && oldService.Quantity !== service.Quantity;
  }
  
  isExtraServiceInList(service: any, list: any[]): boolean {
    return list.some(s => s.ExtraServiceId === service.ExtraServiceId);
  }
  
  isExtraServiceModified(service: any, oldList: any[]): boolean {
    const oldService = oldList.find(s => s.ExtraServiceId === service.ExtraServiceId);
    return oldService && (oldService.Quantity !== service.Quantity || oldService.Hours !== service.Hours);
  }

  shouldShowField(fieldName: string): boolean {
    if (fieldName === 'Services' || fieldName === 'ExtraServices') {
      return false;
    }
    
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
      'UpdatedAt', // Hide UpdatedAt since it's already in Date column
      'Id' 
    ];
    
    return !hiddenFields.includes(fieldName);
  }

  getEntityTypeDisplayName(entityType: string): string {
    const typeMap: { [key: string]: string } = {
      'User': 'User ID',
      'Order': 'Order',
      'CleanerAssignment': 'Order',
      'OrderServicesUpdate': 'Order Services Update', 
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

  // NEW: Helper method to display service quantity with special handling for bedrooms
  getServiceQuantityDisplay(service: any): string {
    if (service.ServiceName === 'Bedrooms' && service.Quantity === 0) {
      return 'Studio';
    }
    return service.Quantity.toString();
  }

  // NEW: Helper method to display extra service details properly
  getExtraServiceDisplay(service: any): string {
    const parts: string[] = [];
    
    // Only show quantity if it's greater than 0 and the service doesn't primarily use hours
    if (service.Quantity > 0 && (!service.Hours || service.Hours === 0)) {
      parts.push(`Qty ${service.Quantity}`);
    }
    
    // Show hours if present and greater than 0
    if (service.Hours && service.Hours > 0) {
      parts.push(`${service.Hours}h`);
    }
    
    return parts.join(' ');
  }

  // NEW: Helper method to check if extra service should show quantity
  shouldShowExtraServiceQuantity(service: any): boolean {
    return service.Quantity > 0 && (!service.Hours || service.Hours === 0);
  }

  // NEW: Helper method to check if extra service should show hours
  shouldShowExtraServiceHours(service: any): boolean {
    return service.Hours && service.Hours > 0;
  }

  // UPDATED: Get all extra services including removed ones for display, but filter out unchanged ones
  getAllExtraServices(oldServices: any[], newServices: any[]): any[] {
    const changedServices: any[] = [];
    
    // Add new services that are added, modified, or reduced
    newServices.forEach(newService => {
      const oldService = oldServices.find(s => s.ExtraServiceId === newService.ExtraServiceId);
      
      // Check if it's added, modified, or reduced
      if (!oldService || 
          this.isExtraServiceModified(newService, oldServices) || 
          this.isExtraServiceReduced(newService, oldServices)) {
        changedServices.push(newService);
      }
    });
    
    // Add removed services
    oldServices.forEach(oldService => {
      const exists = newServices.some(newService => 
        newService.ExtraServiceId === oldService.ExtraServiceId
      );
      if (!exists) {
        changedServices.push({
          ...oldService,
          isRemoved: true
        });
      }
    });
    
    return changedServices;
  }

  // NEW: Get all regular services including removed ones for display, but filter out unchanged ones
  getAllServices(oldServices: any[], newServices: any[]): any[] {
    const changedServices: any[] = [];
    
    // Add new services that are added or modified
    newServices.forEach(newService => {
      const oldService = oldServices.find(s => s.ServiceId === newService.ServiceId);
      
      // Check if it's added or modified
      if (!oldService || this.isServiceModified(newService, oldServices)) {
        changedServices.push(newService);
      }
    });
    
    // Add removed services
    oldServices.forEach(oldService => {
      const exists = newServices.some(newService => 
        newService.ServiceId === oldService.ServiceId
      );
      if (!exists) {
        changedServices.push({
          ...oldService,
          isRemoved: true
        });
      }
    });
    
    return changedServices;
  }

  // NEW: Check if extra service was removed
  isExtraServiceRemoved(service: any): boolean {
    return service.isRemoved === true;
  }

  // NEW: Check if extra service was reduced in quantity
  isExtraServiceReduced(service: any, oldList: any[]): boolean {
    const oldService = oldList.find(s => s.ExtraServiceId === service.ExtraServiceId);
    if (!oldService) return false;
    
    // Check if quantity was reduced
    if (service.Quantity !== undefined && oldService.Quantity !== undefined) {
      return service.Quantity < oldService.Quantity;
    }
    
    // Check if hours were reduced
    if (service.Hours !== undefined && oldService.Hours !== undefined) {
      return service.Hours < oldService.Hours;
    }
    
    return false;
  }

  // NEW: Check if regular service was removed
  isServiceRemoved(service: any): boolean {
    return service.isRemoved === true;
  }

  // NEW: Get old service data for comparison
  getOldService(service: any, oldServices: any[]): any {
    return oldServices.find(s => s.ServiceId === service.ServiceId) || service;
  }

  // NEW: Get old extra service data for comparison
  getOldExtraService(service: any, oldServices: any[]): any {
    return oldServices.find(s => s.ExtraServiceId === service.ExtraServiceId) || service;
  }

  // NEW: Get changed services for "Before" section (services that were modified or removed)
  getChangedServices(oldServices: any[], newServices: any[]): any[] {
    const changedServices: any[] = [];
    
    oldServices.forEach(oldService => {
      const newService = newServices.find(s => s.ServiceId === oldService.ServiceId);
      
      // Include if it was removed or modified
      if (!newService || this.isServiceModified(newService, oldServices)) {
        changedServices.push(oldService);
      }
    });
    
    return changedServices;
  }

  // NEW: Get changed extra services for "Before" section (services that were modified or removed)
  getChangedExtraServices(oldServices: any[], newServices: any[]): any[] {
    const changedServices: any[] = [];
    
    oldServices.forEach(oldService => {
      const newService = newServices.find(s => s.ExtraServiceId === oldService.ExtraServiceId);
      
      // Include if it was removed, modified, or reduced
      if (!newService || 
          this.isExtraServiceModified(newService, oldServices) || 
          this.isExtraServiceReduced(newService, oldServices)) {
        changedServices.push(oldService);
      }
    });
    
    return changedServices;
  }
}