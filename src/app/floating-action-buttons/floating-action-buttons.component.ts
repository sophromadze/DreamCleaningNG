import { Component, HostListener, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-floating-action-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-action-buttons.component.html',
  styleUrl: './floating-action-buttons.component.scss'
})
export class FloatingActionButtonsComponent {
  isExpanded = false;
  private isBrowser: boolean;
  
  constructor(
    private router: Router, 
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isExpanded = false;
    }
  }
  
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }

  closeExpanded() {
    this.isExpanded = false;
  }
  
  callPhone() {
    if (this.isBrowser) {
      window.location.href = 'tel:+19299301525';
    }
  }

  sendEmail() {
    if (this.isBrowser) {
      window.location.href = 'mailto:hello@dreamcleaningnearme.com';
    }
  }

  bookNow() {
    this.router.navigate(['/booking']);
  }
} 