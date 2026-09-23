import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VideoService, Video } from '../../services/video.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-900 min-h-screen text-white p-6">
      <h1 class="text-xl font-bold mb-6">Recommended Videos</h1>

      <div *ngIf="loading" class="text-center text-gray-400 py-10">
        Loading videos...
      </div>

      <div *ngIf="!loading && videos.length === 0" class="text-center text-gray-400 py-10">
        No videos available yet. Be the first to upload one!
      </div>

      <!-- Video Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div *ngFor="let video of videos" class="cursor-pointer group">
          <!-- Thumbnail Container -->
          <div class="relative aspect-video bg-gray-800 rounded-xl overflow-hidden mb-3">
            <img 
              [src]="video.thumbnailUrl || 'https://via.placeholder.com/640x360?text=No+Thumbnail'" 
              [alt]="video.title"
              class="w-full h-full object-cover group-hover:scale-105 transition duration-200"
            />
          </div>

          <!-- Video Details -->
          <div class="flex space-x-3">
            <div class="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center font-bold text-sm">
              {{ video.user?.username?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div>
              <h3 class="font-semibold text-sm line-clamp-2 group-hover:text-gray-300">
                {{ video.title }}
              </h3>
              <p class="text-xs text-gray-400 mt-1">
                {{ video.user?.username || 'Unknown Channel' }}
              </p>
              <p class="text-xs text-gray-400">
                {{ video.views || 0 }} views • {{ video.createdAt | date:'shortDate' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  videos: Video[] = [];
  loading = true;

  constructor(private videoService: VideoService) {}

  ngOnInit(): void {
    this.videoService.getVideos().subscribe({
      next: (res) => {
        this.videos = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}