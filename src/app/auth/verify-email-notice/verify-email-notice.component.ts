import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email-notice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email-notice.component.html',
  styleUrls: ['./verify-email-notice.component.scss']
})
export class VerifyEmailNoticeComponent {
  isResending = false;
  successMessage = '';
  errorMessage = '';
  userEmail: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Get email from navigation state (passed from registration)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.userEmail = navigation.extras.state['email'] || '';
    }
  }

  resendEmail() {
    if (!this.userEmail) {
      this.errorMessage = 'Email address not found. Please try registering again.';
      return;
    }

    this.isResending = true;
    this.successMessage = '';
    this.errorMessage = '';

    // Pass the email that was stored from registration
    this.authService.resendVerification(this.userEmail).subscribe({
      next: (response: any) => {
        this.successMessage = response.message || 'Verification email sent!';
        this.isResending = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to send verification email. Please try again.';
        this.isResending = false;
      }
    });
  }
}