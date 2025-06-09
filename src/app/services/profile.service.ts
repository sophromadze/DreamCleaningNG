import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  firstTimeOrder: boolean;
  subscriptionId?: number;
  subscriptionName?: string;
  subscriptionDiscountPercentage?: number;  
  subscriptionExpiryDate?: Date;             
  subscriptionOrderCount?: number;           
  apartments: Apartment[];
}

export interface Apartment {
  id: number;
  name: string;
  address: string;
  aptSuite?: string;
  city: string;
  state: string;
  postalCode: string;
  specialInstructions?: string;
}

export interface UpdateProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface CreateApartment {
  name: string;
  address: string;
  aptSuite?: string;
  city: string;
  state: string;
  postalCode: string;
  specialInstructions?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.apiUrl}/profile`);
  }

  updateProfile(profile: UpdateProfile): Observable<Profile> {
    return this.http.put<Profile>(`${this.apiUrl}/profile`, profile);
  }

  getApartments(): Observable<Apartment[]> {
    return this.http.get<Apartment[]>(`${this.apiUrl}/profile/apartments`);
  }

  addApartment(apartment: CreateApartment): Observable<Apartment> {
    return this.http.post<Apartment>(`${this.apiUrl}/profile/apartments`, apartment);
  }

  updateApartment(id: number, apartment: Apartment): Observable<Apartment> {
    return this.http.put<Apartment>(`${this.apiUrl}/profile/apartments/${id}`, apartment);
  }

  deleteApartment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/profile/apartments/${id}`);
  }
}