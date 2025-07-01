import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HttpClientModule, GoogleSigninButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  isLoginMode = true;
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  returnUrl: string;
  showResendOption = false;
  resendEmail = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''], // Remove pattern validation to make it truly optional
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });

    // Add password match validation
    this.registerForm.get('confirmPassword')?.setValidators([
      Validators.required,
      this.passwordMatchValidator.bind(this)
    ]);
  }

  passwordMatchValidator(control: any) {
    const password = this.registerForm?.get('password')?.value;
    const confirmPassword = control.value;
    
    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  ngOnInit() {
    // Listen for Google sign-in success
    if (this.authService.socialAuthService) {
      this.authService.socialAuthService.authState.subscribe((user) => {
        if (user && user.provider === 'GOOGLE') {
          this.handleGoogleSignIn(user);
        }
      });
    }
  }

  private async handleGoogleSignIn(user: any) {
    console.log('Google sign-in successful:', user);
    this.isLoading = true;
    this.errorMessage = null;
    
    try {
      // Send the ID token to your backend
      await this.authService.handleGoogleUser(user);
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = error?.error?.message || 'Google login failed. Please try again.';
    }
  }

  // Social login methods
  // async onGoogleLogin() {
  //   console.log('Google login button clicked');
  //   this.isLoading = true;
  //   this.errorMessage = null;
    
  //   try {
  //     console.log('Calling authService.googleLogin()');
  //     await this.authService.googleLogin();
  //     console.log('Google login successful');
  //   } catch (error: any) {
  //     console.error('Google login error:', error);
  //     this.isLoading = false;
      
  //     if (error.message?.includes('popup_closed_by_user')) {
  //       this.errorMessage = 'Login cancelled';
  //     } else if (error.message?.includes('Social auth service not initialized')) {
  //       this.errorMessage = 'Social login is initializing. Please try again in a moment.';
  //     } else {
  //       this.errorMessage = error?.error?.message || 'Google login failed. Please try again.';
  //     }
  //   }
  // }
  

  onForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null;
  }

  resendVerification() {
    if (!this.resendEmail) return;
    
    this.authService.resendVerification(this.resendEmail).subscribe({
      next: (response: any) => {
        this.errorMessage = 'Verification email sent! Please check your inbox.';
        this.showResendOption = false;
      },
      error: () => {
        this.errorMessage = 'Failed to resend verification email.';
      }
    });
  }

  onSubmit() {
    this.errorMessage = null;
    this.isLoading = true;
  
    if (this.isLoginMode) {
      if (this.loginForm.valid) {
        this.authService.login(this.loginForm.value).subscribe({
          next: (response) => {
            this.isLoading = false;
            // Navigate to return URL or home
            this.router.navigateByUrl(this.returnUrl);
          },
          error: (error) => {
            this.isLoading = false;
            
            // Handle specific error cases
            if (error.status === 400 && error.error?.message) {
              this.errorMessage = error.error.message;
              
              // Check if it's email verification error
              if (error.error.message.includes('verify your email')) {
                this.showResendOption = true;
                this.resendEmail = this.loginForm.value.email; // Store the email they tried to login with
              }
            } else if (error.status === 401) {
              this.errorMessage = 'Invalid email or password.';
            } else if (error.status === 0 || error.status >= 500) {
              this.errorMessage = 'Unable to connect to server. Please check your connection and try again.';
            } else {
              this.errorMessage = 'Login failed. Please try again.';
            }
          }
        });
      }
    } else {
      if (this.registerForm.valid) {
        this.authService.register(this.registerForm.value).subscribe({
          next: (response) => {
            this.isLoading = false;
            
            // Check if email verification is required
            if (response.requiresEmailVerification) {
              // Navigate to verification notice page WITH EMAIL in state
              this.router.navigate(['/auth/verify-email-notice'], {
                state: { email: this.registerForm.value.email }
              });
            } else {
              // This shouldn't happen with the new flow, but handle it
              this.router.navigateByUrl(this.returnUrl);
            }
          },
          error: (error) => {
            // Don't log to console - only show user-friendly message
            this.isLoading = false;
            
            // Handle specific error cases
            if (error.status === 400 && error.error?.message) {
              // Use the server's error message for user display
              this.errorMessage = error.error.message;
            } else if (error.status === 409) {
              this.errorMessage = 'An account with this email already exists.';
            } else if (error.status === 0 || error.status >= 500) {
              this.errorMessage = 'Unable to connect to server. Please check your connection and try again.';
            } else {
              this.errorMessage = 'Registration failed. Please try again.';
            }
          }
        });
      }
    }
  }
}