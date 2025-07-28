import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  private isBrowser: boolean;

  constructor(
    private googlePlacesService: GooglePlacesService,
    private specialOfferService: SpecialOfferService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Preload the main hero image for this component only in browser
    if (this.isBrowser) {
      this.preloadMainImage();
    }
    this.loadReviews();
    this.loadSpecialOffers();
    this.checkAuthStatus();

    // Add debug method to window
    if (this.isBrowser) {
      (window as any).debugMainAuth = () => this.debugAuth();
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    // Clean up any preload links created by this component only in browser
    if (this.isBrowser) {
      const mainImagePreloadLinks = document.querySelectorAll('link[rel="preload"][data-main-image="true"]');
      mainImagePreloadLinks.forEach(link => link.remove());
    }
  }

  private loadReviews() {
    this.subscription.add(
      this.googlePlacesService.getReviews().subscribe({
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
      })
    );
  }

  private loadSpecialOffers() {
    this.isLoadingOffers = true;
    this.subscription.add(
      this.specialOfferService.getPublicSpecialOffers().subscribe({
        next: (offers) => {
          this.specialOffers = offers;
          this.isLoadingOffers = false;
        },
        error: (error) => {
          console.error('Error loading special offers:', error);
          this.isLoadingOffers = false;
        }
      })
    );
  }

  private checkAuthStatus() {
    // Set initial auth state
    this.isLoggedIn = this.authService.isLoggedIn();
    
    // Subscribe to authentication state changes
    this.subscription.add(
      this.authService.currentUser.subscribe(user => {
        this.isLoggedIn = !!user;
        console.log('Auth state changed - isLoggedIn:', this.isLoggedIn);
        if (this.isLoggedIn) {
          this.loadUserOffers();
        } else {
          this.userOffers = [];
        }
        // Force change detection
        this.cdr.detectChanges();
      })
    );
  }

  private loadUserOffers() {
    this.subscription.add(
      this.specialOfferService.getMySpecialOffers().subscribe({
        next: (offers) => {
          this.userOffers = offers;
        },
        error: (error) => {
          console.error('Error loading user offers:', error);
        }
      })
    );
  }

  private preloadMainImage() {
    // Only execute in browser environment
    if (!this.isBrowser) return;
    
    // Create a link element to preload the main image
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/images/mainImage.webp';
    link.fetchPriority = 'high';
    link.setAttribute('data-main-image', 'true'); // Mark it for easy removal
    document.head.appendChild(link);
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
      if (this.isBrowser) {
        window.location.href = '/booking';
      }
    } else {
      // Redirect to login page if not logged in
      if (this.isBrowser) {
        window.location.href = '/login';
      }
    }
  }

  // Debug method to check auth state
  debugAuth() {
    console.log('Component isLoggedIn:', this.isLoggedIn);
    console.log('AuthService isLoggedIn():', this.authService.isLoggedIn());
    console.log('Current user:', this.authService.currentUserValue);
    console.log('isLoadingOffers:', this.isLoadingOffers);
    console.log('Condition !isLoggedIn && !isLoadingOffers:', !this.isLoggedIn && !this.isLoadingOffers);
  }
}
