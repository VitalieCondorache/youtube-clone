import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Video, VideoService } from '../../services/video.service';
import { formatCount } from '../../shared/format.util';
import { readApiError } from '../../shared/http-error.util';

@Component({
  selector: 'app-my-videos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-gray-900 min-h-screen text-white p-6">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-bold">My videos</h1>
          <a
            routerLink="/upload"
            class="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full font-semibold"
          >
            Upload video
          </a>
        </div>

        <div *ngIf="errorMessage()" class="bg-red-500 text-white p-3 rounded mb-4 text-sm">
          {{ errorMessage() }}
        </div>

        <p *ngIf="loading()" class="text-center text-gray-400 py-16">Loading your videos...</p>

        <div *ngIf="!loading() && videos().length === 0" class="text-center text-gray-400 py-16">
          <p class="mb-4">You have not uploaded any video yet.</p>
          <a routerLink="/upload" class="text-blue-400 hover:underline">Upload your first video</a>
        </div>

        <ul class="space-y-4">
          <li *ngFor="let video of videos()" class="flex flex-col sm:flex-row gap-4 bg-gray-800 rounded-xl p-3">
            <a
              [routerLink]="['/watch', video._id]"
              class="sm:w-48 shrink-0 aspect-video bg-gray-900 rounded-lg overflow-hidden"
            >
              <img [src]="video.thumbnailUrl" [alt]="video.title" class="w-full h-full object-cover" />
            </a>

            <div class="flex-1 min-w-0">
              <a [routerLink]="['/watch', video._id]" class="font-semibold hover:text-gray-300 block truncate">
                {{ video.title }}
              </a>
              <p class="text-xs text-gray-400 mt-1">
                {{ formatCount(video.views) }} views • {{ formatCount(video.likesCount) }} likes •
                {{ video.createdAt | date:'shortDate' }}
              </p>
              <p *ngIf="video.description" class="text-xs text-gray-400 mt-2 line-clamp-2">
                {{ video.description }}
              </p>
            </div>

            <div class="flex items-start">
              <button
                *ngIf="confirmingId() !== video._id"
                (click)="askToDelete(video._id)"
                class="text-sm border border-gray-600 hover:border-red-500 hover:text-red-400 px-3 py-1.5 rounded-full transition"
              >
                Delete
              </button>

              <div *ngIf="confirmingId() === video._id" class="flex items-center gap-2">
                <button
                  (click)="deleteVideo(video._id)"
                  [disabled]="deletingId() === video._id"
                  class="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-full font-semibold"
                >
                  {{ deletingId() === video._id ? 'Deleting...' : 'Yes, delete' }}
                </button>
                <button (click)="cancelDelete()" class="text-sm text-gray-400 hover:text-gray-200 px-2 py-1.5">
                  Cancel
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class MyVideosComponent implements OnInit {
  readonly videos = signal<Video[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly confirmingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  // exposed to the template
  protected readonly formatCount = formatCount;

  constructor(private videoService: VideoService) {}

  ngOnInit(): void {
    this.loadVideos();
  }

  askToDelete(id: string): void {
    this.confirmingId.set(id);
  }

  cancelDelete(): void {
    this.confirmingId.set(null);
  }

  deleteVideo(id: string): void {
    this.deletingId.set(id);
    this.errorMessage.set('');

    this.videoService.deleteVideo(id).subscribe({
      next: () => {
        this.videos.update((videos) => videos.filter((video) => video._id !== id));
        this.deletingId.set(null);
        this.confirmingId.set(null);
      },
      error: (err) => {
        this.deletingId.set(null);
        this.confirmingId.set(null);
        this.errorMessage.set(readApiError(err, 'The video could not be deleted'));
      }
    });
  }

  private loadVideos(): void {
    this.videoService.getMyVideos().subscribe({
      next: (res) => {
        this.videos.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(readApiError(err, 'Your videos could not be loaded'));
      }
    });
  }
}
