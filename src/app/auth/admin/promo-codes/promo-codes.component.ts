import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, PromoCode, CreatePromoCode, UpdatePromoCode, UserPermissions } from '../../../services/admin.service';

@Component({
  selector: 'app-promo-codes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promo-codes.component.html',
  styleUrls: ['./promo-codes.component.scss']
})
export class PromoCodesComponent implements OnInit {
  promoCodes: PromoCode[] = [];
  isAddingPromoCode = false;
  editingPromoCodeId: number | null = null;
  newPromoCode: CreatePromoCode = {
    code: '',
    description: '',
    isPercentage: false,
    discountValue: 0,
    maxUsageCount: undefined,
    maxUsagePerUser: undefined,
    validFrom: undefined,
    validTo: undefined,
    minimumOrderAmount: undefined
  };

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

  // UI State
  errorMessage = '';
  successMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUserPermissions();
    this.loadPromoCodes();
  }

  loadUserPermissions() {
    this.adminService.getUserPermissions().subscribe({
      next: (response) => {
        this.userRole = response.role;
        this.userPermissions = response;
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.errorMessage = 'Failed to load permissions. Please try again.';
      }
    });
  }

  loadPromoCodes() {
    this.adminService.getPromoCodes().subscribe({
      next: (codes) => {
        this.promoCodes = codes;
      },
      error: (error) => {
        console.error('Error loading promo codes:', error);
        this.errorMessage = 'Failed to load promo codes. Please try again.';
      }
    });
  }

  startAddingPromoCode() {
    this.isAddingPromoCode = true;
    this.editingPromoCodeId = null;
    this.newPromoCode = {
      code: '',
      description: '',
      isPercentage: false,
      discountValue: 0,
      maxUsageCount: undefined,
      maxUsagePerUser: undefined,
      validFrom: undefined,
      validTo: undefined,
      minimumOrderAmount: undefined
    };
  }

  cancelAddPromoCode() {
    this.isAddingPromoCode = false;
    this.newPromoCode = {
      code: '',
      description: '',
      isPercentage: false,
      discountValue: 0,
      maxUsageCount: undefined,
      maxUsagePerUser: undefined,
      validFrom: undefined,
      validTo: undefined,
      minimumOrderAmount: undefined
    };
  }

  addPromoCode() {
    this.adminService.createPromoCode(this.newPromoCode).subscribe({
      next: (response) => {
        this.promoCodes.push(response);
        this.isAddingPromoCode = false;
        this.newPromoCode = {
          code: '',
          description: '',
          isPercentage: false,
          discountValue: 0,
          maxUsageCount: undefined,
          maxUsagePerUser: undefined,
          validFrom: undefined,
          validTo: undefined,
          minimumOrderAmount: undefined
        };
        this.successMessage = 'Promo code added successfully.';
      },
      error: (error) => {
        console.error('Error creating promo code:', error);
        this.errorMessage = 'Failed to create promo code. Please try again.';
      }
    });
  }

  editPromoCode(code: PromoCode) {
    this.editingPromoCodeId = code.id;
  }

  cancelEditPromoCode() {
    this.editingPromoCodeId = null;
  }

  savePromoCode(code: PromoCode) {
    const updateData: UpdatePromoCode = {
      description: code.description,
      isPercentage: code.isPercentage,
      discountValue: code.discountValue,
      maxUsageCount: code.maxUsageCount,
      maxUsagePerUser: code.maxUsagePerUser,
      validFrom: code.validFrom,
      validTo: code.validTo,
      minimumOrderAmount: code.minimumOrderAmount,
      isActive: code.isActive
    };

    this.adminService.updatePromoCode(code.id, updateData).subscribe({
      next: (response) => {
        const index = this.promoCodes.findIndex(c => c.id === response.id);
        if (index !== -1) {
          this.promoCodes[index] = response;
        }
        this.editingPromoCodeId = null;
        this.successMessage = 'Promo code updated successfully.';
      },
      error: (error) => {
        console.error('Error updating promo code:', error);
        this.errorMessage = 'Failed to update promo code. Please try again.';
      }
    });
  }

  deletePromoCode(code: PromoCode) {
    if (confirm('Are you sure you want to delete this promo code?')) {
      this.adminService.deletePromoCode(code.id).subscribe({
        next: () => {
          this.promoCodes = this.promoCodes.filter(c => c.id !== code.id);
          this.successMessage = 'Promo code deleted successfully.';
        },
        error: (error) => {
          console.error('Error deleting promo code:', error);
          this.errorMessage = 'Failed to delete promo code. Please try again.';
        }
      });
    }
  }

  deactivatePromoCode(code: PromoCode) {
    this.adminService.deactivatePromoCode(code.id).subscribe({
      next: (response) => {
        const index = this.promoCodes.findIndex(c => c.id === code.id);
        if (index !== -1) {
          this.promoCodes[index] = { ...this.promoCodes[index], isActive: false };
        }
        this.successMessage = 'Promo code deactivated successfully.';
      },
      error: (error) => {
        console.error('Error deactivating promo code:', error);
        this.errorMessage = 'Failed to deactivate promo code. Please try again.';
      }
    });
  }

  activatePromoCode(code: PromoCode) {
    this.adminService.activatePromoCode(code.id).subscribe({
      next: (response) => {
        const index = this.promoCodes.findIndex(c => c.id === code.id);
        if (index !== -1) {
          this.promoCodes[index] = { ...this.promoCodes[index], isActive: true };
        }
        this.successMessage = 'Promo code activated successfully.';
      },
      error: (error) => {
        console.error('Error activating promo code:', error);
        this.errorMessage = 'Failed to activate promo code. Please try again.';
      }
    });
  }
}
