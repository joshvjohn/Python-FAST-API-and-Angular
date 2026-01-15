import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * LoginComponent - User login page
 * 
 * Features:
 * - Input fields for username and password
 * - Form validation (check if fields are empty)
 * - Error messages if login fails (wrong credentials)
 * - Link to registration page for new users
 * - On success, redirects to upload dashboard
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <h2>Login</h2>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
      <input [(ngModel)]="username" placeholder="Username" type="text" />
      <input [(ngModel)]="password" placeholder="Password" type="password" />
      <button (click)="onLogin()">Login</button>
      <p>No account? <a routerLink="/register">Register</a></p>
    </div>
  `
})
export class LoginComponent {
  // Dependencies injected from Angular
  authService = inject(AuthService);
  router = inject(Router);
  
  // User input stored here (two-way bound to input fields)
  username = '';
  password = '';
  
  // Error message displayed if login fails
  errorMessage = '';

  /**
   * onLogin - Handle the login button click
   * 
   * Flow:
   * 1. Clear any previous error messages
   * 2. Validate that both fields are filled
   * 3. Call authService.login() to verify credentials with backend
   * 4. If successful:
   *    - Backend returns JWT token
   *    - Token is saved to localStorage (in AuthService)
   *    - Redirect to upload dashboard
   * 5. If failed: Show error message (usually "Incorrect username or password")
   * 
   * The JWT token allows us to make authenticated requests
   * (the authInterceptor automatically includes it in future requests)
   */
  onLogin() {
    // Start fresh - clear previous error messages
    this.errorMessage = '';
    
    // Validation: Don't proceed if fields are empty
    if (!this.username || !this.password) {
      this.errorMessage = 'Username and password are required.';
      return;
    }
    
    // Send login credentials to backend
    this.authService.login({ username: this.username, password: this.password })
      .subscribe({
        // Runs if login succeeds (correct username and password)
        next: () => {
          // authService.login() has already saved the token to localStorage
          // Now navigate to the upload page
          this.router.navigate(['/upload']);
        },
        // Runs if login fails (wrong username/password or network error)
        error: (err) => {
          // Get error message from backend response
          const detail = err.error?.detail || err.message || 'Login failed';
          this.errorMessage = detail;
          // Log to browser console for debugging
          console.error('Login error:', err);
        }
      });
  }
}