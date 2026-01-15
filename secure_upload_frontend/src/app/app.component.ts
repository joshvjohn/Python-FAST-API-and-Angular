import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <main>
      <header class="app-header">
        <h1>🔐 Secure Upload</h1>
        <nav class="app-nav">
          <ng-container *ngIf="!authService.isLoggedIn()">
            <a routerLink="/login" routerLinkActive="active">Login</a>
            <a routerLink="/register" routerLinkActive="active">Register</a>
          </ng-container>
          <ng-container *ngIf="authService.isLoggedIn()">
            <a routerLink="/upload" routerLinkActive="active">Upload</a>
            <button class="logout-btn" (click)="authService.logout()">Logout</button>
          </ng-container>
        </nav>
      </header>
      <div class="app-content">
        <router-outlet></router-outlet>
      </div>
    </main>
  `,
  styles: [`
    main { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .app-header { background: rgba(0,0,0,0.1); padding: 30px 20px; text-align: center; border-bottom: 2px solid rgba(255,255,255,0.2); box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: white; margin: 0 0 20px 0; font-size: 2.5rem; font-weight: 700; }
    .app-nav { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; align-items: center; }
    .app-nav a { color: white; text-decoration: none; font-size: 1.1rem; font-weight: 600; padding: 8px 16px; border-radius: 4px; transition: all 0.3s; border-bottom: 3px solid transparent; }
    .app-nav a:hover { background: rgba(255,255,255,0.1); border-bottom-color: white; transform: translateY(-2px); }
    .app-nav a.active { background: rgba(255,255,255,0.15); border-bottom-color: #ffd700; }
    .logout-btn { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; font-size: 1.1rem; font-weight: 600; border-radius: 4px; cursor: pointer; transition: all 0.3s; margin: 0; width: auto; }
    .logout-btn:hover { background: rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.5); transform: translateY(-2px); }
    .app-content { padding: 30px 20px; }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
}

