import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * RegisterComponent - User account creation page
 * 
 * Features:
 * - Input fields for username and password
 * - Form validation (check if fields are empty)
 * - Error messages if registration fails
 * - Success message before redirecting to login
 * - Link to login page for existing users
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <h2>Create Account</h2>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="success">{{ successMessage }}</div>
      <input [(ngModel)]="username" placeholder="Username" type="text" />
      <input [(ngModel)]="password" placeholder="Password" type="password" />
      <button (click)="onRegister()">Register</button>
      <p>Already have an account? <a routerLink="/login">Login</a></p>
    </div>
  `
})
export class RegisterComponent {
  // inject() - Get services from Angular's dependency injection system
  // These are provided globally and can be used in any component
  authService = inject(AuthService);
  router = inject(Router);
  
  // Data binding: When user types in input fields, these variables update
  // When we set these variables, the input fields update (two-way binding with [(ngModel)])
  username = '';
  password = '';
  
  // Error/success messages to show user feedback
  errorMessage = '';
  successMessage = '';

  /**
   * onRegister - Handle the register button click
   * 
   * Flow:
   * 1. Clear any previous error/success messages
   * 2. Validate that username and password are not empty
   * 3. Call authService.register() to send data to backend
   * 4. If successful: show success message, then redirect to login after 1.5 seconds
   * 5. If failed: show error message from backend
   * 
   * subscribe() - Listen to the HTTP response
   *   - next: Runs if request succeeds
   *   - error: Runs if request fails
   */
  onRegister() {
    // Clear previous messages so user sees fresh state
    this.errorMessage = '';
    this.successMessage = '';
    
    // Validation: Check if both fields are filled
    if (!this.username || !this.password) {
      this.errorMessage = 'Username and password are required.';
      return;  // Stop here, don't proceed to backend
    }
    
    // Send registration request to backend
    this.authService.register({ username: this.username, password: this.password })
      .subscribe({
        // next() runs if the HTTP request succeeds (status 200-299)
        next: () => {
          this.successMessage = 'Registration successful! Redirecting to login...';
          // Wait 1.5 seconds so user sees the success message, then redirect
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        // error() runs if the HTTP request fails or throws an exception
        error: (err) => {
          // Try to get error message from backend, fallback to generic message
          const detail = err.error?.detail || err.message || 'Registration failed';
          this.errorMessage = detail;
          // Log to browser console for debugging
          console.error('Registration error:', err);
        }
      });
  }
}