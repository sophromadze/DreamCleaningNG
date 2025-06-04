import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Review {
  authorName: string;
  profilePhotoUrl: string;
  rating: number;
  text: string;
  time: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GooglePlacesService {
  private apiKey = environment.googleMapsApiKey;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private readonly placeId = 'ChIJHSWM5PolFKIRKY3v5B2aLKg'; // Your Google Place ID

  constructor(private http: HttpClient) { }

  searchPlaces(query: string): Observable<any> {
    const url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
    return this.http.get(url);
  }

  getPlaceDetails(placeId: string): Observable<any> {
    const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,reviews,user_ratings_total&key=${this.apiKey}`;
    return this.http.get(url);
  }

  getPlaceReviews(placeId: string): Observable<any> {
    const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=reviews&key=${this.apiKey}`;
    return this.http.get(url);
  }

  getReviews(): Observable<{ reviews: Review[], overallRating: number, totalReviews: number }> {
    return this.getPlaceDetails(this.placeId).pipe(
      map(response => {
        const result = response.result;
        if (!result) {
          return {
            reviews: [],
            overallRating: 0,
            totalReviews: 0
          };
        }

        const reviews = (result.reviews || []).map((review: any) => ({
          authorName: review.author_name,
          profilePhotoUrl: review.profile_photo_url,
          rating: review.rating,
          text: review.text,
          time: new Date(review.time * 1000)
        }));

        return {
          reviews,
          overallRating: result.rating || 0,
          totalReviews: result.user_ratings_total || 0
        };
      }),
      catchError(error => {
        return of({
          reviews: [],
          overallRating: 0,
          totalReviews: 0
        });
      })
    );
  }
} 