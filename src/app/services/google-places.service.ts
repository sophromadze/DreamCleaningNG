import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GooglePlacesService {
  private apiKey = environment.googleMapsApiKey;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(private http: HttpClient) { }

  searchPlaces(query: string): Observable<any> {
    const url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
    return this.http.get(url);
  }

  getPlaceDetails(placeId: string): Observable<any> {
    const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,reviews&key=${this.apiKey}`;
    return this.http.get(url);
  }

  getPlaceReviews(placeId: string): Observable<any> {
    const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=reviews&key=${this.apiKey}`;
    return this.http.get(url);
  }
} 