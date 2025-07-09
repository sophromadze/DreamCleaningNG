import { Component, OnInit } from '@angular/core';
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
  orderId: number = 0;
  isProcessing = false;
  paymentCompleted = false;
  errorMessage = '';
  bookingData: any = null;
  paymentClientSecret: string | null = null;
  orderTotal: number = 0;
  currentUser: any;

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

    // Create the booking immediately
    this.createBooking();
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
    
    this.bookingService.confirmPayment(this.orderId, paymentIntent.id).subscribe({
      next: (response) => {
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
            console.log('User profile refreshed with new phone number');
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
      }
    });
  }

  onPaymentError(error: any) {
    this.errorMessage = error.message || 'Payment failed. Please try again.';
    this.isProcessing = false;
  }

  cancelBooking() {
    // Clear the booking data
    this.bookingDataService.clearBookingData();
    this.router.navigate(['/booking']);
  }
}