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
    if (confirm(`Are you sure you want to delete "${type.name}"?`)) {
      this.adminService.deleteServiceType(type.id).subscribe({
        next: () => {
          this.successMessage = 'Service type deleted successfully';
          if (this.selectedServiceType?.id === type.id) {
            this.selectedServiceType = null;
          }
          this.loadServiceTypes();
        },
        error: () => {
          this.errorMessage = 'Failed to delete service type';
        }
      });
    }
  }

  // Services Methods
  startAddingService() {
    if (!this.selectedServiceType) return;
    
    this.isAddingService = true;
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

  cancelAddService() {
    this.isAddingService = false;
  }

  addService() {
    this.adminService.createService(this.newService).subscribe({
      next: () => {
        this.successMessage = 'Service created successfully';
        this.isAddingService = false;
        this.loadServiceTypes();
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
      },
      error: () => {
        this.errorMessage = 'Failed to update service';
      }
    });
  }

  deleteService(service: Service) {
    if (confirm(`Are you sure you want to delete "${service.name}"?`)) {
      this.adminService.deleteService(service.id).subscribe({
        next: () => {
          this.successMessage = 'Service deleted successfully';
          this.loadServiceTypes();
        },
        error: () => {
          this.errorMessage = 'Failed to delete service';
        }
      });
    }
  }

  // Extra Services Methods
  startAddingExtraService() {
    if (!this.selectedServiceType) return;
    
    this.isAddingExtraService = true;
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

  cancelAddExtraService() {
    this.isAddingExtraService = false;
  }

  addExtraService() {
    this.adminService.createExtraService(this.newExtraService).subscribe({
      next: () => {
        this.successMessage = 'Extra service created successfully';
        this.isAddingExtraService = false;
        this.loadServiceTypes();
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
      serviceTypeId: undefined, // This should be set based on your logic
      isAvailableForAll: extraService.isAvailableForAll,
      displayOrder: 1
    }).subscribe({
      next: () => {
        this.successMessage = 'Extra service updated successfully';
        this.editingExtraServiceId = null;
        this.loadServiceTypes();
      },
      error: () => {
        this.errorMessage = 'Failed to update extra service';
      }
    });
  }

  deleteExtraService(extraService: ExtraService) {
    if (confirm(`Are you sure you want to delete "${extraService.name}"?`)) {
      this.adminService.deleteExtraService(extraService.id).subscribe({
        next: () => {
          this.successMessage = 'Extra service deleted successfully';
          this.loadServiceTypes();
        },
        error: () => {
          this.errorMessage = 'Failed to delete extra service';
        }
      });
    }
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
      isPercentage: true,
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
    this.adminService.createPromoCode(this.newPromoCode).subscribe({
      next: () => {
        this.successMessage = 'Promo code created successfully';
        this.isAddingPromoCode = false;
        this.loadPromoCodes();
      },
      error: () => {
        this.errorMessage = 'Failed to create promo code';
      }
    });
  }

  editPromoCode(promoCode: PromoCode) {
    this.editingPromoCodeId = promoCode.id;
  }

  cancelEditPromoCode() {
    this.editingPromoCodeId = null;
    this.loadPromoCodes();
  }

  savePromoCode(promoCode: PromoCode) {
    const updateData: UpdatePromoCode = {
      description: promoCode.description,
      isPercentage: promoCode.isPercentage,
      discountValue: promoCode.discountValue,
      maxUsageCount: promoCode.maxUsageCount,
      maxUsagePerUser: promoCode.maxUsagePerUser,
      validFrom: promoCode.validFrom,
      validTo: promoCode.validTo,
      minimumOrderAmount: promoCode.minimumOrderAmount,
      isActive: promoCode.isActive
    };

    this.adminService.updatePromoCode(promoCode.id, updateData).subscribe({
      next: () => {
        this.successMessage = 'Promo code updated successfully';
        this.editingPromoCodeId = null;
        this.loadPromoCodes();
      },
      error: () => {
        this.errorMessage = 'Failed to update promo code';
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