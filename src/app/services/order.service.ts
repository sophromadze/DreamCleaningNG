import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderList {
  id: number;
  serviceTypeName: string;
  serviceDate: Date;
  serviceTime: string;
  status: string;
  total: number;
  serviceAddress: string;
  orderDate: Date;
}

export interface Order {
  id: number;
  userId: number;
  serviceTypeId: number;
  serviceTypeName: string;
  orderDate: Date;
  serviceDate: Date;
  serviceTime: string;
  status: string;
  subTotal: number;
  tax: number;
  tips: number;
  total: number;
  discountAmount: number;
  promoCode?: string;
  frequencyId: number;
  frequencyName: string;
  entryMethod?: string;
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
  totalDuration: number;
  maidsCount: number;
  isPaid: boolean;
  paidAt?: Date;
  services: OrderService[];
  extraServices: OrderExtraService[];
}

export interface OrderService {
  id: number;
  serviceId: number;
  serviceName: string;
  quantity: number;
  hours?: number;
  cost: number;
  duration: number;
  priceMultiplier?: number;
}

export interface OrderExtraService {
  id: number;
  extraServiceId: number;
  extraServiceName: string;
  quantity: number;
  hours: number;
  cost: number;
  duration: number;
}

export interface UpdateOrder {
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
  services: { serviceId: number; quantity: number }[];
  extraServices: { extraServiceId: number; quantity: number; hours: number }[];
  tips: number;
}

export interface CancelOrder {
  reason: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getUserOrders(): Observable<OrderList[]> {
    return this.http.get<OrderList[]>(`${this.apiUrl}/order`);
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/order/${orderId}`);
  }

  updateOrder(orderId: number, updateData: UpdateOrder): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/order/${orderId}`, updateData);
  }

  cancelOrder(orderId: number, cancelData: CancelOrder): Observable<any> {
    return this.http.post(`${this.apiUrl}/order/${orderId}/cancel`, cancelData);
  }

  calculateAdditionalAmount(orderId: number, updateData: UpdateOrder): Observable<{ additionalAmount: number }> {
    return this.http.post<{ additionalAmount: number }>(`${this.apiUrl}/order/${orderId}/calculate-additional`, updateData);
  }

  simulatePayment(orderId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/order/${orderId}/simulate-payment`, {});
  }

  simulateBookingPayment(orderId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/booking/simulate-payment/${orderId}`, {});
  }
}