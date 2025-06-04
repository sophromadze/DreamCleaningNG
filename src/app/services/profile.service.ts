import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  firstTimeOrder: boolean;
  subscriptionId?: number;
  subscriptionName?: string;
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
  private baseUrl = 'https://localhost:7292/api/profile';

  constructor(private http: HttpClient) { }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(this.baseUrl);
  }

  updateProfile(profile: UpdateProfile): Observable<Profile> {
    return this.http.put<Profile>(this.baseUrl, profile);
  }

  getApartments(): Observable<Apartment[]> {
    return this.http.get<Apartment[]>(`${this.baseUrl}/apartments`);
  }

  addApartment(apartment: CreateApartment): Observable<Apartment> {
    return this.http.post<Apartment>(`${this.baseUrl}/apartments`, apartment);
  }

  updateApartment(id: number, apartment: Apartment): Observable<Apartment> {
    return this.http.put<Apartment>(`${this.baseUrl}/apartments/${id}`, apartment);
  }

  deleteApartment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/apartments/${id}`);
  }
}