import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { BookingDataService } from '../../services/booking-data.service';
import { PaymentComponent } from '../payment/payment.component';
import { StripeService } from '../../services/stripe.service';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, PaymentComponent],
  templateUrl: './booking-confirmation.component.html',
  styleUrls: ['./booking-confirmation.component.scss']
})
export class BookingConfirmationComponent implements OnInit {
  @ViewChild('paymentComponent') paymentComponent!: PaymentComponent;
  
  orderId: number = 0;
  isProcessing = false;
  paymentCompleted = false;
  errorMessage = '';
  bookingData: any = null;
  paymentClientSecret: string | null = null;
  orderTotal: number = 0;
  currentUser: any;

  // Flag to track if we're preparing for payment
  isPreparing = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private bookingService: BookingService,
    private bookingDataService: BookingDataService,
    private stripeService: StripeService
  ) {}

  ngOnInit() {
    // Get booking data from service
    this.bookingData = this.bookingDataService.getBookingData();
    
    if (!this.bookingData) {
      // No booking data, redirect back to booking
      this.router.navigate(['/booking']);
      return;
    }

    // Get current user for billing details
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });

    // Create payment intent without creating order
    this.preparePayment();
  }

  preparePayment() {
    this.isPreparing = true;
    this.errorMessage = '';
    this.paymentClientSecret = null; // Clear previous payment intent

    // Clear payment component errors if it exists
    if (this.paymentComponent) {
      this.paymentComponent.clearErrors();
    }

    // Calculate total from booking data
    let total;
    
    // First try to use the pre-calculated total
    if (this.bookingData.calculation?.total !== undefined && this.bookingData.calculation?.total !== null) {
      total = this.bookingData.calculation.total;
    } else if (this.bookingData.total !== undefined && this.bookingData.total !== null) {
      total = this.bookingData.total;
    } else {
      // Fallback calculation - FIXED with correct tax calculation
      const subTotal = this.bookingData.subTotal || 0;
      const tips = this.bookingData.tips || 0;
      const companyDevelopmentTips = this.bookingData.companyDevelopmentTips || 0;
      const discountAmount = this.bookingData.discountAmount || 0;
      const subscriptionDiscountAmount = this.bookingData.subscriptionDiscountAmount || 0;
      const giftCardAmountToUse = this.bookingData.giftCardAmountToUse || 0;
      
      // Calculate total discount
      const totalDiscountAmount = discountAmount + subscriptionDiscountAmount;
      
      // Calculate tax on DISCOUNTED subtotal (this is the fix)
      const discountedSubTotal = subTotal - totalDiscountAmount;
      const tax = Math.round(discountedSubTotal * 0.08875 * 100) / 100; // Fixed: 0.088 -> 0.08875
      
      // Calculate final total
      const totalBeforeGiftCard = discountedSubTotal + tax + tips + companyDevelopmentTips;
      total = Math.max(0, totalBeforeGiftCard - giftCardAmountToUse);
      total = Math.round(total * 100) / 100;
    }
    
    this.orderTotal = total;

    // Create payment intent directly with Stripe service
    const metadata = {
      userId: this.currentUser?.id?.toString() || '',
      type: 'booking_preparation'
    };

    this.stripeService.createPaymentIntent(total, metadata).subscribe({
      next: (paymentIntent) => {
        this.paymentClientSecret = paymentIntent.client_secret;
        this.isPreparing = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to prepare payment. Please try again.';
        this.isPreparing = false;
      }
    });
  }

  createBooking() {
    this.isProcessing = true;
    this.errorMessage = '';

    this.bookingService.createBooking(this.bookingData).subscribe({
      next: (response) => {
        this.orderId = response.orderId;
        this.paymentClientSecret = response.paymentClientSecret;
        this.orderTotal = response.total;
        this.isProcessing = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create booking';
        this.isProcessing = false;
      }
    });
  }

  get billingDetails() {
    return {
      name: `${this.currentUser?.firstName} ${this.currentUser?.lastName}`,
      email: this.currentUser?.email,
      phone: this.currentUser?.phone || this.bookingData?.contactPhone
    };
  }

  onPaymentComplete(paymentIntent: any) {
    this.isProcessing = true;
    
    // Now create the booking after successful payment
    this.bookingService.createBooking(this.bookingData).subscribe({
      next: (response) => {
        this.orderId = response.orderId;
        
        // Immediately confirm the payment
        this.bookingService.confirmPayment(this.orderId, paymentIntent.id).subscribe({
          next: (confirmResponse) => {
            this.paymentCompleted = true;
            this.isProcessing = false;
            
            // Clear the booking data
            this.bookingDataService.clearBookingData();
            
            // Check if user selected a subscription
            const selectedSubscription = this.bookingData.subscription;
            if (selectedSubscription && selectedSubscription.subscriptionDays > 0) {
              // Refresh subscription data
              this.bookingService.getUserSubscription().subscribe({
                next: (subscriptionData) => {
                  console.log('Subscription data refreshed:', subscriptionData);
                },
                error: (error) => {
                  console.error('Failed to refresh subscription data:', error);
                }
              });
            }
            
            // Refresh user profile to get updated phone number
            this.authService.refreshUserProfile().subscribe({
              next: () => {
                // User profile refreshed successfully
              },
              error: (error) => {
                console.error('Failed to refresh user profile:', error);
              }
            });
            
            // Redirect to order details after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/order', this.orderId], {
                state: { bookingCompleted: true }
              });
            }, 3000);
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Payment confirmation failed';
            this.isProcessing = false;
            // TODO: Handle the case where order was created but payment confirmation failed
          }
        });
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create booking';
        this.isProcessing = false;
      }
    });
  }

  onPaymentError(error: any) {
    // Don't set error message here since the payment component will show it
    // Just reset the processing state
    this.isProcessing = false;
  }

  retryPayment() {
    // Clear any existing errors and prepare a new payment
    this.preparePayment();
  }

  cancelBooking() {
    // Clear the booking data
    this.bookingDataService.clearBookingData();
    this.router.navigate(['/booking']);
  }
}