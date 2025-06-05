import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderService, Order, UpdateOrder } from '../../../services/order.service';
import { BookingService, ServiceType, Service, ExtraService, Frequency } from '../../../services/booking.service';
import { LocationService } from '../../../services/location.service';

interface SelectedService {
  service: Service;
  quantity: number;
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
  
  // Constants
  salesTaxRate = 0.088; // 8.8%

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
      tips: [0, Validators.min(0)]
    });
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
  
    // Initialize selected services with quantities from the order
    this.selectedServices = [];
    
    // Add all services from the order
    this.order.services.forEach(orderService => {
      const service = this.serviceType!.services.find(s => s.id === orderService.serviceId);
      if (service) {
        this.selectedServices.push({
          service: service,
          quantity: orderService.quantity
        });
      }
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

  updateServiceQuantity(service: Service, quantity: number) {
    const selectedService = this.selectedServices.find(s => s.service.id === service.id);
    if (selectedService) {
      selectedService.quantity = quantity;
    } else {
      this.selectedServices.push({ service, quantity });
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

  calculateNewTotal() {
    let subTotal = 0;
    let totalDuration = 0;

    // Calculate base price
    if (this.serviceType) {
      subTotal += this.serviceType.basePrice;
    }

    // Check for deep cleaning multipliers
    let priceMultiplier = 1;
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      priceMultiplier = superDeepCleaning.extraService.priceMultiplier;
    } else if (deepCleaning) {
      priceMultiplier = deepCleaning.extraService.priceMultiplier;
    }

    // Calculate service costs
    this.selectedServices.forEach(selected => {
      // Special handling for office cleaning - cost is per cleaner per hour
      if (selected.service.serviceKey === 'cleaners' && this.serviceType?.name === 'Office Cleaning') {
        // Find the hours service
        const hoursService = this.selectedServices.find(s => s.service.serviceKey === 'hours');
        if (hoursService) {
          const hours = hoursService.quantity;
          const cleaners = selected.quantity;
          const costPerCleanerPerHour = selected.service.cost * priceMultiplier;
          const cost = costPerCleanerPerHour * cleaners * hours;
          subTotal += cost;
          totalDuration += hours * 60; // Convert hours to minutes
        }
      } else if (selected.service.serviceKey === 'bedrooms' && selected.quantity === 0) {
        // Studio apartment - flat rate of $20
        const cost = 20 * priceMultiplier;
        subTotal += cost;
        totalDuration += 20; // 20 minutes for studio
      } else if (selected.service.serviceKey !== 'hours') {
        // Regular service calculation (not hours)
        const cost = selected.service.cost * selected.quantity * priceMultiplier;
        subTotal += cost;
        totalDuration += selected.service.timeDuration * selected.quantity;
      }
    });

    // Calculate extra service costs (excluding deep cleaning multipliers)
    this.selectedExtraServices.forEach(selected => {
      if (!selected.extraService.isDeepCleaning && !selected.extraService.isSuperDeepCleaning) {
        if (selected.extraService.hasHours) {
          subTotal += selected.extraService.price * selected.hours;
          totalDuration += selected.extraService.duration * selected.hours;
        } else if (selected.extraService.hasQuantity) {
          subTotal += selected.extraService.price * selected.quantity;
          totalDuration += selected.extraService.duration * selected.quantity;
        } else {
          subTotal += selected.extraService.price;
          totalDuration += selected.extraService.duration;
        }
      }
    });

    // Apply original discount amount (not percentage, to keep the same discount)
    const discountedSubTotal = subTotal - this.originalDiscountAmount;

    // Make sure we don't go negative
    if (discountedSubTotal < 0) {
      this.newSubTotal = 0;
      this.newTax = 0;
    } else {
      this.newSubTotal = discountedSubTotal;
      this.newTax = discountedSubTotal * this.salesTaxRate;
    }

    // Get tips
    const tips = this.orderForm.get('tips')?.value || 0;

    // Calculate new total
    this.newTotal = this.newSubTotal + this.newTax + tips;

    // Calculate the additional amount needed
    this.additionalAmount = this.newTotal - this.originalTotal;
  }

  prepareUpdateData(): UpdateOrder {
    const formValue = this.orderForm.value;
    
    // Filter out services with 0 quantity for office cleaning hours
    const services = this.selectedServices
      .filter(s => !(s.service.serviceKey === 'hours' && s.quantity === 0))
      .map(s => ({
        serviceId: s.service.id,
        quantity: s.quantity
      }));
    
    return {
      serviceDate: new Date(formValue.serviceDate),
      serviceTime: formValue.serviceTime,
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
    const updateData = this.prepareUpdateData();

    this.orderService.updateOrder(this.order.id, updateData).subscribe({
      next: (updatedOrder) => {
        this.successMessage = 'Order updated successfully';
        setTimeout(() => {
          this.router.navigate(['/order', this.order!.id]);
        }, 1500);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to update order';
        this.isSaving = false;
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
}