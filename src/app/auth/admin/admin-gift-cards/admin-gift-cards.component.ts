// admin-gift-cards.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

interface GiftCardAdmin {
  id: number;
  code: string;
  originalAmount: number;
  currentBalance: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  message?: string;
  isActive: boolean;
  isPaid: boolean;
  createdAt: Date;
  paidAt?: Date;
  purchasedByUserName: string;
  totalAmountUsed: number;
  timesUsed: number;
  lastUsedAt?: Date;
  isFullyUsed: boolean;
  usages: GiftCardUsage[];
}

interface GiftCardUsage {
  id: number;
  amountUsed: number;
  balanceAfterUsage: number;
  usedAt: Date;
  orderReference: string;
  usedByName: string;
  usedByEmail: string;
}

@Component({
  selector: 'app-admin-gift-cards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-gift-cards.component.html',
  styleUrl: './admin-gift-cards.component.scss'
})
export class AdminGiftCardsComponent implements OnInit {
  giftCards: GiftCardAdmin[] = [];
  filteredGiftCards: GiftCardAdmin[] = [];
  selectedGiftCard: GiftCardAdmin | null = null;
  
  // Filters
  searchTerm = '';
  filterStatus = 'all'; // all, active, inactive, fullyUsed, partiallyUsed
  filterPaidStatus = 'all'; // all, paid, unpaid
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  paginatedGiftCards: GiftCardAdmin[] = [];
  
  // Stats
  totalGiftCards = 0;
  totalAmountSold = 0;
  totalAmountUsed = 0;
  activeGiftCards = 0;

  giftCardBackgroundPath: string = '';
  hasGiftCardBackground: boolean = false;
  isUpdatingBackground: boolean = false;

  selectedFile: File | null = null;
  isUploading: boolean = false;
  imagePreviewUrl: string | null = null;
  
  loading = false;
  errorMessage = '';
  isSuperAdmin = false;
  userPermissions: any = {
    permissions: {
      canActivate: false,
      canDeactivate: false
    }
  };

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.checkUserRole();
    this.loadGiftCards();
    this.loadGiftCardConfig();
  }

  checkUserRole() {
    this.adminService.getUserPermissions().subscribe({
      next: (permissions) => {
        this.isSuperAdmin = permissions.role === 'SuperAdmin';
        this.userPermissions = permissions;
      },
      error: (error) => {
        console.error('Error checking user role:', error);
        this.isSuperAdmin = false;
      }
    });
  }

  canToggleGiftCardStatus(giftCard: GiftCardAdmin): boolean {
    if (this.isSuperAdmin) return true;
    if (!this.userPermissions.permissions) return false;
    
    return giftCard.isActive 
      ? this.userPermissions.permissions.canDeactivate 
      : this.userPermissions.permissions.canActivate;
  }

  maskGiftCardCode(code: string): string {
    return this.isSuperAdmin ? code : '*'.repeat(code.length);
  }

  loadGiftCards() {
    this.loading = true;
    this.errorMessage = '';
    
    this.adminService.getAllGiftCards().subscribe({
      next: (cards) => {
        this.giftCards = cards;
        this.calculateStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load gift cards';
        this.loading = false;
        console.error('Error loading gift cards:', error);
      }
    });
  }

  calculateStats() {
    this.totalGiftCards = this.giftCards.length;
    this.totalAmountSold = this.giftCards
      .filter(g => g.isPaid)
      .reduce((sum, g) => sum + g.originalAmount, 0);
    this.totalAmountUsed = this.giftCards
      .reduce((sum, g) => sum + g.totalAmountUsed, 0);
    this.activeGiftCards = this.giftCards
      .filter(g => g.isActive && !g.isFullyUsed).length;
  }

  applyFilters() {
    let filtered = [...this.giftCards];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.id.toString().includes(term) ||
        g.senderEmail.toLowerCase().includes(term)
      );
    }

    // Status filter
    switch (this.filterStatus) {
      case 'active':
        filtered = filtered.filter(g => g.isActive && !g.isFullyUsed);
        break;
      case 'inactive':
        filtered = filtered.filter(g => !g.isActive);
        break;
      case 'fullyUsed':
        filtered = filtered.filter(g => g.isFullyUsed);
        break;
      case 'partiallyUsed':
        filtered = filtered.filter(g => g.totalAmountUsed > 0 && !g.isFullyUsed);
        break;
    }

    // Paid status filter
    switch (this.filterPaidStatus) {
      case 'paid':
        filtered = filtered.filter(g => g.isPaid);
        break;
      case 'unpaid':
        filtered = filtered.filter(g => !g.isPaid);
        break;
    }

    this.filteredGiftCards = filtered;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredGiftCards.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.currentPage = Math.max(1, this.currentPage);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedGiftCards = this.filteredGiftCards.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 3; // Number of pages to show in the middle

    if (this.totalPages <= 5) {
      // If total pages is 5 or less, show all pages
      for (let i = 2; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate the range of pages to show
      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, start + maxVisiblePages - 1);

      // Adjust start if we're near the end
      if (end === this.totalPages - 1) {
        start = Math.max(2, end - maxVisiblePages + 1);
      }

      // Add pages to the array
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.changePage(page);
    }
  }

  viewDetails(giftCard: GiftCardAdmin) {
    if (this.selectedGiftCard?.id === giftCard.id) {
      this.selectedGiftCard = null;
    } else {
      this.selectedGiftCard = giftCard;
    }
  }

  closeDetails() {
    this.selectedGiftCard = null;
  }

  toggleGiftCardStatus(giftCard: GiftCardAdmin) {
    const action = giftCard.isActive ? 'deactivate' : 'activate';
    
    if (confirm(`Are you sure you want to ${action} this gift card?`)) {
      this.adminService.toggleGiftCardStatus(giftCard.id, action).subscribe({
        next: () => {
          this.loadGiftCards();
        },
        error: (error) => {
          console.error(`Error ${action}ing gift card:`, error);
          alert(`Failed to ${action} gift card`);
        }
      });
    }
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: any): string {
    return new Date(date).toLocaleString();
  }

  loadGiftCardConfig() {
    this.adminService.getGiftCardConfig().subscribe({
      next: (config) => {
        this.giftCardBackgroundPath = config.backgroundImagePath || '';
        this.hasGiftCardBackground = config.hasBackground;
      },
      error: (error) => {
        console.error('Error loading gift card config:', error);
      }
    });
  }
  
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type - ADDED image/webp
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
  
  uploadImage() {
    if (!this.selectedFile) {
      alert('Please select an image first');
      return;
    }
    
    this.isUploading = true;
    this.adminService.uploadGiftCardBackground(this.selectedFile).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.giftCardBackgroundPath = response.imagePath;
        this.hasGiftCardBackground = true;
        this.selectedFile = null;
        this.imagePreviewUrl = null;
        
        // Clear file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        alert('Background image uploaded successfully!');
        // Clear the cache so next visit loads the new image
        localStorage.removeItem('giftCardBackground');
        this.loadGiftCardConfig(); // Reload config
      },
      error: (error) => {
        this.isUploading = false;
        alert('Upload failed: ' + (error.error?.message || 'Unknown error'));
        console.error('Upload error:', error);
      }
    });
  }
}