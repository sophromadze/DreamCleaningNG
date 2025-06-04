import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfileService, Profile, Apartment, CreateApartment } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';

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

  // Profile edit form
  editProfileForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  };

  // New apartment form
  newApartment: CreateApartment = {
    name: '',
    address: '',
    city: '',
    postalCode: '',
    numberOfRooms: undefined,
    numberOfBathrooms: undefined,
    squareMeters: undefined,
    specialInstructions: ''
  };

  // Edit apartment form
  editingApartment: Apartment | null = null;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProfile();
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
    this.isAddingApartment = true;
    this.newApartment = {
      name: '',
      address: '',
      city: '',
      postalCode: '',
      numberOfRooms: undefined,
      numberOfBathrooms: undefined,
      squareMeters: undefined,
      specialInstructions: ''
    };
  }

  cancelAddApartment() {
    this.isAddingApartment = false;
  }

  addApartment() {
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
        this.errorMessage = 'Failed to add apartment';
      }
    });
  }

  startEditApartment(apartment: Apartment) {
    this.editingApartmentId = apartment.id;
    this.editingApartment = { ...apartment };
  }

  cancelEditApartment() {
    this.editingApartmentId = null;
    this.editingApartment = null;
  }

  saveApartment() {
    if (this.editingApartment && this.editingApartmentId) {
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
          this.errorMessage = 'Failed to update apartment';
        }
      });
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
}