import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { validatePassword } from '../../utils/password-validator';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="change-password-container">
      <h1>Change Password</h1>
      <div class="change-password-content">
        <form (ngSubmit)="onSubmit()" #passwordForm="ngForm">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              [(ngModel)]="currentPassword"
              required
              #currentPasswordInput="ngModel"
            />
            <div class="error" *ngIf="currentPasswordInput.invalid && currentPasswordInput.touched">
              Current password is required
            </div>
          </div>

          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              [(ngModel)]="newPassword"
              (ngModelChange)="validateNewPassword()"
              required
              minlength="8"
              #newPasswordInput="ngModel"
            />
            
            <div class="password-requirements">
              <small class="requirement-header">Password must contain:</small>
              <ul class="requirements-list">
                <li [class.met]="hasMinLength()">
                  At least 8 characters
                </li>
                <li [class.met]="hasUppercase()">
                  At least one uppercase letter
                </li>
                <li [class.met]="hasLowercase()">
                  At least one lowercase letter
                </li>
                <li [class.met]="hasNumber()">
                  At least one number
                </li>
              </ul>
            </div>
            
            <div class="error" *ngIf="newPasswordInput.touched && passwordErrors.length > 0">
              <span *ngFor="let error of passwordErrors">{{ error }}<br></span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              [(ngModel)]="confirmPassword"
              required
              #confirmPasswordInput="ngModel"
            />
            <div class="error" *ngIf="confirmPasswordInput.invalid && confirmPasswordInput.touched">
              Please confirm your new password
            </div>
            <div class="error" *ngIf="confirmPassword !== newPassword && confirmPasswordInput.touched">
              Passwords do not match
            </div>
          </div>

          <div class="success" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <div class="error" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" [disabled]="!isFormValid() || isSubmitting">
            {{ isSubmitting ? 'Changing Password...' : 'Change Password' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .change-password-container {
      padding: 2rem;
      max-width: 500px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    input.ng-invalid.ng-touched {
      border-color: #f44336;
    }

    .error {
      color: #f44336;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .success {
      color: #4CAF50;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    button {
      width: 100%;
      padding: 0.75rem;
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      background-color: #1976D2;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .password-requirements {
      margin-top: 0.5rem;
      background-color: #f5f5f5;
      padding: 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .requirement-header {
      color: #666;
      font-weight: 500;
      display: block;
      margin-bottom: 0.5rem;
    }

    .requirements-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .requirements-list li {
      color: #999;
      margin-bottom: 0.25rem;
      padding-left: 1.25rem;
      position: relative;
    }

    .requirements-list li::before {
      content: '○';
      position: absolute;
      left: 0;
      top: 0;
    }

    .requirements-list li.met {
      color: #4CAF50;
    }

    .requirements-list li.met::before {
      content: '✓';
      color: #4CAF50;
    }
  `]
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isSubmitting = false;
  passwordErrors: string[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnChanges() {
    this.validateNewPassword();
  }

  validateNewPassword() {
    if (this.newPassword) {
      const validation = validatePassword(this.newPassword);
      this.passwordErrors = validation.errors;
    } else {
      this.passwordErrors = [];
    }
  }

  isFormValid(): boolean {
    const validation = validatePassword(this.newPassword);
    return this.currentPassword.length > 0 && 
           validation.isValid && 
           this.newPassword === this.confirmPassword;
  }

  // Helper methods for template
  hasMinLength(): boolean {
    return this.newPassword ? this.newPassword.length >= 8 : false;
  }

  hasUppercase(): boolean {
    return this.newPassword ? /[A-Z]/.test(this.newPassword) : false;
  }

  hasLowercase(): boolean {
    return this.newPassword ? /[a-z]/.test(this.newPassword) : false;
  }

  hasNumber(): boolean {
    return this.newPassword ? /\d/.test(this.newPassword) : false;
  }

  onSubmit() {
    if (!this.isFormValid()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.successMessage = 'Password changed successfully!';
        this.isSubmitting = false;
        setTimeout(() => {
          this.router.navigate(['/cabinet']);
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to change password';
        this.isSubmitting = false;
      }
    });
  }
}