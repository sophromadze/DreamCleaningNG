import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { BookingDataService } from '../../services/booking-data.service';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './booking-confirmation.component.html',
  styleUrls: ['./booking-confirmation.component.scss']
})
export class BookingConfirmationComponent implements OnInit {
  orderId: number = 0;
  isProcessing = false;
  paymentCompleted = false;
  errorMessage = '';
  bookingData: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private authService: AuthService,
    private bookingService: BookingService,
    private bookingDataService: BookingDataService
  ) {}

  ngOnInit() {
    // Get booking data from service
    this.bookingData = this.bookingDataService.getBookingData();
    
    if (!this.bookingData) {
      // No booking data, redirect back to booking
      this.router.navigate(['/booking']);
      return;
    }
    
    // If we have an orderId in the route (for backward compatibility)
    const routeOrderId = this.route.snapshot.params['orderId'];
    if (routeOrderId) {
      this.orderId = +routeOrderId;
    }
  }

  simulatePayment() {
    this.isProcessing = true;
    this.errorMessage = '';

    // First, create the booking
    this.bookingService.createBooking(this.bookingData).subscribe({
      next: (response) => {
        this.orderId = response.orderId;
        
        // Now simulate the payment
        this.orderService.simulateBookingPayment(this.orderId).subscribe({
          next: (paymentResponse) => {
            this.paymentCompleted = true;
            this.isProcessing = false;
            
            // Clear the booking data
            this.bookingDataService.clearBookingData();
            
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
            this.errorMessage = 'Payment failed. Please try again.';
            this.isProcessing = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create booking';
        this.isProcessing = false;
      }
    });
  }

  cancelBooking() {
    // Clear the booking data
    this.bookingDataService.clearBookingData();
    this.router.navigate(['/booking']);
  }
}