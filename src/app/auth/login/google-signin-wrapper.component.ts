import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-google-signin-wrapper',
  standalone: true,
  imports: [CommonModule, GoogleSigninButtonModule],
  template: `
    <div *ngIf="isBrowser">
      <asl-google-signin-button
        type="standard"
        size="large"
        text="signin_with"
        shape="rectangular"
        theme="outline"
        logo_alignment="left">
      </asl-google-signin-button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class GoogleSigninWrapperComponent implements OnInit {
  isBrowser: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.loadGoogleSignInScript();
    }
  }

  private loadGoogleSignInScript() {
    // Check if script is already loaded
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      return;
    }

    // Load Google Sign-In script dynamically
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
} 