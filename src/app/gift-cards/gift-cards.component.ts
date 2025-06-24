import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
  giftCardBackgroundPath: string = '';
  isLoadingBackground: boolean = true;

  // Predefined amounts for selection
  predefinedAmounts = [100, 200, 300, 400, 500, 1000];

  constructor(
    private fb: FormBuilder,
    private giftCardService: GiftCardService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
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
    this.loadGiftCardBackground();
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

  loadGiftCardBackground() {
    // Step 1: Check cache first for instant display
    const cachedPath = localStorage.getItem('giftCardBackground');
    if (cachedPath) {
      this.giftCardBackgroundPath = cachedPath;
      this.isLoadingBackground = false;
    }
    
    // Step 2: Fetch latest from API to check for updates
    this.http.get<any>('/api/admin/gift-card-config').subscribe({
      next: (response) => {
        const newPath = response.backgroundImagePath || '/images/mainImage.png';
        
        // If path changed or no cache, preload the new image
        if (newPath !== this.giftCardBackgroundPath || !cachedPath) {
          this.preloadImage(newPath);
        } else {
          // Path hasn't changed, we're already showing the right image
          this.isLoadingBackground = false;
        }
      },
      error: (error: any) => {
        console.error('Error loading gift card background:', error);
        
        // If no cached version, use fallback
        if (!this.giftCardBackgroundPath) {
          this.giftCardBackgroundPath = '/images/mainImage.png';
          this.isLoadingBackground = false;
        }
      }
    });
  }

  private preloadImage(imagePath: string) {
    const img = new Image();
    
    img.onload = () => {
      // Image loaded successfully
      this.giftCardBackgroundPath = imagePath;
      this.isLoadingBackground = false;
      
      // Update cache with new path
      localStorage.setItem('giftCardBackground', imagePath);
    };
    
    img.onerror = () => {
      // Image failed to load, use fallback
      console.error('Failed to load gift card background:', imagePath);
      this.giftCardBackgroundPath = '/images/mainImage.png';
      this.isLoadingBackground = false;
      
      // Don't cache failed image
      localStorage.removeItem('giftCardBackground');
    };
    
    // Start loading the image
    img.src = imagePath;
  }

  getGiftCardBackground(): string {
    return this.giftCardBackgroundPath;
  }


  // Form getters for template
  get amount() { return this.giftCardForm.get('amount'); }
  get recipientName() { return this.giftCardForm.get('recipientName'); }
  get recipientEmail() { return this.giftCardForm.get('recipientEmail'); }
  get senderName() { return this.giftCardForm.get('senderName'); }
  get senderEmail() { return this.giftCardForm.get('senderEmail'); }
  get message() { return this.giftCardForm.get('message'); }
}