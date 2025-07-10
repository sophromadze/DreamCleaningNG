import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GiftCardService, CreateGiftCard } from '../services/gift-card.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './gift-cards.component.html',
  styleUrls: ['./gift-cards.component.scss']
})
export class GiftCardsComponent implements OnInit {
  giftCardForm: FormGroup;
  previewGiftCard: any = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isProcessingPayment = false;
  currentUser: any = null;
  giftCardBackgroundPath: string = '';
  isLoadingBackground: boolean = true;

  // Add billing details getter
  get billingDetails() {
    return {
      name: this.giftCardForm.get('senderName')?.value,
      email: this.giftCardForm.get('senderEmail')?.value
    };
  }
  // Predefined amounts for selection
  predefinedAmounts = [100, 200, 300, 400, 500, 1000];

  constructor(
    private fb: FormBuilder,
    private giftCardService: GiftCardService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    this.giftCardForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(50), Validators.max(10000)]],
      recipientName: ['', [Validators.required, Validators.maxLength(15)]],
      recipientEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      senderName: ['', [Validators.required, Validators.maxLength(100)]],
      senderEmail: [{value: '', disabled: true}, [Validators.required, Validators.email, Validators.maxLength(255)]],
      message: ['', [Validators.required, Validators.maxLength(70)]]
    });

    // Subscribe to form changes to update preview
    this.giftCardForm.valueChanges.subscribe(formValue => {
      this.updatePreview(formValue);
    });
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.prefillUserData();
    this.loadGiftCardBackground();
    this.updatePreview(this.giftCardForm.value);
  }

  updatePreview(formValue: any) {
    this.previewGiftCard = {
      ...formValue,
      code: 'XXXX-XXXX-XXXX', // Placeholder for preview
      createdDate: new Date()
    };
  }

  loadCurrentUser() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.prefillUserData();
    });
  }

  prefillUserData() {
    if (this.currentUser) {
      this.giftCardForm.patchValue({
        senderName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
        senderEmail: this.currentUser.email
      });
    }
  }



  selectAmount(amount: number) {
    this.giftCardForm.patchValue({ amount });
  }

  onCreateGiftCard() {    
    if (!this.giftCardForm.valid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }
  
    this.isLoading = true;
    this.errorMessage = '';
  
    // Get gift card data
    const giftCardData: CreateGiftCard = this.giftCardForm.getRawValue();
    
    // Navigate to confirmation page with gift card data
    this.router.navigate(['/gift-card-confirmation'], {
      state: { giftCardData: giftCardData }
    }).then(success => {
      if (!success) {
        console.error('Navigation failed');
        this.isLoading = false;
        this.errorMessage = 'Failed to proceed to payment. Please try again.';
      }
    }).catch(error => {
      console.error('Navigation error:', error);
      this.isLoading = false;
      this.errorMessage = 'Failed to proceed to payment. Please try again.';
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }



  private markFormGroupTouched() {
    Object.keys(this.giftCardForm.controls).forEach(key => {
      this.giftCardForm.get(key)?.markAsTouched();
    });
  }

  loadGiftCardBackground() {
    // Step 1: Check cache first for instant display
    const cachedPath = localStorage.getItem('giftCardBackground');
    if (cachedPath) {
      this.giftCardBackgroundPath = cachedPath;
      this.isLoadingBackground = false;
    }
    
    // Step 2: Fetch latest from API to check for updates
    this.http.get<any>('/api/admin/gift-card-config').subscribe({
      next: (response) => {
        const newPath = response.backgroundImagePath || '/images/mainImage.png';
        
        // If path changed or no cache, preload the new image
        if (newPath !== this.giftCardBackgroundPath || !cachedPath) {
          this.preloadImage(newPath);
        } else {
          // Path hasn't changed, we're already showing the right image
          this.isLoadingBackground = false;
        }
      },
      error: (error: any) => {
        console.error('Error loading gift card background:', error);
        
        // If no cached version, use fallback
        if (!this.giftCardBackgroundPath) {
          this.giftCardBackgroundPath = '/images/mainImage.png';
          this.isLoadingBackground = false;
        }
      }
    });
  }

  private preloadImage(imagePath: string) {
    const img = new Image();
    
    img.onload = () => {
      // Image loaded successfully
      this.giftCardBackgroundPath = imagePath;
      this.isLoadingBackground = false;
      
      // Update cache with new path
      localStorage.setItem('giftCardBackground', imagePath);
    };
    
    img.onerror = () => {
      // Image failed to load, use fallback
      console.error('Failed to load gift card background:', imagePath);
      this.giftCardBackgroundPath = '/images/mainImage.png';
      this.isLoadingBackground = false;
      
      // Don't cache failed image
      localStorage.removeItem('giftCardBackground');
    };
    
    // Start loading the image
    img.src = imagePath;
  }

  getGiftCardBackground(): string {
    return this.giftCardBackgroundPath;
  }


  // Form getters for template
  get amount() { return this.giftCardForm.get('amount'); }
  get recipientName() { return this.giftCardForm.get('recipientName'); }
  get recipientEmail() { return this.giftCardForm.get('recipientEmail'); }
  get senderName() { return this.giftCardForm.get('senderName'); }
  get senderEmail() { return this.giftCardForm.get('senderEmail'); }
  get message() { return this.giftCardForm.get('message'); }
}