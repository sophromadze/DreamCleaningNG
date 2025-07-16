// src/app/auth/profile/order-edit/order-edit.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderService, Order, UpdateOrder } from '../../../services/order.service';
import { BookingService, ServiceType, Service, ExtraService, Subscription } from '../../../services/booking.service';
import { LocationService } from '../../../services/location.service';
import { AuthService } from '../../../services/auth.service';
import { DurationUtils } from '../../../utils/duration.utils';
import { DateSelectorComponent } from '../../../booking/date-selector/date-selector.component';
import { TimeSelectorComponent } from '../../../booking/time-selector/time-selector.component';
import { StripeService } from '../../../services/stripe.service';

interface SelectedService {
  service: Service;
  quantity: number;
  hours?: number;  
}

interface SelectedExtraService {
  extraService: ExtraService;
  quantity: number;
  hours: number;
}

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DateSelectorComponent, TimeSelectorComponent],
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss']
})
export class OrderEditComponent implements OnInit, OnDestroy {
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
  isSameDaySelected = false;
  
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
  originalSubscriptionDiscountAmount = 0;
  
  // Calculated values
  newSubTotal = 0;
  newTotal = 0;
  newTax = 0;
  totalDuration: number = 0;
  actualTotalDuration: number = 0;

  // Gift card specific properties
  giftCardApplied = false;
  giftCardBalance = 0;
  giftCardAmountToUse = 0;
  isGiftCard = false;
  originalGiftCardCode: string | null = null;
  originalGiftCardAmountUsed = 0;
  
  // Mobile tooltip management
  mobileTooltipTimeouts: { [key: number]: any } = {};
  mobileTooltipStates: { [key: number]: boolean } = {};
  isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  
  // Order summary collapse state
  isSummaryCollapsed = false;
  
  // Constants
  salesTaxRate = 0.08875; // 8.875%

  calculatedMaidsCount = 1;
  originalMaidsCount = 1;

  originalServiceQuantities: Map<number, number> = new Map();
  serviceControls: FormArray;

