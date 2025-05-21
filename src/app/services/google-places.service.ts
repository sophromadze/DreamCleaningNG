import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Review {
  authorName: string;
  profilePhotoUrl: string;
  rating: number;
  text: string;
  time: Date;
}

interface GoogleReview {
  Gg: {
    Eg: string;  // author name
    Fg: string;  // profile photo URL
  };
  Ig: number;    // rating
  text: string;  // review text
  Eg: Date;      // time
}

interface PlaceDetails {
  rating?: number;
  reviews?: GoogleReview[];
  userRatingCount?: number;
}

declare global {
  interface Window {
    google: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GooglePlacesService {
  private readonly placeId = 'ChIJHSWM5PolFKIRKY3v5B2aLKg';
  private place: any;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializePlace();
    }
  }

  private async initializePlace() {
    try {
      const { Place } = await window.google.maps.importLibrary("places");
      this.place = new Place({
        id: this.placeId
      });
    } catch (error) {
      console.error('Error initializing Place:', error);
    }
  }

  getReviews(): Observable<{ reviews: Review[], overallRating: number, totalReviews: number }> {
    if (typeof window === 'undefined') {
      return of({ reviews: [], overallRating: 0, totalReviews: 0 });
    }

    return from((async () => {
      if (!this.place) {
        await this.initializePlace();
      }

      if (!this.place) {
        throw new Error('Google Places API not loaded');
      }

      try {
        const result = await this.place.fetchFields({
          fields: ['rating', 'reviews', 'userRatingCount']
        });
        return result.place as PlaceDetails;
      } catch (error) {
        console.error('Error fetching place details:', error);
        throw error;
      }
    })()).pipe(
      map(result => {
        const reviews = result.reviews || [];
        
        return {
          reviews: reviews.map((review: any) => {
            const authorName = review.Gg?.Eg || '';
            const profilePhotoUrl = review.Gg?.Fg || '';
            const rating = review.Ig || 0;
            const text = review.text || '';
            const time = review.Eg || new Date();

            return {
              authorName,
              profilePhotoUrl,
              rating,
              text,
              time
            };
          }),
          overallRating: result.rating || 0,
          totalReviews: result.userRatingCount || 0
        };
      }),
      catchError(error => {
        console.error('Error fetching reviews:', error);
        return of({ reviews: [], overallRating: 0, totalReviews: 0 });
      })
    );
  }
} 