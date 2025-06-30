import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CleanerCalendarItem {
  orderId: number;
  clientName: string;
  serviceDate: string;
  serviceTime: string;
  serviceAddress: string;
  serviceTypeName: string;
  totalDuration: number;
  tipsForCleaner?: string;
  isAssignedToCleaner: boolean;
}

export interface CleanerOrderDetail {
  orderId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceDate: string;
  serviceTime: string;
  serviceAddress: string;
  aptSuite?: string;
  city: string;
  state: string;
  zipCode: string;
  serviceTypeName: string;
  services: string[];
  extraServices: string[];
  totalDuration: number;
  maidsCount: number;
  entryMethod?: string;
  specialInstructions?: string;
  status: string;
  tipsAmount: number; // ADD: The actual tips amount
  tipsForCleaner?: string; // Additional admin instructions
  assignedCleaners: string[];
}

export interface AvailableCleaner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isAvailable: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CleanerService {
  private apiUrl = `${environment.apiUrl}/cleaner`;
  private adminApiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getCleanerCalendar(): Observable<CleanerCalendarItem[]> {
    return this.http.get<CleanerCalendarItem[]>(`${this.apiUrl}/calendar`);
  }

  getOrderDetails(orderId: number): Observable<CleanerOrderDetail> {
    return this.http.get<CleanerOrderDetail>(`${this.apiUrl}/orders/${orderId}`);
  }

  getAvailableCleaners(orderId: number): Observable<AvailableCleaner[]> {
    return this.http.get<AvailableCleaner[]>(`${this.adminApiUrl}/orders/${orderId}/available-cleaners`);
  }

  assignCleaners(orderId: number, cleanerIds: number[], tipsForCleaner?: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/orders/${orderId}/assign-cleaners`, {
      cleanerIds,
      tipsForCleaner
    });
  }

  removeCleanerFromOrder(orderId: number, cleanerId: number): Observable<any> {
    return this.http.delete(`${this.adminApiUrl}/orders/${orderId}/cleaners/${cleanerId}`);
  }
}