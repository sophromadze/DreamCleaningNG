import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.orderId = +this.route.snapshot.params['orderId'];
    if (!this.orderId) {
      this.router.navigate(['/booking']);
    }
  }

  simulatePayment() {
    this.isProcessing = true;
    this.errorMessage = '';

    this.orderService.simulateBookingPayment(this.orderId).subscribe({
      next: (response) => {
        this.paymentCompleted = true;
        this.isProcessing = false;
        
        // Redirect to order details after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/order', this.orderId]);
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = 'Payment failed. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  cancelBooking() {
    // In a real app, you might want to cancel the order here
    this.router.navigate(['/booking']);
  }
}