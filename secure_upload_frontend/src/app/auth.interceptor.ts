import { HttpInterceptorFn } from '@angular/common/http';

/**
 * authInterceptor - Automatically attach JWT token to all HTTP requests
 * 
 * An interceptor is middleware that runs on every HTTP request and response.
 * This interceptor:
 * 1. Checks if user is logged in (JWT token in localStorage)
 * 2. If token exists, adds it to the Authorization header
 * 3. Sends the request with the token
 * 
 * Why this matters:
 * - The backend uses the token to verify the user is authenticated
 * - Without the token, protected endpoints return 401 Unauthorized
 * - This automatically adds the token to every request, so we don't forget
 * 
 * How it works:
 * - User logs in -> Token saved to localStorage
 * - User makes a request -> Interceptor adds token to Authorization header
 * - Backend receives request with token -> Verifies it's valid -> Allows request
 * 
 * @param req - The HTTP request being sent
 * @param next - Function to continue the request (pass it forward)
 * @returns Modified request with Authorization header if token exists
 * 
 * Example of what gets added to every request:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Get the JWT token from localStorage
  // localStorage is browser storage that persists data even after page refresh
  const token = localStorage.getItem('access_token');

  // If a token exists, add it to the request headers
  if (token) {
    // req.clone() creates a copy of the request (we can't modify the original)
    // setHeaders() adds/modifies headers on the copied request
    const cloned = req.clone({
      setHeaders: { 
        // Format: "Bearer <token>"
        // "Bearer" is the standard OAuth2 token type
        Authorization: `Bearer ${token}` 
      }
    });
    // Pass the modified request to the next handler (continues the request)
    return next(cloned);
  }
  
  // If no token, just pass the original request forward
  return next(req);
};