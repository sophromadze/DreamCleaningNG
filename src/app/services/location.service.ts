import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private baseUrl = 'https://localhost:7292/api/location';

  constructor(private http: HttpClient) { }

  getStates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/states`).pipe(
      catchError(() => of(['New York'])) // Fallback to default
    );
  }

  getCities(state: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/cities/${state}`).pipe(
      catchError(() => of(['Manhattan', 'Brooklyn', 'Queens'])) // Fallback to default
    );
  }

  getAllCities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/cities`).pipe(
      catchError(() => of(['Manhattan', 'Brooklyn', 'Queens'])) // Fallback to default
    );
  }
}