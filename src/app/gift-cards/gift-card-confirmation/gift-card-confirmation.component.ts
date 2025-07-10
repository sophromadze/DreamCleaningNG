import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { GiftCardService, CreateGiftCard } from '../../services/gift-card.service';
import { AuthService } from '../../services/auth.service';
import { PaymentComponent } from '../../booking/payment/payment.component';
import { StripeService } from '../../services/stripe.service';

@Component({
  selector: 'app-gift-card-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, PaymentComponent],
  templateUrl: './gift-card-confirmation.component.html',
  styleUrls: ['./gift-card-confirmation.component.scss']
})
export class GiftCardConfirmationComponent implements OnInit {
  giftCardId: number = 0;
  isProcessing = false;
  paymentCompleted = false;
  errorMessage = '';
  giftCardData: CreateGiftCard | null = null;
  paymentClientSecret: string | null = null;
  giftCardAmount: number = 0;
  currentUser: any;
  isPreparing = true;
  giftCardCode: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private giftCardService: GiftCardService,
    private stripeService: StripeService
  ) {
    // Try to get state from navigation
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { giftCardData: CreateGiftCard };
    
    if (state?.giftCardData) {
      this.giftCardData = state.giftCardData;
    }
  }

  ngOnInit() {
    // If no gift card data, try to get it from router state
    if (!this.giftCardData) {
      const state = history.state as { giftCardData: CreateGiftCard };
      if (state?.giftCardData) {
        this.giftCardData = state.giftCardData;
      }
    }
    
    if (!this.giftCardData) {
      console.error('No gift card data found, redirecting back...');
      this.router.navigate(['/gift-cards']);
      return;
    }

    // Set the amount
    this.giftCardAmount = typeof this.giftCardData.amount === 'string' 
      ? parseFloat(this.giftCardData.amount) 
      : this.giftCardData.amount;

    // Get current user
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });

    // Prepare payment
    this.preparePayment();
  }

  preparePayment() {
    this.isPreparing = true;
    this.errorMessage = '';

    const metadata = {
      userId: this.currentUser?.id?.toString() || '',
      type: 'gift_card_preparation'
    };

    this.stripeService.createPaymentIntent(this.giftCardAmount, metadata).subscribe({
      next: (paymentIntent) => {
        this.paymentClientSecret = paymentIntent.client_secret;
        this.isPreparing = false;
      },
      error: (error) => {
        console.error('Failed to create payment intent:', error);
        this.errorMessage = 'Failed to prepare payment. Please try again.';
        this.isPreparing = false;
      }
    });
  }

  get billingDetails() {
    return {
      name: this.giftCardData?.senderName || '',
      email: this.giftCardData?.senderEmail || ''
    };
  }

  onPaymentComplete(paymentIntent: any) {
    if (!this.giftCardData) return;
    
    this.isProcessing = true;
    
    // Create the gift card after successful payment
    this.giftCardService.createGiftCard(this.giftCardData).subscribe({
      next: (response) => {
        this.giftCardId = response.giftCardId;
        this.giftCardCode = response.code;
        
        // Confirm the payment
        this.giftCardService.confirmGiftCardPayment(response.giftCardId, paymentIntent.id).subscribe({
          next: (confirmResponse) => {
            this.paymentCompleted = true;
            this.isProcessing = false;
            
            // Redirect after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/gift-cards']);
            }, 3000);
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Payment confirmation failed';
            this.isProcessing = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create gift card';
        this.isProcessing = false;
      }
    });
  }

  onPaymentError(error: any) {
    // Only show error message for setup errors, not payment processing errors
    // Payment processing errors are handled by the payment component itself
    if (error.error?.type === 'card_error' || error.error?.type === 'validation_error') {
      // These are handled by the payment component, don't show duplicate error
      return;
    }
    
    this.errorMessage = error.message || 'Payment setup failed. Please try again.';
    this.isProcessing = false;
  }

  retryPayment() {
    this.errorMessage = '';
    this.paymentClientSecret = null; // Clear the old payment intent
    this.preparePayment();
  }

  cancelPurchase() {
    this.router.navigate(['/gift-cards']);
  }
}