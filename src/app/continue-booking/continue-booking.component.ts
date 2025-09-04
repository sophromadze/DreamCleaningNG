import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, HostListener, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { FormPersistenceService, BookingFormData } from '../services/form-persistence.service';
import { Subject, takeUntil, filter } from 'rxjs';

@Component({
  selector: 'app-continue-booking',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './continue-booking.component.html',
  styleUrl: './continue-booking.component.scss'
})
export class ContinueBookingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  public isBrowser: boolean;
  
  showContinueBooking = false;
  isOnBookingPage = false;
  isExpanded = true; // Start expanded, can be collapsed

  constructor(
    public formPersistenceService: FormPersistenceService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;

    // Check if we're on the booking page
    this.checkCurrentRoute();
    
    // Listen for route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.checkCurrentRoute();
        this.updateVisibility(this.formPersistenceService.getFormData());
      });

    // Listen for form data changes
    this.formPersistenceService.formData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(formData => {
        this.updateVisibility(formData);
      });

    // Initial check
    this.updateVisibility(this.formPersistenceService.getFormData());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkCurrentRoute() {
    this.isOnBookingPage = this.router.url.includes('/booking');
  }

  private updateVisibility(formData: any) {
    // Show continue booking if:
    // 1. We have saved form data
    // 2. We're not on the booking page
    // 3. We're in browser environment
    // 4. The booking hasn't been completed
    const shouldShow = this.isBrowser && 
                      !!formData && 
                      !this.isOnBookingPage &&
                      formData.bookingProgress !== 'completed';
    
    this.showContinueBooking = shouldShow;
  }

  onContinueBooking() {
    this.router.navigate(['/booking']);
  }

  onDismiss() {
    // Instead of hiding completely, collapse to small button
    this.isExpanded = false;
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }
}
