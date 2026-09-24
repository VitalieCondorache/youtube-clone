import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, fromEvent } from 'rxjs';
import { Video, VideoService } from '../../services/video.service';
import { formatCount } from '../../shared/format.util';
import { readApiError } from '../../shared/http-error.util';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-gray-900 min-h-screen text-white p-6">
      <h1 class="text-xl font-bold mb-6">Recommended Videos</h1>

      <div *ngIf="loading()" class="text-center text-gray-400 py-10">
        Loading videos...
      </div>

      <div *ngIf="errorMessage()" class="bg-red-500 text-white p-3 rounded mb-4 text-sm">
        {{ errorMessage() }}
      </div>

      <div *ngIf="!loading() && videos().length === 0" class="text-center text-gray-400 py-10">
        No videos available yet. Be the first to upload one!
      </div>

      <!-- Video Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <a
          *ngFor="let video of videos()"
          [routerLink]="['/watch', video._id]"
          class="block cursor-pointer group"
        >
          <!-- Thumbnail Container -->
          <div class="relative aspect-video bg-gray-800 rounded-xl overflow-hidden mb-3">
            <img
              [src]="video.thumbnailUrl"
              [alt]="video.title"
              class="w-full h-full object-cover group-hover:scale-105 transition duration-200"
            />
          </div>

          <!-- Video Details -->
          <div class="flex space-x-3">
            <div class="w-9 h-9 shrink-0 rounded-full bg-red-600 flex items-center justify-center font-bold text-sm">
              {{ initial(video.uploader?.username) }}
            </div>
            <div class="min-w-0">
              <h3 class="font-semibold text-sm line-clamp-2 group-hover:text-gray-300">
                {{ video.title }}
              </h3>
              <p class="text-xs text-gray-400 mt-1">
                {{ video.uploader?.username || 'Unknown Channel' }}
              </p>
              <p class="text-xs text-gray-400">
                {{ formatCount(video.views) }} views • {{ video.createdAt | date:'shortDate' }}
              </p>
              <p class="text-xs text-gray-400">
                👍 {{ formatCount(video.likesCount) }}
              </p>
            </div>
          </div>
        </a>
      </div>

      <!-- Pagination footer -->
      <div *ngIf="!loading() && videos().length > 0" class="text-center py-10">
        <p *ngIf="loadingMore()" class="text-sm text-gray-400">Loading more videos...</p>

        <button
          *ngIf="hasMore() && !loadingMore()"
          (click)="loadNextPage()"
          class="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-full transition"
        >
          Load more
        </button>

        <p *ngIf="!hasMore()" class="text-sm text-gray-500">
          You have seen all {{ total() }} videos
        </p>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly videos = signal<Video[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly errorMessage = signal('');
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);

  readonly hasMore = computed(() => this.page() < this.pages());

  // exposed to the template
  protected readonly formatCount = formatCount;

  private scrollSubscription?: Subscription;

  constructor(private videoService: VideoService) {}

  ngOnInit(): void {
    this.loadPage(1);

    // Infinite scroll, the guards inside onWindowScroll keep the requests unique
    this.scrollSubscription = fromEvent(window, 'scroll').subscribe(() => this.onWindowScroll());
  }

  ngOnDestroy(): void {
    this.scrollSubscription?.unsubscribe();
  }

  onWindowScroll(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    const bottomReached = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300;

    if (bottomReached) {
      this.loadNextPage();
    }
  }

  loadNextPage(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadPage(this.page() + 1);
  }

  initial(name?: string): string {
    return (name?.charAt(0) || 'U').toUpperCase();
  }

  private loadPage(page: number): void {
    if (page > 1) {
      this.loadingMore.set(true);
    }

    this.errorMessage.set('');

    this.videoService.getVideos(page, PAGE_SIZE).subscribe({
      next: (res) => {
        this.videos.update((videos) => (page === 1 ? res.data : [...videos, ...res.data]));
        this.page.set(res.page);
        this.pages.set(res.pages);
        this.total.set(res.total);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadingMore.set(false);
        this.errorMessage.set(readApiError(err, 'The videos could not be loaded'));
      }
    });
  }
}
