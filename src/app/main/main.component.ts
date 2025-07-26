import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { GooglePlacesService, Review } from '../services/google-reviews.service';
import { SpecialOfferService, PublicSpecialOffer, UserSpecialOffer } from '../services/special-offer.service';
import { AuthService } from '../services/auth.service';
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
  specialOffers: PublicSpecialOffer[] = [];
  userOffers: UserSpecialOffer[] = [];
  isLoggedIn: boolean = false;
  isLoadingOffers: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private googlePlacesService: GooglePlacesService,
    private specialOfferService: SpecialOfferService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadReviews();
    this.loadSpecialOffers();
    this.checkAuthStatus();
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

  private loadSpecialOffers() {
    this.isLoadingOffers = true;
    this.specialOfferService.getPublicSpecialOffers().subscribe({
      next: (offers) => {
        this.specialOffers = offers;
        this.isLoadingOffers = false;
      },
      error: (error) => {
        console.error('Error loading special offers:', error);
        this.isLoadingOffers = false;
      }
    });
  }

  private checkAuthStatus() {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) {
      this.loadUserOffers();
    }
  }

  private loadUserOffers() {
    this.specialOfferService.getMySpecialOffers().subscribe({
      next: (offers) => {
        this.userOffers = offers;
      },
      error: (error) => {
        console.error('Error loading user offers:', error);
      }
    });
  }

  getDisplayOffers(): PublicSpecialOffer[] {
    if (this.isLoggedIn) {
      // For logged users, show only their available offers
      return this.specialOffers.filter(offer => 
        this.userOffers.some(userOffer => userOffer.specialOfferId === offer.id)
      );
    } else {
      // For non-logged users, show all public offers
      return this.specialOffers;
    }
  }

  onOfferClick() {
    if (this.isLoggedIn) {
      // Redirect to booking page if logged in
      window.location.href = '/booking';
    } else {
      // Redirect to login page if not logged in
      window.location.href = '/login';
    }
  }
}
