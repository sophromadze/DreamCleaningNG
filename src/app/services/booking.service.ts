import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceType {
  id: number;
  name: string;
  basePrice: number;
  description?: string;
  services: Service[];
  extraServices: ExtraService[];
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
}

export interface Frequency {
  id: number;
  name: string;
  description?: string;
  discountPercentage: number;
  frequencyDays: number;
}

export interface PromoCodeValidation {
  isValid: boolean;
  discountValue: number;
  isPercentage: boolean;
  message?: string;
}

export interface BookingData {
  serviceTypeId: number;
  services: { serviceId: number; quantity: number }[];
  extraServices: { extraServiceId: number; quantity: number; hours: number }[];
  frequencyId: number;
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
  apartmentId?: number;
  promoCode?: string;
  tips: number;
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
  private baseUrl = 'https://localhost:7292/api';

  constructor(private http: HttpClient) { }

  getServiceTypes(): Observable<ServiceType[]> {
    return this.http.get<ServiceType[]>(`${this.baseUrl}/booking/service-types`);
  }

  getFrequencies(): Observable<Frequency[]> {
    return this.http.get<Frequency[]>(`${this.baseUrl}/booking/frequencies`);
  }

  validatePromoCode(code: string): Observable<PromoCodeValidation> {
    return this.http.post<PromoCodeValidation>(`${this.baseUrl}/booking/validate-promo`, { code });
  }

  calculateBooking(bookingData: Partial<BookingData>): Observable<BookingCalculation> {
    return this.http.post<BookingCalculation>(`${this.baseUrl}/booking/calculate`, bookingData);
  }

  createBooking(bookingData: BookingData): Observable<any> {
    return this.http.post(`${this.baseUrl}/booking/create`, bookingData);
  }

  getAvailableTimeSlots(date: Date, serviceTypeId: number): Observable<string[]> {
    const dateStr = date.toISOString().split('T')[0];
    return this.http.get<string[]>(`${this.baseUrl}/booking/available-times?date=${dateStr}&serviceTypeId=${serviceTypeId}`);
  }
}