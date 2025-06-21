import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfileService, Profile, Apartment, CreateApartment } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { OrderService, OrderList } from '../../services/order.service';
import { Router } from '@angular/router';
import { SpecialOfferService, UserSpecialOffer } from '../../services/special-offer.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profile: Profile | null = null;
  isLoading = true;
  isEditingProfile = false;
  isAddingApartment = false;
  editingApartmentId: number | null = null;
  errorMessage = '';
  successMessage = '';
  recentOrders: OrderList[] = [];
  specialOffers: UserSpecialOffer[] = [];

  // Profile edit form
  editProfileForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  };

  // Location data
  states: string[] = [];
  cities: string[] = [];

  // New apartment form
  newApartment: CreateApartment = {
    name: '',
    address: '',
    aptSuite: '',
    city: '',
    state: '',
    postalCode: '',
    specialInstructions: ''
  };

  // Edit apartment form
  editingApartment: Apartment | null = null;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private locationService: LocationService,
    private orderService: OrderService,
    private router: Router,
    private specialOfferService: SpecialOfferService
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadLocationData();
    this.loadRecentOrders();
    this.loadSpecialOffers();
  }

  loadLocationData() {
    this.locationService.getStates().subscribe({
      next: (states) => {
        this.states = states;
        if (states.length > 0) {
          this.loadCities(states[0]);
        }
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
    // Only reset city if we're adding a new apartment
    if (this.isAddingApartment) {
      this.newApartment.city = '';
    }
    // Don't reset city when editing - it should keep its value
  }

  loadProfile() {
    this.isLoading = true;
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load profile';
        this.isLoading = false;
      }
    });
  }

  startEditProfile() {
    if (this.profile) {
      this.editProfileForm = {
        firstName: this.profile.firstName,
        lastName: this.profile.lastName,
        email: this.profile.email,
        phone: this.profile.phone || ''
      };
      this.isEditingProfile = true;
    }
  }

  cancelEditProfile() {
    this.isEditingProfile = false;
    this.errorMessage = '';
  }

  saveProfile() {
    // Validate phone number format
    if (this.editProfileForm.phone && !/^\d{10}$/.test(this.editProfileForm.phone)) {
      this.errorMessage = 'Please enter a valid 10-digit phone number';
      return;
    }

    this.profileService.updateProfile(this.editProfileForm).subscribe({
      next: (updatedProfile) => {
        this.profile = updatedProfile;
        this.isEditingProfile = false;
        this.successMessage = 'Profile updated successfully';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = 'Failed to update profile';
      }
    });
  }

  startAddApartment() {
    if (this.profile && this.profile.apartments.length >= 10) {
      this.errorMessage = 'You have reached the maximum limit of 10 saved addresses';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }
    
    this.isAddingApartment = true;
    this.newApartment = {
      name: '',
      address: '',
      aptSuite: '',
      city: '',
      state: this.states.length > 0 ? this.states[0] : '',
      postalCode: '',
      specialInstructions: ''
    };
    if (this.newApartment.state) {
      this.onStateChange(this.newApartment.state);
    }
  }

  addApartment() {
    // Clear any previous error messages
    this.errorMessage = '';
    
    // Validate for duplicates
    const validationError = this.validateApartment(this.newApartment);
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }
    
    this.profileService.addApartment(this.newApartment).subscribe({
      next: (apartment) => {
        if (this.profile) {
          this.profile.apartments.push(apartment);
        }
        this.isAddingApartment = false;
        this.successMessage = 'Apartment added successfully';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to add apartment';
      }
    });
  }
  

  // Add this method to check for duplicate apartments
  validateApartment(apartment: CreateApartment | Apartment, excludeId?: number): string | null {
    if (!this.profile || !this.profile.apartments) return null;
    
    // Check only active apartments
    const activeApartments = this.profile.apartments.filter(a => a.id !== excludeId);
    
    // Check for duplicate name (case-insensitive)
    const duplicateName = activeApartments.find(a => 
      a.name.toLowerCase() === apartment.name.toLowerCase()
    );
    
    if (duplicateName) {
      return `An apartment with the name '${apartment.name}' already exists`;
    }
    
    // Check for duplicate address (case-insensitive) - just the address field
    const duplicateAddress = activeApartments.find(a => 
      a.address.toLowerCase() === apartment.address.toLowerCase()
    );
    
    if (duplicateAddress) {
      return `An apartment with the address '${apartment.address}' already exists`;
    }
    
    return null;
  }
  

  startEditApartment(apartment: Apartment) {
    this.editingApartmentId = apartment.id;
    this.editingApartment = { ...apartment };
    // Load cities for the current state without resetting the city
    if (this.editingApartment.state) {
      this.loadCities(this.editingApartment.state);
    }
  }

  saveApartment() {
    if (this.editingApartment && this.editingApartmentId) {
      // Validate required fields
      if (!this.editingApartment.name || !this.editingApartment.address || 
          !this.editingApartment.city || !this.editingApartment.state || 
          !this.editingApartment.postalCode) {
        this.errorMessage = 'Please fill in all required fields';
        return;
      }

      // Validate for duplicates before making the API call
      const validationError = this.validateApartment(this.editingApartment, this.editingApartmentId);
      if (validationError) {
        this.errorMessage = validationError;
        return;
      }

      this.profileService.updateApartment(this.editingApartmentId, this.editingApartment).subscribe({
        next: (updatedApartment) => {
          if (this.profile) {
            const index = this.profile.apartments.findIndex(a => a.id === updatedApartment.id);
            if (index !== -1) {
              this.profile.apartments[index] = updatedApartment;
            }
          }
          this.editingApartmentId = null;
          this.editingApartment = null;
          this.successMessage = 'Apartment updated successfully';
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          // Handle validation errors from the backend
          if (error.status === 400) {
            this.errorMessage = error.error?.message || 'Invalid apartment data';
          } else {
            this.errorMessage = 'Failed to update apartment. Please try again.';
          }
        }
      });
    }
  }

  // Optional: Add real-time validation on form input
  onApartmentNameChange() {
    // Clear error first
    this.errorMessage = '';
    
    if (this.isAddingApartment && this.newApartment.name) {
      const duplicateName = this.profile?.apartments.find(a => 
        a.name.toLowerCase() === this.newApartment.name.toLowerCase()
      );
      if (duplicateName) {
        this.errorMessage = `An apartment with the name '${this.newApartment.name}' already exists`;
        return;
      }
    }
  }
  
  // Add the cancel methods to clear errors
  cancelAddApartment() {
    this.isAddingApartment = false;
    this.errorMessage = '';
    // Reset the form
    this.newApartment = {
      name: '',
      address: '',
      aptSuite: '',
      city: '',
      state: this.states.length > 0 ? this.states[0] : '',
      postalCode: '',
      specialInstructions: ''
    };
  }
  
  cancelEditApartment() {
    this.editingApartmentId = null;
    this.editingApartment = null;
    this.errorMessage = '';
  }
  
  onApartmentAddressChange() {
    // Clear error first
    this.errorMessage = '';
    
    // Check for duplicate name first
    if (this.isAddingApartment && this.newApartment.address) {
      const duplicateName = this.profile?.apartments.find(a => 
        a.address.toLowerCase() === this.newApartment.address.toLowerCase()
      );
      if (duplicateName) {
        this.errorMessage = `An apartment with the address '${this.newApartment.address}' already exists`;
        return;
      }
    }
  }

  deleteApartment(apartment: Apartment) {
    if (confirm(`Are you sure you want to delete "${apartment.name}"?`)) {
      this.profileService.deleteApartment(apartment.id).subscribe({
        next: () => {
          if (this.profile) {
            this.profile.apartments = this.profile.apartments.filter(a => a.id !== apartment.id);
          }
          this.successMessage = 'Apartment deleted successfully';
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = 'Failed to delete apartment';
        }
      });
    }
  }

  logout() {
    this.authService.logout();
  }

  loadSpecialOffers() {
    this.specialOfferService.getMySpecialOffers().subscribe({
      next: (offers) => {
        this.specialOffers = offers;
      },
      error: (error) => {
        console.error('Error loading special offers:', error);
      }
    });
  }

  loadRecentOrders() {
    this.orderService.getUserOrders().subscribe({
      next: (orders: OrderList[]) => {
        this.recentOrders = orders.slice(0, 3);
      },
      error: (error: Error) => {
        console.error('Error loading recent orders:', error);
      }
    });
  }

  viewOrderDetails(orderId: number) {
    this.router.navigate(['/order', orderId]);
  }

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString();
  }

  // Add method to handle phone input
  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Remove any non-digit characters
    input.value = input.value.replace(/\D/g, '');
    // Update the model
    this.editProfileForm.phone = input.value;
  }
}