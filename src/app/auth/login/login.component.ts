import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HttpClientModule],
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

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null;
  }

  onSubmit() {
    this.errorMessage = null;
    this.isLoading = true;
  
    if (this.isLoginMode) {
      if (this.loginForm.valid) {
        this.authService.login(this.loginForm.value).subscribe({
          next: (response) => {
            // Only log success messages in development
            if (!environment.production) {
              console.log('Login successful:', response);
            }
            this.isLoading = false;
            // Navigate to return URL or home
            this.router.navigateByUrl(this.returnUrl);
          },
          error: (error) => {
            // Don't log to console - only show user-friendly message
            this.isLoading = false;
            
            // Handle specific error cases
            if (error.status === 400 && error.error?.message) {
              // Use the server's error message for user display
              this.errorMessage = error.error.message;
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
            // Only log success messages in development
            if (!environment.production) {
              console.log('Registration successful:', response);
            }
            this.isLoading = false;
            // Navigate to return URL or home
            this.router.navigateByUrl(this.returnUrl);
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