import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GiftCardService, CreateGiftCard, GiftCard } from '../services/gift-card.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './gift-cards.component.html',
  styleUrls: ['./gift-cards.component.scss']
})
export class GiftCardsComponent implements OnInit {
  giftCardForm: FormGroup;
  userGiftCards: GiftCard[] = [];
  previewGiftCard: any = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isProcessingPayment = false;
  currentUser: any = null;
  copiedCode: string | null = null;

  // Predefined amounts for selection
  predefinedAmounts = [100, 200, 300, 400, 500, 1000];

  constructor(
    private fb: FormBuilder,
    private giftCardService: GiftCardService,
    private authService: AuthService,
    private router: Router
  ) {
    this.giftCardForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(50), Validators.max(10000)]],
      recipientName: ['', [Validators.required, Validators.maxLength(15)]],
      recipientEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      senderName: ['', [Validators.required, Validators.maxLength(100)]],
      senderEmail: [{value: '', disabled: true}, [Validators.required, Validators.email, Validators.maxLength(255)]],
      message: ['', [Validators.required, Validators.maxLength(70)]]
    });

    // Subscribe to form changes to update preview
    this.giftCardForm.valueChanges.subscribe(formValue => {
      this.updatePreview(formValue);
    });
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.loadUserGiftCards();
    this.prefillUserData();
    // Initialize preview with empty values
    this.updatePreview(this.giftCardForm.value);
  }

  updatePreview(formValue: any) {
    this.previewGiftCard = {
      ...formValue,
      code: 'XXXX-XXXX-XXXX', // Placeholder for preview
      createdDate: new Date()
    };
  }

  loadCurrentUser() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.prefillUserData();
    });
  }

  prefillUserData() {
    if (this.currentUser) {
      this.giftCardForm.patchValue({
        senderName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
        senderEmail: this.currentUser.email
      });
    }
  }

  loadUserGiftCards() {
    this.giftCardService.getUserGiftCards().subscribe({
      next: (cards) => {
        this.userGiftCards = cards;
      },
      error: (error) => {
        console.error('Error loading gift cards:', error);
      }
    });
  }

  selectAmount(amount: number) {
    this.giftCardForm.patchValue({ amount });
  }

  onCreateGiftCard() {
    if (!this.giftCardForm.valid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const giftCardData: CreateGiftCard = this.giftCardForm.getRawValue();

    this.giftCardService.createGiftCard(giftCardData).subscribe({
      next: (response) => {
        this.previewGiftCard = {
          ...giftCardData,
          code: response.code,
          id: response.giftCardId,
          paymentIntentId: response.paymentIntentId
        };
        this.isLoading = false;
        
        // Proceed to payment
        this.processPayment();
      },
      error: (error) => {
        console.error('Error creating gift card:', error);
        this.errorMessage = error.error?.message || 'Failed to create gift card. Please try again.';
        this.isLoading = false;
      }
    });
  }

  processPayment() {
    this.isProcessingPayment = true;
    this.errorMessage = '';

    // Simulate payment processing (replace with actual payment integration)
    this.giftCardService.simulateGiftCardPayment(this.previewGiftCard.id).subscribe({
      next: (response) => {
        this.isProcessingPayment = false;
        this.successMessage = 'Gift card created and paid successfully! The recipient will receive an email notification.';
        
        // Reset form and reload gift cards
        this.giftCardForm.reset();
        this.previewGiftCard = null;
        this.prefillUserData();
        this.loadUserGiftCards();
        
        // Scroll to top to show success message
        window.scrollTo(0, 0);
      },
      error: (error) => {
        console.error('Error processing payment:', error);
        this.errorMessage = error.error?.message || 'Failed to process payment. Please try again.';
        this.isProcessingPayment = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getGiftCardStatusBadge(giftCard: GiftCard): string {
    if (!giftCard.isActive) return 'inactive';
    if (giftCard.isUsed) return 'used';
    if (giftCard.currentBalance <= 0) return 'depleted';
    if (giftCard.currentBalance < giftCard.originalAmount) return 'partially-used';
    return 'active';
  }

  getGiftCardStatusText(giftCard: GiftCard): string {
    if (!giftCard.isActive) return 'Inactive';
    if (giftCard.isUsed) return 'Fully Used';
    if (giftCard.currentBalance <= 0) return 'Depleted';
    if (giftCard.currentBalance < giftCard.originalAmount) return 'Partially Used';
    return 'Active';
  }

  copyGiftCardCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode = code;
      // Show feedback for 2 seconds
      setTimeout(() => {
        this.copiedCode = null;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.copiedCode = code;
        setTimeout(() => {
          this.copiedCode = null;
        }, 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    });
  }

  // Add method to check if code was just copied
  isCodeCopied(code: string): boolean {
    return this.copiedCode === code;
  }

  private markFormGroupTouched() {
    Object.keys(this.giftCardForm.controls).forEach(key => {
      this.giftCardForm.get(key)?.markAsTouched();
    });
  }

  // Form getters for template
  get amount() { return this.giftCardForm.get('amount'); }
  get recipientName() { return this.giftCardForm.get('recipientName'); }
  get recipientEmail() { return this.giftCardForm.get('recipientEmail'); }
  get senderName() { return this.giftCardForm.get('senderName'); }
  get senderEmail() { return this.giftCardForm.get('senderEmail'); }
  get message() { return this.giftCardForm.get('message'); }
}