import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { BookingService, ServiceType, Service, ExtraService, Subscription, BookingCalculation } from '../services/booking.service';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { LocationService } from '../services/location.service';
import { BookingDataService } from '../services/booking-data.service';
import { DurationUtils } from '../utils/duration.utils';
import { SpecialOfferService, UserSpecialOffer } from '../services/special-offer.service';
import { FormPersistenceService, BookingFormData } from '../services/form-persistence.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { PollService, PollQuestion, PollAnswer, PollSubmission } from '../services/poll.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { DurationSelectorComponent } from './duration-selector/duration-selector.component';
import { TimeSelectorComponent } from './time-selector/time-selector.component';
import { DateSelectorComponent } from './date-selector/date-selector.component';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule, DurationSelectorComponent, TimeSelectorComponent, DateSelectorComponent],
  providers: [BookingService],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Make Math available in template
  Math = Math;

  // Custom pricing properties - initialized with default values
  showCustomPricing = false;
  customAmount: FormControl = new FormControl('', [Validators.required, Validators.min(0.01)]);
  customCleaners: FormControl = new FormControl(1, [Validators.required, Validators.min(1), Validators.max(10)]);
  customDuration: FormControl = new FormControl(90, [Validators.required, Validators.min(30), Validators.max(480)]);

  // Service Type Form Control
  serviceTypeControl: FormControl = new FormControl('', [Validators.required]);

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

  // Special offers
  userSpecialOffers: UserSpecialOffer[] = [];
  firstTimeDiscountPercentage: number = 0; 
  hasFirstTimeDiscountOffer: boolean = false;
  selectedSpecialOffer: UserSpecialOffer | null = null;
  specialOfferApplied = false;
  
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
  serviceTypeDropdownOpen = false;
  hasFirstTimeDiscount = false;
  firstTimeDiscountApplied = false;
  promoCodeApplied = false;
  promoDiscount = 0;
  promoIsPercentage = true;
  calculatedMaidsCount = 1;
  actualTotalDuration: number = 0;

  uploadedPhotos: Array<{
    file: File;
    preview: SafeUrl;
    base64: string;
  }> = [];
  maxPhotos = 12;
  maxFileSize = 15 * 1024 * 1024; // 15MB per photo
  acceptedFormats = 'image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif';
  isUploadingPhoto = false;
  photoUploadError = '';
  isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  
  // Subscription-related properties
  userSubscription: any = null;
  hasActiveSubscription = false;
  nextOrderDiscount = 0;
  nextOrderTotal = 0;
  subscriptionDiscountAmount = 0;
  promoOrFirstTimeDiscountAmount = 0;

  // Gift card specific properties
  giftCardApplied = false;
  giftCardBalance = 0;
  giftCardAmountToUse = 0;
  isGiftCard = false;
  
  // Mobile tooltip management
  mobileTooltipTimeouts: { [key: number]: any } = {};
  mobileTooltipStates: { [key: number]: boolean } = {};
  
  // Booking summary collapse state
  isSummaryCollapsed = true;
  
  // Constants
  salesTaxRate = 0.08875; // 8.875%
  minDate = new Date();
  minTipAmount = 10; 
  minCompanyTipAmount = 10;
  
  // Entry methods
  entryMethods = [
    'I will be home',
    'Doorman',
    'Hidden key',
    'Office reception',
    'Other'
  ];

  pollQuestions: PollQuestion[] = [];
  pollAnswers: { [key: number]: string } = {};
  showPollForm = false;
  pollFormSubmitted = false;
  
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
    private bookingDataService: BookingDataService,
    private specialOfferService: SpecialOfferService,
    public formPersistenceService: FormPersistenceService,
    private pollService: PollService,
    private sanitizer: DomSanitizer
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
      ]],
      companyDevelopmentTips: [0, [
        Validators.min(0),
        (control: AbstractControl): ValidationErrors | null => {
          const value = control.value;
          if (value === 0) return null; // Allow 0 as default
          return value >= this.minCompanyTipAmount ? null : { minCompanyTipAmount: true };
        }
      ]],
      cleaningType: ['normal', Validators.required], // Add new form control for cleaning type
      smsConsent: [false, [Validators.requiredTrue]],
      cancellationConsent: [false, [Validators.requiredTrue]]
    });
  }

  ngOnInit() {
    // Set minimum date to tomorrow
    this.minDate = new Date();
    this.minDate.setDate(this.minDate.getDate() + 2);
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

    // Ensure custom pricing FormControls have proper default values
    this.initializeCustomPricingDefaults();
    
    // Initialize entry method to empty to show "Select entry method"
    this.entryMethod.setValue('');

    // Load saved form data if exists
    this.loadSavedFormData();
    
    // Wait for auth service to be initialized before proceeding
    this.authService.isInitialized$.subscribe(isInitialized => {
      if (isInitialized) {
        // Only refresh user profile if logged in
        if (this.authService.isLoggedIn()) {
          // Refresh user data to ensure we have the latest firstTimeOrder status
          this.authService.refreshUserProfile().subscribe({
            next: () => {
              this.loadInitialData();
              this.setupFormListeners();
              this.loadSpecialOffers();
            },
            error: () => {
              // Even if refresh fails, continue with cached data
              this.loadInitialData();
              this.setupFormListeners();
              this.loadSpecialOffers();
            }
          });
        } else {
          // Not logged in, skip refresh and just load initial data
          this.loadInitialData();
          this.setupFormListeners();
        }
      }
    });

    if (this.customAmount) {
      this.customAmount.valueChanges
        .pipe(
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (this.showCustomPricing) {
            this.calculateTotal();
          }
        });
    }
    
    // Setup click outside handler for dropdown
    this.setupDropdownClickOutside();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDropdownClickOutside() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.service-type-dropdown')) {
        this.serviceTypeDropdownOpen = false;
      }
    });
  }

  private initializeCustomPricingDefaults() {
    // Ensure custom pricing FormControls have proper default values
    if (!this.customAmount.value) {
      this.customAmount.patchValue('');
    }
    if (!this.customCleaners.value) {
      this.customCleaners.patchValue(1);
    }
    if (!this.customDuration.value) {
      this.customDuration.patchValue(60);
    }
  }

  private loadSavedFormData() {
    const savedData = this.formPersistenceService.getFormData();
    if (!savedData) return;
  
    // Restore form fields
    const formValues: any = {};
    if (savedData.serviceDate) formValues.serviceDate = savedData.serviceDate;
    if (savedData.serviceTime) formValues.serviceTime = savedData.serviceTime;
    if (savedData.entryMethod) formValues.entryMethod = savedData.entryMethod;
    if (savedData.customEntryMethod) formValues.customEntryMethod = savedData.customEntryMethod;
    if (savedData.specialInstructions) formValues.specialInstructions = savedData.specialInstructions;
    if (savedData.contactFirstName) formValues.contactFirstName = savedData.contactFirstName;
    if (savedData.contactLastName) formValues.contactLastName = savedData.contactLastName;
    if (savedData.contactEmail) formValues.contactEmail = savedData.contactEmail;
    if (savedData.contactPhone) formValues.contactPhone = savedData.contactPhone;
    if (savedData.selectedApartmentId) formValues.selectedApartmentId = savedData.selectedApartmentId;
    if (savedData.serviceAddress) formValues.serviceAddress = savedData.serviceAddress;
    if (savedData.apartmentName) formValues.apartmentName = savedData.apartmentName;
    if (savedData.aptSuite) formValues.aptSuite = savedData.aptSuite;
    if (savedData.city) formValues.city = savedData.city;
    if (savedData.state) formValues.state = savedData.state;
    if (savedData.zipCode) formValues.zipCode = savedData.zipCode;
    if (savedData.promoCode) formValues.promoCode = savedData.promoCode;
    if (savedData.tips !== undefined) formValues.tips = savedData.tips;
    if (savedData.companyDevelopmentTips !== undefined) formValues.companyDevelopmentTips = savedData.companyDevelopmentTips;
    if (savedData.cleaningType) formValues.cleaningType = savedData.cleaningType;
    if (savedData.smsConsent !== undefined) formValues.smsConsent = savedData.smsConsent;
    if (savedData.cancellationConsent !== undefined) formValues.cancellationConsent = savedData.cancellationConsent;
  
    this.bookingForm.patchValue(formValues);
    
    // Restore service type control value
    if (savedData.selectedServiceTypeId) {
      this.serviceTypeControl.setValue(savedData.selectedServiceTypeId);
    }
  }  

  private loadInitialData() {
    // Clear any existing error messages
    this.errorMessage = '';
    
    // Load service types
    this.bookingService.getServiceTypes().subscribe({
      next: (serviceTypes) => {       
        // Sort service types by displayOrder
        this.serviceTypes = serviceTypes.sort((a, b) => {
          const orderA = a.displayOrder || 999;
          const orderB = b.displayOrder || 999;
          return orderA - orderB;
        });
        
        // Sort services and extra services within each service type
        this.serviceTypes.forEach(serviceType => {
          if (serviceType.services) {
            serviceType.services.sort((a, b) => {
              const orderA = a.displayOrder || 999;
              const orderB = b.displayOrder || 999;
              return orderA - orderB;
            });
          }
          
          if (serviceType.extraServices) {
            serviceType.extraServices.sort((a, b) => {
              const orderA = a.displayOrder || 999;
              const orderB = b.displayOrder || 999;
              return orderA - orderB;
            });
          }
        });
        
        // Clear error message on success
        if (this.errorMessage === 'Failed to load service types') {
          this.errorMessage = '';
        }
        
        // Restore selected service type from saved data
        const savedData = this.formPersistenceService.getFormData();
        if (savedData?.selectedServiceTypeId) {
          const savedServiceType = this.serviceTypes.find(st => String(st.id) === String(savedData.selectedServiceTypeId));
          if (savedServiceType) {
            // Set the service type control value first
            this.serviceTypeControl.setValue(savedServiceType.id);
            this.selectServiceType(savedServiceType);
            
            // Restore selected services
            if (savedData.selectedServices) {
              savedData.selectedServices.forEach(ss => {
                const service = savedServiceType.services.find(s => String(s.id) === String(ss.serviceId));
                if (service) {
                  const existingIndex = this.selectedServices.findIndex(s => String(s.service.id) === String(service.id));
                  if (existingIndex >= 0) {
                    this.selectedServices[existingIndex].quantity = ss.quantity;
                  }
                }
              });
            }
            
            // Restore selected extra services
            if (savedData.selectedExtraServices) {
              savedData.selectedExtraServices.forEach(ses => {
                const extraService = savedServiceType.extraServices.find(es => String(es.id) === String(ses.extraServiceId));
                if (extraService) {
                  this.selectedExtraServices.push({
                    extraService,
                    quantity: ses.quantity,
                    hours: ses.hours
                  });
                }
              });
              
              // Sync cleaning type with restored extra services
              const currentCleaningType = this.getCurrentCleaningType();
              this.cleaningType.setValue(currentCleaningType);
            }
            
            this.calculateTotal();
          }
        }
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
        const savedState = this.bookingForm.get('state')?.value;
        
        if (savedState && states.includes(savedState)) {
          // Use saved state and load its cities
          this.loadCities(savedState);
        } else if (states.length > 0 && !savedState) {
          // No saved state, use default
          this.bookingForm.patchValue({ state: states[0] });
          this.loadCities(states[0]);
        }
      }
    });
    
    // Load subscriptions
    this.bookingService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        // Sort subscriptions by displayOrder
        this.subscriptions = subscriptions.sort((a, b) => {
          const orderA = a.displayOrder || 999;
          const orderB = b.displayOrder || 999;
          return orderA - orderB;
        });
        
        // Clear error message on success
        if (this.errorMessage === 'Failed to load subscriptions') {
          this.errorMessage = '';
        }
        
        // Check for saved subscription first
        const savedData = this.formPersistenceService.getFormData();
        if (savedData?.selectedSubscriptionId) {
          const savedSubscription = this.subscriptions.find(s => String(s.id) === String(savedData.selectedSubscriptionId));
          if (savedSubscription) {
            this.selectedSubscription = savedSubscription;
            return; // Don't override with default if we have saved data
          }
        }
        
        // Set default subscription logic...
        if (!this.hasActiveSubscription) {
          if (this.subscriptions.length > 0) {
            const oneTimeSubscription = this.subscriptions.find(s => s.name === 'One Time') || this.subscriptions[0];
            this.selectedSubscription = oneTimeSubscription;
          }
        } else if (this.userSubscription) {
          this.updateSelectedSubscription();
        }
      },
      error: (error) => {
        console.error('Failed to load subscriptions:', error);
        this.errorMessage = 'Failed to load subscriptions';
      }
    });
    
    // Load current user data
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.hasFirstTimeDiscount = user.firstTimeOrder;
        
        // Check if we have saved form data
        const savedData = this.formPersistenceService.getFormData();
        
        // Only pre-fill contact info if there's no saved data
        if (!savedData || !savedData.contactFirstName) {
          this.bookingForm.patchValue({
            contactFirstName: user.firstName,
            contactLastName: user.lastName,
            contactEmail: user.email,
            contactPhone: user.phone || ''
          });
        }
        
        // Load user apartments
        this.profileService.getApartments().subscribe({
          next: (apartments) => {
            this.userApartments = apartments;
            
            // Only auto-fill with first apartment if no saved apartment selection
            if (apartments.length > 0 && !savedData?.selectedApartmentId) {
              const firstApartment = apartments[0];
              this.bookingForm.patchValue({
                selectedApartmentId: firstApartment.id.toString()
              });
              this.fillApartmentAddress(firstApartment.id.toString());
            } else if (savedData?.selectedApartmentId) {
              // Restore saved apartment selection
              this.fillApartmentAddress(savedData.selectedApartmentId);
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

    // Listen to company development tips changes
    this.bookingForm.get('companyDevelopmentTips')?.valueChanges.subscribe(() => {
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
            // Use skipDateChange=true to preserve the user's selected date
            this.toggleExtraService(sameDayService.extraService, true);
          }
        }
      }
    });
    
    // Add auto-save functionality with debounce
    this.bookingForm.valueChanges
      .pipe(
        debounceTime(1000), // Wait 1 second after user stops typing
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.saveFormData();
      });
  }
  
  private saveFormData() {
    const formData: BookingFormData = {
      // Service Type and Services
      selectedServiceTypeId: this.selectedServiceType?.id ? String(this.selectedServiceType.id) : undefined,
      selectedServices: this.selectedServices.map(s => ({
        serviceId: String(s.service.id),
        quantity: s.quantity
      })),
      selectedExtraServices: this.selectedExtraServices.map(es => ({
        extraServiceId: String(es.extraService.id),
        quantity: es.quantity,
        hours: es.hours
      })),
      
      // Form Values
      ...this.bookingForm.value,
      
      // Selected Subscription
      selectedSubscriptionId: this.selectedSubscription?.id ? String(this.selectedSubscription.id) : undefined,
      
      // Consent checkboxes
      smsConsent: this.smsConsent.value,
      cancellationConsent: this.cancellationConsent.value
    };
  
    this.formPersistenceService.saveFormData(formData);
    
    // Also save the service type control value
    if (this.selectedServiceType) {
      this.serviceTypeControl.setValue(this.selectedServiceType.id);
    }
  }

  clearAllFormData() {
    if (confirm('Are you sure you want to clear all form data?')) {
      this.formPersistenceService.clearFormData();
      this.serviceTypeControl.setValue('');
      this.router.navigate(['/booking']).then(() => {
        window.location.reload();
      });
    }
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

  toggleServiceTypeDropdown() {
    this.serviceTypeDropdownOpen = !this.serviceTypeDropdownOpen;
  }

  selectServiceType(serviceType: ServiceType) {
    this.selectedServiceType = serviceType;
    this.serviceTypeControl.setValue(serviceType.id);
    this.serviceTypeDropdownOpen = false; // Close dropdown after selection
    this.selectedServices = [];
    this.selectedExtraServices = [];

    // Reset all special modes
    this.showPollForm = false;
    this.showCustomPricing = false;

    // Check if this service type has custom pricing
    if (serviceType.isCustom) {
      this.showCustomPricing = true;

      // Set defaults for custom fields
      this.customAmount.setValue(serviceType.basePrice);
      this.customCleaners.setValue(1);
      // Always set duration to 60 (1 hour) as default for custom pricing
      this.customDuration.patchValue(60);

      // Force Angular to detect changes for the duration dropdown
      setTimeout(() => {
        this.customDuration.patchValue(60);
      }, 0);

      // Ensure entry method is required for custom pricing
      this.entryMethod.setValidators([Validators.required]);
      this.entryMethod.updateValueAndValidity();
      
      // Reset entry method to empty to show "Select entry method"
      this.entryMethod.setValue('');

      // Trigger calculation
      this.calculateTotal();
    }
    
    // Check if this service type has poll functionality
   else if (serviceType.hasPoll) {
      this.showPollForm = true;
      this.loadPollQuestions(serviceType.id);
      
      // DISABLE validation for fields not needed in poll forms
      this.entryMethod.clearValidators();
      this.entryMethod.updateValueAndValidity();
      
      // Set default values to prevent validation errors but disable validators
      this.entryMethod.setValue('N/A'); // Set a default value
      
      // Initialize subscription and cleaning type for consistency
      if (!this.selectedSubscription && this.subscriptions && this.subscriptions.length > 0) {
        if (!this.hasActiveSubscription) {
          this.selectedSubscription = this.subscriptions[0];
        } else {
          this.updateSelectedSubscription();
        }
      }
      
      if (!this.cleaningType.value) {
        this.cleaningType.setValue('normal');
      }
    } else {
      this.showPollForm = false;
      
      // RESTORE validation for regular booking forms
      this.entryMethod.setValidators([Validators.required]);
      this.entryMethod.updateValueAndValidity();
      
      // Reset entry method value when switching back to regular booking
      this.entryMethod.setValue('');
      
      // Initialize services based on type (your existing logic)
      if (serviceType.services) {
        const sortedServices = [...serviceType.services].sort((a, b) => 
          (a.displayOrder || 999) - (b.displayOrder || 999)
        );
        
        sortedServices.forEach(service => {
          if (service.isActive !== false) {
            // Use minValue as default for all services
            const defaultQuantity = service.minValue ?? 0;
            this.selectedServices.push({
              service: service,
              quantity: defaultQuantity
            });
          }
        });
      }
      
      this.selectedExtraServices = [];
      
      if (!this.selectedSubscription && this.subscriptions && this.subscriptions.length > 0) {
        if (!this.hasActiveSubscription) {
          this.selectedSubscription = this.subscriptions[0];
        } else {
          this.updateSelectedSubscription();
        }
      }
      
      if (!this.cleaningType.value) {
        this.cleaningType.setValue('normal');
      }
    }
    
    this.calculateTotal();
    this.saveFormData();
  }

  onServiceTypeChange(event: any) {
    const serviceTypeId = event.target.value;
    if (serviceTypeId) {
      const selectedType = this.serviceTypes.find(type => type.id === parseInt(serviceTypeId));
      if (selectedType) {
        this.selectServiceType(selectedType);
      }
    } else {
      // Reset when no service type is selected
      this.selectedServiceType = null;
      this.selectedServices = [];
      this.selectedExtraServices = [];
      this.showPollForm = false;
      this.showCustomPricing = false;
      this.calculateTotal();
      this.saveFormData();
    }
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
    this.saveFormData();
  }

  toggleExtraService(extraService: ExtraService, skipDateChange: boolean = false) {
    const index = this.selectedExtraServices.findIndex(s => s.extraService.id === extraService.id);
    
    if (index > -1) {
      // Remove if already selected
      this.selectedExtraServices.splice(index, 1);
      
      // Clear mobile tooltip for this service immediately
      this.clearMobileTooltip(extraService.id);
      
      if (extraService.isSameDayService) {
        this.isSameDaySelected = false;
        // Only set date to tomorrow if this is a manual uncheck (not from date selection)
        if (!skipDateChange) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const year = tomorrow.getFullYear();
          const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const day = String(tomorrow.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          
          this.serviceDate.setValue(formattedDate);
        }
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
      
      // Show mobile tooltip for this service
      this.showMobileTooltip(extraService.id);
      
      if (extraService.isSameDayService) {
        this.isSameDaySelected = true;
        this.updateDateRestrictions();
      }
    }
    
    this.calculateTotal();
    this.saveFormData();
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

    // If special offer is already applied, show error
    if (this.specialOfferApplied) {
      this.errorMessage = 'Cannot apply promo code when a special offer is already applied. Please remove the special offer first.';
      return;
    }

    // Keep your existing first-time discount check as is
    if (this.firstTimeDiscountApplied) {
      this.errorMessage = 'Cannot apply promo code when first-time discount is already applied. Please remove the first-time discount first.';
      return;
    }

    // Clear any previous error
    this.errorMessage = '';

    this.bookingService.validatePromoCode(code).subscribe({
      next: (validation) => {
        if (validation.isValid) {
          if (validation.isGiftCard) {
            // Handle gift card
            this.isGiftCard = true;
            this.giftCardApplied = true;
            this.giftCardBalance = validation.availableBalance || 0;
            this.promoCodeApplied = false; // Gift cards don't use promo system
          } else {
            // Your existing promo code logic stays exactly the same
            this.isGiftCard = false;
            this.giftCardApplied = false;
            this.promoCodeApplied = true;
            this.promoDiscount = validation.discountValue;
            this.promoIsPercentage = validation.isPercentage;
          }
          
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
    }
    // Don't automatically change the date when same day service is unchecked
    // Let the user manually select a date or uncheck the service
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

    // ADD THIS BLOCK FOR CUSTOM PRICING
    if (this.showCustomPricing && this.customAmount.value) {
      // For custom pricing, use the custom values directly
      subTotal = parseFloat(this.customAmount.value) || 0;

      // Parse and log duration
      const parsedDuration = parseInt(this.customDuration.value);

      // IMPORTANT: Parse duration as integer
      actualTotalDuration = parsedDuration || 90;
      totalDuration = actualTotalDuration; // Add this line
      displayDuration = actualTotalDuration;
      
      
      // Parse cleaners as integer
      this.calculatedMaidsCount = parseInt(this.customCleaners.value) || 1;
    
      // Store the actual total duration for backend
      this.actualTotalDuration = actualTotalDuration;
    
      // Skip all the complex calculations for custom pricing
      // Jump straight to discount calculations
    
      // Reset discount amounts
      this.subscriptionDiscountAmount = 0;
      this.promoOrFirstTimeDiscountAmount = 0;
    
      // Calculate subscription discount if applicable
      if (this.hasActiveSubscription && this.userSubscription && this.userSubscription.discountPercentage > 0) {
        this.subscriptionDiscountAmount = Math.round(subTotal * (this.userSubscription.discountPercentage / 100) * 100) / 100;
      }
    
      // Calculate promo or first-time discount
      if (this.specialOfferApplied && this.selectedSpecialOffer) {
        const offer = this.selectedSpecialOffer;
        if (offer.isPercentage) {
          this.promoOrFirstTimeDiscountAmount = Math.round(subTotal * (offer.discountValue / 100) * 100) / 100;
        } else {
          this.promoOrFirstTimeDiscountAmount = Math.min(offer.discountValue, subTotal);
        }
      } else if (this.hasFirstTimeDiscount && this.currentUser?.firstTimeOrder && this.firstTimeDiscountApplied) {
        this.promoOrFirstTimeDiscountAmount = Math.round(subTotal * (this.firstTimeDiscountPercentage / 100) * 100) / 100;
      } else if (this.promoCodeApplied && !this.giftCardApplied) {
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
      const companyDevelopmentTips = this.companyDevelopmentTips.value || 0;
      const totalTips = tips + companyDevelopmentTips;
    
      // Calculate total
      const total = discountedSubTotal + tax + totalTips;
    
      // Apply gift card if applicable
      let finalTotal = total;
      if (this.giftCardApplied && this.isGiftCard) {
        this.giftCardAmountToUse = Math.min(this.giftCardBalance, total);
        finalTotal = Math.max(0, total - this.giftCardAmountToUse);
      }
    
      this.calculation = {
        subTotal: Math.round(subTotal * 100) / 100,
        tax,
        discountAmount: totalDiscountAmount,
        tips: totalTips,
        total: Math.round(finalTotal * 100) / 100,
        totalDuration: displayDuration
      };
    
      // Calculate next order's total if needed
      if (this.selectedSubscription && this.selectedSubscription.subscriptionDays > 0 && !this.hasActiveSubscription) {
        const nextOrderDiscountPercentage = this.selectedSubscription.discountPercentage;
        this.nextOrderDiscount = Math.round(subTotal * (nextOrderDiscountPercentage / 100) * 100) / 100;
        const nextOrderDiscountedSubTotal = subTotal - this.nextOrderDiscount;
        const nextOrderTax = Math.round(nextOrderDiscountedSubTotal * this.salesTaxRate * 100) / 100;
        this.nextOrderTotal = nextOrderDiscountedSubTotal + nextOrderTax;
      } else {
        this.nextOrderDiscount = 0;
        this.nextOrderTotal = 0;
      }
    
      return; // Exit early for custom pricing
    }

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

      // ADD THIS LINE - Add service type's base duration
      if (!useExplicitHours) {
        totalDuration += this.selectedServiceType.timeDuration || 0;
        actualTotalDuration += this.selectedServiceType.timeDuration || 0;
      }
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
        const cost = this.getServicePrice(selected.service, 0);
        subTotal += cost;
        if (!useExplicitHours) {
          const studioDuration = this.getServiceDuration(selected.service);
          totalDuration += studioDuration;
          actualTotalDuration += studioDuration;
        }
      } else if (selected.service.serviceRelationType !== 'hours') {
        const cost = selected.service.cost * selected.quantity * priceMultiplier;
        subTotal += cost;
        if (!useExplicitHours) {
          const serviceDuration = selected.service.timeDuration * selected.quantity;
          totalDuration += serviceDuration;
          actualTotalDuration += serviceDuration;
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
            const extraDuration = selected.extraService.duration * selected.hours;
            totalDuration += extraDuration;
            actualTotalDuration += extraDuration;
          }
        } else if (selected.extraService.hasQuantity) {
          subTotal += selected.extraService.price * selected.quantity * currentMultiplier;
          if (!useExplicitHours) {
            const extraDuration = selected.extraService.duration * selected.quantity;
            totalDuration += extraDuration;
            actualTotalDuration += extraDuration;
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

    // Calculate extra cleaners FIRST
    const extraCleaners = this.getExtraCleanersCount();

    // Calculate base maids count (without extra cleaners)
    let baseMaidsCount = 1;

    if (hasCleanerService) {
      const cleanerService = this.selectedServices.find(s => 
        s.service.serviceRelationType === 'cleaner'
      );
      if (cleanerService) {
        baseMaidsCount = cleanerService.quantity;
      }
      // When cleaners are explicitly selected, use actual duration without division initially
      displayDuration = actualTotalDuration;
    } else {
      const totalHours = totalDuration / 60;
      if (totalHours <= 6) {
        baseMaidsCount = 1;
        displayDuration = totalDuration;
      } else {
        baseMaidsCount = Math.ceil(totalHours / 6);
        displayDuration = totalDuration; // Don't divide yet
      }
    }

    // NOW add extra cleaners to get total maid count
    this.calculatedMaidsCount = baseMaidsCount + extraCleaners;
      
    // FINALLY divide duration by TOTAL maid count (including extra cleaners)
    if (this.calculatedMaidsCount > 1 && !hasCleanerService) {
      // Only divide duration when we have multiple maids and no explicit cleaner service
      displayDuration = Math.ceil(totalDuration / this.calculatedMaidsCount);
    } else if (hasCleanerService && this.calculatedMaidsCount > baseMaidsCount) {
      // If we have explicit cleaners AND extra cleaners, divide by total count
      displayDuration = Math.ceil(actualTotalDuration / this.calculatedMaidsCount);
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
    this.subscriptionDiscountAmount = Math.round(subTotal * (this.userSubscription.discountPercentage / 100) * 100) / 100;
    } else {
    this.subscriptionDiscountAmount = 0;
    }

    // Calculate promo or first-time discount (can stack with subscription)
    if (this.specialOfferApplied && this.selectedSpecialOffer) {
      // Use selected special offer
      const offer = this.selectedSpecialOffer;
      if (offer.isPercentage) {
        this.promoOrFirstTimeDiscountAmount = Math.round(subTotal * (offer.discountValue / 100) * 100) / 100;
      } else {
        this.promoOrFirstTimeDiscountAmount = Math.min(offer.discountValue, subTotal);
      }
    } else if (this.hasFirstTimeDiscount && this.currentUser?.firstTimeOrder && this.firstTimeDiscountApplied) {
      // Old logic for backward compatibility
      this.promoOrFirstTimeDiscountAmount = Math.round(subTotal * (this.firstTimeDiscountPercentage / 100) * 100) / 100;
    } else if (this.promoCodeApplied && !this.giftCardApplied) {
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
    const companyDevelopmentTips = this.companyDevelopmentTips.value || 0;
    const totalTips = tips + companyDevelopmentTips;
      
    // Calculate total
    const total = discountedSubTotal + tax + totalTips;

    // Apply gift card if applicable - ADD THIS BLOCK
    let finalTotal = total;
    if (this.giftCardApplied && this.isGiftCard) {
      this.giftCardAmountToUse = Math.min(this.giftCardBalance, total);
      finalTotal = Math.max(0, total - this.giftCardAmountToUse);
    }

    // For display, when using explicit hours, show the hours directly
    if (useExplicitHours && hoursService) {
      displayDuration = hoursService.quantity * 60;
    }

    this.calculation = {
      subTotal: Math.round(subTotal * 100) / 100,
      tax,
      discountAmount: totalDiscountAmount,
      tips: totalTips,
      total: Math.round(finalTotal * 100) / 100,
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

  // Get cleaner pricing text
  getCleanerPricingText(): string {
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    const pricePerHour = this.getCleanerPricePerHour();
    
    if (superDeepCleaning) {
      return `Hourly Service: $${pricePerHour} per hour/per cleaner <span class="cleaning-type-red">(Super Deep Cleaning)</span>`;
    } else if (deepCleaning) {
      return `Hourly Service: $${pricePerHour} per hour/per cleaner <span class="cleaning-type-red">(Deep Cleaning)</span>`;
    }
    return `Hourly Service: $${pricePerHour} per hour/per cleaner`;
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
  getCleanerPricePerHour(): number {
    // Get the actual cleaner service cost from the selected services
    const cleanerService = this.selectedServices.find(s => s.service.serviceRelationType === 'cleaner');
    const basePrice = cleanerService ? cleanerService.service.cost : 40; // fallback to 40 if no cleaner service found
    
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);
    
    if (superDeepCleaning) {
      return basePrice * superDeepCleaning.extraService.priceMultiplier;
    } else if (deepCleaning) {
      return basePrice * deepCleaning.extraService.priceMultiplier;
    }
    
    return basePrice; // regular cleaning - no multiplier
  }

  getExtraCleanersCount(): number {
    const extraCleanersService = this.selectedExtraServices.find(s => 
      s.extraService.name === 'Extra Cleaners' && s.extraService.hasQuantity
    );
    return extraCleanersService ? extraCleanersService.quantity : 0;
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
    const quantity = this.getServiceQuantity(service);
    
    // Get duration multiplier based on cleaning type
    let durationMultiplier = 1;
    const deepCleaning = this.selectedExtraServices.find(s => s.extraService.isDeepCleaning);
    const superDeepCleaning = this.selectedExtraServices.find(s => s.extraService.isSuperDeepCleaning);

    if (superDeepCleaning) {
      durationMultiplier = superDeepCleaning.extraService.priceMultiplier;
    } else if (deepCleaning) {
      durationMultiplier = deepCleaning.extraService.priceMultiplier;
    }
    
    if (service.serviceKey === 'bedrooms' && quantity === 0) {
      return Math.round(20 * durationMultiplier); // 20 minutes base for studio, adjusted by cleaning type
    }
    
    // For most services, duration should be multiplied by quantity
    // But for cleaner and hours services, we don't multiply as they have special logic
    if (service.serviceRelationType === 'cleaner' || service.serviceRelationType === 'hours') {
      return Math.round(service.timeDuration * durationMultiplier);
    }
    
    return Math.round(service.timeDuration * quantity * durationMultiplier);
  }

  getServiceQuantity(service: Service): number {
    const selected = this.selectedServices.find(s => s.service.id === service.id);
    return selected ? selected.quantity : (service.minValue || 0);
  }

  isFormValid(): boolean {
    if (this.showPollForm) {
      return this.isPollFormValid();
    }
    
    return this.bookingForm.valid && 
           this.serviceTypeControl.valid &&
           this.selectedServiceType !== null && 
           this.selectedSubscription !== null && 
           this.cleaningType.value !== null &&
           this.smsConsent.value === true &&
           this.cancellationConsent.value === true;
  }

  onSubmit() {
    if (this.showPollForm) {
      this.submitPollForm();
      return;
    }

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
    if (!this.bookingForm.valid || !this.selectedServiceType || !this.selectedSubscription || !this.cleaningType.value) {
      this.scrollToFirstError();
      return;
    }
    
    // Also check custom pricing fields if applicable
    if (this.showCustomPricing && (!this.customAmount.valid || !this.customCleaners.valid || !this.customDuration.valid || !this.entryMethod.value)) {
      this.scrollToFirstError();
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
      promoCode: this.giftCardApplied && this.isGiftCard ? null : 
         (this.specialOfferApplied && this.selectedSpecialOffer ? null :
         (this.firstTimeDiscountApplied && !formValue.promoCode ? 'firstUse' : formValue.promoCode)),
      specialOfferId: this.specialOfferApplied ? this.selectedSpecialOffer?.specialOfferId : undefined,
      userSpecialOfferId: this.specialOfferApplied && this.selectedSpecialOffer ? this.selectedSpecialOffer.id : undefined,
      tips: formValue.tips,
      companyDevelopmentTips: formValue.companyDevelopmentTips,
      maidsCount: this.showCustomPricing ? parseInt(this.customCleaners.value) : this.calculatedMaidsCount,
      discountAmount: this.promoOrFirstTimeDiscountAmount,
      subscriptionDiscountAmount: shouldApplySubscriptionDiscount ? this.subscriptionDiscountAmount : 0,
      subTotal: this.calculation.subTotal,
      totalDuration: this.showCustomPricing ? parseInt(this.customDuration.value) : this.actualTotalDuration,
      hasActiveSubscription: this.hasActiveSubscription,
      userSubscriptionId: this.userSubscription?.subscriptionId,
      giftCardCode: this.giftCardApplied && this.isGiftCard ? this.promoCode.value : null,
      giftCardAmountToUse: this.giftCardApplied ? this.giftCardAmountToUse : 0,
      isCustomPricing: this.showCustomPricing,
      customAmount: this.showCustomPricing ? parseFloat(this.customAmount.value) : undefined,
      customCleaners: this.showCustomPricing ? parseInt(this.customCleaners.value) : undefined,
      customDuration: this.showCustomPricing ? parseInt(this.customDuration.value) : undefined,
      smsConsent: formValue.smsConsent,
      cancellationConsent: formValue.cancellationConsent,
      uploadedPhotos: this.preparePhotosForSubmission(),
    };

    // Store booking data in service instead of creating order immediately
    this.bookingDataService.setBookingData(bookingData);
    this.isLoading = false;
    
    // Navigate to booking confirmation without creating the order yet
    this.router.navigate(['/booking-confirmation']);
  }

  private scrollToFirstError() {
    // Mark all form controls as touched to trigger validation
    this.markFormGroupTouched(this.bookingForm);
    
    // Mark service type control as touched
    this.serviceTypeControl.markAsTouched();
    
    // Also mark custom pricing controls if applicable
    if (this.showCustomPricing) {
      this.customAmount.markAsTouched();
      this.customCleaners.markAsTouched();
      this.customDuration.markAsTouched();
    }

    // Find the first invalid field and scroll to it
    setTimeout(() => {
      // Try multiple selectors to find the first error
      let firstErrorElement = document.querySelector('.ng-invalid.ng-touched');
      
      if (!firstErrorElement) {
        // If no touched invalid elements, look for any invalid elements
        firstErrorElement = document.querySelector('.ng-invalid');
      }
      
      if (!firstErrorElement) {
        // If still no invalid elements, look for required fields that are empty
        const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
        for (let input of requiredInputs) {
          if (!(input as HTMLInputElement).value) {
            firstErrorElement = input;
            break;
          }
        }
      }
      
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Focus the element if it's an input
        if (firstErrorElement instanceof HTMLInputElement || 
            firstErrorElement instanceof HTMLSelectElement || 
            firstErrorElement instanceof HTMLTextAreaElement) {
          firstErrorElement.focus();
        }
      }
    }, 100);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
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

  get apartmentName() { return this.bookingForm.get('apartmentName') as FormControl; }

  removePromoCode() {
    this.promoCodeApplied = false;
    this.promoDiscount = 0;
    this.promoCode.setValue('');
    this.errorMessage = ''; // Clear any error messages
    this.giftCardApplied = false;
    this.isGiftCard = false;
    this.giftCardBalance = 0;
    this.giftCardAmountToUse = 0;
    this.calculateTotal();
  }

  getGiftCardDisplayInfo(): { amountToUse: number; remainingBalance: number } {
    if (!this.giftCardApplied) {
      return { amountToUse: 0, remainingBalance: 0 };
    }
    return { 
      amountToUse: this.giftCardAmountToUse, 
      remainingBalance: this.giftCardBalance - this.giftCardAmountToUse 
    };
  }
  
  removeFirstTimeDiscount() {
    this.firstTimeDiscountApplied = false;
    // Re-enable the promo code input
    this.promoCode.enable();
    this.errorMessage = '';
    this.calculateTotal();
  }

  loadSpecialOffers() {
    if (this.authService.isLoggedIn()) {
      this.specialOfferService.getMySpecialOffers().subscribe({
        next: (offers) => {
          this.userSpecialOffers = offers;
          // Find first-time offer if exists
          const firstTimeOffer = offers.find(o => o.name.includes('First Time'));
          if (firstTimeOffer) {
            this.firstTimeDiscountPercentage = firstTimeOffer.discountValue;
            this.hasFirstTimeDiscountOffer = true;
          } else {
            this.hasFirstTimeDiscountOffer = false;
          }
          // Check if user has first-time discount in their offers (for backward compatibility)
          this.hasFirstTimeDiscount = offers.some(o => o.name.toLowerCase().includes('first time'));
        },
        error: (error) => {
          console.error('Error loading special offers:', error);
          this.hasFirstTimeDiscountOffer = false;
          this.userSpecialOffers = [];
        }
      });
    }
  }

  applySpecialOffer(offer: UserSpecialOffer) {
    // Check if promo code is already applied (but NOT gift card)
    if (this.promoCodeApplied && !this.isGiftCard) {
      this.errorMessage = 'Cannot apply special offer when a promo code is already applied. Please remove the promo code first.';
      return;
    }
  
    // Check if another special offer is already applied
    if (this.specialOfferApplied && this.selectedSpecialOffer?.id !== offer.id) {
      this.errorMessage = 'Only one special offer can be applied at a time. Please remove the current offer first.';
      return;
    }
  
    // Clear any previous error
    this.errorMessage = '';
  
    // Apply the special offer
    this.selectedSpecialOffer = offer;
    this.specialOfferApplied = true;
    
    // Update promo code disabled state
    this.updatePromoCodeDisabledState();
    
    // For backward compatibility with first-time discount
    if (offer.name.toLowerCase().includes('first time')) {
      this.firstTimeDiscountApplied = true;
    }
    
    this.calculateTotal();
  }
  
  removeSpecialOffer() {
    this.selectedSpecialOffer = null;
    this.specialOfferApplied = false;
    this.firstTimeDiscountApplied = false;
    
    // Update promo code disabled state
    this.updatePromoCodeDisabledState();
    this.errorMessage = '';
    
    this.calculateTotal();
  }
  
  loadPollQuestions(serviceTypeId: number) {
    this.pollService.getPollQuestions(serviceTypeId).subscribe({
      next: (questions) => {
        this.pollQuestions = questions;
        this.pollAnswers = {};
        
        // Initialize dropdown questions with empty string to show "Select an option"
        questions.forEach(question => {
          if (question.questionType === 'dropdown') {
            this.pollAnswers[question.id] = '';
          }
        });
      },
      error: (error) => {
        console.error('Error loading poll questions:', error);
      }
    });
  }

  initializeRegularServices(serviceType: ServiceType) {
    // Initialize services based on type
    if (serviceType.services) {
      // Sort services by displayOrder before processing
      const sortedServices = [...serviceType.services].sort((a, b) => 
        (a.displayOrder || 999) - (b.displayOrder || 999)
      );
      
      sortedServices.forEach(service => {
        if (service.isActive !== false) {
          // Use minValue as default for all services
          const defaultQuantity = service.minValue ?? 0;
          this.selectedServices.push({
            service: service,
            quantity: defaultQuantity
          });
        }
      });
    }
    
    // Clear any previously selected extra services
    this.selectedExtraServices = [];
  }
  
  isPollFormValid(): boolean {
    if (!this.showPollForm) return true;
    
    // Check required questions
    for (const question of this.pollQuestions) {
      if (question.isRequired && (!this.pollAnswers[question.id] || this.pollAnswers[question.id].trim() === '')) {
        return false;
      }
    }
    
    // Check only the required fields for poll forms: contact info and address
    const requiredFields = [
      'contactFirstName',
      'contactLastName', 
      'contactEmail',
      'contactPhone',
      'serviceAddress',
      'city',
      'state',
      'zipCode'
    ];
    
    // Check if user has selected an apartment (which would fill address fields)
    if (this.selectedApartmentId.value) {
      // If apartment is selected, we don't need to validate individual address fields
      // but we still need contact info
      const contactFields = ['contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone'];
      for (const field of contactFields) {
        const control = this.bookingForm.get(field);
        if (!control || !control.valid) {
          return false;
        }
      }
    } else {
      // If no apartment selected, validate all required fields including address
      for (const field of requiredFields) {
        const control = this.bookingForm.get(field);
        if (!control || !control.valid) {
          return false;
        }
      }
      
      // Also check apartment name if entering new address
      const apartmentNameControl = this.bookingForm.get('apartmentName');
      if (!apartmentNameControl || !apartmentNameControl.valid) {
        return false;
      }
    }
    
    // Check consent checkboxes for poll forms
    if (!this.smsConsent.value || !this.cancellationConsent.value) {
      return false;
    }
    
    return true;
  }
  
  submitPollForm() {
    this.pollFormSubmitted = true;
    
    if (!this.isPollFormValid()) {
      this.scrollToFirstError();
      return;
    }
  
    this.isLoading = true;
    const formValue = this.bookingForm.getRawValue();
  
    const answers: PollAnswer[] = this.pollQuestions.map(question => ({
      pollQuestionId: question.id,
      answer: this.pollAnswers[question.id] || ''
    })).filter(answer => answer.answer.trim() !== '');
  
    const submission: PollSubmission = {
      serviceTypeId: this.selectedServiceType!.id,
      contactFirstName: formValue.contactFirstName,
      contactLastName: formValue.contactLastName,
      contactEmail: formValue.contactEmail,
      contactPhone: formValue.contactPhone,
      serviceAddress: formValue.serviceAddress,
      aptSuite: formValue.aptSuite,
      city: formValue.city,
      state: formValue.state,
      postalCode: formValue.zipCode,
      answers: answers,
      uploadedPhotos: this.preparePhotosForSubmission()
    };
  
    this.pollService.submitPoll(submission).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/poll-success'], { 
          queryParams: { serviceType: this.selectedServiceType!.name } 
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to submit poll. Please try again.';
      }
    });
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
  get companyDevelopmentTips() { return this.bookingForm.get('companyDevelopmentTips') as FormControl; }
  get cleaningType() { return this.bookingForm.get('cleaningType') as FormControl; }
  get smsConsent() { return this.bookingForm.get('smsConsent') as FormControl; }
  get cancellationConsent() { return this.bookingForm.get('cancellationConsent') as FormControl; }

  // Check if promo code should be disabled
  isPromoCodeDisabled(): boolean {
    return this.specialOfferApplied || this.promoCode.disabled;
  }

  // Update promo code disabled state based on special offer
  updatePromoCodeDisabledState() {
    if (this.specialOfferApplied) {
      this.promoCode.disable();
    } else {
      this.promoCode.enable();
    }
  }

  private loadUserSubscription() {
    // Only call getUserSubscription if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.hasActiveSubscription = false;
      this.userSubscription = null;
      return;
    }
  
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
        // Only log error if it's not a 401 (which is expected for logged out users)
        if (error.status !== 401) {
          console.error('Error loading subscription:', error);
        }
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

  // Get filtered extra services (excluding deep cleaning and super deep cleaning)
  getFilteredExtraServices(): ExtraService[] {
    if (!this.selectedServiceType) return [];
    
    return this.selectedServiceType.extraServices.filter(extra => {
      // Show all extra services except deep cleaning and super deep cleaning
      return !extra.isDeepCleaning && !extra.isSuperDeepCleaning;
    });
  }

  getExtraServiceTooltip(extra: ExtraService): string {
    let tooltip = extra.description || '';
    
    // Add additional info for Extra Cleaners
    if (extra.name === 'Extra Cleaners') {
      tooltip += '\n\nEach extra cleaner reduces service duration.';
    }
    
    return tooltip;
  }

  // Handle cleaning type selection
  onCleaningTypeChange(cleaningType: string) {
    // Remove any existing deep cleaning or super deep cleaning services
    this.selectedExtraServices = this.selectedExtraServices.filter(
      s => !s.extraService.isDeepCleaning && !s.extraService.isSuperDeepCleaning
    );

    // Add the selected cleaning type if not normal
    if (cleaningType !== 'normal' && this.selectedServiceType) {
      const cleaningService = this.selectedServiceType.extraServices.find(extra => {
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

    this.calculateTotal();
    this.saveFormData();
  }

  onDurationChange(duration: number) {
    this.customDuration.setValue(duration);
    this.calculateTotal();
    this.saveFormData();
  }

  getAvailableTimeSlots(): string[] {
    const selectedDate = this.serviceDate.value;
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

  onDateChange() {
    // Reset time selection when date changes
    const availableSlots = this.getAvailableTimeSlots();
    if (availableSlots.length > 0) {
      // Set to first available time slot
      this.serviceTime.setValue(availableSlots[0]);
    } else {
      this.serviceTime.setValue('');
    }
    this.saveFormData();
  }

  onTimeChange(time: string) {
    this.serviceTime.setValue(time);
    this.saveFormData();
  }

  onDateSelectorChange(date: string) {
    this.serviceDate.setValue(date);
    
    // Check if the selected date is not today (same day service)
    const selectedDate = new Date(date);
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    // If user selected a date that's not today, uncheck same day service
    if (!isToday) {
      // Find and uncheck the same day service
      const sameDayService = this.selectedExtraServices.find(s => s.extraService.isSameDayService);
      if (sameDayService) {
        this.toggleExtraService(sameDayService.extraService, true); // Skip date change since user selected a specific date
      }
    }
    
    this.onDateChange();
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

  // Photo upload methods
  async onPhotoSelect(event: any) {
    this.photoUploadError = '';
    const files = event.target.files;
    
    if (!files || files.length === 0) return;
    
    // Check if adding these files would exceed the limit
    if (this.uploadedPhotos.length + files.length > this.maxPhotos) {
      this.photoUploadError = `You can upload a maximum of ${this.maxPhotos} photos`;
      return;
    }
    
    this.isUploadingPhoto = true;
    
    const fileList = Array.from(files as FileList);
    for (const file of fileList) {
      try {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.name.toLowerCase().match(/\.(heic|heif)$/)) {
          this.photoUploadError = 'Only image files are allowed';
          this.isUploadingPhoto = false;
          return;
        }
        
        // Validate file size (15MB limit)
        if (file.size > this.maxFileSize) {
          this.photoUploadError = `File ${file.name} is too large. Maximum size is 15MB`;
          this.isUploadingPhoto = false;
          return;
        }
        
        // Compress and convert to base64
        const result = await this.compressAndConvertToBase64(file);
        this.uploadedPhotos.push({
          file: file,
          preview: this.sanitizer.bypassSecurityTrustUrl(result.preview),
          base64: result.base64
        });
        
        this.isUploadingPhoto = false;
        
        // Clear the input to allow re-selection of the same file
        event.target.value = '';
      } catch (error) {
        console.error('Error processing photo:', error);
        this.photoUploadError = 'Error processing photo';
        this.isUploadingPhoto = false;
      }
    }
  }

  private compressAndConvertToBase64(file: File): Promise<{preview: string, base64: string}> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200;
          
          // Only resize if image is larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with good quality
          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          const base64Data = base64.split(',')[1];
          
          resolve({
            preview: base64,
            base64: base64Data
          });
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  removePhoto(index: number) {
    this.uploadedPhotos.splice(index, 1);
  }

  private preparePhotosForSubmission(): any[] {
    return this.uploadedPhotos.map(photo => ({
      fileName: photo.file.name,
      base64Data: photo.base64,
      contentType: photo.file.type
    }));
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
    if (serviceName.includes('office')) return 'fas fa-desktop';
    if (serviceName.includes('couches')) return 'fas fa-couch';
    
    // Default icon for unknown services
    return 'fas fa-plus';
  }

  toggleBookingSummary() {
    this.isSummaryCollapsed = !this.isSummaryCollapsed;
    
    // Scroll to the booking summary
    setTimeout(() => {
      const summaryElement = document.querySelector('.booking-summary');
      if (summaryElement) {
        summaryElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }
}