import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

/**
 * UploadComponent - File upload and management dashboard
 * 
 * This is the main page shown to logged-in users. Features:
 * - Upload files to the server
 * - View list of all their uploaded files
 * - See file sizes in human-readable format
 * - Auto-refresh file list after each upload
 * - Logout button in header
 * 
 * All operations require authentication (JWT token)
 * The token is automatically sent by authInterceptor
 */
@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2>Upload Dashboard</h2>
      
      <h3>Upload a File</h3>
      <input type="file" (change)="onFileSelected($event)">
      <button (click)="onUpload()" [disabled]="!selectedFile">Upload</button>
      <p *ngIf="message" [class.success]="isSuccess" [class.error]="!isSuccess">{{ message }}</p>
      
      <hr/>
      
      <h3>Your Files</h3>
      <div *ngIf="files.length > 0" class="files-list">
        <table>
          <thead>
            <tr><th>Filename</th><th>Size</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let file of files">
              <td>{{ file.name }}</td>
              <td>{{ formatSize(file.size) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="files.length === 0 && !loadingFiles" class="no-files">
        <p>No files uploaded yet.</p>
      </div>
      <div *ngIf="loadingFiles" class="loading">
        <p>Loading files...</p>
      </div>
    </div>
  `
})
export class UploadComponent implements OnInit {
  // Dependencies injected from Angular
  http = inject(HttpClient);  // For making HTTP requests
  authService = inject(AuthService);  // For logout and auth checks
  
  // File upload state
  selectedFile: File | null = null;  // Currently selected file from input
  message = '';  // Success/error message after upload
  isSuccess = false;  // Whether the upload succeeded
  
  // File listing state
  files: any[] = [];  // List of user's uploaded files
  loadingFiles = false;  // Whether file list is currently loading

  /**
   * ngOnInit - Angular lifecycle hook, runs when component initializes
   * 
   * Called automatically after the component is created.
   * Used here to load the file list when the user first navigates to upload page.
   */
  ngOnInit() {
    this.loadFiles();
  }

  /**
   * onFileSelected - Handle file input change event
   * 
   * Runs when user selects a file from the file picker.
   * Stores the file in memory until upload button is clicked.
   * 
   * @param event - The change event from the file input
   * 
   * How it works:
   * 1. User clicks file input
   * 2. Browser file picker opens
   * 3. User selects a file
   * 4. Browser triggers (change) event
   * 5. Angular calls this method
   * 6. We extract the file from event.target.files[0]
   * 7. Store it in selectedFile variable
   * 8. Upload button becomes enabled because selectedFile is not null
   */
  onFileSelected(event: any) {
    // event.target.files is an array of selected files
    // [0] gets the first (and only) file the user selected
    this.selectedFile = event.target.files[0];
  }

  /**
   * onUpload - Upload the selected file to the server
   * 
   * Flow:
   * 1. Validate that a file is selected
   * 2. Create FormData object (special format for file uploads)
   * 3. Send POST request to backend /upload endpoint
   * 4. Backend receives file with JWT token (from authInterceptor)
   * 5. Backend saves file to disk with filename: "username_originalfilename"
   * 6. Show success/error message
   * 7. Refresh file list
   * 
   * FormData - Special format for sending files
   * Cannot send files as regular JSON, must use FormData
   * 
   * FormData is like a multipart form submission:
   * ------boundary
   * Content-Disposition: form-data; name="file"; filename="myfile.txt"
   * [binary file content]
   * ------boundary
   */
  onUpload() {
    // Check if user actually selected a file
    if (!this.selectedFile) {
      this.message = 'Please select a file first.';
      this.isSuccess = false;
      return;
    }

    // Create FormData object to hold the file
    // FormData is a special object for sending files over HTTP
    const formData = new FormData();
    
    // Append the file to FormData with key 'file' (backend expects this key)
    formData.append('file', this.selectedFile);

    // Send the file to backend
    // The authInterceptor will automatically add the JWT token to this request
    this.http.post<any>('http://localhost:8000/upload', formData).subscribe({
      // Success callback - file uploaded successfully
      next: (res) => {
        // Show success message from backend
        this.message = res.info || 'File uploaded successfully!';
        this.isSuccess = true;
        this.selectedFile = null;  // Clear selected file
        this.loadFiles();  // Refresh the file list to show newly uploaded file
      },
      // Error callback - something went wrong
      error: (err) => {
        // Extract error message from backend response
        const detail = err.error?.detail || err.message || 'Upload failed';
        this.message = detail;
        this.isSuccess = false;
        console.error('Upload error:', err);
        
        // If 401 (unauthorized), token expired, logout user
        if (err.status === 401) {
          setTimeout(() => this.authService.logout(), 1500);
        }
      }
    });
  }

  /**
   * loadFiles - Fetch and display list of user's uploaded files
   * 
   * Makes a GET request to backend /files endpoint.
   * Backend returns list of files that belong to the current user.
   * 
   * Flow:
   * 1. Set loadingFiles = true (show "Loading..." message)
   * 2. Send GET request to /files endpoint
   * 3. Backend validates JWT token (gets username from token)
   * 4. Backend finds all files starting with "username_"
   * 5. Backend returns list of files with sizes
   * 6. We store files in this.files array
   * 7. Template shows files in a table using *ngFor
   */
  loadFiles() {
    this.loadingFiles = true;  // Show loading indicator
    
    // Request file list from backend
    // JWT token automatically added by authInterceptor
    this.http.get<any>('http://localhost:8000/files').subscribe({
      // Success - we got the file list
      next: (res) => {
        this.files = res.files || [];  // Store files in component variable
        this.loadingFiles = false;  // Hide loading indicator
      },
      // Error - something went wrong
      error: (err) => {
        console.error('Error loading files:', err);
        this.loadingFiles = false;
        
        // If 401 (unauthorized), token expired, logout user
        if (err.status === 401) this.authService.logout();
      }
    });
  }

  /**
   * formatSize - Convert bytes to human-readable file size
   * 
   * Takes a size in bytes and converts it to KB, MB, GB, etc.
   * 
   * Examples:
   * - 512 bytes -> "512 B"
   * - 1024 bytes -> "1 KB"
   * - 1048576 bytes -> "1 MB"
   * - 1073741824 bytes -> "1 GB"
   * 
   * @param bytes - File size in bytes (number)
   * @returns Formatted size string (e.g., "2.5 MB")
   * 
   * How the math works:
   * 1. Check if size is 0 bytes
   * 2. Define conversion factor: 1 KB = 1024 bytes
   * 3. Calculate index: log(bytes) / log(1024) tells us which unit to use
   * 4. Divide bytes by (1024 ^ index) to get the size in that unit
   * 5. Round to 2 decimal places
   * 6. Append the unit name (B, KB, MB, GB)
   */
  formatSize(bytes: number): string {
    // Special case: 0 bytes
    if (bytes === 0) return '0 B';
    
    // Conversion factor: 1 KB = 1024 bytes
    const k = 1024;
    
    // Unit names in order
    const sizes = ['B', 'KB', 'MB', 'GB'];
    
    // Calculate which unit to use
    // Math.log(bytes) / Math.log(k) tells us how many "steps" (units) we need
    // Math.floor() rounds down to nearest whole number
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    // Convert to the appropriate unit and round to 2 decimal places
    // bytes / (k^i) converts bytes to the appropriate unit
    // Math.round(...) rounds to 2 decimal places
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}