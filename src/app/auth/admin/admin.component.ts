import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, PromoCode, CreatePromoCode, UpdatePromoCode, UserAdmin, CreateService, CreateExtraService, CreateFrequency } from '../../services/admin.service';
import { ServiceType, Service, ExtraService, Frequency } from '../../services/booking.service';

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
  
  // Frequencies
  frequencies: Frequency[] = [];
  isAddingFrequency = false;
  editingFrequencyId: number | null = null;
  newFrequency: CreateFrequency = {
    name: '',
    description: '',
    discountPercentage: 0,
    frequencyDays: 0,
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
  
  // UI State
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadServiceTypes();
    this.loadAllServices();
    this.loadAllExtraServices();
    this.loadFrequencies();
    this.loadPromoCodes();
    this.loadUsers();
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
        this.serviceTypes = types;
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
    this.isEditingServiceType = true;
  }

  cancelEditServiceType() {
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

  // Frequencies Methods
  loadFrequencies() {
    this.adminService.getFrequencies().subscribe({
      next: (frequencies) => {
        this.frequencies = frequencies;
      },
      error: () => {
        this.errorMessage = 'Failed to load frequencies';
      }
    });
  }

  startAddingFrequency() {
    this.isAddingFrequency = true;
    this.newFrequency = {
      name: '',
      description: '',
      discountPercentage: 0,
      frequencyDays: 0,
      displayOrder: this.frequencies.length + 1
    };
  }

  cancelAddFrequency() {
    this.isAddingFrequency = false;
  }

  addFrequency() {
    this.adminService.createFrequency(this.newFrequency).subscribe({
      next: () => {
        this.successMessage = 'Frequency created successfully';
        this.isAddingFrequency = false;
        this.loadFrequencies();
      },
      error: () => {
        this.errorMessage = 'Failed to create frequency';
      }
    });
  }

  editFrequency(frequency: Frequency) {
    this.editingFrequencyId = frequency.id;
  }

  cancelEditFrequency() {
    this.editingFrequencyId = null;
    this.loadFrequencies();
  }

  saveFrequency(frequency: Frequency) {
    this.adminService.updateFrequency(frequency.id, {
      name: frequency.name,
      description: frequency.description,
      discountPercentage: frequency.discountPercentage,
      frequencyDays: frequency.frequencyDays,
      displayOrder: 1
    }).subscribe({
      next: () => {
        this.successMessage = 'Frequency updated successfully';
        this.editingFrequencyId = null;
        this.loadFrequencies();
      },
      error: () => {
        this.errorMessage = 'Failed to update frequency';
      }
    });
  }

  deleteFrequency(frequency: Frequency) {
    if (confirm(`Are you sure you want to delete "${frequency.name}"?`)) {
      this.adminService.deleteFrequency(frequency.id).subscribe({
        next: () => {
          this.successMessage = 'Frequency deleted successfully';
          this.loadFrequencies();
        },
        error: () => {
          this.errorMessage = 'Failed to delete frequency';
        }
      });
    }
  }

  // Promo Code Methods
  loadPromoCodes() {
    this.adminService.getPromoCodes().subscribe({
      next: (codes) => {
        this.promoCodes = codes;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load promo codes';
      }
    });
  }

  startAddingPromoCode() {
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
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load users';
      }
    });
  }

  updateUserRole(user: UserAdmin, newRole: string) {
    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        this.successMessage = 'User role updated successfully';
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = 'Failed to update user role';
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
}