  // Payment related properties
  isProcessingPayment = false;
  paymentClientSecret: string | null = null;
  cardError: string | null = null;
  paymentErrorMessage: string = '';
  private updateData: UpdateOrder | null = null;


  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private bookingService: BookingService,
    private locationService: LocationService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private stripeService: StripeService
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
      companyDevelopmentTips: [0, Validators.min(0)],
      services: this.fb.array([]),
      cleaningType: ['normal', Validators.required]
    });
    this.serviceControls = this.orderForm.get('services') as FormArray;
  }

  ngOnInit() {
    const orderId = this.route.snapshot.params['id'];
    this.loadLocationData();
    this.loadOrder(orderId);
    
    // Auto-collapse summary on mobile devices (≤1200px)
    this.updateSummaryCollapseState();
    
    // Listen to window resize events
    window.addEventListener('resize', () => {
      this.updateSummaryCollapseState();
    });
    
    // Listen to tips changes
    this.orderForm.get('tips')?.valueChanges.subscribe(() => {
      this.calculateNewTotal();
    });

    // Listen to company development tips changes
    this.orderForm.get('companyDevelopmentTips')?.valueChanges.subscribe(() => {
      this.calculateNewTotal();
    });

    // Listen to date changes to unselect same day service
    this.orderForm.get('serviceDate')?.valueChanges.subscribe(value => {
      if (this.isSameDaySelected && value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayFormatted = `${year}-${month}-${day}`;
        
        // If the selected date is not today, unselect same day service
        if (value !== todayFormatted) {
          const sameDayService = this.selectedExtraServices.find(s => s.extraService.isSameDayService);
          if (sameDayService) {
            // Remove same day service from selected extra services
            this.selectedExtraServices = this.selectedExtraServices.filter(
              s => !s.extraService.isSameDayService
            );
            this.isSameDaySelected = false;
            this.calculateNewTotal();
          }
        }
      }
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
        this.originalSubscriptionDiscountAmount = order.subscriptionDiscountAmount || 0;
        this.originalMaidsCount = order.maidsCount;
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
    // Fix date handling to prevent timezone issues
    const serviceDate = new Date(order.serviceDate);
    const year = serviceDate.getFullYear();
    const month = String(serviceDate.getMonth() + 1).padStart(2, '0');
    const day = String(serviceDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    this.orderForm.patchValue({
      serviceDate: formattedDate,
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
      tips: order.tips,
      companyDevelopmentTips: order.companyDevelopmentTips || 0
    });

    // Load cities for the selected state
    if (order.state) {
      this.loadCities(order.state);
    }

    // Initialize gift card data if present
  if (order.giftCardCode) {
    this.originalGiftCardCode = order.giftCardCode;
    this.originalGiftCardAmountUsed = order.giftCardAmountUsed || 0;
    
    // Validate the gift card to get current balance
    this.bookingService.validatePromoCode(order.giftCardCode).subscribe({
      next: (validation) => {
        if (validation.isValid && validation.isGiftCard) {
          this.isGiftCard = true;
          this.giftCardApplied = true;
          this.giftCardBalance = validation.availableBalance || 0;
          // Add back the originally used amount to get total available
          this.giftCardBalance += this.originalGiftCardAmountUsed;
          this.calculateNewTotal();
        }
      }
    });
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

    // Sync cleaning type with restored extra services
    const currentCleaningType = this.getCurrentCleaningType();
    this.cleaningType.setValue(currentCleaningType);
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
      // Remove if already selected
      this.selectedExtraServices.splice(index, 1);
      
      // Clear mobile tooltip for this service immediately
      this.clearMobileTooltip(extraService.id);
      
      if (extraService.isSameDayService) {
        this.isSameDaySelected = false;
        this.updateDateRestrictions();
      }
    } else {
      // Clear all existing tooltips first
      this.clearAllMobileTooltips();
      
      // If selecting a cleaning type, remove other cleaning types
      if (extraService.isDeepCleaning || extraService.isSuperDeepCleaning) {
        // Remove any existing deep cleaning or super deep cleaning
        this.selectedExtraServices = this.selectedExtraServices.filter(
          s => !s.extraService.isDeepCleaning && !s.extraService.isSuperDeepCleaning
        );
      }
      
      // Add new selection
      this.selectedExtraServices.push({
        extraService: extraService,
        quantity: 1,
        hours: extraService.hasHours ? 0.5 : 0
      });
      
      // Show mobile tooltip for this service after a brief delay to ensure state is set
      setTimeout(() => {
        this.showMobileTooltip(extraService.id);
      }, 10);
      
      if (extraService.isSameDayService) {
        this.isSameDaySelected = true;
        this.updateDateRestrictions();
      }
    }
    
    this.calculateNewTotal();
  }

  // Mobile tooltip management methods
  showMobileTooltip(extraServiceId: number) {
    // Only show tooltip on mobile devices
    if (!this.isCurrentlyMobile()) return;
    
    // Clear any existing timeout for this service
    this.clearMobileTooltip(extraServiceId);
    
    // Set tooltip state to visible
    this.mobileTooltipStates[extraServiceId] = true;
    
    // Set timeout to hide tooltip after 5 seconds
    this.mobileTooltipTimeouts[extraServiceId] = setTimeout(() => {
      this.clearMobileTooltip(extraServiceId);
    }, 5000);
  }

  clearMobileTooltip(extraServiceId: number) {
    // Clear the timeout
    if (this.mobileTooltipTimeouts[extraServiceId]) {
      clearTimeout(this.mobileTooltipTimeouts[extraServiceId]);
      delete this.mobileTooltipTimeouts[extraServiceId];
    }
    
    // Set tooltip state to hidden
    this.mobileTooltipStates[extraServiceId] = false;
  }

  // Clear all mobile tooltips
  clearAllMobileTooltips() {
    // Clear all timeouts
    Object.keys(this.mobileTooltipTimeouts).forEach(key => {
      const id = parseInt(key);
      if (this.mobileTooltipTimeouts[id]) {
        clearTimeout(this.mobileTooltipTimeouts[id]);
      }
    });
    
    // Reset all tooltip states
    this.mobileTooltipTimeouts = {};
    this.mobileTooltipStates = {};
  }

  isMobileTooltipVisible(extraServiceId: number): boolean {
    return this.mobileTooltipStates[extraServiceId] || false;
  }

  // Check if currently on mobile
  isCurrentlyMobile(): boolean {
    return window.innerWidth <= 768;
  }

  private updateDateRestrictions() {
    if (this.isSameDaySelected) {
      const today = new Date();
      // Format date properly for HTML date input (YYYY-MM-DD)
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      this.orderForm.patchValue({ serviceDate: formattedDate });
    } else {
      // Set date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      this.orderForm.patchValue({ serviceDate: formattedDate });
    }
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

  getExtraServicePrice(extraService: ExtraService): number {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    
    // Get price multiplier based on cleaning type
    let priceMultiplier = 1;
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);

    if (superDeepCleaning) {
      priceMultiplier = superDeepCleaning.extraService.priceMultiplier;
    } else if (deepCleaning) {
      priceMultiplier = deepCleaning.extraService.priceMultiplier;
    }

    // Apply multiplier (except for same day service)
    const currentMultiplier = extraService.isSameDayService ? 1 : priceMultiplier;

    // Calculate price based on type
    if (extraService.hasHours) {
      // For hours-based services, use selected hours or default to 0.5
      const hours = selected ? selected.hours : 0.5;
      return extraService.price * hours * currentMultiplier;
    } else if (extraService.hasQuantity) {
      // For quantity-based services, use selected quantity or default to 1
      const quantity = selected ? selected.quantity : 1;
      return extraService.price * quantity * currentMultiplier;
    } else {
      return extraService.price * currentMultiplier;
    }
  }

  getExtraServiceDuration(extraService: ExtraService): number {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    
    // Calculate duration based on type
    if (extraService.hasHours) {
      // For hours-based services, use selected hours or default to 0.5
      const hours = selected ? selected.hours : 0.5;
      return extraService.duration * hours;
    } else if (extraService.hasQuantity) {
      // For quantity-based services, use selected quantity or default to 1
      const quantity = selected ? selected.quantity : 1;
      return extraService.duration * quantity;
    } else {
      return extraService.duration;
    }
  }

  getServicePrice(service: Service, quantity: number): number {
    // Get price multiplier based on cleaning type
    let priceMultiplier = 1;
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);

    if (superDeepCleaning) {
      priceMultiplier = superDeepCleaning.extraService.priceMultiplier;
    } else if (deepCleaning) {
      priceMultiplier = deepCleaning.extraService.priceMultiplier;
    }

    // Special handling for studio apartment (bedrooms = 0)
    if (service.serviceKey === 'bedrooms' && quantity === 0) {
      return 10 * priceMultiplier; // $10 base price for studio, adjusted by cleaning type
    }

    // Apply multiplier to service cost
    return service.cost * quantity * priceMultiplier;
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

  getFilteredExtraServices(): ExtraService[] {
    if (!this.serviceType || !this.serviceType.extraServices) {
      return [];
    }
    
    // Check if same day service was originally selected in the order
    const wasSameDayServiceSelected = this.order?.extraServices.some(orderExtra => {
      const extraService = this.serviceType!.extraServices.find(es => es.id === orderExtra.extraServiceId);
      return extraService?.isSameDayService;
    }) || false;
    
    // Filter out deep cleaning and super deep cleaning services
    // Also filter out same day service if it was not originally selected
    return this.serviceType.extraServices.filter(extra => {
      if (extra.isDeepCleaning || extra.isSuperDeepCleaning) {
        return false;
      }
      
      // Hide same day service if it was not originally selected
      if (extra.isSameDayService && !wasSameDayServiceSelected) {
        return false;
      }
      
      return true;
    });
  }

  getOriginalServiceHours(service: Service): number {
    if (!this.order || service.serviceRelationType !== 'cleaner') return 0;
    
    // Find the hours service for this service type
    const hoursService = this.serviceType?.services.find(s => 
      s.serviceRelationType === 'hours' && s.serviceTypeId === service.serviceTypeId
    );
    
    if (hoursService) {
      const orderHoursService = this.order.services.find(s => s.serviceId === hoursService.id);
      if (orderHoursService) {
        return orderHoursService.quantity;
      }
    }
    
    // Fallback: check if duration is stored with cleaner service
    const orderService = this.order.services.find(s => s.serviceId === service.id);
    if (orderService && orderService.duration) {
      return Math.floor(orderService.duration / 60);
    }
    
    return 0;
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

  // Add this detailed logging to your calculateNewTotal() method in order-edit.component.ts

  calculateNewTotal() {
    if (!this.serviceType) return;
  
    let subtotal = 0;
    let totalDuration = 0;
    let deepCleaningFee = 0;
    let displayDuration = 0;
    let actualTotalDuration = 0;
  
    // Check for deep cleaning multipliers
    let priceMultiplier = 1;
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      priceMultiplier = superDeepCleaning.extraService.priceMultiplier;
      deepCleaningFee = superDeepCleaning.extraService.price;
    } else if (deepCleaning) {
      priceMultiplier = deepCleaning.extraService.priceMultiplier;
      deepCleaningFee = deepCleaning.extraService.price;
    }
    
    // Calculate base price with multiplier
    if (this.serviceType) {
      const baseServiceCost = this.serviceType.basePrice * priceMultiplier;
      subtotal += baseServiceCost;
      
      // Add service type duration
      totalDuration += this.serviceType.timeDuration || 0;
      actualTotalDuration += this.serviceType.timeDuration || 0;
    }
  
    // Process regular services
    this.selectedServices.forEach(selectedService => {
      const service = selectedService.service;
      const quantity = selectedService.quantity;
      let serviceCost = 0;
      let serviceDuration = 0;
  
      // Special handling for studio apartments (bedrooms = 0)
      if (service.serviceKey === 'bedrooms' && quantity === 0) {
        // Studio apartment special pricing
        serviceCost = 10 * priceMultiplier; // Studio is $10
        serviceDuration = 20; // 20 minutes for studio
        
        subtotal += serviceCost;
        totalDuration += serviceDuration;
        actualTotalDuration += serviceDuration;
      } else if (quantity > 0) {
        // Calculate cost based on service type
        if (service.serviceRelationType === 'hours') {
          // For hours-based services, find the related cleaner service
          const cleanerService = this.selectedServices.find(s => 
            s.service.serviceRelationType === 'cleaner' && 
            s.service.serviceTypeId === service.serviceTypeId
          );
          
          if (cleanerService && cleanerService.quantity > 0) {
            serviceCost = service.cost * selectedService.quantity * cleanerService.quantity * priceMultiplier;
            serviceDuration = service.timeDuration * selectedService.quantity * cleanerService.quantity;
          }
        } else if (service.cost > 0) {
          serviceCost = service.cost * selectedService.quantity * priceMultiplier;
          serviceDuration = service.timeDuration * selectedService.quantity;
        } else {
          // Service with no cost (duration only)
          serviceDuration = service.timeDuration * selectedService.quantity;
        }
  
        subtotal += serviceCost;
        totalDuration += serviceDuration;
        actualTotalDuration += serviceDuration;
      }
    });
  
    // Process extra services
    this.selectedExtraServices.forEach(selectedExtra => {
      const extraService = selectedExtra.extraService;
      let extraCost = 0;
  
      if (!extraService.isDeepCleaning && !extraService.isSuperDeepCleaning) {
        // IMPORTANT FIX: Apply price multiplier to non-same-day extra services when deep cleaning is selected
        // Same day services keep their own multiplier (usually 1.0 or their specific multiplier)
        // Regular extra services get the deep cleaning multiplier applied
        const currentMultiplier = extraService.isSameDayService ? extraService.priceMultiplier : priceMultiplier;
  
        if (extraService.hasHours && selectedExtra.hours > 0) {
          extraCost = extraService.price * selectedExtra.hours * currentMultiplier;
        } else if (extraService.hasQuantity && selectedExtra.quantity > 0) {
          extraCost = extraService.price * selectedExtra.quantity * currentMultiplier;
        } else if (!extraService.hasHours && !extraService.hasQuantity) {
          extraCost = extraService.price * currentMultiplier;
        }
  
        subtotal += extraCost;
      } 
  
      totalDuration += extraService.duration;
      actualTotalDuration += extraService.duration;
    });
  
    // Continue with your existing calculation logic...
    
    // Check if we have cleaner-hours relationship
    const hasCleanerService = this.selectedServices.some(s => 
      s.service.serviceRelationType === 'cleaner'
    );
  
    // Calculate maids count and display duration
    let baseMaidsCount = 1;
    const extraCleaners = this.selectedExtraServices
      .filter(s => s.extraService.name.toLowerCase().includes('extra cleaner'))
      .reduce((sum, s) => sum + s.quantity, 0);
  
    if (hasCleanerService) {
      const cleanerService = this.selectedServices.find(s => 
        s.service.serviceRelationType === 'cleaner'
      );
      if (cleanerService) {
        baseMaidsCount = cleanerService.quantity;
      }
      displayDuration = actualTotalDuration;
    } else {
      const totalHours = totalDuration / 60;
      if (totalHours <= 6) {
        baseMaidsCount = 1;
        displayDuration = totalDuration;
      } else {
        baseMaidsCount = Math.ceil(totalHours / 6);
        displayDuration = totalDuration;
      }
    }
    
    this.calculatedMaidsCount = baseMaidsCount + extraCleaners;
    
    if (this.calculatedMaidsCount > 1 && !hasCleanerService) {
      displayDuration = Math.ceil(totalDuration / this.calculatedMaidsCount);
    } else if (hasCleanerService && this.calculatedMaidsCount > baseMaidsCount) {
      displayDuration = Math.ceil(actualTotalDuration / this.calculatedMaidsCount);
    }
    
    displayDuration = Math.max(displayDuration, 60);
  
    this.totalDuration = Math.max(displayDuration, 60);
    this.actualTotalDuration = Math.max(actualTotalDuration, 60);
  
    // Add deep cleaning fee AFTER all other calculations
    subtotal += deepCleaningFee;
  
    // Apply original discounts
    const discountedSubTotal = subtotal - this.originalDiscountAmount - this.originalSubscriptionDiscountAmount;
  
    // Make sure we don't go negative
    if (discountedSubTotal < 0) {
      this.newSubTotal = 0;
      this.newTax = 0;
    } else {
      this.newSubTotal = discountedSubTotal;
      this.newTax = Math.round(discountedSubTotal * this.salesTaxRate * 100) / 100;
    }
  
    // Get tips
    const tips = this.orderForm.get('tips')?.value || 0;
    const companyDevelopmentTips = this.orderForm.get('companyDevelopmentTips')?.value || 0;
    const totalTips = tips + companyDevelopmentTips;
  
    // Calculate new total
    this.newTotal = this.newSubTotal + this.newTax + totalTips;
  
    // Apply gift card if applicable
    let finalTotal = this.newTotal;
    if (this.giftCardApplied && this.isGiftCard) {
      const maxGiftCardUse = Math.min(this.giftCardBalance, this.newTotal);
      this.giftCardAmountToUse = maxGiftCardUse;
      finalTotal = Math.max(0, this.newTotal - this.giftCardAmountToUse);
    }
  
    this.newTotal = Math.round(finalTotal * 100) / 100;
  
    // Calculate the additional amount needed
    this.additionalAmount = this.newTotal - this.originalTotal;
  
    if (Math.abs(this.additionalAmount) < 0.01) {
      this.additionalAmount = 0;
    }
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
      entryMethod: formValue.entryMethod === 'Other' ? 
        formValue.customEntryMethod : formValue.entryMethod,
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
      tips: formValue.tips || 0,
      companyDevelopmentTips: formValue.companyDevelopmentTips || 0,
      totalDuration: this.actualTotalDuration,
      maidsCount: this.calculatedMaidsCount,
      calculatedSubTotal: this.newSubTotal + this.originalDiscountAmount + this.originalSubscriptionDiscountAmount,
      calculatedTax: this.newTax,
      calculatedTotal: this.newTotal
    };
  }

  ngOnDestroy() {
    // Clean up Stripe elements when component is destroyed
    this.stripeService.destroyCardElement();
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

    // Store update data for later use
    this.updateData = this.prepareUpdateData();

    // Check if additional payment is needed
    if (this.additionalAmount > 0) {
      this.showPaymentModal = true;
      // Initialize Stripe elements when modal opens
      setTimeout(() => this.initializeStripeElements(), 100);
    } else {
      this.saveOrder();
    }
  }

  private async initializeStripeElements() {
    try {
      await this.stripeService.initializeElements();
      const cardElement = this.stripeService.createCardElement('card-element-order-edit');
      
      if (cardElement) {
        cardElement.on('change', (event: any) => {
          this.cardError = event.error ? event.error.message : null;
        });
      }
    } catch (error) {
      console.error('Failed to initialize Stripe elements:', error);
      this.paymentErrorMessage = 'Failed to initialize payment form';
    }
  }

  saveOrder() {
    if (!this.order) return;

    this.isSaving = true;
    this.errorMessage = '';
    const updateData = this.updateData || this.prepareUpdateData();

    this.orderService.updateOrder(this.order.id, updateData).subscribe({
      next: (updatedOrder) => {
        this.successMessage = 'Order updated successfully';
        
        // Refresh user profile to ensure phone is updated if changed
        this.authService.refreshUserProfile().subscribe({
          next: () => {
          }
        });
        
        setTimeout(() => {
          this.router.navigate(['/order', this.order!.id]);
        }, 1500);
      },
      error: (error) => {
        console.error('Update error:', error);
        this.errorMessage = error.error?.message || error.error || 'Failed to update order';
        this.isSaving = false;
        window.scrollTo(0, 0);
      }
    });
  }

  async processAdditionalPayment() {
    if (!this.order || !this.updateData || this.isProcessingPayment || this.cardError) return;

    this.isProcessingPayment = true;
    this.paymentErrorMessage = '';

    try {
      // Step 1: Create payment intent for the additional amount
      this.orderService.createUpdatePaymentIntent(this.order.id, this.updateData).subscribe({
        next: async (response) => {
          this.paymentClientSecret = response.paymentClientSecret;

          try {
            // Step 2: Confirm the payment with Stripe
            const paymentIntent = await this.stripeService.confirmCardPayment(
              response.paymentClientSecret,
              this.getBillingDetails()
            );

            // Step 3: Confirm with backend and update the order
            this.orderService.confirmUpdatePayment(
              this.order!.id, 
              paymentIntent.id,
              this.updateData!
            ).subscribe({
              next: (updatedOrder) => {
                this.showPaymentModal = false;
                this.successMessage = 'Order updated successfully';
                
                // Refresh user profile to ensure phone is updated if changed
                this.authService.refreshUserProfile().subscribe({
                  next: () => {
                  }
                });
                
                setTimeout(() => {
                  this.router.navigate(['/order', this.order!.id]);
                }, 1500);
              },
              error: (error) => {
                this.paymentErrorMessage = error.error?.message || 'Failed to update order after payment';
                this.isProcessingPayment = false;
              }
            });
          } catch (paymentError: any) {
            // Payment failed
            this.paymentErrorMessage = paymentError.message || 'Payment failed. Please try again.';
            this.isProcessingPayment = false;
          }
        },
        error: (error) => {
          this.paymentErrorMessage = error.error?.message || 'Failed to create payment';
          this.isProcessingPayment = false;
        }
      });
    } catch (error: any) {
      this.paymentErrorMessage = 'An unexpected error occurred';
      this.isProcessingPayment = false;
    }
  }

  private getBillingDetails() {
    const formValue = this.orderForm.value;
    return {
      name: `${formValue.contactFirstName} ${formValue.contactLastName}`,
      email: formValue.contactEmail,
      phone: formValue.contactPhone,
      address: {
        line1: formValue.serviceAddress,
        line2: formValue.aptSuite || '',
        city: formValue.city,
        state: formValue.state,
        postal_code: formValue.zipCode
      }
    };
  }


  closePaymentModal() {
    if (!this.isProcessingPayment) {
      this.showPaymentModal = false;
      this.paymentErrorMessage = '';
      this.cardError = null;
      // Clean up Stripe elements
      this.stripeService.destroyCardElement();
    }
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
    // Ensure minimum 1 hour (60 minutes) before formatting
    const adjustedMinutes = Math.max(minutes, 60);
    return DurationUtils.formatDurationRounded(adjustedMinutes);
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  formatServiceDuration(minutes: number): string {
    // Use actual duration for individual services
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  get minDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get tips() {
    return this.orderForm.get('tips')!;
  }

  get companyDevelopmentTips() {
    return this.orderForm.get('companyDevelopmentTips')!;
  }
  
  get totalDurationDisplay(): number {
    return this.totalDuration;
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

  getServiceDuration(service: Service): number {
    // Get duration multiplier based on cleaning type
    let durationMultiplier = 1;
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);

    if (superDeepCleaning) {
      durationMultiplier = superDeepCleaning.extraService.priceMultiplier;
    } else if (deepCleaning) {
      durationMultiplier = deepCleaning.extraService.priceMultiplier;
    }

    // Special handling for studio apartment (bedrooms = 0)
    if (service.serviceKey === 'bedrooms' && this.getServiceQuantity(service) === 0) {
      return Math.round(30 * durationMultiplier); // 20 minutes base for studio, adjusted by cleaning type
    }

    // Apply multiplier to service duration
    return Math.round(service.timeDuration * durationMultiplier);
  }

  getAvailableTimeSlots(): string[] {
    const selectedDate = this.orderForm.get('serviceDate')?.value;
    if (!selectedDate) return [];

    // Time slots from 8:00 AM to 6:00 PM (30-minute intervals) for all days
    const timeSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00'
    ];

    return timeSlots;
  }

  formatTimeSlot(timeSlot: string): string {
    const [hour, minute] = timeSlot.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  }

  // Handle cleaning type selection
  onCleaningTypeChange(cleaningType: string) {
    // Remove any existing deep cleaning or super deep cleaning services
    this.selectedExtraServices = this.selectedExtraServices.filter(
      s => !s.extraService.isDeepCleaning && !s.extraService.isSuperDeepCleaning
    );

    // Add the selected cleaning type if not normal
    if (cleaningType !== 'normal' && this.serviceType) {
      const cleaningService = this.serviceType.extraServices.find(extra => {
        if (cleaningType === 'deep' && extra.isDeepCleaning) return true;
        if (cleaningType === 'super-deep' && extra.isSuperDeepCleaning) return true;
        return false;
      });

      if (cleaningService) {
        this.selectedExtraServices.push({
          extraService: cleaningService,
          quantity: 1,
          hours: cleaningService.hasHours ? 0.5 : 0
        });
      }
    }

    this.calculateNewTotal();
  }

  // Get current cleaning type from form
  getCurrentCleaningType(): string {
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      return 'super-deep';
    } else if (deepCleaning) {
      return 'deep';
    }
    return 'normal';
  }

  getExtraCleanersCount(): number {
    const extraCleanersService = this.selectedExtraServices.find(s => 
      s.extraService.name === 'Extra Cleaners' && s.extraService.hasQuantity
    );
    return extraCleanersService ? extraCleanersService.quantity : 0;
  }

  getCleanerPricePerHour(): number {
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    // Get the actual cleaner service cost from the selected services
    const cleanerService = this.selectedServices.find(s => s.service.serviceRelationType === 'cleaner');
    const basePrice = cleanerService ? cleanerService.service.cost : 40; // fallback to 40 if no cleaner service found
    
    if (superDeepCleaning) {
      return basePrice * superDeepCleaning.extraService.priceMultiplier;
    } else if (deepCleaning) {
      return basePrice * deepCleaning.extraService.priceMultiplier;
    }
    
    return basePrice; // regular cleaning - no multiplier
  }

  getExtraServiceIcon(extraService: ExtraService): string {
    const serviceName = extraService.name.toLowerCase();
    
    if (serviceName.includes('same day')) return 'fas fa-bolt';
    if (serviceName.includes('extra cleaners')) return 'fas fa-users';
    if (serviceName.includes('extra minutes')) return 'fas fa-clock';
    if (serviceName.includes('cleaning supplies')) return 'fas fa-spray-can';
    if (serviceName.includes('vacuum cleaner')) return 'fas fa-stethoscope fa-flip-vertical';
    if (serviceName.includes('pets')) return 'fas fa-paw';
    if (serviceName.includes('fridge')) return 'fas fa-toilet-portable';
    if (serviceName.includes('oven')) return 'fas fa-pager fa-flip-vertical';
    if (serviceName.includes('kitchen cabinets')) return 'fas fa-box-archive';
    if (serviceName.includes('closets')) return 'fas fa-calendar-week fa-flip-vertical';
    if (serviceName.includes('dishes')) return 'fas fa-utensils';
    if (serviceName.includes('baseboards')) return 'fas fa-ruler-horizontal';
    if (serviceName.includes('windows')) return 'fas fa-table';
    if (serviceName.includes('walls')) return 'fas fa-clapperboard fa-flip-vertical';
    if (serviceName.includes('stairs')) return 'fas fa-stairs';
    if (serviceName.includes('folding') || serviceName.includes('folding / organizing')) return 'fas fa-layer-group';
    if (serviceName.includes('laundry')) return 'fas fa-camera-retro';
    if (serviceName.includes('balcony')) return 'fas fa-store';
    if (serviceName.includes('office')) return 'fas fa-building';
    if (serviceName.includes('couches')) return 'fas fa-couch';
    
    // Default icon for unknown services
    return 'fas fa-plus';
  }

  getExtraServiceTooltip(extra: ExtraService): string {
    let tooltip = extra.description || '';
    
    // Add additional info for Extra Cleaners
    if (extra.name === 'Extra Cleaners') {
      tooltip += '\n\nEach extra cleaner reduces service duration.';
    }
    
    return tooltip;
  }

  get cleaningType() {
    return this.orderForm.get('cleaningType') as FormControl;
  }

  onDateChange(date: string) {
    this.orderForm.patchValue({ serviceDate: date });
  }

  onTimeChange(time: string) {
    this.orderForm.patchValue({ serviceTime: time });
  }

  toggleOrderSummary() {
    this.isSummaryCollapsed = !this.isSummaryCollapsed;
    
    // Scroll to the order summary
    setTimeout(() => {
      const summaryElement = document.querySelector('.order-summary');
      if (summaryElement) {
        summaryElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }

  private updateSummaryCollapseState() {
    if (window.innerWidth <= 1200) {
      this.isSummaryCollapsed = true;
    } else {
      this.isSummaryCollapsed = false;
    }
  }
}