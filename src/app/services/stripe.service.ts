import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

declare var Stripe: any;

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripe: any;
  private elements: any;
  private cardElement: any;
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient, private authService: AuthService) {
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

  createPaymentIntent(amount: number, metadata?: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    
    const body = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: metadata || {}
    };
    
    // Fix: Change URL to match your backend controller route
    return this.http.post(`${this.apiUrl}/stripewebhook/create-payment-intent`, body, { headers });
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

  async getPaymentIntentAsync(paymentIntentId: string) {
    const paymentIntent = await this.stripe.retrievePaymentIntent(paymentIntentId);
    return paymentIntent.paymentIntent;
  }

  destroyCardElement() {
    if (this.cardElement) {
      this.cardElement.destroy();
      this.cardElement = null;
    }
  }
}