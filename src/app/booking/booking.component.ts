import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { BookingService, ServiceType, Service, ExtraService, Frequency, BookingCalculation } from '../services/booking.service';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { LocationService } from '../services/location.service';

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
  frequencies: Frequency[] = [];
  currentUser: any = null;
  userApartments: any[] = [];
  
  // Selected values
  selectedServiceType: ServiceType | null = null;
  selectedServices: SelectedService[] = [];
  selectedExtraServices: SelectedExtraService[] = [];
  selectedFrequency: Frequency | null = null;
  
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
    private router: Router
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
    // Set minimum date to today
    this.minDate = new Date();
    this.minDate.setHours(0, 0, 0, 0);
    
    this.loadInitialData();
    this.setupFormListeners();
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

    // Load frequencies
    this.bookingService.getFrequencies().subscribe({
      next: (frequencies) => {
        this.frequencies = frequencies;
        // Set "One Time" as default selected frequency
        if (frequencies.length > 0) {
          const oneTimeFrequency = frequencies.find(f => f.name === 'One Time') || frequencies[0];
          this.selectedFrequency = oneTimeFrequency;
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load frequencies';
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
          }
        });
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
    // Listen to apartment selection
    this.bookingForm.get('useApartmentAddress')?.valueChanges.subscribe(useApartment => {
      if (useApartment) {
        const apartmentId = this.bookingForm.get('selectedApartmentId')?.value;
        if (apartmentId) {
          this.fillApartmentAddress(apartmentId);
        }
      }
    });

    this.bookingForm.get('selectedApartmentId')?.valueChanges.subscribe(apartmentId => {
      if (this.bookingForm.get('useApartmentAddress')?.value && apartmentId) {
        this.fillApartmentAddress(apartmentId);
      }
    });

    // Listen to tips changes
    this.bookingForm.get('tips')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  selectServiceType(serviceType: ServiceType) {
    this.selectedServiceType = serviceType;
    this.selectedServices = [];
    this.selectedExtraServices = [];
    
    // Initialize services based on type
    if (serviceType.services) {
      serviceType.services.forEach(service => {
        if (service.inputType === 'dropdown') {
          this.selectedServices.push({
            service: service,
            quantity: service.minValue || 1
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

  selectFrequency(frequency: Frequency) {
    this.selectedFrequency = frequency;
    this.calculateTotal();
  }

  applyPromoCode() {
    const code = this.promoCode.value;
    if (!code) return;

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
    this.firstTimeDiscountApplied = true;
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
      this.serviceDate.disable();
    } else {
      this.serviceDate.enable();
    }
  }

  private fillApartmentAddress(apartmentId: string) {
    const apartment = this.userApartments.find(a => a.id === +apartmentId);
    if (apartment) {
      this.bookingForm.patchValue({
        serviceAddress: apartment.address,
        aptSuite: apartment.aptSuite || '',
        city: apartment.city,
        state: apartment.state,
        zipCode: apartment.postalCode
      });
    }
  }

  private calculateTotal() {
    let subTotal = 0;
    let totalDuration = 0;
    let actualTotalDuration = 0; // Track the real total duration
    let deepCleaningFee = 0;
    let displayDuration = 0; // This will be the duration shown to the user

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

    // Calculate service costs
    this.selectedServices.forEach(selected => {
      // Special handling for cleaner-hours relationship - works for ANY service type
      if (selected.service.serviceRelationType === 'cleaner') {
        // Find the hours service
        const hoursService = this.selectedServices.find(s => s.service.serviceRelationType === 'hours');
        if (hoursService) {
          const hours = hoursService.quantity;
          const cleaners = selected.quantity;
          const costPerCleanerPerHour = selected.service.cost * priceMultiplier;
          const cost = costPerCleanerPerHour * cleaners * hours;
          subTotal += cost;
          totalDuration += hours * 60; // Convert hours to minutes
          actualTotalDuration += hours * 60; // Track actual total
        }
      } else if (selected.service.serviceKey === 'bedrooms' && selected.quantity === 0) {
        // Studio apartment - flat rate of $20
        const cost = 20 * priceMultiplier;
        subTotal += cost;
        totalDuration += 20; // 20 minutes for studio
        actualTotalDuration += 20; // Track actual total
      } else if (selected.service.serviceRelationType !== 'hours') {
        // Regular service calculation (not hours in a cleaner-hours relationship)
        const cost = selected.service.cost * selected.quantity * priceMultiplier;
        subTotal += cost;
        totalDuration += selected.service.timeDuration * selected.quantity;
        actualTotalDuration += selected.service.timeDuration * selected.quantity; // Track actual total
      }
      // Note: 'hours' services are not calculated separately when serviceRelationType is 'hours'
    });

    // Calculate extra service costs
    this.selectedExtraServices.forEach(selected => {
      if (!selected.extraService.isDeepCleaning && !selected.extraService.isSuperDeepCleaning) {
        // Regular extra services - apply multiplier EXCEPT for Same Day Service
        const currentMultiplier = selected.extraService.isSameDayService ? 1 : priceMultiplier;

        if (selected.extraService.hasHours) {
          subTotal += selected.extraService.price * selected.hours * currentMultiplier;
          totalDuration += selected.extraService.duration * selected.hours;
          actualTotalDuration += selected.extraService.duration * selected.hours; // Track actual total
        } else if (selected.extraService.hasQuantity) {
          subTotal += selected.extraService.price * selected.quantity * currentMultiplier;
          totalDuration += selected.extraService.duration * selected.quantity;
          actualTotalDuration += selected.extraService.duration * selected.quantity; // Track actual total
        } else {
          subTotal += selected.extraService.price * currentMultiplier;
          totalDuration += selected.extraService.duration;
          actualTotalDuration += selected.extraService.duration; // Track actual total
        }
      } else {
        // Deep cleaning services - duration only (fee tracked separately)
        totalDuration += selected.extraService.duration;
        actualTotalDuration += selected.extraService.duration; // Track actual total
      }
    });

    // Calculate maids count
    this.calculatedMaidsCount = 1;

    // Check if cleaners are explicitly selected
    const hasCleanerService = this.selectedServices.some(s => 
      s.service.serviceRelationType === 'cleaner'
    );

    // Check if hours are explicitly selected
    const hoursService = this.selectedServices.find(s => 
      s.service.serviceRelationType === 'hours'
    );

    if (hasCleanerService) {
      // Use the selected cleaner count
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

    // IMPORTANT: Store the actual total duration for backend
    this.actualTotalDuration = actualTotalDuration;

    // Apply frequency discount to the subtotal (before adding deep cleaning fee)
    let discountAmount = 0;
    if (this.selectedFrequency && this.selectedFrequency.discountPercentage > 0) {
      discountAmount = subTotal * (this.selectedFrequency.discountPercentage / 100);
    }

    // Apply first time discount (20%) only if explicitly applied
    if (this.hasFirstTimeDiscount && this.currentUser?.firstTimeOrder && this.firstTimeDiscountApplied) {
      discountAmount += subTotal * 0.20;
    }

    // Apply promo code discount
    if (this.promoCodeApplied) {
      if (this.promoIsPercentage) {
        discountAmount += subTotal * (this.promoDiscount / 100);
      } else {
        discountAmount += this.promoDiscount;
      }
    }

    // Now add the deep cleaning fee AFTER discounts are calculated
    subTotal += deepCleaningFee;

    // Calculate tax on discounted subtotal
    const discountedSubTotal = subTotal - discountAmount;
    const tax = discountedSubTotal * this.salesTaxRate;

    // Get tips
    const tips = this.tips.value || 0;

    // Calculate total
    const total = discountedSubTotal + tax + tips;

    this.calculation = {
      subTotal,
      tax,
      discountAmount,
      tips,
      total,
      totalDuration: displayDuration // This is for display only (duration per maid)
    };
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
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const baseFormat = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    if (this.calculatedMaidsCount > 1) {
      return `${baseFormat} per maid`;
    }
    return baseFormat;
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
           this.selectedFrequency !== null;
  }

  onSubmit() {
    if (!this.bookingForm.valid || !this.selectedServiceType || !this.selectedFrequency) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    
    // Get form values, including disabled fields
    const formValue = this.bookingForm.getRawValue();
    
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
    
    const bookingData = {
      serviceTypeId: this.selectedServiceType.id,
      services: this.selectedServices.map(s => ({
        serviceId: s.service.id,
        quantity: s.quantity
      })),
      extraServices: this.selectedExtraServices.map(s => ({
        extraServiceId: s.extraService.id,
        quantity: s.quantity,
        hours: s.hours
      })),
      frequencyId: this.selectedFrequency.id,
      serviceDate: serviceDate,
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
      apartmentId: formValue.selectedApartmentId,
      promoCode: formValue.promoCode,
      tips: formValue.tips,
      maidsCount: this.calculatedMaidsCount,
      totalDuration: this.actualTotalDuration 
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: (response) => {
        // Navigate to payment or confirmation page
        this.router.navigate(['/booking-confirmation', response.orderId]);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create booking';
        this.isLoading = false;
      }
    });
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
}