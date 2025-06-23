// src/app/auth/admin/special-offers/special-offers.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SpecialOfferService, SpecialOffer, CreateSpecialOffer, UpdateSpecialOffer, OfferType } from '../../../services/special-offer.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-special-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './special-offers.component.html',
  styleUrls: ['./special-offers.component.scss']
})
export class SpecialOffersComponent implements OnInit {
  specialOffers: SpecialOffer[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  showCreateForm = false;
  editingOfferId: number | null = null;
  specialOfferForm!: FormGroup;

  editingOfferType: { [key: number]: number } = {};
  
  offerTypes = [
    { value: OfferType.FirstTime, label: 'First Time' },
    { value: OfferType.Seasonal, label: 'Seasonal' },
    { value: OfferType.Holiday, label: 'Holiday' },
    { value: OfferType.Custom, label: 'Custom' }
  ];

  // Permissions
  userRole: string = '';
  canCreate = false;
  canUpdate = false;
  canDelete = false;

  constructor(
    private specialOfferService: SpecialOfferService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.setUserPermissions();
    this.loadSpecialOffers();
  }

  initializeForm() {
    this.specialOfferForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      isPercentage: [true, Validators.required],
      discountValue: [20, [Validators.required, Validators.min(0.01)]],
      type: [OfferType.Custom, Validators.required],
      validFrom: [null],
      validTo: [null],
      minimumOrderAmount: [null, Validators.min(0)],
      requiresFirstTimeCustomer: [false],
      icon: [''],
      badgeColor: ['#28a745']
    });

    // Add validator for percentage discount
    this.specialOfferForm.get('discountValue')?.valueChanges.subscribe(() => {
      this.validateDiscountValue();
    });
    
    this.specialOfferForm.get('isPercentage')?.valueChanges.subscribe(() => {
      this.validateDiscountValue();
    });
  }

  validateDiscountValue() {
    const isPercentage = this.specialOfferForm.get('isPercentage')?.value;
    const discountValue = this.specialOfferForm.get('discountValue')?.value;
    
    if (isPercentage && discountValue > 100) {
      this.specialOfferForm.get('discountValue')?.setErrors({ max: true });
    }
  }

  setUserPermissions() {
    const currentUser = this.authService.currentUserValue;
    this.userRole = currentUser?.role || '';
    
    // Only Admin and SuperAdmin can manage special offers
    this.canCreate = this.userRole === 'Admin' || this.userRole === 'SuperAdmin';
    this.canUpdate = this.userRole === 'Admin' || this.userRole === 'SuperAdmin';
    this.canDelete = this.userRole === 'SuperAdmin'; // Only SuperAdmin can delete
  }

  loadSpecialOffers() {
    this.isLoading = true;
    this.specialOfferService.getAllSpecialOffers().subscribe({
      next: (offers) => {
        this.specialOffers = offers;
        this.isLoading = false;
        this.clearMessages();
      },
      error: (error) => {
        console.error('Error loading special offers:', error);
        this.errorMessage = error.error?.message || 'Failed to load special offers';
        this.isLoading = false;
      }
    });
  }

  clearMessages() {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 5000);
  }

  // Add this method to properly display offer types
  getOfferTypeString(type: number): string {
    switch(type) {
      case 0: return 'FirstTime';
      case 1: return 'Seasonal';
      case 2: return 'Holiday';
      case 3: return 'Custom';
      default: return 'Custom';
    }
  }

  showCreateOfferForm() {
    this.showCreateForm = true;
    this.editingOfferId = null;
    this.specialOfferForm.reset({
      isPercentage: true,
      discountValue: 20,
      type: OfferType.Custom,
      requiresFirstTimeCustomer: false,
      badgeColor: '#28a745'
    });
  }

  editOffer(offer: SpecialOffer) {
    this.editingOfferId = offer.id;
    this.showCreateForm = false;
    // Store the numeric type value
    this.editingOfferType[offer.id] = this.getOfferTypeValue(offer.type);
  }
  

  getOfferTypeValue(typeString: string): number {
    switch(typeString) {
      case 'FirstTime': return OfferType.FirstTime;
      case 'Seasonal': return OfferType.Seasonal;
      case 'Holiday': return OfferType.Holiday;
      case 'Custom': return OfferType.Custom;
      default: return OfferType.Custom;
    }
  }

  saveOffer() {
    if (this.editingOfferId) {
      // Save inline edited offer
      const offer = this.specialOffers.find(o => o.id === this.editingOfferId);
      if (offer) {
        this.isLoading = true;
        
        const updateData: UpdateSpecialOffer = {
          name: offer.name,
          description: offer.description,
          isPercentage: offer.isPercentage,
          discountValue: offer.discountValue,
          type: this.editingOfferType[offer.id],
          validFrom: offer.validFrom ? new Date(offer.validFrom) : undefined,
          validTo: offer.validTo ? new Date(offer.validTo) : undefined,
          icon: offer.icon || '',
          badgeColor: offer.badgeColor || '#28a745',
          isActive: offer.isActive
        };

        this.specialOfferService.updateSpecialOffer(offer.id, updateData).subscribe({
          next: () => {
            this.successMessage = 'Special offer updated successfully';
            this.editingOfferId = null;
            this.loadSpecialOffers();
            this.isLoading = false;
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Failed to update special offer';
            this.isLoading = false;
          }
        });
      }
    } else {
      // Save new offer (existing logic)
      if (!this.specialOfferForm.valid) {
        this.markFormGroupTouched(this.specialOfferForm);
        return;
      }

      this.isLoading = true;
      const formValue = this.specialOfferForm.value;

      // Create new offer
      const createData: CreateSpecialOffer = {
        ...formValue,
        type: formValue.type
      };

      this.specialOfferService.createSpecialOffer(createData).subscribe({
        next: () => {
          this.successMessage = 'Special offer created successfully';
          this.showCreateForm = false;
          this.loadSpecialOffers();
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to create special offer';
          this.isLoading = false;
        }
      });
    }
  }

  cancelEdit() {
    this.showCreateForm = false;
    this.editingOfferId = null;
    this.specialOfferForm.reset();
  }

  deleteOffer(offer: SpecialOffer) {
    if (offer.type === 'FirstTime') {
      this.errorMessage = 'Cannot delete the first-time customer discount';
      return;
    }

    if (!confirm(`Are you sure you want to delete "${offer.name}"?`)) {
      return;
    }

    this.specialOfferService.deleteSpecialOffer(offer.id).subscribe({
      next: () => {
        this.successMessage = 'Special offer deleted successfully';
        this.loadSpecialOffers();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to delete special offer';
      }
    });
  }

  toggleOfferStatus(offer: SpecialOffer, enable: boolean) {
    const action = enable ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} "${offer.name}"?`)) {
      return;
    }
  
    const serviceCall = enable ? 
      this.specialOfferService.enableSpecialOffer(offer.id) : 
      this.specialOfferService.disableSpecialOffer(offer.id);
  
    serviceCall.subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadSpecialOffers();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || `Failed to ${action} special offer`;
      }
    });
  }

  getOfferTypeLabel(type: string): string {
    return this.offerTypes.find(t => t.value === this.getOfferTypeValue(type))?.label || type;
  }

  isFirstTimeOffer(offer: SpecialOffer): boolean {
    return offer.type === 'FirstTime';
  }

  isEditingFirstTimeOffer(): boolean {
    if (!this.editingOfferId) return false;
    const offer = this.specialOffers.find(o => o.id === this.editingOfferId);
    return offer ? this.isFirstTimeOffer(offer) : false;
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}