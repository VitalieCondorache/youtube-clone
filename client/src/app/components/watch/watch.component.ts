import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Video, VideoService } from '../../services/video.service';
import { CommentService, VideoComment } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { formatCount } from '../../shared/format.util';
import { readApiError } from '../../shared/http-error.util';

@Component({
  selector: 'app-watch',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="bg-gray-900 min-h-screen text-white">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div *ngIf="loading()" class="text-center text-gray-400 py-20">Loading video...</div>

        <!-- Video could not be loaded -->
        <div *ngIf="!loading() && !video()" class="text-center py-20">
          <p class="text-red-400 mb-4">{{ errorMessage() || 'Video not found' }}</p>
          <a routerLink="/" class="text-blue-400 hover:underline">← Back to home</a>
        </div>

        <ng-container *ngIf="video() as video">
          <video
            class="w-full aspect-video bg-black rounded-xl"
            [src]="video.videoUrl"
            [poster]="video.thumbnailUrl"
            controls
          ></video>

          <h1 class="text-xl font-bold mt-4">{{ video.title }}</h1>

          <div class="flex flex-wrap items-center justify-between gap-4 mt-4">
            <!-- Channel -->
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold">
                {{ initial(video.uploader?.username) }}
              </div>
              <div>
                <p class="font-semibold text-sm">{{ video.uploader?.username || 'Unknown Channel' }}</p>
                <p class="text-xs text-gray-400">
                  {{ formatCount(video.views) }} views • {{ video.createdAt | date:'mediumDate' }}
                </p>
              </div>
            </div>

            <!-- Reactions -->
            <div class="flex items-center bg-gray-800 rounded-full overflow-hidden">
              <button
                type="button"
                (click)="onReact(1)"
                [disabled]="isReacting()"
                [class.text-blue-400]="video.userReaction === 1"
                [attr.aria-pressed]="video.userReaction === 1"
                class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700 disabled:opacity-60"
              >
                👍 <span>{{ formatCount(video.likesCount) }}</span>
              </button>
              <span class="w-px h-6 bg-gray-700"></span>
              <button
                type="button"
                (click)="onReact(-1)"
                [disabled]="isReacting()"
                [class.text-blue-400]="video.userReaction === -1"
                [attr.aria-pressed]="video.userReaction === -1"
                class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700 disabled:opacity-60"
              >
                👎 <span>{{ formatCount(video.dislikesCount) }}</span>
              </button>
            </div>
          </div>

          <p *ngIf="actionError()" class="text-sm text-red-400 mt-3">{{ actionError() }}</p>

          <p class="text-sm text-gray-300 mt-4 whitespace-pre-line">
            {{ video.description || 'No description provided.' }}
          </p>
          <!-- Comments -->
          <section class="mt-10 border-t border-gray-800 pt-6">
            <h2 class="font-semibold mb-4">
              {{ comments().length }} {{ comments().length === 1 ? 'Comment' : 'Comments' }}
            </h2>

            <form *ngIf="authService.isLoggedIn(); else signInPrompt" (ngSubmit)="onAddComment()" class="mb-6">
              <textarea
                rows="2"
                [ngModel]="commentText()"
                (ngModelChange)="commentText.set($event)"
                name="commentText"
                placeholder="Add a comment..."
                class="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
              ></textarea>
              <div class="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  (click)="commentText.set('')"
                  class="text-sm px-3 py-1.5 rounded-full hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="isPostingComment() || !commentText().trim()"
                  class="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 rounded-full font-semibold"
                >
                  {{ isPostingComment() ? 'Posting...' : 'Comment' }}
                </button>
              </div>
            </form>

            <ng-template #signInPrompt>
              <p class="text-sm text-gray-400 mb-6">
                <a routerLink="/login" class="text-blue-400 hover:underline">Sign in</a> to add a comment.
              </p>
            </ng-template>

            <p *ngIf="comments().length === 0" class="text-sm text-gray-400">
              No comments yet. Be the first to comment!
            </p>

            <ul class="space-y-5">
              <li *ngFor="let comment of comments()" class="flex space-x-3">
                <div class="w-9 h-9 shrink-0 rounded-full bg-gray-700 flex items-center justify-center font-bold text-sm">
                  {{ initial(comment.author?.username) }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm">
                    <span class="font-semibold">{{ comment.author?.username || 'Unknown' }}</span>
                    <span class="text-xs text-gray-500 ml-2">{{ comment.createdAt | date:'short' }}</span>
                  </p>
                  <p class="text-sm text-gray-200 mt-1 whitespace-pre-line break-words">{{ comment.text }}</p>
                </div>
              </li>
            </ul>
          </section>
        </ng-container>
      </div>
    </div>
  `
})
export class WatchComponent implements OnInit {
  readonly video = signal<Video | null>(null);
  readonly comments = signal<VideoComment[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly actionError = signal('');

  readonly commentText = signal('');
  readonly isPostingComment = signal(false);
  readonly isReacting = signal(false);

  // exposed to the template
  protected readonly formatCount = formatCount;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videoService: VideoService,
    private commentService: CommentService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const videoId = this.route.snapshot.paramMap.get('id') ?? '';

    this.loadVideo(videoId);
    this.loadComments(videoId);
  }

  onReact(value: 1 | -1): void {
    const video = this.video();

    if (!video) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.isReacting.set(true);
    this.actionError.set('');

    this.videoService.toggleLike(video._id, value).subscribe({
      next: (res) => {
        this.video.set({
          ...video,
          likesCount: res.data.likesCount,
          dislikesCount: res.data.dislikesCount,
          userReaction: res.data.userReaction
        });
        this.isReacting.set(false);
      },
      error: (err) => {
        this.isReacting.set(false);
        this.actionError.set(this.readErrorMessage(err, 'Your reaction could not be saved'));
      }
    });
  }

  onAddComment(): void {
    const text = this.commentText().trim();
    const video = this.video();

    if (!text || !video) {
      return;
    }

    this.isPostingComment.set(true);
    this.actionError.set('');

    this.commentService.addComment(video._id, text).subscribe({
      next: (res) => {
        this.comments.update((comments) => [res.data, ...comments]);
        this.commentText.set('');
        this.isPostingComment.set(false);
      },
      error: (err) => {
        this.isPostingComment.set(false);
        this.actionError.set(this.readErrorMessage(err, 'Your comment could not be posted'));
      }
    });
  }

  initial(name?: string): string {
    return (name?.charAt(0) || 'U').toUpperCase();
  }

  private loadVideo(videoId: string): void {
    this.videoService.getVideoById(videoId).subscribe({
      next: (res) => {
        this.video.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.readErrorMessage(err, 'Video not found'));
      }
    });
  }

  private loadComments(videoId: string): void {
    this.commentService.getComments(videoId).subscribe({
      next: (res) => {
        this.comments.set(res.data || []);
      },
      error: () => {
        // Comments are not critical, the video can still be watched
        this.comments.set([]);
      }
    });
  }

  // The response body can be empty (proxy or server errors), so never read it blindly
  private readErrorMessage(err: { error?: { message?: string }; message?: string }, fallback: string): string {
    return readApiError(err, fallback);
  }
}

