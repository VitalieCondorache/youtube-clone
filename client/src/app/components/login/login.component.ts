import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex justify-center items-center h-screen bg-gray-900 text-white">
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 class="text-2xl font-bold mb-6 text-center text-red-600">YouTube Clone - Login</h2>
        
        <div *ngIf="errorMessage" class="bg-red-500 text-white p-3 rounded mb-4 text-sm">
          {{ errorMessage }}
        </div>

        <form (ngSubmit)="onLogin()">
          <div class="mb-4">
            <label class="block text-sm mb-2">Email</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              required 
              class="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm mb-2">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              required 
              class="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <button 
            type="submit" 
            class="w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded font-semibold transition duration-200"
          >
            Login
          </button>
        </form>

        <p class="mt-4 text-sm text-center text-gray-400">
          Don't have an account? <a routerLink="/register" class="text-red-500 hover:underline">Register</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin(): void {
    const credentials = { email: this.email, password: this.password };
    this.authService.login(credentials).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        // The response body can be empty (proxy/server errors), so guard before reading it
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else if (err.message) {
          this.errorMessage = err.message;
        } else {
          this.errorMessage = 'Invalid credentials or server error';
        }
      }
    });
  }
}