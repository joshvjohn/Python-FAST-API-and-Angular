import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

/**
 * AuthService - Handles all authentication-related operations
 * 
 * This service manages:
 * - User registration (signup)
 * - User login
 * - Storing JWT tokens in localStorage
 * - Checking if user is logged in
 * - Logout functionality
 * 
 * @Injectable provides root: Makes this service available globally throughout the app
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8000';  // Backend server URL

  /**
   * register - Create a new user account
   * 
   * Sends username and password to the backend /register endpoint.
   * The backend will:
   * 1. Check if username already exists
   * 2. Hash the password for security
   * 3. Store the user in the database
   * 
   * @param credentials - {username: string, password: string}
   * @returns Observable - HTTP response from backend
   * 
   * Usage in component:
   *   this.authService.register({username: 'john', password: 'pass123'})
   *     .subscribe(
   *       (response) => console.log('Success!'),
   *       (error) => console.log('Registration failed')
   *     );
   */
  register(credentials: any) {
    return this.http.post(`${this.apiUrl}/register`, credentials);
  }

  /**
   * login - Authenticate user and get JWT token
   * 
   * Sends credentials to the backend /token endpoint.
   * On success, the backend returns a JWT token which we store in localStorage.
   * 
   * What happens:
   * 1. Convert credentials to URLEncoded format (required by OAuth2)
   * 2. Send POST request with proper headers
   * 3. Backend validates credentials and returns JWT token
   * 4. We store the token in localStorage using tap() operator
   * 5. Frontend can now use this token for protected endpoints
   * 
   * @param credentials - {username: string, password: string}
   * @returns Observable - HTTP response with access_token
   * 
   * Note: URLSearchParams format is: "username=john&password=pass123"
   */
  login(credentials: {username: string, password: string}) {
    // Create URLSearchParams (format: "key=value&key2=value2")
    const body = new URLSearchParams();
    body.set('username', credentials.username);
    body.set('password', credentials.password);

    // Set proper Content-Type header for OAuth2
    const options = {
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
    };

    // Send login request and save token if successful
    return this.http.post<any>(`${this.apiUrl}/token`, body.toString(), options).pipe(
      // tap() operator: runs a side effect without changing the data
      // Here, we save the token to localStorage after successful login
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
      })
    );
  }

  /**
   * logout - Clear authentication and redirect to login page
   * 
   * Removes the JWT token from localStorage, effectively logging out the user.
   * Then redirects to the login page.
   * 
   * Usage: this.authService.logout()
   */
  logout() {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }

  /**
   * isLoggedIn - Check if user is currently authenticated
   * 
   * Returns true if a JWT token exists in localStorage.
   * Used by the app header to show/hide login buttons.
   * 
   * @returns boolean - true if token exists, false otherwise
   * 
   * Usage: 
   *   if (this.authService.isLoggedIn()) {
   *     // Show upload button
   *   }
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }
}