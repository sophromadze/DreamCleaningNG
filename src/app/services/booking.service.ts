import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ServiceType {
  id: number;
  name: string;
  basePrice: number;
  description?: string;
  services: Service[];
  extraServices: ExtraService[];
  isActive: boolean;
  displayOrder?: number;
  hasPoll: boolean;
  timeDuration: number;
}

export interface Service {
  id: number;
  name: string;
  serviceKey: string;
  cost: number;
  timeDuration: number;
  serviceTypeId: number;
  inputType: string;
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  isRangeInput: boolean;
  unit?: string;
  serviceRelationType?: string;
  isActive: boolean;
  displayOrder?: number;
}

export interface ExtraService {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration: number;
  icon?: string;
  hasQuantity: boolean;
  hasHours: boolean;
  isDeepCleaning: boolean;
  isSuperDeepCleaning: boolean;
  isSameDayService: boolean;
  priceMultiplier: number;
  isAvailableForAll: boolean;
  isActive: boolean;
  displayOrder?: number;
}

export interface Subscription {
  id: number;
  name: string;
  description?: string;
  discountPercentage: number;
  subscriptionDays: number;
  isActive: boolean;
  displayOrder?: number;
}

export interface PromoCodeValidationDto {
  isValid: boolean;
  discountValue: number;
  isPercentage: boolean;
  message?: string;
  isGiftCard?: boolean;
  availableBalance?: number;
}

export interface BookingData {
  serviceTypeId: number;
  services: { serviceId: number; quantity: number }[];
  extraServices: { extraServiceId: number; quantity: number; hours: number }[];
  subscriptionId: number;
  serviceDate: Date;
  serviceTime: string;
  entryMethod: string;
  specialInstructions?: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  serviceAddress: string;
  aptSuite?: string;
  city: string;
  state: string;
  zipCode: string;
  apartmentId?: number | null;
  apartmentName?: string;
  promoCode?: string;
  userSpecialOfferId?: number;
  tips: number;
  companyDevelopmentTips: number;
  maidsCount: number;
  totalDuration: number;
  discountAmount: number;
  subTotal: number;
}

export interface BookingCalculation {
  subTotal: number;
  tax: number;
  discountAmount: number;
  tips: number;
  total: number;
  totalDuration: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getServiceTypes(): Observable<ServiceType[]> {
    return this.http.get<ServiceType[]>(`${this.apiUrl}/booking/service-types`);
  }

  getSubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/booking/subscriptions`);
  }
  
  validatePromoCode(code: string): Observable<PromoCodeValidationDto> {
    return this.http.post<PromoCodeValidationDto>(`${this.apiUrl}/booking/validate-promo`, { code });
  }

  // Method to apply gift card during booking
  applyGiftCardToBooking(giftCardCode: string, orderAmount: number, orderId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/booking/apply-gift-card`, 
      { code: giftCardCode, orderAmount, orderId }
    );
  }

  calculateBooking(bookingData: Partial<BookingData>): Observable<BookingCalculation> {
    return this.http.post<BookingCalculation>(`${this.apiUrl}/booking/calculate`, bookingData);
  }

  createBooking(bookingData: BookingData): Observable<any> {
    return this.http.post(`${this.apiUrl}/booking/create`, bookingData);
  }

  getAvailableTimeSlots(date: Date, serviceTypeId: number): Observable<string[]> {
    const dateStr = date.toISOString().split('T')[0];
    return this.http.get<string[]>(`${this.apiUrl}/booking/available-times?date=${dateStr}&serviceTypeId=${serviceTypeId}`);
  }

  getUserSubscription(): Observable<any> {
    return this.http.get(`${this.apiUrl}/booking/user-subscription`);
  }
}