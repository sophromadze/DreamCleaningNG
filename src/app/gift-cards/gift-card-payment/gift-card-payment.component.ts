import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { GiftCardService } from '../../services/gift-card.service';
import { PaymentComponent } from '../../booking/payment/payment.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-gift-card-payment',
  standalone: true,
  imports: [CommonModule, PaymentComponent],
  templateUrl: './gift-card-payment.component.html',
  styleUrls: ['./gift-card-payment.component.scss']
})
export class GiftCardPaymentComponent implements OnInit {
  giftCardId: number | null = null;
  clientSecret: string | null = null;
  amount: number = 0;
  paymentCompleted = false;
  errorMessage: string | null = null;
  currentUser: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private giftCardService: GiftCardService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.giftCardId = params['giftCardId'] ? +params['giftCardId'] : null;
      this.clientSecret = params['clientSecret'] || null;
      this.amount = params['amount'] ? +params['amount'] : 0;
    });

    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  get billingDetails() {
    return {
      name: `${this.currentUser?.firstName} ${this.currentUser?.lastName}`,
      email: this.currentUser?.email
    };
  }

  onPaymentComplete(paymentIntent: any) {
    if (this.giftCardId) {
      this.giftCardService.confirmGiftCardPayment(this.giftCardId, paymentIntent.id).subscribe({
        next: () => {
          this.paymentCompleted = true;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to confirm payment';
        }
      });
    }
  }

  onPaymentError(error: any) {
    this.errorMessage = error.message || 'Payment failed. Please try again.';
  }
}