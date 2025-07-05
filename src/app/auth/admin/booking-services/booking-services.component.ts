import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, CreateService, CreateExtraService, UserPermissions } from '../../../services/admin.service';
import { ServiceType, Service, ExtraService } from '../../../services/booking.service';

export interface PollQuestion {
  id: number;
  question: string;
  questionType: string;
  options?: string;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  serviceTypeId: number;
}

export interface CreatePollQuestion {
  question: string;
  questionType: string;
  options?: string;
  isRequired: boolean;
  displayOrder: number;
  serviceTypeId: number;
}

@Component({
  selector: 'app-booking-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-services.component.html',
  styleUrls: ['./booking-services.component.scss']
})
export class BookingServicesComponent implements OnInit {
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
    displayOrder: 1,
    timeDuration: 90,
    hasPoll: false
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

  // Messages for each section
  serviceTypeMessage = { error: '', success: '' };
  serviceMessage = { error: '', success: '' };
  extraServiceMessage = { error: '', success: '' };

  // Poll Questions
  pollQuestions: PollQuestion[] = [];
  isAddingPollQuestion = false;
  editingPollQuestionId: number | null = null;
  newPollQuestion: CreatePollQuestion = {
    question: '',
    questionType: 'text',
    options: '',
    isRequired: false,
    displayOrder: 1,
    serviceTypeId: 0
  };

