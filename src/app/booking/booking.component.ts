import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { BookingService, ServiceType, Service, ExtraService, Subscription, BookingCalculation } from '../services/booking.service';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { LocationService } from '../services/location.service';
import { BookingDataService } from '../services/booking-data.service';
import { DurationUtils } from '../utils/duration.utils';

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
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  providers: [BookingService],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit {
  // Data
  serviceTypes: ServiceType[] = [];
  subscriptions: Subscription[] = [];
  currentUser: any = null;
  userApartments: any[] = [];
  
  // Selected values
  selectedServiceType: ServiceType | null = null;
  selectedServices: SelectedService[] = [];
  selectedExtraServices: SelectedExtraService[] = [];
  selectedSubscription: Subscription | null = null;
  
  // Form
  bookingForm: FormGroup;
  
  // Calculation
  calculation: BookingCalculation = {
    subTotal: 0,
    tax: 0,
    discountAmount: 0,
    tips: 0,
    total: 0,
    totalDuration: 0
  };
  
  // UI state
  isLoading = false;
  errorMessage = '';
  isSameDaySelected = false;
  hasFirstTimeDiscount = false;
  firstTimeDiscountApplied = false;
  promoCodeApplied = false;
  promoDiscount = 0;
  promoIsPercentage = true;
  calculatedMaidsCount = 1;
  actualTotalDuration: number = 0;
  
  // Subscription-related properties
  userSubscription: any = null;
  hasActiveSubscription = false;
  nextOrderDiscount = 0;
  nextOrderTotal = 0;
  subscriptionDiscountAmount = 0;
  promoOrFirstTimeDiscountAmount = 0;
  
  // Constants
  salesTaxRate = 0.088; // 8.8%
  minDate = new Date();
  minTipAmount = 10; // Minimum tip amount when user enters a custom value
  
  // Entry methods
  entryMethods = [
    'I will be home',
    'Doorman',
    'Hidden key',
    'Office reception',
    'Other'
  ];
  
  
  // States and Cities - will be loaded from backend
  states: string[] = [];
  cities: string[] = [];

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private authService: AuthService,
    private profileService: ProfileService,
    private locationService: LocationService,
    private router: Router,
    private bookingDataService: BookingDataService
  ) {
    this.bookingForm = this.fb.group({
      serviceDate: [{value: '', disabled: false}, Validators.required],
      serviceTime: ['', Validators.required],
      entryMethod: ['', Validators.required],
      customEntryMethod: [''],
      specialInstructions: [''],
      contactFirstName: ['', Validators.required],
      contactLastName: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      useApartmentAddress: [false],
      selectedApartmentId: [''],
      serviceAddress: ['', Validators.required],
      apartmentName: [''],
      aptSuite: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      promoCode: [''],
      tips: [0, [
        Validators.min(0),
        (control: AbstractControl): ValidationErrors | null => {
          const value = control.value;
          if (value === 0) return null; // Allow 0 as default
          return value >= this.minTipAmount ? null : { minTipAmount: true };
        }
      ]]
    });
  }

  ngOnInit() {
    // Always load fresh subscription data
    this.loadUserSubscription();
    // Set minimum date to tomorrow
    this.minDate = new Date();
    this.minDate.setDate(this.minDate.getDate() + 2); // Add one day to make it tomorrow
    this.minDate.setHours(0, 0, 0, 0);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // Set default values
    this.serviceDate.setValue(formattedDate);
    this.serviceTime.setValue('08:00');
    
    // Only refresh user profile if logged in
    if (this.authService.isLoggedIn()) {
      // Refresh user data to ensure we have the latest firstTimeOrder status
      this.authService.refreshUserProfile().subscribe({
        next: () => {
          this.loadInitialData();
          this.setupFormListeners();
        },
        error: () => {
          // Even if refresh fails, continue with cached data
          this.loadInitialData();
          this.setupFormListeners();
        }
      });
    } else {
      // Not logged in, skip refresh and just load initial data
      this.loadInitialData();
      this.setupFormListeners();
    }
  }

  private loadInitialData() {
    // Load service types
    this.bookingService.getServiceTypes().subscribe({
      next: (serviceTypes) => {
        this.serviceTypes = serviceTypes;
      },
      error: (error) => {
        console.error('Failed to load service types:', error);
        this.errorMessage = 'Failed to load service types';
      }
    });

    // Load location data
    this.locationService.getStates().subscribe({
      next: (states) => {
        this.states = states;
        if (states.length > 0) {
          this.bookingForm.patchValue({ state: states[0] });
          this.loadCities(states[0]);
        }
      }
    });

    // Load subscriptions
    this.bookingService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        this.subscriptions = subscriptions;

        // Only set default if user doesn't have an active subscription
        // OR if we haven't loaded the user subscription data yet
        if (!this.hasActiveSubscription) {
          // Set "One Time" as default selected subscription
          if (subscriptions.length > 0) {
            const oneTimeSubscription = subscriptions.find(s => s.name === 'One Time') || subscriptions[0];
            this.selectedSubscription = oneTimeSubscription;
          }
        } else if (this.userSubscription) {
          // If we already have user subscription data, update the selection now
          this.updateSelectedSubscription();
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load subscriptions';
      }
    });

    // Load current user data
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.hasFirstTimeDiscount = user.firstTimeOrder;
        this.bookingForm.patchValue({
          contactFirstName: user.firstName,
          contactLastName: user.lastName,
          contactEmail: user.email,
          contactPhone: user.phone || ''
        });
        
        // Load user apartments
        this.profileService.getApartments().subscribe({
          next: (apartments) => {
            this.userApartments = apartments;

            // Auto-fill with first apartment if available
            if (apartments.length > 0) {
              const firstApartment = apartments[0];
              this.bookingForm.patchValue({
                selectedApartmentId: firstApartment.id.toString()
              });
              this.fillApartmentAddress(firstApartment.id.toString());
            }
          }
        });

        // Load user subscription after loading user data
        this.loadUserSubscription();
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
    this.bookingForm.patchValue({ city: '' });
  }

  private setupFormListeners() {
    // Listen to apartment selection changes
    this.bookingForm.get('selectedApartmentId')?.valueChanges.subscribe(apartmentId => {
      const apartmentNameControl = this.bookingForm.get('apartmentName');
      
      if (apartmentId) {
        // Using saved apartment - remove apartment name requirement
        apartmentNameControl?.clearValidators();
        apartmentNameControl?.setValue('');
      } else {
        // Entering new address - apartment name is required
        apartmentNameControl?.setValidators([Validators.required]);
      }
      
      apartmentNameControl?.updateValueAndValidity();
    });
  
    // Listen to tips changes
    this.bookingForm.get('tips')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });

    // Listen to service date changes
    this.bookingForm.get('serviceDate')?.valueChanges.subscribe(newDate => {
      if (this.isSameDaySelected && newDate) {
        const today = new Date();
        const selectedDate = new Date(newDate);
        
        // Check if the selected date is not today
        if (selectedDate.toDateString() !== today.toDateString()) {
          // Find and remove the same day service
          const sameDayService = this.selectedExtraServices.find(s => s.extraService.isSameDayService);
          if (sameDayService) {
            this.toggleExtraService(sameDayService.extraService);
          }
        }
      }
    });
  }

  onApartmentSelect(event: any) {
    const apartmentId = event.target.value;
    if (apartmentId) {
      this.fillApartmentAddress(apartmentId);
    }
  }

  clearApartmentSelection() {
    this.bookingForm.patchValue({
      selectedApartmentId: '',
      serviceAddress: '',
      aptSuite: '',
      city: '',
      state: this.states.length > 0 ? this.states[0] : '',
      zipCode: ''
    });
    
    // Load cities for the default state
    if (this.states.length > 0) {
      this.loadCities(this.states[0]);
    }
  }

  selectServiceType(serviceType: ServiceType) {
    this.selectedServiceType = serviceType;
    this.selectedServices = [];
    this.selectedExtraServices = [];
    
    // Initialize services based on type
    if (serviceType.services) {
      serviceType.services.forEach(service => {
        if (service.inputType === 'dropdown') {
          // Set default to 0 for bedrooms, otherwise use minValue or 1
          const defaultQuantity = service.serviceKey === 'bedrooms' ? 0 : (service.minValue || 1);
          this.selectedServices.push({
            service: service,
            quantity: defaultQuantity
          });
        } else if (service.isRangeInput) {
          this.selectedServices.push({
            service: service,
            quantity: service.minValue || 400
          });
        }
      });
    }
    
    this.calculateTotal();
  }


  updateServiceQuantity(service: Service, quantity: number) {
    const selectedService = this.selectedServices.find(s => s.service.id === service.id);
    if (selectedService) {
      selectedService.quantity = quantity;
      // When cleaners or hours change, update the display for both
      if (service.serviceKey === 'cleaners' || service.serviceKey === 'hours') {
        // Force Angular to detect changes
        this.selectedServices = [...this.selectedServices];
      }
      this.calculateTotal();
    }
  }

  toggleExtraService(extraService: ExtraService) {
    const index = this.selectedExtraServices.findIndex(s => s.extraService.id === extraService.id);
    
    if (index > -1) {
      // Remove if already selected
      this.selectedExtraServices.splice(index, 1);
      
      if (extraService.isSameDayService) {
        this.isSameDaySelected = false;
        this.updateDateRestrictions();
      }
    } else {
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
      
      if (extraService.isSameDayService) {
        this.isSameDaySelected = true;
        this.updateDateRestrictions();
      }
    }
    
    this.calculateTotal();
  }

  updateExtraServiceQuantity(extraService: ExtraService, quantity: number) {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    if (selected && quantity >= 1) {
      selected.quantity = quantity;
      this.calculateTotal();
    }
  }

  updateExtraServiceHours(extraService: ExtraService, hours: number) {
    const selected = this.selectedExtraServices.find(s => s.extraService.id === extraService.id);
    if (selected && hours >= 0.5) {
      selected.hours = hours;
      this.calculateTotal();
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

  selectSubscription(subscription: Subscription) {
    this.selectedSubscription = subscription;
    this.calculateTotal();
  }

  applyPromoCode() {
    // Check if the control is disabled
    if (this.promoCode.disabled) {
      return;
    }

    const code = this.promoCode.value;
    if (!code) return;

    // If first-time discount is already applied, show error
    if (this.firstTimeDiscountApplied) {
      this.errorMessage = 'Cannot apply promo code when first-time discount is already applied. Please remove the first-time discount first.';
      return;
    }

    // Clear any previous error
    this.errorMessage = '';

    this.bookingService.validatePromoCode(code).subscribe({
      next: (validation) => {
        if (validation.isValid) {
          this.promoCodeApplied = true;
          this.promoDiscount = validation.discountValue;
          this.promoIsPercentage = validation.isPercentage;
          this.calculateTotal();
        } else {
          this.errorMessage = validation.message || 'Invalid promo code';
        }
      },
      error: () => {
        this.errorMessage = 'Failed to validate promo code';
      }
    });
  }

  applyFirstTimeDiscount() {
    // If promo code is already applied, show error
    if (this.promoCodeApplied) {
      this.errorMessage = 'Cannot apply first-time discount when a promo code is already applied. Please remove the promo code first.';
      return;
    }
    
    this.firstTimeDiscountApplied = true;
    // Disable the promo code input
    this.promoCode.disable();
    this.errorMessage = '';
    this.calculateTotal();
  }

  private updateDateRestrictions() {
    if (this.isSameDaySelected) {
      const today = new Date();
      // Format date properly for HTML date input (YYYY-MM-DD)
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      this.serviceDate.setValue(formattedDate);
    } else {
      // Set date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      this.serviceDate.setValue(formattedDate);
      this.serviceDate.enable();
    }
  }

  private fillApartmentAddress(apartmentId: string) {
    const apartment = this.userApartments.find(a => a.id === +apartmentId);
    if (apartment) {
      // First set the state and load cities
      this.bookingForm.patchValue({
        state: apartment.state
      });
      
      // Load cities for the state, then set the rest of the address
      this.locationService.getCities(apartment.state).subscribe({
        next: (cities) => {
          this.cities = cities;
          
          // Now set all address fields including city
          this.bookingForm.patchValue({
            serviceAddress: apartment.address,
            aptSuite: apartment.aptSuite || '',
            city: apartment.city,
            zipCode: apartment.postalCode
          });
        }
      });
    }
  }

  private calculateTotal() {
    let subTotal = 0;
    let totalDuration = 0;
    let actualTotalDuration = 0;
    let deepCleaningFee = 0;
    let displayDuration = 0;
    let useExplicitHours = false;

    // Check for deep cleaning multipliers FIRST
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
    if (this.selectedServiceType) {
      subTotal += this.selectedServiceType.basePrice * priceMultiplier;
    }

    // Check if we have cleaner-hours relationship
    const hasCleanerService = this.selectedServices.some(s => 
      s.service.serviceRelationType === 'cleaner'
    );
    const hoursService = this.selectedServices.find(s => 
      s.service.serviceRelationType === 'hours'
    );

    // If we have both cleaner and hours services, use hours as the duration
    if (hasCleanerService && hoursService) {
      useExplicitHours = true;
      actualTotalDuration = hoursService.quantity * 60;
      totalDuration = actualTotalDuration;
    }

    // Calculate service costs
    this.selectedServices.forEach(selected => {
      if (selected.service.serviceRelationType === 'cleaner') {
        if (hoursService) {
          const hours = hoursService.quantity;
          const cleaners = selected.quantity;
          const costPerCleanerPerHour = selected.service.cost * priceMultiplier;
          const cost = costPerCleanerPerHour * cleaners * hours;
          subTotal += cost;
        }
      } else if (selected.service.serviceKey === 'bedrooms' && selected.quantity === 0) {
        const cost = 20 * priceMultiplier;
        subTotal += cost;
        if (!useExplicitHours) {
          totalDuration += 20;
          actualTotalDuration += 20;
        }
      } else if (selected.service.serviceRelationType !== 'hours') {
        const cost = selected.service.cost * selected.quantity * priceMultiplier;
        subTotal += cost;
        if (!useExplicitHours) {
          totalDuration += selected.service.timeDuration * selected.quantity;
          actualTotalDuration += selected.service.timeDuration * selected.quantity;
        }
      }
    });

    // Calculate extra service costs
    this.selectedExtraServices.forEach(selected => {
      if (!selected.extraService.isDeepCleaning && !selected.extraService.isSuperDeepCleaning) {
        const currentMultiplier = selected.extraService.isSameDayService ? 1 : priceMultiplier;
        
        if (selected.extraService.hasHours) {
          subTotal += selected.extraService.price * selected.hours * currentMultiplier;
          if (!useExplicitHours) {
            totalDuration += selected.extraService.duration * selected.hours;
            actualTotalDuration += selected.extraService.duration * selected.hours;
          }
        } else if (selected.extraService.hasQuantity) {
          subTotal += selected.extraService.price * selected.quantity * currentMultiplier;
          if (!useExplicitHours) {
            totalDuration += selected.extraService.duration * selected.quantity;
            actualTotalDuration += selected.extraService.duration * selected.quantity;
          }
        } else {
          subTotal += selected.extraService.price * currentMultiplier;
          if (!useExplicitHours) {
            totalDuration += selected.extraService.duration;
            actualTotalDuration += selected.extraService.duration;
          }
        }
      } else {
        if (!useExplicitHours) {
          totalDuration += selected.extraService.duration;
          actualTotalDuration += selected.extraService.duration;
        }
      }
    });

    // Calculate maids count
    this.calculatedMaidsCount = 1;

    if (hasCleanerService) {
      const cleanerService = this.selectedServices.find(s => 
        s.service.serviceRelationType === 'cleaner'
      );
      if (cleanerService) {
        this.calculatedMaidsCount = cleanerService.quantity;
      }
      displayDuration = actualTotalDuration;
    } else {
      const totalHours = totalDuration / 60;
      if (totalHours <= 6) {
        this.calculatedMaidsCount = 1;
        displayDuration = totalDuration;
      } else {
        this.calculatedMaidsCount = Math.ceil(totalHours / 6);
        displayDuration = Math.ceil(totalDuration / this.calculatedMaidsCount);
      }
    }

    // Store the actual total duration for backend
    this.actualTotalDuration = actualTotalDuration;

    // Add deep cleaning fee AFTER discounts are calculated
    subTotal += deepCleaningFee;

    // Reset discount amounts
    this.subscriptionDiscountAmount = 0;
    this.promoOrFirstTimeDiscountAmount = 0;

    // Calculate subscription discount if applicable
    const isUsingSubscriptionSubscription = this.hasActiveSubscription && 
    this.userSubscription && 
    this.selectedSubscription && 
    this.selectedSubscription.subscriptionDays > 0 &&
    this.getSubscriptionDaysForSubscription(this.userSubscription.subscriptionName) === this.selectedSubscription.subscriptionDays;
      
    if (this.hasActiveSubscription && this.userSubscription && this.userSubscription.discountPercentage > 0) {
    console.log('Applying subscription discount:', {
      hasActiveSubscription: this.hasActiveSubscription,
      subscriptionName: this.userSubscription.subscriptionName,
      discountPercentage: this.userSubscription.discountPercentage
    });
    this.subscriptionDiscountAmount = Math.round(subTotal * (this.userSubscription.discountPercentage / 100) * 100) / 100;
    } else {
    console.log('NOT applying subscription discount:', {
      hasActiveSubscription: this.hasActiveSubscription,
      reason: !this.hasActiveSubscription ? 'No active subscription' : 
              !this.userSubscription ? 'No subscription data' :
              'Not using subscription subscription'
    });
    this.subscriptionDiscountAmount = 0;
    }

    // Calculate promo or first-time discount (can stack with subscription)
    if (this.hasFirstTimeDiscount && this.currentUser?.firstTimeOrder && this.firstTimeDiscountApplied) {
      this.promoOrFirstTimeDiscountAmount = Math.round(subTotal * 0.20 * 100) / 100;
    } else if (this.promoCodeApplied) {
      if (this.promoIsPercentage) {
        this.promoOrFirstTimeDiscountAmount = Math.round(subTotal * (this.promoDiscount / 100) * 100) / 100;
      } else {
        this.promoOrFirstTimeDiscountAmount = this.promoDiscount;
      }
    }

    // Total discount is the sum of both
    const totalDiscountAmount = this.subscriptionDiscountAmount + this.promoOrFirstTimeDiscountAmount;

    

    // Calculate tax on discounted subtotal
    const discountedSubTotal = subTotal - totalDiscountAmount;
    const tax = Math.round(discountedSubTotal * this.salesTaxRate * 100) / 100;

    // Get tips
    const tips = this.tips.value || 0;

    // Calculate total
    const total = discountedSubTotal + tax + tips;

    // For display, when using explicit hours, show the hours directly
    if (useExplicitHours && hoursService) {
      displayDuration = hoursService.quantity * 60;
    }

    this.calculation = {
      subTotal: Math.round(subTotal * 100) / 100,
      tax,
      discountAmount: totalDiscountAmount,
      tips,
      total: Math.round(total * 100) / 100,
      totalDuration: displayDuration
    };

    // Calculate next order's total with subscription discount
    if (this.selectedSubscription && this.selectedSubscription.subscriptionDays > 0 && !this.hasActiveSubscription) {
    const nextOrderDiscountPercentage = this.selectedSubscription.discountPercentage;
    this.nextOrderDiscount = Math.round(subTotal * (nextOrderDiscountPercentage / 100) * 100) / 100;
    
    // Calculate tax on the discounted subtotal for next order
    const nextOrderDiscountedSubTotal = subTotal - this.nextOrderDiscount;
    const nextOrderTax = Math.round(nextOrderDiscountedSubTotal * this.salesTaxRate * 100) / 100;
    
    this.nextOrderTotal = nextOrderDiscountedSubTotal + nextOrderTax;
    } else {
      this.nextOrderDiscount = 0;
      this.nextOrderTotal = 0;
    }
  }

   // Get cleaning type text
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

  // Get cleaner pricing text
  getCleanerPricingText(): string {
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      return 'Hourly Service: $80 per hour/per cleaner <span class="cleaning-type-red">(Super Deep Cleaning)</span>';
    } else if (deepCleaning) {
      return 'Hourly Service: $60 per hour/per cleaner <span class="cleaning-type-red">(Deep Cleaning)</span>';
    }
    return 'Hourly Service: $40 per hour/per cleaner';
  }

  // Get cleaner cost display
  getCleanerCostDisplay(cleanerCount: number): string {
    const pricePerHour = this.getCleanerPricePerHour();
    const hoursService = this.selectedServices.find(s => s.service.serviceRelationType === 'hours');
    const hours = hoursService ? hoursService.quantity : 0;
    
    if (hours === 0) {
      return `${cleanerCount} cleaner${cleanerCount > 1 ? 's' : ''} × ${pricePerHour}/hour`;
    } else {
      const totalCost = cleanerCount * hours * pricePerHour;
      return `${cleanerCount} × ${hours}h × ${pricePerHour} = ${totalCost}`;
    }
  }

  // Get hours cost display
  getHoursCostDisplay(hours: number): string {
    const pricePerHour = this.getCleanerPricePerHour();
    const cleanersService = this.selectedServices.find(s => s.service.serviceRelationType === 'cleaner');
    const cleaners = cleanersService ? cleanersService.quantity : 0;
    
    if (cleaners === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const totalCost = cleaners * hours * pricePerHour;
      return `${cleaners} cleaner${cleaners > 1 ? 's' : ''} × ${hours}h = ${totalCost}`;
    }
  }

  // Check if we have cleaner services
  hasCleanerServices(): boolean {
    return this.selectedServices.some(s => s.service.serviceRelationType === 'cleaner');
  }

  // Get cleaner price per hour based on cleaning type
  private getCleanerPricePerHour(): number {
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      return 80;
    } else if (deepCleaning) {
      return 60;
    }
    return 40;
  }

  formatDuration(minutes: number): string {
    // Use rounded duration
    const baseFormat = DurationUtils.formatDurationRounded(minutes);
    
    // Preserve your "per maid" logic
    if (this.calculatedMaidsCount > 1) {
      return `${baseFormat} per maid`;
    }
    return baseFormat;
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

  formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const formatted = `${hour12}:${minutes} ${ampm}`;
    return formatted;
  }

  getServiceDuration(service: Service): number {
    if (service.serviceKey === 'bedrooms' && this.getServiceQuantity(service) === 0) {
      return 20; // 20 minutes for studio apartment
    }
    return service.timeDuration;
  }

  getServiceQuantity(service: Service): number {
    const selected = this.selectedServices.find(s => s.service.id === service.id);
    return selected ? selected.quantity : (service.minValue || 0);
  }

  getServiceTypeIcon(serviceType: ServiceType): string {
    // Map service types to icons
    const iconMap: { [key: string]: string } = {
      'Residential Cleaning': '🏠',
      'Office Cleaning': '🏢',
      'Commercial Cleaning': '🏪'
    };
    return iconMap[serviceType.name] || '🧹';
  }

  isFormValid(): boolean {
    return this.bookingForm.valid && 
           this.selectedServiceType !== null && 
           this.selectedSubscription !== null;
  }

  onSubmit() {

    if (!this.authService.isLoggedIn()) {
      // Store the current booking state if needed
      // You could implement a service to save the form state
      
      // Redirect to login with return URL
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: '/booking' }
      });
      return;
    }

    // Check if the form is valid
    if (!this.bookingForm.valid || !this.selectedServiceType || !this.selectedSubscription) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }
  
    this.isLoading = true;
    
    // Get form values, including disabled fields
    const formValue = this.bookingForm.getRawValue();
    
    // Debug log to check apartment ID
    // console.log('Form values:', formValue);
    console.log('Use Apartment Address:', formValue.useApartmentAddress);
    console.log('Selected apartment ID:', formValue.selectedApartmentId);
    console.log('Apartment ID being sent:', formValue.apartmentId);
    
    // Check if serviceDate exists
    if (!formValue.serviceDate) {
      this.errorMessage = 'Please select a service date';
      this.isLoading = false;
      return;
    }
    
    // Parse the date string and create a proper Date object
    let serviceDate: Date;
    
    if (typeof formValue.serviceDate === 'string') {
      const dateParts = formValue.serviceDate.split('-');
      if (dateParts.length === 3) {
        const [year, month, day] = dateParts.map(Number);
        serviceDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
      } else {
        this.errorMessage = 'Invalid date format';
        this.isLoading = false;
        return;
      }
    } else if (formValue.serviceDate instanceof Date) {
      serviceDate = formValue.serviceDate;
    } else {
      this.errorMessage = 'Invalid date format';
      this.isLoading = false;
      return;
    }
    
    // Determine apartmentId and apartmentName based on whether using saved apartment
    let apartmentId: number | null = null;
    let apartmentName: string | undefined = undefined;
    
    if (formValue.selectedApartmentId) {
      // Using a saved apartment
      apartmentId = Number(formValue.selectedApartmentId);
      // Find the apartment name from the selected apartment
      const selectedApartment = this.userApartments.find(a => a.id === apartmentId);
      if (selectedApartment) {
        apartmentName = selectedApartment.name;
      }
    } else if (formValue.apartmentName) {
      // Entering a new apartment
      apartmentName = formValue.apartmentName;
      // apartmentId remains null for new apartments
    }

    const shouldApplySubscriptionDiscount = this.hasActiveSubscription && 
  this.userSubscription && 
  this.userSubscription.discountPercentage > 0;

    
    const bookingData = {
      serviceTypeId: this.selectedServiceType.id,
      orderDate: new Date(), 
      services: this.selectedServices.map(s => ({
        serviceId: s.service.id,
        quantity: s.quantity
      })),
      extraServices: this.selectedExtraServices.map(s => ({
        extraServiceId: s.extraService.id,
        quantity: s.quantity,
        hours: s.hours
      })),
      subscriptionId: this.selectedSubscription.id,
      serviceDate: formValue.serviceDate,
      serviceTime: formValue.serviceTime,
      entryMethod: formValue.entryMethod === 'Other' 
        ? formValue.customEntryMethod 
        : formValue.entryMethod,
      specialInstructions: formValue.specialInstructions,
      contactFirstName: formValue.contactFirstName,
      contactLastName: formValue.contactLastName,
      contactEmail: formValue.contactEmail,
      contactPhone: formValue.contactPhone,
      serviceAddress: formValue.serviceAddress,
      aptSuite: formValue.aptSuite,
      city: formValue.city,
      state: formValue.state,
      zipCode: formValue.zipCode,
      apartmentId: apartmentId,
      apartmentName: apartmentName,
      promoCode: this.firstTimeDiscountApplied && !formValue.promoCode ? 'firstUse' : formValue.promoCode,
      tips: formValue.tips,
      maidsCount: this.calculatedMaidsCount,
      discountAmount: this.promoOrFirstTimeDiscountAmount,
      subscriptionDiscountAmount: shouldApplySubscriptionDiscount ? this.subscriptionDiscountAmount : 0,
      subTotal: this.calculation.subTotal,
      totalDuration: this.actualTotalDuration,
      hasActiveSubscription: this.hasActiveSubscription,
      userSubscriptionId: this.userSubscription?.subscriptionId
    };

    // Debug log the booking data
    console.log('Booking data being stored temporarily:', bookingData);

    // Store booking data in service instead of creating order immediately
    this.bookingDataService.setBookingData(bookingData);
    this.isLoading = false;
    
    // Navigate to booking confirmation without creating the order yet
    this.router.navigate(['/booking-confirmation']);
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

  getMinDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get apartmentName() { return this.bookingForm.get('apartmentName') as FormControl; }

  removePromoCode() {
    this.promoCodeApplied = false;
    this.promoDiscount = 0;
    this.promoCode.setValue('');
    this.errorMessage = ''; // Clear any error messages
    this.calculateTotal();
  }
  
  removeFirstTimeDiscount() {
    this.firstTimeDiscountApplied = false;
    // Re-enable the promo code input
    this.promoCode.enable();
    this.errorMessage = '';
    this.calculateTotal();
  }

  // Form control getters for type safety
  get serviceDate() { return this.bookingForm.get('serviceDate') as FormControl; }
  get serviceTime() { return this.bookingForm.get('serviceTime') as FormControl; }
  get entryMethod() { return this.bookingForm.get('entryMethod') as FormControl; }
  get customEntryMethod() { return this.bookingForm.get('customEntryMethod') as FormControl; }
  get specialInstructions() { return this.bookingForm.get('specialInstructions') as FormControl; }
  get contactFirstName() { return this.bookingForm.get('contactFirstName') as FormControl; }
  get contactLastName() { return this.bookingForm.get('contactLastName') as FormControl; }
  get contactEmail() { return this.bookingForm.get('contactEmail') as FormControl; }
  get contactPhone() { return this.bookingForm.get('contactPhone') as FormControl; }
  get useApartmentAddress() { return this.bookingForm.get('useApartmentAddress') as FormControl; }
  get selectedApartmentId() { return this.bookingForm.get('selectedApartmentId') as FormControl; }
  get serviceAddress() { return this.bookingForm.get('serviceAddress') as FormControl; }
  get aptSuite() { return this.bookingForm.get('aptSuite') as FormControl; }
  get city() { return this.bookingForm.get('city') as FormControl; }
  get state() { return this.bookingForm.get('state') as FormControl; }
  get zipCode() { return this.bookingForm.get('zipCode') as FormControl; }
  get promoCode() { return this.bookingForm.get('promoCode') as FormControl; }
  get tips() { return this.bookingForm.get('tips') as FormControl; }

  private loadUserSubscription() {
    this.bookingService.getUserSubscription().subscribe({
      next: (data) => {
        if (data.hasSubscription) {
          this.hasActiveSubscription = true;
          this.userSubscription = data;
          
          // If subscription is already loaded, update the selection
          if (this.subscriptions && this.subscriptions.length > 0) {
            this.updateSelectedSubscription();
          }
        } else {
          this.hasActiveSubscription = false;
          this.userSubscription = null;
        }
      },
      error: (error) => {
        console.error('Error loading subscription:', error);
        this.hasActiveSubscription = false;
      }
    });
  }
  
  private updateSelectedSubscription() {
    if (this.userSubscription && this.subscriptions) {
      const matchingSubscription = this.subscriptions.find(s => s.id === this.userSubscription.subscriptionId);

      if (matchingSubscription) {
        this.selectedSubscription = matchingSubscription;
        // Trigger calculation when subscription is updated
        this.calculateTotal();
      }
    }
  }

  // Helper method to map subscription name to subscription days
  getSubscriptionDaysForSubscription(subscriptionName: string | undefined): number {
    if (!subscriptionName) return 0;
    
    const mapping: { [key: string]: number } = {
      'Weekly': 7,
      'Bi-Weekly': 14,
      'Monthly': 30
    };
    return mapping[subscriptionName] || 0;
  }
}