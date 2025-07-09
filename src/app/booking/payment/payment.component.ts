import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripeService } from '../../services/stripe.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit, OnDestroy {
  @Input() amount!: number;
  @Input() clientSecret!: string;
  @Input() billingDetails?: any;
  @Output() paymentComplete = new EventEmitter<any>();
  @Output() paymentError = new EventEmitter<any>();

  isProcessing = false;
  cardError: string | null = null;
  errorMessage: string | null = null;

  constructor(private stripeService: StripeService) {}

  ngOnInit() {
    this.initializeStripeElements();
  }

  ngOnDestroy() {
    this.stripeService.destroyCardElement();
  }

  private initializeStripeElements() {
    this.stripeService.createElements();
    const cardElement = this.stripeService.createCardElement('card-element');
    
    cardElement.addEventListener('change', (event: any) => {
      this.cardError = event.error ? event.error.message : null;
    });
  }

  async processPayment() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.errorMessage = null;

    try {
      const paymentIntent = await this.stripeService.confirmCardPayment(
        this.clientSecret,
        this.billingDetails
      );

      this.paymentComplete.emit(paymentIntent);
    } catch (error: any) {
      this.errorMessage = error.message || 'Payment failed. Please try again.';
      this.paymentError.emit(error);
    } finally {
      this.isProcessing = false;
    }
  }
}