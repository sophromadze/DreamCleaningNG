import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, PromoCode, CreatePromoCode, UpdatePromoCode, UserAdmin, CreateService, CreateExtraService, CreateSubscription, UserPermissions } from '../../services/admin.service';
import { ServiceType, Service, ExtraService, Subscription } from '../../services/booking.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  activeTab: 'services' | 'users' = 'services';

  
  
  // Service Types
  serviceTypes: ServiceType[] = [];
  allServices: Service[] = [];
  allExtraServices: ExtraService[] = [];
  selectedServiceType: ServiceType | null = null;
  isEditingServiceType = false;
  isAddingServiceType = false;
  newServiceType = {
    name: '',
    basePrice: 0,
    description: '',
    displayOrder: 1
  };
  
  // Services
  isAddingService = false;
  editingServiceId: number | null = null;
  newService: CreateService = {
    name: '',
    serviceKey: '',
    cost: 0,
    timeDuration: 0,
    serviceTypeId: 0,
    inputType: 'dropdown',
    minValue: 0,
    maxValue: 10,
    stepValue: 1,
    isRangeInput: false,
    unit: '',
    serviceRelationType: '',
    displayOrder: 1
  };
  selectedExistingServiceId: number | null = null;
  showExistingServices = false;
  
  // Extra Services  
  isAddingExtraService = false;
  editingExtraServiceId: number | null = null;
  newExtraService: CreateExtraService = {
    name: '',
    description: '',
    price: 0,
    duration: 0,
    icon: '',
    hasQuantity: false,
    hasHours: false,
    isDeepCleaning: false,
    isSuperDeepCleaning: false,
    isSameDayService: false,
    priceMultiplier: 1.0,
    serviceTypeId: undefined,
    isAvailableForAll: true,
    displayOrder: 1
  };
  selectedExistingExtraServiceId: number | null = null;
  showExistingExtraServices = false;
  
  // subscriptions
  subscriptions: Subscription[] = [];
  isAddingSubscription = false;
  editingSubscriptionId: number | null = null;
  newSubscription: CreateSubscription = {
    name: '',
    description: '',
    discountPercentage: 0,
    subscriptionDays: 0,
    displayOrder: 1
  };
  
  // Promo Codes
  promoCodes: PromoCode[] = [];
  isAddingPromoCode = false;
  editingPromoCodeId: number | null = null;
  
  newPromoCode: CreatePromoCode = {
    code: '',
    description: '',
    isPercentage: true,
    discountValue: 0,
    maxUsageCount: undefined,
    maxUsagePerUser: undefined,
    validFrom: undefined,
    validTo: undefined,
    minimumOrderAmount: undefined
  };
  
  // Users
  users: UserAdmin[] = [];

  currentUserRole: string = '';

  userRole: string = '';  
  userPermissions: any = { 
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canActivate: false,
    canDeactivate: false
  };

  // Permissions
  permissions: UserPermissions | null = null;
  canCreate = false;
  canUpdate = false;
  canDelete = false;
  canActivate = false;
  canDeactivate = false;

  // Role dropdown management
  roleDropdownUserId: number | null = null;
  
  // UI State
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUserPermissions();
    this.loadServiceTypes();
    this.loadAllServices();
    this.loadAllExtraServices();
    this.loadSubscriptions();
    this.loadPromoCodes();
    this.loadUsers();
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (permissions) => {
        this.permissions = permissions;
        
        this.userRole = permissions.role;  
        this.userPermissions = permissions.permissions;  
        
        this.canCreate = permissions.permissions.canCreate;
        this.canUpdate = permissions.permissions.canUpdate;
        this.canDelete = permissions.permissions.canDelete;
        this.canActivate = permissions.permissions.canActivate;
        this.canDeactivate = permissions.permissions.canDeactivate;
        
        // ADD THESE DEBUG LOGS (optional, for testing):
        console.log('User role:', this.userRole);
        console.log('User permissions:', this.userPermissions);
      },
      error: (error) => {
        console.error('Failed to load permissions', error);
        
        // ADD THIS LINE:
        this.userRole = '';  // Reset userRole on error
        
        // Keep your existing code:
        this.canCreate = false;
        this.canUpdate = false;
        this.canDelete = false;
        this.canActivate = false;
        this.canDeactivate = false;
      }
    });
  }

  switchTab(tab: 'services' | 'users') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Service Types Methods
  loadServiceTypes() {
    this.adminService.getServiceTypes().subscribe({
      next: (types) => {
        // Sort service types by ID
        this.serviceTypes = types.sort((a, b) => a.id - b.id);
        
        // Sort services and extra services by ID within each service type
        this.serviceTypes.forEach(type => {
          type.services = type.services.sort((a, b) => a.id - b.id);
          type.extraServices = type.extraServices.sort((a, b) => a.id - b.id);
        });
        
        // If a service type is currently selected, update it with the fresh data
        if (this.selectedServiceType) {
          const updatedServiceType = this.serviceTypes.find(st => st.id === this.selectedServiceType!.id);
          if (updatedServiceType) {
            this.selectedServiceType = updatedServiceType;
          }
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load service types';
      }
    });
  }

  loadAllServices() {
    this.adminService.getServices().subscribe({
      next: (services) => {
        this.allServices = services;
      },
      error: (error) => {
        console.error('Failed to load all services', error);
      }
    });
  }

  loadAllExtraServices() {
    this.adminService.getExtraServices().subscribe({
      next: (extraServices) => {
        this.allExtraServices = extraServices;
      },
      error: (error) => {
        console.error('Failed to load all extra services', error);
      }
    });
  }

  getServiceTypeNameById(serviceTypeId: number): string {
    const serviceType = this.serviceTypes.find(st => st.id === serviceTypeId);
    return serviceType ? `${serviceType.name} (#${serviceType.id})` : `Unknown (#${serviceTypeId})`;
  }

  selectServiceType(type: ServiceType) {
    this.selectedServiceType = type;
    this.isEditingServiceType = false;
    this.isAddingService = false;
    this.isAddingExtraService = false;
  }

  startAddingServiceType() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create service types';
      return;
    }
    this.isAddingServiceType = true;
    this.newServiceType = {
      name: '',
      basePrice: 0,
      description: '',
      displayOrder: this.serviceTypes.length + 1
    };
  }

  cancelAddServiceType() {
    this.isAddingServiceType = false;
  }

  addServiceType() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create service types';
      return;
    }
    this.adminService.createServiceType(this.newServiceType).subscribe({
      next: () => {
        this.successMessage = 'Service type created successfully';
        this.isAddingServiceType = false;
        this.loadServiceTypes();
      },
      error: () => {
        this.errorMessage = 'Failed to create service type';
      }
    });
  }

  editServiceType() {
    if (!this.canUpdate) {
      this.errorMessage = 'You do not have permission to edit service types';
      return;
    }
    this.isEditingServiceType = true;
  }

  cancelEditServiceType() {
    if (!this.canUpdate) {
      this.errorMessage = 'You do not have permission to edit service types';
      return;
    }
    this.isEditingServiceType = false;
    this.loadServiceTypes();
  }

  saveServiceType() {
    if (!this.selectedServiceType) return;
    
    this.adminService.updateServiceType(this.selectedServiceType.id, {
      name: this.selectedServiceType.name,
      basePrice: this.selectedServiceType.basePrice,
      description: this.selectedServiceType.description,
      displayOrder: 1
    }).subscribe({
      next: () => {
        this.successMessage = 'Service type updated successfully';
        this.isEditingServiceType = false;
        this.loadServiceTypes();
      },
      error: () => {
        this.errorMessage = 'Failed to update service type';
      }
    });
  }

  deleteServiceType(type: ServiceType) {
    if (!this.canDelete) {
      this.errorMessage = 'You do not have permission to delete service types';
      return;
    }
    if (confirm(`Are you sure you want to permanently delete "${type.name}"? This cannot be undone.`)) {
      this.adminService.deleteServiceType(type.id).subscribe({
        next: () => {
          this.successMessage = 'Service type deleted successfully';
          if (this.selectedServiceType?.id === type.id) {
            this.selectedServiceType = null;
          }
          this.loadServiceTypes();
        },
        error: (error) => {
          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Failed to delete service type';
          }
        }
      });
    }
  }

  deactivateServiceType(type: ServiceType) {
    if (!this.canDeactivate) {
      this.errorMessage = 'You do not have permission to deactivate service types';
      return;
    }
    this.adminService.deactivateServiceType(type.id).subscribe({
      next: () => {
        this.successMessage = 'Service type deactivated successfully';
        this.loadServiceTypes();
      },
      error: () => {
        this.errorMessage = 'Failed to deactivate service type';
      }
    });
  }

  activateServiceType(type: ServiceType) {
    if (!this.canActivate) {
      this.errorMessage = 'You do not have permission to activate service types';
      return;
    }
    this.adminService.activateServiceType(type.id).subscribe({
      next: () => {
        this.successMessage = 'Service type activated successfully';
        this.loadServiceTypes();
      },
      error: () => {
        this.errorMessage = 'Failed to activate service type';
      }
    });
  }

  // Services Methods
  startAddingService() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create services';
      return;
    }
    if (!this.selectedServiceType) return;
    
    this.isAddingService = true;
    this.showExistingServices = false;
    this.selectedExistingServiceId = null;
    this.newService = {
      name: '',
      serviceKey: '',
      cost: 0,
      timeDuration: 0,
      serviceTypeId: this.selectedServiceType.id,
      inputType: 'dropdown',
      minValue: 0,
      maxValue: 10,
      stepValue: 1,
      isRangeInput: false,
      unit: '',
      displayOrder: this.selectedServiceType.services.length + 1
    };
  }

  toggleExistingServices() {
    this.showExistingServices = !this.showExistingServices;
  }

  copyExistingService() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to copy services';
      return;
    }
    if (!this.selectedExistingServiceId || !this.selectedServiceType) return;
    
    this.adminService.copyService({
      sourceServiceId: this.selectedExistingServiceId,
      targetServiceTypeId: this.selectedServiceType.id
    }).subscribe({
      next: () => {
        this.successMessage = 'Service copied successfully';
        this.isAddingService = false;
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.errorMessage = 'Failed to copy service';
      }
    });
  }


  cancelAddService() {
    this.isAddingService = false;
    this.showExistingServices = false;
    this.selectedExistingServiceId = null;
  }

  addService() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create services';
      return;
    }
    this.adminService.createService(this.newService).subscribe({
      next: () => {
        this.successMessage = 'Service created successfully';
        this.isAddingService = false;
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.errorMessage = 'Failed to create service';
      }
    });
  }

  editService(service: Service) {
    if (!this.canUpdate) {
      this.errorMessage = 'You do not have permission to edit service';
      return;
    }
    this.editingServiceId = service.id;
  }

  cancelEditService() {
    this.editingServiceId = null;
    this.loadServiceTypes();
  }

  saveService(service: Service) {
    this.adminService.updateService(service.id, {
      name: service.name,
      serviceKey: service.serviceKey,
      cost: service.cost,
      timeDuration: service.timeDuration,
      serviceTypeId: service.serviceTypeId,
      inputType: service.inputType,
      minValue: service.minValue,
      maxValue: service.maxValue,
      stepValue: service.stepValue,
      isRangeInput: service.isRangeInput,
      unit: service.unit,
      serviceRelationType: service.serviceRelationType, // ADD THIS LINE
      displayOrder: 1
    }).subscribe({
      next: () => {
        this.successMessage = 'Service updated successfully';
        this.editingServiceId = null;
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.errorMessage = 'Failed to update service';
      }
    });
  }

  deleteService(service: Service) {
    if (!this.canDelete) {
      this.errorMessage = 'You do not have permission to delete services';
      return;
    }
    if (confirm(`Are you sure you want to permanently delete "${service.name}"? This cannot be undone.`)) {
      this.adminService.deleteService(service.id).subscribe({
        next: () => {
          this.successMessage = 'Service deleted successfully';
          this.loadServiceTypes();
          this.loadAllServices();
        },
        error: (error) => {
          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Failed to delete service';
          }
        }
      });
    }
  }

  deactivateService(service: Service) {
    if (!this.canDeactivate) {
      this.errorMessage = 'You do not have permission to deactivate services';
      return;
    }
    this.adminService.deactivateService(service.id).subscribe({
      next: () => {
        this.successMessage = 'Service deactivated successfully';
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.errorMessage = 'Failed to deactivate service';
      }
    });
  }

  activateService(service: Service) {
    if (!this.canActivate) {
      this.errorMessage = 'You do not have permission to activate services';
      return;
    }
    this.adminService.activateService(service.id).subscribe({
      next: () => {
        this.successMessage = 'Service activated successfully';
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.errorMessage = 'Failed to activate service';
      }
    });
  }

  // Extra Services Methods
  startAddingExtraService() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create extra services';
      return;
    }
    if (!this.selectedServiceType) return;
    
    this.isAddingExtraService = true;
    this.showExistingExtraServices = false;
    this.selectedExistingExtraServiceId = null;
    this.newExtraService = {
      name: '',
      description: '',
      price: 0,
      duration: 0,
      icon: '',
      hasQuantity: false,
      hasHours: false,
      isDeepCleaning: false,
      isSuperDeepCleaning: false,
      isSameDayService: false,
      priceMultiplier: 1.0,
      serviceTypeId: this.selectedServiceType.id,
      isAvailableForAll: false,
      displayOrder: this.selectedServiceType.extraServices.length + 1
    };
  }

  toggleExistingExtraServices() {
    this.showExistingExtraServices = !this.showExistingExtraServices;
  }

  copyExistingExtraService() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to copy extra services';
      return;
    }
    if (!this.selectedExistingExtraServiceId || !this.selectedServiceType) return;
    
    this.adminService.copyExtraService({
      sourceExtraServiceId: this.selectedExistingExtraServiceId,
      targetServiceTypeId: this.selectedServiceType.id
    }).subscribe({
      next: () => {
        this.successMessage = 'Extra service copied successfully';
        this.isAddingExtraService = false;
        this.loadServiceTypes();
        this.loadAllExtraServices();
      },
      error: () => {
        this.errorMessage = 'Failed to copy extra service';
      }
    });
  }

  cancelAddExtraService() {
    this.isAddingExtraService = false;
    this.showExistingExtraServices = false;
    this.selectedExistingExtraServiceId = null;
  }

  addExtraService() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create extra services';
      return;
    }
    // If IsAvailableForAll is true, set serviceTypeId to null
    if (this.newExtraService.isAvailableForAll) {
      this.newExtraService.serviceTypeId = undefined;
    }
    
    this.adminService.createExtraService(this.newExtraService).subscribe({
      next: () => {
        this.successMessage = 'Extra service created successfully';
        this.isAddingExtraService = false;
        this.loadServiceTypes();
        this.loadAllExtraServices();
      },
      error: () => {
        this.errorMessage = 'Failed to create extra service';
      }
    });
  }

  editExtraService(extraService: ExtraService) {
    if (!this.canUpdate) {
      this.errorMessage = 'You do not have permission to edit extra services';
      return;
    }
    this.editingExtraServiceId = extraService.id;
  }

  cancelEditExtraService() {
    this.editingExtraServiceId = null;
    this.loadServiceTypes();
  }

  saveExtraService(extraService: ExtraService) {
    this.adminService.updateExtraService(extraService.id, {
      name: extraService.name,
      description: extraService.description,
      price: extraService.price,
      duration: extraService.duration,
      icon: extraService.icon,
      hasQuantity: extraService.hasQuantity,
      hasHours: extraService.hasHours,
      isDeepCleaning: extraService.isDeepCleaning,
      isSuperDeepCleaning: extraService.isSuperDeepCleaning,
      isSameDayService: extraService.isSameDayService,
      priceMultiplier: extraService.priceMultiplier,
      serviceTypeId: extraService.isAvailableForAll ? undefined : this.selectedServiceType?.id,
      isAvailableForAll: extraService.isAvailableForAll,
      displayOrder: 1
    }).subscribe({
      next: () => {
        this.successMessage = 'Extra service updated successfully';
        this.editingExtraServiceId = null;
        this.loadServiceTypes();
        this.loadAllExtraServices();
      },
      error: () => {
        this.errorMessage = 'Failed to update extra service';
      }
    });
  }

  deleteExtraService(extraService: ExtraService) {
    if (!this.canDelete) {
      this.errorMessage = 'You do not have permission to delete extra services';
      return;
    }
    if (confirm(`Are you sure you want to permanently delete "${extraService.name}"? This cannot be undone.`)) {
      this.adminService.deleteExtraService(extraService.id).subscribe({
        next: () => {
          this.successMessage = 'Extra service deleted successfully';
          this.loadServiceTypes();
          this.loadAllExtraServices();
        },
        error: (error) => {
          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Failed to delete extra service';
          }
        }
      });
    }
  }

  deactivateExtraService(extraService: ExtraService) {
    if (!this.canDeactivate) {
      this.errorMessage = 'You do not have permission to deactivate extra services';
      return;
    }
    this.adminService.deactivateExtraService(extraService.id).subscribe({
      next: () => {
        this.successMessage = 'Extra service deactivated successfully';
        this.loadServiceTypes();
        this.loadAllExtraServices();
      },
      error: () => {
        this.errorMessage = 'Failed to deactivate extra service';
      }
    });
  }

  activateExtraService(extraService: ExtraService) {
    if (!this.canActivate) {
      this.errorMessage = 'You do not have permission to activate extra services';
      return;
    }
    this.adminService.activateExtraService(extraService.id).subscribe({
      next: () => {
        this.successMessage = 'Extra service activated successfully';
        this.loadServiceTypes();
        this.loadAllExtraServices();
      },
      error: () => {
        this.errorMessage = 'Failed to activate extra service';
      }
    });
  }

  // Subscriptions Methods
  loadSubscriptions() {
    this.adminService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        // Sort subscriptions by ID
        this.subscriptions = subscriptions.sort((a, b) => a.id - b.id);
      },
      error: (error) => {
        this.errorMessage = 'Failed to load subscriptions';
      }
    });
  }

  startAddingSubscription() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create subscriptions';
      return;
    }
    this.isAddingSubscription = true;
    this.newSubscription = {
      name: '',
      description: '',
      discountPercentage: 0,
      subscriptionDays: 0,
      displayOrder: this.subscriptions.length + 1
    };
  }

  cancelAddSubscription() {
    this.isAddingSubscription = false;
  }

  addSubscription() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create subscriptions';
      return;
    }
    this.adminService.createSubscription(this.newSubscription).subscribe({
      next: () => {
        this.successMessage = 'Subscription created successfully';
        this.isAddingSubscription = false;
        this.loadSubscriptions();
      },
      error: () => {
        this.errorMessage = 'Failed to create subscription';
      }
    });
  }

  editSubscription(subscription: Subscription) {
    if (!this.canUpdate) {
      this.errorMessage = 'You do not have permission to edit subscriptions';
      return;
    }
    this.editingSubscriptionId = subscription.id;
  }

  cancelEditSubscription() {
    this.editingSubscriptionId = null;
    this.loadSubscriptions();
  }

  saveSubscription(subscription: Subscription) {
    this.adminService.updateSubscription(subscription.id, {
      name: subscription.name,
      description: subscription.description,
      discountPercentage: subscription.discountPercentage,
      subscriptionDays: subscription.subscriptionDays,
      displayOrder: 1
    }).subscribe({
      next: () => {
        this.successMessage = 'Subscription updated successfully';
        this.editingSubscriptionId = null;
        this.loadSubscriptions();
      },
      error: () => {
        this.errorMessage = 'Failed to update subscription';
      }
    });
  }

  deleteSubscription(subscription: Subscription) {
    if (!this.canDelete) {
      this.errorMessage = 'You do not have permission to delete subscriptions';
      return;
    }
    if (confirm(`Are you sure you want to delete "${subscription.name}"?`)) {
      this.adminService.deleteSubscription(subscription.id).subscribe({
        next: () => {
          this.successMessage = 'Subscription deleted successfully';
          this.loadSubscriptions();
        },
        error: () => {
          this.errorMessage = 'Failed to delete subscription';
        }
      });
    }
  }

  // Promo Code Methods
  loadPromoCodes() {
    this.adminService.getPromoCodes().subscribe({
      next: (codes) => {
        // Sort promo codes by ID
        this.promoCodes = codes.sort((a, b) => a.id - b.id);
      },
      error: (error) => {
        this.errorMessage = 'Failed to load promo codes';
      }
    });
  }

  startAddingPromoCode() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create promo codes';
      return;
    }
    this.isAddingPromoCode = true;
    this.newPromoCode = {
      code: '',
      description: '',
      isPercentage: true, // Ensure it's a boolean
      discountValue: 0,
      maxUsageCount: undefined,
      maxUsagePerUser: undefined,
      validFrom: undefined,
      validTo: undefined,
      minimumOrderAmount: undefined
    };
  }

  cancelAddPromoCode() {
    this.isAddingPromoCode = false;
  }

  addPromoCode() {
    if (!this.canCreate) {
      this.errorMessage = 'You do not have permission to create promo codes';
      return;
    }
    // Validate before sending
    if (!this.newPromoCode.code || this.newPromoCode.discountValue <= 0) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }
  
    // Clean up the data before sending
    const promoCodeData: CreatePromoCode = {
      code: this.newPromoCode.code.trim(),
      description: this.newPromoCode.description?.trim() || undefined,
      isPercentage: Boolean(this.newPromoCode.isPercentage), // Convert to boolean
      discountValue: Number(this.newPromoCode.discountValue),
      maxUsageCount: this.newPromoCode.maxUsageCount ? Number(this.newPromoCode.maxUsageCount) : undefined,
      maxUsagePerUser: this.newPromoCode.maxUsagePerUser ? Number(this.newPromoCode.maxUsagePerUser) : undefined,
      validFrom: this.newPromoCode.validFrom || undefined,
      validTo: this.newPromoCode.validTo || undefined,
      minimumOrderAmount: this.newPromoCode.minimumOrderAmount ? Number(this.newPromoCode.minimumOrderAmount) : undefined
    };
  
    // Additional client-side validation
    if (promoCodeData.isPercentage && promoCodeData.discountValue > 100) {
      this.errorMessage = 'Percentage discount cannot be greater than 100%';
      return;
    }
  
    if (promoCodeData.validFrom && promoCodeData.validTo && new Date(promoCodeData.validFrom) > new Date(promoCodeData.validTo)) {
      this.errorMessage = 'Valid From date must be before Valid To date';
      return;
    }
  
    console.log('Sending promo code data:', promoCodeData); // Debug log
  
    this.adminService.createPromoCode(promoCodeData).subscribe({
      next: () => {
        this.successMessage = 'Promo code created successfully';
        this.isAddingPromoCode = false;
        this.loadPromoCodes();
      },
      error: (error) => {
        console.error('Failed to create promo code:', error);
        if (error.error?.errors) {
          // Handle validation errors from backend
          const errorMessages = Object.values(error.error.errors).flat().join(', ');
          this.errorMessage = errorMessages;
        } else {
          this.errorMessage = error.error?.message || 'Failed to create promo code';
        }
      }
    });
  }

  editPromoCode(promoCode: PromoCode) {
    if (!this.canUpdate) {
      this.errorMessage = 'You do not have permission to edit promo codes';
      return;
    }
    this.editingPromoCodeId = promoCode.id;
    // Format dates for HTML date input if they exist
    if (promoCode.validFrom) {
      promoCode.validFrom = this.formatDateForInput(promoCode.validFrom);
    }
    if (promoCode.validTo) {
      promoCode.validTo = this.formatDateForInput(promoCode.validTo);
    }
  }

  // Add this helper method
  private formatDateForInput(date: any): any {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  cancelEditPromoCode() {
    this.editingPromoCodeId = null;
    this.loadPromoCodes();
  }

  savePromoCode(promoCode: PromoCode) {
    // Validate before sending
    if (promoCode.discountValue <= 0) {
      this.errorMessage = 'Discount value must be greater than 0';
      return;
    }
  
    // Clean up the data and ensure proper types
    const updateData: UpdatePromoCode = {
      description: promoCode.description?.trim() || undefined,
      isPercentage: Boolean(promoCode.isPercentage), // Ensure boolean
      discountValue: Number(promoCode.discountValue),
      maxUsageCount: promoCode.maxUsageCount ? Number(promoCode.maxUsageCount) : undefined,
      maxUsagePerUser: promoCode.maxUsagePerUser ? Number(promoCode.maxUsagePerUser) : undefined,
      validFrom: promoCode.validFrom || undefined,
      validTo: promoCode.validTo || undefined,
      minimumOrderAmount: promoCode.minimumOrderAmount ? Number(promoCode.minimumOrderAmount) : undefined,
      isActive: Boolean(promoCode.isActive) // Ensure boolean
    };
  
    // Additional client-side validation
    if (updateData.isPercentage && updateData.discountValue > 100) {
      this.errorMessage = 'Percentage discount cannot be greater than 100%';
      return;
    }
  
    if (updateData.validFrom && updateData.validTo && new Date(updateData.validFrom) > new Date(updateData.validTo)) {
      this.errorMessage = 'Valid From date must be before Valid To date';
      return;
    }
  
    console.log('Updating promo code:', updateData); // Debug log
  
    this.adminService.updatePromoCode(promoCode.id, updateData).subscribe({
      next: () => {
        this.successMessage = 'Promo code updated successfully';
        this.editingPromoCodeId = null;
        this.loadPromoCodes();
      },
      error: (error) => {
        console.error('Failed to update promo code:', error);
        if (error.error?.errors) {
          // Handle validation errors from backend
          const errorMessages = Object.values(error.error.errors).flat().join(', ');
          this.errorMessage = errorMessages;
        } else {
          this.errorMessage = error.error?.message || 'Failed to update promo code';
        }
      }
    });
  }

  deletePromoCode(promoCode: PromoCode) {
    if (!this.canDelete) {
      this.errorMessage = 'You do not have permission to delete promo codes';
      return;
    }
    if (confirm(`Are you sure you want to delete promo code "${promoCode.code}"?`)) {
      this.adminService.deletePromoCode(promoCode.id).subscribe({
        next: () => {
          this.successMessage = 'Promo code deleted successfully';
          this.loadPromoCodes();
        },
        error: () => {
          this.errorMessage = 'Failed to delete promo code';
        }
      });
    }
  }

  // User Methods
  loadUsers() {
    this.adminService.getUsers().subscribe({
      next: (response: any) => {
        if (response.users) {
          // Sort users by ID
          this.users = response.users.sort((a: any, b: any) => a.id - b.id);
          this.currentUserRole = response.currentUserRole;
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load users';
      }
    });
  }

  toggleUserStatus(user: UserAdmin) {
    this.adminService.updateUserStatus(user.id, !user.isActive).subscribe({
      next: () => {
        this.successMessage = 'User status updated successfully';
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = 'Failed to update user status';
      }
    });
  }

  toggleRoleDropdown(userId: number) {
    if (this.roleDropdownUserId === userId) {
      this.roleDropdownUserId = null;
    } else {
      this.roleDropdownUserId = userId;
    }
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.role-dropdown')) {
      this.roleDropdownUserId = null;
    }
  }
  
  canChangeUserRole(user: UserAdmin, newRole: string): boolean {
    if (!this.currentUserRole) return false;
    if (this.currentUserRole === 'Moderator') return false;
    if (this.currentUserRole === 'Admin' && newRole === 'SuperAdmin') return false;
    if (this.currentUserRole === 'Admin' && user.role === 'SuperAdmin') return false;
    return true;
  }
  
  updateUserRole(user: UserAdmin, newRole: string) {
    if (!this.canUpdate) {
      this.errorMessage = 'You do not have permission to update user roles';
      return;
    }
  
    if (!this.canChangeUserRole(user, newRole)) {
      this.errorMessage = this.getRoleChangeErrorMessage(user, newRole);
      return;
    }
  
    const message = `Are you sure you want to change ${user.firstName} ${user.lastName}'s role from ${user.role} to ${newRole}?`;
    if (!confirm(message)) return;
  
    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        this.successMessage = 'User role updated successfully';
        this.loadUsers();
      },
      error: (error) => {
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Failed to update user role';
        }
      }
    });
  }

  updateUserStatus(user: UserAdmin, isActive: boolean) {
    if (!this.canDeactivate && !isActive) {
      this.errorMessage = 'You do not have permission to deactivate users';
      return;
    }
    
    if (!this.canActivate && isActive) {
      this.errorMessage = 'You do not have permission to activate users';
      return;
    }
  
    const action = isActive ? 'activate' : 'deactivate';
    if (confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`)) {
      this.adminService.updateUserStatus(user.id, isActive).subscribe({
        next: () => {
          this.successMessage = `User ${action}d successfully`;
          this.loadUsers();
        },
        error: () => {
          this.errorMessage = `Failed to ${action} user`;
        }
      });
    }
  }
  
  private getRoleChangeErrorMessage(user: UserAdmin, newRole: string): string {
    if (this.currentUserRole === 'Admin' && newRole === 'SuperAdmin') {
      return 'You cannot assign SuperAdmin role as an Admin';
    }
    if (this.currentUserRole === 'Admin' && user.role === 'SuperAdmin') {
      return 'You cannot modify SuperAdmin users as an Admin';
    }
    return 'You do not have permission to change this user\'s role';
  }
}