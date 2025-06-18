// src/app/auth/verify-email-notice/verify-email-notice.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

  constructor(private authService: AuthService) {}

  resendEmail() {
    this.isResending = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.resendVerification().subscribe({
      next: () => {
        this.successMessage = 'Verification email sent successfully!';
        this.isResending = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to send verification email.';
        this.isResending = false;
      }
    });
  }
}