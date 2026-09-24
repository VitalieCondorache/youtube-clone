import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="bg-gray-900 border-b border-gray-800 text-white px-4 py-2.5 flex justify-between items-center sticky top-0 z-50">
      <!-- Logo -->
      <div class="flex items-center space-x-4">
        <a routerLink="/" class="flex items-center space-x-1">
          <span class="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-lg">▶</span>
          <span class="font-bold text-xl tracking-tight">YouTube</span>
        </a>
      </div>

      <!-- Search Bar -->
      <div class="w-1/3 flex">
        <input 
          type="text" 
          placeholder="Search..." 
          class="w-full bg-gray-800 border border-gray-700 px-4 py-1.5 rounded-l-full focus:outline-none focus:border-blue-500 text-sm"
        />
        <button class="bg-gray-700 border border-l-0 border-gray-700 px-5 py-1.5 rounded-r-full hover:bg-gray-600">
          🔍
        </button>
      </div>

      <!-- User Auth Actions -->
      <div class="flex items-center space-x-3">
        <a
          *ngIf="authService.isLoggedIn()"
          routerLink="/my-videos"
          class="text-sm text-gray-300 hover:text-white px-2 py-1.5"
        >
          My videos
        </a>

        <a
          *ngIf="authService.isLoggedIn()"
          routerLink="/upload"
          class="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-700 flex items-center gap-1"
        >
          <span class="text-red-500 font-bold">+</span> Upload
        </a>

        <ng-container *ngIf="authService.isLoggedIn(); else loggedOut">
          <button (click)="onLogout()" class="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-700">
            Logout
          </button>
        </ng-container>

        <ng-template #loggedOut>
          <a routerLink="/login" class="text-sm border border-blue-500 text-blue-400 px-3 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition">
            Sign In
          </a>
        </ng-template>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  constructor(public authService: AuthService, private router: Router) {}

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}