  // Question types
  questionTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'radio', label: 'Radio Buttons' }
  ];

  // Messages for poll questions
  pollQuestionMessage = { success: '', error: '' };

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  // Helper method to clear messages
  private clearMessages() {
    this.serviceTypeMessage = { error: '', success: '' };
    this.serviceMessage = { error: '', success: '' };
    this.extraServiceMessage = { error: '', success: '' };
  }

  ngOnInit() {
    this.loadUserPermissions();
    this.loadServiceTypes();
    this.loadAllServices();
    this.loadAllExtraServices();
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (response) => {
        this.userRole = response.role;
        this.userPermissions = response;
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.serviceTypeMessage.error = 'Failed to load permissions. Please try again.';
      }
    });
  }

  // Service Types Methods
  loadServiceTypes() {
    this.adminService.getServiceTypes().subscribe({
      next: (types) => {       
        // Sort by displayOrder
        this.serviceTypes = types.sort((a, b) => 
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );
        
        // Also sort services within each type
        this.serviceTypes.forEach(type => {
          if (type.services) {
            type.services.sort((a, b) => 
              (a.displayOrder || 0) - (b.displayOrder || 0)
            );
          }

          if (type.extraServices) {
            type.extraServices.sort((a, b) => 
              (a.displayOrder || 0) - (b.displayOrder || 0)
            );
          }
        });
      },
      error: (error) => {
        console.error('Error loading service types:', error);
        this.serviceTypeMessage.error = 'Failed to load service types. Please try again.';
      }
    });
  }

  loadAllServices() {
    if (this.serviceTypes.length === 0) {
      this.adminService.getServiceTypes().subscribe({
        next: (types) => {
          this.serviceTypes = types;
          this.adminService.getServices().subscribe({
            next: (services) => {
              this.allServices = services;
            },
            error: (error) => {
              console.error('Error loading services:', error);
              this.serviceMessage.error = 'Failed to load services. Please try again.';
            }
          });
        },
        error: (error) => {
          console.error('Error loading service types:', error);
          this.serviceTypeMessage.error = 'Failed to load service types. Please try again.';
        }
      });
    } else {
      this.adminService.getServices().subscribe({
        next: (services) => {
          this.allServices = services;
        },
        error: (error) => {
          console.error('Error loading services:', error);
          this.serviceMessage.error = 'Failed to load services. Please try again.';
        }
      });
    }
  }

  loadAllExtraServices() {
    this.adminService.getExtraServices().subscribe({
      next: (services) => {
        this.allExtraServices = services;
      },
      error: (error) => {
        console.error('Error loading extra services:', error);
        this.extraServiceMessage.error = 'Failed to load extra services. Please try again.';
      }
    });
  }

  getServiceTypeNameById(serviceTypeId: number | undefined | null): string {
    if (!serviceTypeId) return 'Unknown';
    const serviceType = this.serviceTypes.find(t => t.id === serviceTypeId);
    return serviceType ? serviceType.name : 'Unknown';
  }

  selectServiceType(type: ServiceType) {
    this.selectedServiceType = type;
    this.isAddingServiceType = false;
    this.isAddingService = false;
    this.isAddingExtraService = false;
    this.isAddingPollQuestion = false;
    this.editingPollQuestionId = null;

    if (type.hasPoll) {
      this.loadPollQuestions();
    }
  }

  startAddingServiceType() {
    this.isAddingServiceType = true;
    this.isEditingServiceType = false;
    this.selectedServiceType = null;
    this.newServiceType = {
      name: '',
      basePrice: 0,
      description: '',
      displayOrder: this.serviceTypes.length + 1,
      timeDuration: 90,
      hasPoll: false
    };
  }

  cancelAddServiceType() {
    this.isAddingServiceType = false;
    this.newServiceType = {
      name: '',
      basePrice: 0,
      description: '',
      displayOrder: 1,
      timeDuration: 90,
      hasPoll: false
    };
  }

  addServiceType() {
    this.adminService.createServiceType(this.newServiceType).subscribe({
      next: (response) => {
        this.serviceTypes.push(response);
        this.isAddingServiceType = false;
        this.newServiceType = {
          name: '',
          basePrice: 0,
          description: '',
          displayOrder: 1,
          timeDuration: 90,
          hasPoll: false
        };
        this.serviceTypeMessage.success = 'Service type added successfully.';
      },
      error: (error) => {
        console.error('Error creating service type:', error);
        this.serviceTypeMessage.error = 'Failed to create service type. Please try again.';
      }
    });
  }

  editServiceType() {
    this.isEditingServiceType = true;
  }

  cancelEditServiceType() {
    this.isEditingServiceType = false;
  }

  saveServiceType() {
    if (this.selectedServiceType) {
      const updateData = {
        name: this.selectedServiceType.name,
        basePrice: this.selectedServiceType.basePrice,
        description: this.selectedServiceType.description,
        displayOrder: this.selectedServiceType.displayOrder || 1,
        timeDuration: this.selectedServiceType.timeDuration,
        hasPoll: this.selectedServiceType.hasPoll 
      };
      this.adminService.updateServiceType(this.selectedServiceType.id, updateData).subscribe({
        next: (response) => {
          const index = this.serviceTypes.findIndex(t => t.id === response.id);
          if (index !== -1) {
            this.serviceTypes[index] = response;
          }
          this.loadServiceTypes();
          this.isEditingServiceType = false;
          this.serviceTypeMessage.success = 'Service type updated successfully.';
        },
        error: (error) => {
          console.error('Error updating service type:', error);
          this.serviceTypeMessage.error = 'Failed to update service type. Please try again.';
        }
      });
    }
  }

  deleteServiceType(type: ServiceType) {
    if (confirm('Are you sure you want to delete this service type?')) {
      this.adminService.deleteServiceType(type.id).subscribe({
        next: () => {
          this.serviceTypes = this.serviceTypes.filter(t => t.id !== type.id);
          if (this.selectedServiceType?.id === type.id) {
            this.selectedServiceType = null;
          }
          this.serviceTypeMessage.success = 'Service type deleted successfully.';
        },
        error: (error) => {
          console.error('Error deleting service type:', error);
          this.serviceTypeMessage.error = 'Failed to delete service type. Please try again.';
        }
      });
    }
  }

  deactivateServiceType(type: ServiceType) {
    this.adminService.deactivateServiceType(type.id).subscribe({
      next: (response) => {
        const index = this.serviceTypes.findIndex(t => t.id === type.id);
        if (index !== -1) {
          this.serviceTypes[index] = { ...this.serviceTypes[index], isActive: false };
        }
        this.serviceTypeMessage.success = 'Service type deactivated successfully.';
      },
      error: (error) => {
        console.error('Error deactivating service type:', error);
        this.serviceTypeMessage.error = 'Failed to deactivate service type. Please try again.';
      }
    });
  }

  activateServiceType(type: ServiceType) {
    this.adminService.activateServiceType(type.id).subscribe({
      next: (response) => {
        const index = this.serviceTypes.findIndex(t => t.id === type.id);
        if (index !== -1) {
          this.serviceTypes[index] = { ...this.serviceTypes[index], isActive: true };
        }
        this.serviceTypeMessage.success = 'Service type activated successfully.';
      },
      error: (error) => {
        console.error('Error activating service type:', error);
        this.serviceTypeMessage.error = 'Failed to activate service type. Please try again.';
      }
    });
  }

  // Services Methods
  startAddingService() {
    if (!this.userPermissions.permissions.canCreate) {
      this.serviceMessage.error = 'You do not have permission to create services';
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
    if (!this.userPermissions.permissions.canCreate) {
      this.serviceMessage.error = 'You do not have permission to copy services';
      return;
    }
    if (!this.selectedExistingServiceId || !this.selectedServiceType) return;
    
    this.adminService.copyService({
      sourceServiceId: this.selectedExistingServiceId,
      targetServiceTypeId: this.selectedServiceType.id
    }).subscribe({
      next: (response) => {
        if (this.selectedServiceType) {
          this.selectedServiceType.services.push(response);
        }
        this.serviceMessage.success = 'Service copied successfully';
        this.isAddingService = false;
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.serviceMessage.error = 'Failed to copy service';
      }
    });
  }

  cancelAddService() {
    this.isAddingService = false;
    this.showExistingServices = false;
    this.selectedExistingServiceId = null;
  }

  addService() {
    if (!this.userPermissions.permissions.canCreate) {
      this.serviceMessage.error = 'You do not have permission to create services';
      return;
    }
    this.adminService.createService(this.newService).subscribe({
      next: (response) => {
        if (this.selectedServiceType) {
          this.selectedServiceType.services.push(response);
        }
        this.serviceMessage.success = 'Service created successfully';
        this.isAddingService = false;
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.serviceMessage.error = 'Failed to create service';
      }
    });
  }

  editService(service: Service) {
    if (!this.userPermissions.permissions.canUpdate) {
      this.serviceMessage.error = 'You do not have permission to edit service';
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
      serviceRelationType: service.serviceRelationType,
      displayOrder: service.displayOrder || 1
    }).subscribe({
      next: (response) => {
        if (this.selectedServiceType) {
          const index = this.selectedServiceType.services.findIndex(s => s.id === response.id);
          if (index !== -1) {
            this.selectedServiceType.services[index] = response;
          }
        }
        this.serviceMessage.success = 'Service updated successfully';
        this.editingServiceId = null;
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.serviceMessage.error = 'Failed to update service';
      }
    });
  }

  deleteService(service: Service) {
    if (!this.userPermissions.permissions.canDelete) {
      this.serviceMessage.error = 'You do not have permission to delete services';
      return;
    }
    if (confirm(`Are you sure you want to permanently delete "${service.name}"? This cannot be undone.`)) {
      this.adminService.deleteService(service.id).subscribe({
        next: () => {
          if (this.selectedServiceType) {
            this.selectedServiceType.services = this.selectedServiceType.services.filter(s => s.id !== service.id);
          }
          this.serviceMessage.success = 'Service deleted successfully';
          this.loadServiceTypes();
          this.loadAllServices();
        },
        error: (error) => {
          if (error.error?.message) {
            this.serviceMessage.error = error.error.message;
          } else {
            this.serviceMessage.error = 'Failed to delete service';
          }
        }
      });
    }
  }

  deactivateService(service: Service) {
    if (!this.userPermissions.permissions.canDeactivate) {
      this.serviceMessage.error = 'You do not have permission to deactivate services';
      return;
    }
    this.adminService.deactivateService(service.id).subscribe({
      next: (response) => {
        if (this.selectedServiceType) {
          const index = this.selectedServiceType.services.findIndex(s => s.id === service.id);
          if (index !== -1) {
            this.selectedServiceType.services[index] = { ...this.selectedServiceType.services[index], isActive: false };
          }
        }
        this.serviceMessage.success = 'Service deactivated successfully';
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.serviceMessage.error = 'Failed to deactivate service';
      }
    });
  }

  activateService(service: Service) {
    if (!this.userPermissions.permissions.canActivate) {
      this.serviceMessage.error = 'You do not have permission to activate services';
      return;
    }
    this.adminService.activateService(service.id).subscribe({
      next: (response) => {
        if (this.selectedServiceType) {
          const index = this.selectedServiceType.services.findIndex(s => s.id === service.id);
          if (index !== -1) {
            this.selectedServiceType.services[index] = { ...this.selectedServiceType.services[index], isActive: true };
          }
        }
        this.serviceMessage.success = 'Service activated successfully';
        this.loadServiceTypes();
        this.loadAllServices();
      },
      error: () => {
        this.serviceMessage.error = 'Failed to activate service';
      }
    });
  }

  // Extra Services Methods
  startAddingExtraService() {
    if (!this.userPermissions.permissions.canCreate) {
      this.extraServiceMessage.error = 'You do not have permission to create extra services';
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
      isAvailableForAll: true,
      displayOrder: this.selectedServiceType.extraServices.length + 1
    };
  }

  toggleExistingExtraServices() {
    this.showExistingExtraServices = !this.showExistingExtraServices;
  }

  copyExistingExtraService() {
    if (!this.userPermissions.permissions.canCreate) {
      this.extraServiceMessage.error = 'You do not have permission to copy extra services';
      return;
    }
    if (!this.selectedExistingExtraServiceId || !this.selectedServiceType) return;
    
    const existingService = this.allExtraServices.find(s => s.id === this.selectedExistingExtraServiceId);
    if (existingService) {
      this.newExtraService = {
        name: existingService.name,
        description: existingService.description,
        price: existingService.price,
        duration: existingService.duration,
        icon: existingService.icon,
        hasQuantity: existingService.hasQuantity,
        hasHours: existingService.hasHours,
        isDeepCleaning: existingService.isDeepCleaning,
        isSuperDeepCleaning: existingService.isSuperDeepCleaning,
        isSameDayService: existingService.isSameDayService,
        priceMultiplier: existingService.priceMultiplier,
        serviceTypeId: this.selectedServiceType.id,
        isAvailableForAll: existingService.isAvailableForAll,
        displayOrder: this.selectedServiceType.extraServices.length + 1
      };
      this.showExistingExtraServices = false;
    }
  }

  cancelAddExtraService() {
    this.isAddingExtraService = false;
    this.showExistingExtraServices = false;
    this.selectedExistingExtraServiceId = null;
  }

  addExtraService() {
    if (!this.userPermissions.permissions.canCreate) {
      this.extraServiceMessage.error = 'You do not have permission to create extra services';
      return;
    }
    if (!this.selectedServiceType) return;

    const extraServiceData = {
      ...this.newExtraService,
      serviceTypeId: this.newExtraService.isAvailableForAll ? undefined : this.selectedServiceType.id
    };
    this.adminService.createExtraService(extraServiceData).subscribe({
      next: (response) => {
        if (this.selectedServiceType) {
          this.selectedServiceType.extraServices.push(response);
        }
        this.isAddingExtraService = false;
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
          serviceTypeId: undefined,
          isAvailableForAll: true,
          displayOrder: 1
        };
        this.extraServiceMessage.success = 'Extra service added successfully.';
      },
      error: (error) => {
        console.error('Error creating extra service:', error);
        this.extraServiceMessage.error = 'Failed to create extra service. Please try again.';
      }
    });
  }

  editExtraService(extraService: ExtraService) {
    if (!this.userPermissions.permissions.canUpdate) {
      this.extraServiceMessage.error = 'You do not have permission to edit extra services';
      return;
    }
    this.editingExtraServiceId = extraService.id;
  }

  cancelEditExtraService() {
    this.editingExtraServiceId = null;
    this.loadServiceTypes();
  }

  saveExtraService(extraService: ExtraService) {
    if (!this.userPermissions.permissions.canUpdate) {
      this.extraServiceMessage.error = 'You do not have permission to update extra services';
      return;
    }

    const updateData = {
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
      displayOrder: extraService.displayOrder || 1
    };
    this.adminService.updateExtraService(extraService.id, updateData).subscribe({
      next: (response) => {
        if (this.selectedServiceType) {
          const index = this.selectedServiceType.extraServices.findIndex(s => s.id === response.id);
          if (index !== -1) {
            this.selectedServiceType.extraServices[index] = response;
          }
        }
        this.loadServiceTypes();
        this.editingExtraServiceId = null;
        this.extraServiceMessage.success = 'Extra service updated successfully.';
      },
      error: (error) => {
        console.error('Error updating extra service:', error);
        this.extraServiceMessage.error = 'Failed to update extra service. Please try again.';
      }
    });
  }

  deleteExtraService(extraService: ExtraService) {
    if (!this.userPermissions.permissions.canDelete) {
      this.extraServiceMessage.error = 'You do not have permission to delete extra services';
      return;
    }
    if (confirm(`Are you sure you want to permanently delete "${extraService.name}"? This cannot be undone.`)) {
      this.adminService.deleteExtraService(extraService.id).subscribe({
        next: () => {
          if (this.selectedServiceType) {
            this.selectedServiceType.extraServices = this.selectedServiceType.extraServices.filter(s => s.id !== extraService.id);
          }
          this.extraServiceMessage.success = 'Extra service deleted successfully.';
        },
        error: (error) => {
          console.error('Error deleting extra service:', error);
          this.extraServiceMessage.error = 'Failed to delete extra service. Please try again.';
        }
      });
    }
  }

  deactivateExtraService(extraService: ExtraService) {
    if (!this.userPermissions.permissions.canDeactivate) {
      this.extraServiceMessage.error = 'You do not have permission to deactivate extra services';
      return;
    }
    this.adminService.deactivateExtraService(extraService.id).subscribe({
      next: (response) => {
        // Update allExtraServices
        this.allExtraServices = this.allExtraServices.map(service => 
          service.id === extraService.id 
            ? { ...service, isActive: false }
            : service
        );
        
        // Update selectedServiceType.extraServices if it exists
        if (this.selectedServiceType) {
          this.selectedServiceType.extraServices = this.selectedServiceType.extraServices.map(service =>
            service.id === extraService.id
              ? { ...service, isActive: false }
              : service
          );
        }
        
        this.extraServiceMessage.success = 'Extra service deactivated successfully.';
      },
      error: (error) => {
        console.error('Error deactivating extra service:', error);
        this.extraServiceMessage.error = 'Failed to deactivate extra service. Please try again.';
      }
    });
  }

  activateExtraService(extraService: ExtraService) {
    if (!this.userPermissions.permissions.canActivate) {
      this.extraServiceMessage.error = 'You do not have permission to activate extra services';
      return;
    }
    this.adminService.activateExtraService(extraService.id).subscribe({
      next: (response) => {
        // Update allExtraServices
        this.allExtraServices = this.allExtraServices.map(service => 
          service.id === extraService.id 
            ? { ...service, isActive: true }
            : service
        );
        
        // Update selectedServiceType.extraServices if it exists
        if (this.selectedServiceType) {
          this.selectedServiceType.extraServices = this.selectedServiceType.extraServices.map(service =>
            service.id === extraService.id
              ? { ...service, isActive: true }
              : service
          );
        }
        
        this.extraServiceMessage.success = 'Extra service activated successfully.';
      },
      error: (error) => {
        console.error('Error activating extra service:', error);
        this.extraServiceMessage.error = 'Failed to activate extra service. Please try again.';
      }
    });
  }

  getQuestionTypeLabel(questionType: string): string {
    const type = this.questionTypes.find(t => t.value === questionType);
    return type ? type.label : questionType;
  }

  // Poll Question Methods
  loadPollQuestions() {
    if (!this.selectedServiceType) return;

    this.adminService.getPollQuestions(this.selectedServiceType.id).subscribe({
      next: (questions) => {
        this.pollQuestions = questions;
      },
      error: (error) => {
        console.error('Error loading poll questions:', error);
        this.pollQuestionMessage.error = 'Failed to load poll questions';
      }
    });
  }

  startAddingPollQuestion() {
    if (!this.userPermissions.permissions.canCreate) {
      this.pollQuestionMessage.error = 'You do not have permission to create poll questions';
      return;
    }
    if (!this.selectedServiceType) return;

    this.isAddingPollQuestion = true;
    this.editingPollQuestionId = null;
    this.newPollQuestion = {
      question: '',
      questionType: 'text',
      options: '',
      isRequired: false,
      displayOrder: this.getNextPollQuestionDisplayOrder(),
      serviceTypeId: this.selectedServiceType.id
    };
  }

  cancelAddPollQuestion() {
    this.isAddingPollQuestion = false;
    this.newPollQuestion = {
      question: '',
      questionType: 'text',
      options: '',
      isRequired: false,
      displayOrder: 1,
      serviceTypeId: 0
    };
    this.clearPollQuestionMessages();
  }

  addPollQuestion() {
    if (!this.newPollQuestion.question) {
      this.pollQuestionMessage.error = 'Please enter a question';
      return;
    }

    if ((this.newPollQuestion.questionType === 'dropdown' || this.newPollQuestion.questionType === 'radio') && !this.newPollQuestion.options) {
      this.pollQuestionMessage.error = 'Please enter options for dropdown/radio questions (comma-separated)';
      return;
    }

    this.adminService.createPollQuestion(this.newPollQuestion).subscribe({
      next: (question) => {
        this.pollQuestions.push(question);
        this.pollQuestions.sort((a, b) => a.displayOrder - b.displayOrder);
        this.isAddingPollQuestion = false;
        this.newPollQuestion = {
          question: '',
          questionType: 'text',
          options: '',
          isRequired: false,
          displayOrder: 1,
          serviceTypeId: 0
        };
        this.pollQuestionMessage.success = 'Question added successfully';
        this.clearPollQuestionMessagesAfterDelay();
      },
      error: (error) => {
        console.error('Error adding poll question:', error);
        this.pollQuestionMessage.error = 'Failed to add question';
      }
    });
  }

  editPollQuestion(question: PollQuestion) {
    this.editingPollQuestionId = question.id;
    this.isAddingPollQuestion = false;
  }

  cancelEditPollQuestion() {
    this.editingPollQuestionId = null;
  }

  savePollQuestion(question: PollQuestion) {
    if (!question.question) {
      this.pollQuestionMessage.error = 'Please enter a question';
      return;
    }

    if ((question.questionType === 'dropdown' || question.questionType === 'radio') && !question.options) {
      this.pollQuestionMessage.error = 'Please enter options for dropdown/radio questions (comma-separated)';
      return;
    }

    this.adminService.updatePollQuestion(question.id, question).subscribe({
      next: () => {
        this.editingPollQuestionId = null;
        this.pollQuestionMessage.success = 'Question updated successfully';
        this.clearPollQuestionMessagesAfterDelay();
      },
      error: (error) => {
        console.error('Error updating poll question:', error);
        this.pollQuestionMessage.error = 'Failed to update question';
      }
    });
  }

  deletePollQuestion(questionId: number) {
    if (!this.userPermissions.permissions.canDelete) {
      this.pollQuestionMessage.error = 'You do not have permission to delete poll questions';
      return;
    }

    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    this.adminService.deletePollQuestion(questionId).subscribe({
      next: () => {
        this.pollQuestions = this.pollQuestions.filter(q => q.id !== questionId);
        this.pollQuestionMessage.success = 'Question deleted successfully';
        this.clearPollQuestionMessagesAfterDelay();
      },
      error: (error) => {
        console.error('Error deleting poll question:', error);
        this.pollQuestionMessage.error = 'Failed to delete question';
      }
    });
  }

  getNextPollQuestionDisplayOrder(): number {
    if (this.pollQuestions.length === 0) return 1;
    return Math.max(...this.pollQuestions.map(q => q.displayOrder)) + 1;
  }

  clearPollQuestionMessages() {
    this.pollQuestionMessage = { success: '', error: '' };
  }

  clearPollQuestionMessagesAfterDelay() {
    setTimeout(() => {
      this.clearPollQuestionMessages();
    }, 3000);
  }
}
