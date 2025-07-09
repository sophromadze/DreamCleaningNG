import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare var Stripe: any;

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripe: any;
  private elements: any;
  private cardElement: any;

  constructor() {
    this.stripe = Stripe(environment.stripePublishableKey);
  }

  createElements() {
    this.elements = this.stripe.elements();
    return this.elements;
  }

  createCardElement(elementId: string) {
    const style = {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };

    this.cardElement = this.elements.create('card', { style });
    this.cardElement.mount(`#${elementId}`);
    
    return this.cardElement;
  }

  async confirmCardPayment(clientSecret: string, billingDetails?: any) {
    const { error, paymentIntent } = await this.stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: this.cardElement,
          billing_details: billingDetails
        }
      }
    );

    if (error) {
      throw error;
    }

    return paymentIntent;
  }

  destroyCardElement() {
    if (this.cardElement) {
      this.cardElement.destroy();
      this.cardElement = null;
    }
  }
}