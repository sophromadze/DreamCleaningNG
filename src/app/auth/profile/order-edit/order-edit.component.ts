// src/app/auth/profile/order-edit/order-edit.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderService, Order, UpdateOrder } from '../../../services/order.service';
import { BookingService, ServiceType, Service, ExtraService, Frequency } from '../../../services/booking.service';
import { LocationService } from '../../../services/location.service';

interface SelectedService {
  service: Service;
  quantity: number;
  hours?: number;  // Add hours field for cleaner services
}

interface SelectedExtraService {
  extraService: ExtraService;
  quantity: number;
  hours: number;
}

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss']
})
export class OrderEditComponent implements OnInit {
  order: Order | null = null;
  orderForm: FormGroup;
  
  // Service data
  serviceType: ServiceType | null = null;
  selectedServices: SelectedService[] = [];
  selectedExtraServices: SelectedExtraService[] = [];
  
  // Location data
  states: string[] = [];
  cities: string[] = [];
  
  // UI state
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  additionalAmount = 0;
  showPaymentModal = false;
  
  // Entry methods
  entryMethods = [
    'I will be home',
    'Doorman',
    'Hidden key',
    'Office reception',
    'Other'
  ];
  
  // Original values for comparison
  originalTotal = 0;
  originalDiscountAmount = 0;
  
  // Calculated values
  newSubTotal = 0;
  newTotal = 0;
  newTax = 0;
  totalDuration: number = 0;
  
  // Constants
  salesTaxRate = 0.088; // 8.8%

  calculatedMaidsCount = 1;
  originalMaidsCount = 1;

