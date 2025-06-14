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
  
  // Stats
  totalGiftCards = 0;
  totalAmountSold = 0;
  totalAmountUsed = 0;
  activeGiftCards = 0;
  
  loading = false;
  errorMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadGiftCards();
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
        g.code.toLowerCase().includes(term) ||
        g.recipientEmail.toLowerCase().includes(term) ||
        g.senderEmail.toLowerCase().includes(term) ||
        g.recipientName.toLowerCase().includes(term) ||
        g.senderName.toLowerCase().includes(term)
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
  }

  viewDetails(giftCard: GiftCardAdmin) {
    this.selectedGiftCard = giftCard;
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
}