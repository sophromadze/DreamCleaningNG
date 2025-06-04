import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { GooglePlacesService, Review } from '../services/google-reviews.service';
import { Subscription } from 'rxjs';

interface ExtendedReview extends Review {
  isExpanded?: boolean;
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, RouterLink, HttpClientModule],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent implements OnInit, OnDestroy {
  reviews: ExtendedReview[] = [];
  overallRating: number = 0;
  totalReviews: number = 0;
  private subscription: Subscription = new Subscription();

  constructor(private googlePlacesService: GooglePlacesService) {}

  ngOnInit() {
    this.loadReviews();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private loadReviews() {
    this.subscription = this.googlePlacesService.getReviews().subscribe({
      next: (data) => {
        this.reviews = data.reviews.map(review => ({
          ...review,
          isExpanded: false
        }));
        this.overallRating = data.overallRating;
        this.totalReviews = data.totalReviews;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
      }
    });
  }
}