  originalServiceQuantities: Map<number, number> = new Map();
  serviceControls: FormArray;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private bookingService: BookingService,
    private locationService: LocationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.orderForm = this.fb.group({
      serviceDate: ['', Validators.required],
      serviceTime: ['', Validators.required],
      entryMethod: ['', Validators.required],
      customEntryMethod: [''],
      specialInstructions: [''],
      contactFirstName: ['', Validators.required],
      contactLastName: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      serviceAddress: ['', Validators.required],
      aptSuite: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      tips: [0, Validators.min(0)],
      services: this.fb.array([])
    });
    this.serviceControls = this.orderForm.get('services') as FormArray;
  }

  ngOnInit() {
    const orderId = this.route.snapshot.params['id'];
    this.loadLocationData();
    this.loadOrder(orderId);
    
    // Listen to tips changes
    this.orderForm.get('tips')?.valueChanges.subscribe(() => {
      this.calculateNewTotal();
    });
  }

  loadLocationData() {
    this.locationService.getStates().subscribe({
      next: (states) => {
        this.states = states;
      }
    });
  }

  loadCities(state: string) {
    this.locationService.getCities(state).subscribe({
      next: (cities) => {
        this.cities = cities;
      }
    });
  }

  onStateChange(state: string) {
    this.loadCities(state);
    this.orderForm.patchValue({ city: '' });
  }

  loadOrder(orderId: number) {
    this.isLoading = true;
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.originalTotal = order.total;
        this.originalDiscountAmount = order.discountAmount;
        this.originalMaidsCount = order.maidsCount; // Add this
        this.populateForm(order);
        this.loadServiceType(order.serviceTypeId);
      },
      error: (error) => {
        this.errorMessage = 'Failed to load order';
        this.isLoading = false;
      }
    });
  }

  populateForm(order: Order) {
    this.orderForm.patchValue({
      serviceDate: new Date(order.serviceDate).toISOString().split('T')[0],
      serviceTime: order.serviceTime.substring(0, 5), // HH:mm format
      entryMethod: order.entryMethod === 'Other' ? 'Other' : order.entryMethod,
      customEntryMethod: order.entryMethod === 'Other' ? order.entryMethod : '',
      specialInstructions: order.specialInstructions || '',
      contactFirstName: order.contactFirstName,
      contactLastName: order.contactLastName,
      contactEmail: order.contactEmail,
      contactPhone: order.contactPhone,
      serviceAddress: order.serviceAddress,
      aptSuite: order.aptSuite || '',
      city: order.city,
      state: order.state,
      zipCode: order.zipCode,
      tips: order.tips
    });

    // Load cities for the selected state
    if (order.state) {
      this.loadCities(order.state);
    }
  }

  loadServiceType(serviceTypeId: number) {
    this.bookingService.getServiceTypes().subscribe({
      next: (serviceTypes) => {
        this.serviceType = serviceTypes.find(st => st.id === serviceTypeId) || null;
        if (this.serviceType && this.order) {
          this.initializeServices();
          this.initializeExtraServices();
          // Calculate initial total
          this.calculateNewTotal();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load service details';
        this.isLoading = false;
      }
    });
  }

  initializeServices() {
    if (!this.serviceType || !this.order) return;
  
    // Clear existing controls
    this.serviceControls.clear();
    
    // Initialize selected services with quantities from the order
    this.selectedServices = [];
    
    // First, add all services from the service type with their original quantities
    this.serviceType.services.forEach(service => {
      const orderService = this.order!.services.find(s => s.serviceId === service.id);
      let quantity = orderService ? orderService.quantity : 0;
      let hours: number | undefined = undefined;
      
      // Special handling for cleaner services
      if (service.serviceRelationType === 'cleaner') {
        // Find the hours service in the order
        const hoursService = this.serviceType!.services.find(s => s.serviceRelationType === 'hours' && s.serviceTypeId === service.serviceTypeId);
        if (hoursService) {
          const orderHoursService = this.order!.services.find(s => s.serviceId === hoursService.id);
          hours = orderHoursService ? orderHoursService.quantity : (orderService ? orderService.duration / 60 : 2);
        }
      }
      
      // For hours service, use 0 as default if not found
      if (service.serviceRelationType === 'hours') {
        quantity = quantity || 2; // Default to 2 hours if not found
      }
      
      this.selectedServices.push({
        service: service,
        quantity: quantity,
        hours: hours
      });
      
      // Store original quantity
      this.originalServiceQuantities.set(service.id, quantity);

      // Add form control for this service
      this.serviceControls.push(this.fb.control(quantity));
    });
  }

  initializeExtraServices() {
    if (!this.serviceType || !this.order) return;
    
    // Initialize selected extra services from the order
    this.selectedExtraServices = [];
    
    this.order.extraServices.forEach(orderExtraService => {
      const extraService = this.serviceType!.extraServices.find(es => es.id === orderExtraService.extraServiceId);
      if (extraService) {
        this.selectedExtraServices.push({
          extraService: extraService,
          quantity: orderExtraService.quantity,
          hours: orderExtraService.hours
        });
      }
    });
  }

  getServiceControl(index: number): FormControl {
    return this.serviceControls.at(index) as FormControl;
  }

  updateServiceQuantity(service: Service, quantity: number) {
    const index = this.selectedServices.findIndex(s => s.service.id === service.id);
    if (index !== -1) {
      this.selectedServices[index].quantity = quantity;
      this.serviceControls.at(index).setValue(quantity);
    }
    this.calculateNewTotal();
  }

  toggleExtraService(extraService: ExtraService) {
    const index = this.selectedExtraServices.findIndex(s => s.extraService.id === extraService.id);
    
    if (index > -1) {
      this.selectedExtraServices.splice(index, 1);
    } else {
      // If selecting a cleaning type, remove other cleaning types
      if (extraService.isDeepCleaning || extraService.isSuperDeepCleaning) {
        // Remove any existing deep cleaning or super deep cleaning
        this.selectedExtraServices = this.selectedExtraServices.filter(
          s => !s.extraService.isDeepCleaning && !s.extraService.isSuperDeepCleaning
        );
      }
      
      this.selectedExtraServices.push({
        extraService: extraService,
        quantity: 1,
        hours: extraService.hasHours ? 0.5 : 0
      });
    }
    
    this.calculateNewTotal();
  }

  updateExtraServiceQuantity(extraService: ExtraService, quantity: number) {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    if (selected && quantity >= 1) {
      selected.quantity = quantity;
      this.calculateNewTotal();
    }
  }

  updateExtraServiceHours(extraService: ExtraService, hours: number) {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    if (selected && hours >= 0.5) {
      selected.hours = hours;
      this.calculateNewTotal();
    }
  }

  isExtraServiceSelected(extraService: ExtraService): boolean {
    return this.selectedExtraServices.some(s => s.extraService.id === extraService.id);
  }

  getExtraServiceQuantity(extraService: ExtraService): number {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    return selected ? selected.quantity : 1;
  }

  getExtraServiceHours(extraService: ExtraService): number {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    return selected ? selected.hours : 0.5;
  }

  getServiceQuantity(service: Service): number {
    const selected = this.selectedServices.find(s => s.service.id === service.id);
    return selected ? selected.quantity : (service.minValue || 0);
  }

  getServiceHours(service: Service): number {
    const selected = this.selectedServices.find(s => s.service.id === service.id);
    return selected?.hours || 0;
  }

  getOriginalServiceQuantity(service: Service): number {
    return this.originalServiceQuantities.get(service.id) ?? 0;
  }

  getOriginalServiceHours(service: Service): number {
    if (!this.order || service.serviceRelationType !== 'cleaner') return 0;
    
    // Find the hours service for this service type
    const hoursService = this.serviceType?.services.find(s => 
      s.serviceRelationType === 'hours' && s.serviceTypeId === service.serviceTypeId
    );
    
    if (hoursService) {
      const orderHoursService = this.order.services.find(s => s.serviceId === hoursService.id);
      return orderHoursService ? orderHoursService.quantity : 0;
    }
    
    // Fallback: check if duration is stored with cleaner service
    const orderService = this.order.services.find(s => s.serviceId === service.id);
    return orderService ? orderService.duration / 60 : 0;
  }

  updateServiceHours(service: Service, hours: number): void {
    const index = this.selectedServices.findIndex(s => s.service.id === service.id);
    if (index !== -1) {
      this.selectedServices[index].hours = hours;
      
      // Also update the hours service quantity
      const hoursService = this.selectedServices.find(s => 
        s.service.serviceRelationType === 'hours' && 
        s.service.serviceTypeId === service.serviceTypeId
      );
      
      if (hoursService) {
        hoursService.quantity = hours;
      }
    }
    this.calculateNewTotal();
  }

  calculateNewTotal() {
    if (!this.serviceType) return;
  
    let subtotal = 0;
    let totalDuration = 0;
    let displayDuration = 0; // This will be the duration shown to the user
    let priceMultiplier = 1;
    let deepCleaningFee = 0;
  
    // Check for deep cleaning multipliers FIRST
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      priceMultiplier = superDeepCleaning.extraService.priceMultiplier;
      deepCleaningFee = superDeepCleaning.extraService.price;
    } else if (deepCleaning) {
      priceMultiplier = deepCleaning.extraService.priceMultiplier;
      deepCleaningFee = deepCleaning.extraService.price;
    }
  
    // Add base price with multiplier
    subtotal += this.serviceType.basePrice * priceMultiplier;
  
    // Calculate services cost and duration
    this.selectedServices.forEach(selectedService => {
      const { service, quantity, hours } = selectedService;
      
      if (service.serviceKey === 'bedrooms' && quantity === 0) {
        subtotal += 20 * priceMultiplier;
        totalDuration += 20; // 20 minutes for studio
      } else if (service.serviceRelationType === 'cleaner' && hours) {
        subtotal += service.cost * quantity * hours * priceMultiplier;
        totalDuration += hours * 60; // Convert hours to minutes
      } else if (service.serviceRelationType !== 'hours') {
        subtotal += service.cost * quantity * priceMultiplier;
        totalDuration += service.timeDuration * quantity;
      }
    });
  
    // Calculate extra service costs and duration
    this.selectedExtraServices.forEach(selected => {
      if (!selected.extraService.isDeepCleaning && !selected.extraService.isSuperDeepCleaning) {
        const currentMultiplier = selected.extraService.isSameDayService ? 
          1 : priceMultiplier;
        
        if (selected.extraService.hasHours) {
          subtotal += selected.extraService.price * selected.hours * currentMultiplier;
          totalDuration += selected.extraService.duration * selected.hours;
        } else if (selected.extraService.hasQuantity) {
          subtotal += selected.extraService.price * selected.quantity * currentMultiplier;
          totalDuration += selected.extraService.duration * selected.quantity;
        } else {
          subtotal += selected.extraService.price * currentMultiplier;
          totalDuration += selected.extraService.duration;
        }
      } else {
        totalDuration += selected.extraService.duration;
      }
    });
  
    // Calculate maids count
    this.calculatedMaidsCount = 1;
    
    const hasCleanerService = this.selectedServices.some(s => 
      s.service.serviceRelationType === 'cleaner'
    );
    
    // Check if hours are explicitly selected
    const hoursService = this.selectedServices.find(s => 
      s.service.serviceRelationType === 'hours'
    );
    
    if (hasCleanerService) {
      const cleanerService = this.selectedServices.find(s => 
        s.service.serviceRelationType === 'cleaner'
      );
      if (cleanerService) {
        this.calculatedMaidsCount = cleanerService.quantity;
      }
      
      // If hours service is also selected, use only the hours from that service
      if (hoursService) {
        displayDuration = hoursService.quantity * 60; // Convert hours to minutes
      } else {
        // When cleaners are selected but no hours service, use calculated duration
        displayDuration = totalDuration;
      }
    } else {
      // Calculate based on duration (every 6 hours = 1 maid)
      const totalHours = totalDuration / 60;
      
      // Always start with 1 maid
      if (totalHours <= 6) {
        this.calculatedMaidsCount = 1;
        displayDuration = totalDuration;
      } else {
        // For duration > 6 hours, calculate number of maids needed
        this.calculatedMaidsCount = Math.ceil(totalHours / 6);
        
        // Divide the total duration by number of maids to get display duration
        displayDuration = Math.ceil(totalDuration / this.calculatedMaidsCount);
      }
    }
  
    // Store the display duration for use in the UI
    this.totalDuration = displayDuration;
  
    // Add deep cleaning fee AFTER all other calculations
    subtotal += deepCleaningFee;
  
    // Calculate tax
    this.newTax = subtotal * this.salesTaxRate;
  
    // Calculate new total
    this.newSubTotal = subtotal;
    this.newTotal = subtotal + this.newTax + (this.tips.value || 0);
  
    // Calculate additional amount needed
    this.additionalAmount = this.newTotal - this.originalTotal;
  }

  prepareUpdateData(): UpdateOrder {
    const formValue = this.orderForm.value;
    
    // Prepare services with special handling for cleaner/hours relationship
    const services: { serviceId: number; quantity: number }[] = [];
    
    this.selectedServices.forEach(selectedService => {
      const { service, quantity, hours } = selectedService;
      
      if (service.serviceRelationType === 'cleaner' && hours !== undefined) {
        // Add the cleaner service
        services.push({
          serviceId: service.id,
          quantity: quantity
        });
        
        // Find and add the hours service for this service type
        const hoursService = this.selectedServices.find(s => 
          s.service.serviceRelationType === 'hours' && 
          s.service.serviceTypeId === service.serviceTypeId
        );
        
        if (hoursService) {
          services.push({
            serviceId: hoursService.service.id,
            quantity: hours // Use the hours value as quantity for hours service
          });
        }
      } else if (service.serviceRelationType !== 'hours') {
        // Add non-hours services normally
        services.push({
          serviceId: service.id,
          quantity: quantity
        });
      }
      // Skip hours services as they're handled with cleaners
    });
    
    return {
      serviceDate: new Date(formValue.serviceDate),
      serviceTime: formValue.serviceTime,
      maidsCount: this.calculatedMaidsCount,
      entryMethod: formValue.entryMethod === 'Other' ? formValue.customEntryMethod : formValue.entryMethod,
      specialInstructions: formValue.specialInstructions || '',
      contactFirstName: formValue.contactFirstName,
      contactLastName: formValue.contactLastName,
      contactEmail: formValue.contactEmail,
      contactPhone: formValue.contactPhone,
      serviceAddress: formValue.serviceAddress,
      aptSuite: formValue.aptSuite || '',
      city: formValue.city,
      state: formValue.state,
      zipCode: formValue.zipCode,
      services: services,
      extraServices: this.selectedExtraServices.map(s => ({
        extraServiceId: s.extraService.id,
        quantity: s.quantity,
        hours: s.hours
      })),
      tips: formValue.tips || 0
    };
  }

  onSubmit() {
    if (!this.orderForm.valid || !this.order) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }
  
    // Check if the total is being reduced
    if (this.additionalAmount < 0) {
      this.errorMessage = `Cannot reduce order total. The new total would be $${Math.abs(this.additionalAmount).toFixed(2)} less than the original amount paid.`;
      window.scrollTo(0, 0);
      return;
    }
  
    // Check if additional payment is needed
    if (this.additionalAmount > 0) {
      this.showPaymentModal = true;
    } else {
      this.saveOrder();
    }
  }

  saveOrder() {
    if (!this.order) return;
  
    this.isSaving = true;
    this.errorMessage = ''; // Clear previous errors
    const updateData = this.prepareUpdateData();
  
    this.orderService.updateOrder(this.order.id, updateData).subscribe({
      next: (updatedOrder) => {
        this.successMessage = 'Order updated successfully';
        setTimeout(() => {
          this.router.navigate(['/order', this.order!.id]);
        }, 1500);
      },
      error: (error) => {
        console.error('Update error:', error);
        this.errorMessage = error.error?.message || error.error || 'Failed to update order';
        this.isSaving = false;
        
        // Scroll to top to show error message
        window.scrollTo(0, 0);
      }
    });
  }

  processAdditionalPayment() {
    if (!this.order) return;

    // Simulate payment for additional amount
    this.isSaving = true;
    
    // In real implementation, this would process the payment
    setTimeout(() => {
      this.showPaymentModal = false;
      this.saveOrder();
    }, 1000);
  }

  closePaymentModal() {
    this.showPaymentModal = false;
  }

  getServiceOptions(service: Service): number[] {
    const options: number[] = [];
    const min = service.minValue || 0;
    const max = service.maxValue || 10;
    const step = service.stepValue || 1;
    
    for (let i = min; i <= max; i += step) {
      options.push(i);
    }
    
    return options;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get tips() {
    return this.orderForm.get('tips')!;
  }

  getSelectedServiceQuantity(service: Service): number {
    const selected = this.selectedServices.find(s => s.service.id === service.id);
    return selected ? selected.quantity : 0;
  }

  getCleaningTypeText(): string {
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      return 'Super Deep Cleaning';
    } else if (deepCleaning) {
      return 'Deep Cleaning';
    }
    return 'Normal Cleaning';
  }
}