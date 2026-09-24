import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { VideoService } from '../../services/video.service';
import { formatSize } from '../../shared/format.util';
import { readApiError } from '../../shared/http-error.util';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="bg-gray-900 min-h-screen text-white p-6">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-xl font-bold mb-6">Upload video</h1>

        <div *ngIf="errorMessage()" class="bg-red-500 text-white p-3 rounded mb-4 text-sm">
          {{ errorMessage() }}
        </div>

        <form (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Title -->
          <div>
            <label class="block text-sm mb-2">Title *</label>
            <input
              type="text"
              name="title"
              [ngModel]="title()"
              (ngModelChange)="title.set($event)"
              placeholder="Add a title that describes your video"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm mb-2">Description</label>
            <textarea
              rows="4"
              name="description"
              [ngModel]="description()"
              (ngModelChange)="description.set($event)"
              placeholder="Tell viewers about your video"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500"
            ></textarea>
          </div>

          <div class="grid md:grid-cols-2 gap-6">
            <!-- Thumbnail -->
            <div>
              <label class="block text-sm mb-2">Thumbnail *</label>
              <input
                type="file"
                accept="image/*"
                (change)="onThumbnailSelected($event)"
                class="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700"
              />
              <div *ngIf="thumbnailPreview()" class="mt-3 aspect-video bg-gray-800 rounded-lg overflow-hidden">
                <img [src]="thumbnailPreview()" alt="Thumbnail preview" class="w-full h-full object-cover" />
              </div>
              <p *ngIf="thumbnailFile()" class="mt-2 text-xs text-gray-400">
                {{ thumbnailFile()!.name }} • {{ formatSize(thumbnailFile()!.size) }}
              </p>
            </div>

            <!-- Video -->
            <div>
              <label class="block text-sm mb-2">Video file *</label>
              <input
                type="file"
                accept="video/*"
                (change)="onVideoSelected($event)"
                class="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700"
              />
              <div *ngIf="videoPreview()" class="mt-3 aspect-video bg-black rounded-lg overflow-hidden">
                <video class="w-full h-full" [src]="videoPreview()" controls></video>
              </div>
              <p *ngIf="videoFile()" class="mt-3 text-xs text-gray-400">
                {{ videoFile()!.name }} • {{ formatSize(videoFile()!.size) }}
              </p>
              <p class="mt-2 text-xs text-gray-500">
                Videos bigger than 100 MB are rejected by the server.
              </p>
            </div>
          </div>

          <!-- Progress -->
          <div *ngIf="uploading()">
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>Uploading...</span>
              <span>{{ progress() }}%</span>
            </div>
            <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div class="bg-red-600 h-2 transition-all duration-200" [style.width.%]="progress()"></div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <button
              type="submit"
              [disabled]="uploading()"
              class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-full font-semibold text-sm"
            >
              {{ uploading() ? 'Uploading...' : 'Upload' }}
            </button>
            <a routerLink="/" class="text-sm text-gray-400 hover:text-gray-200">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `
})
export class UploadComponent implements OnDestroy {
  readonly title = signal('');
  readonly description = signal('');
  readonly videoFile = signal<File | null>(null);
  readonly thumbnailFile = signal<File | null>(null);
  readonly thumbnailPreview = signal('');
  readonly videoPreview = signal('');
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly errorMessage = signal('');

  // kept in sync with the multer limit on the server
  private readonly maxSize = 100 * 1024 * 1024;

  // exposed to the template
  protected readonly formatSize = formatSize;

  constructor(private videoService: VideoService, private router: Router) {}

  ngOnDestroy(): void {
    this.revokeObjectUrl(this.thumbnailPreview());
    this.revokeObjectUrl(this.videoPreview());
  }

  onThumbnailSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;

    this.errorMessage.set('');
    this.thumbnailFile.set(file);
    this.revokeObjectUrl(this.thumbnailPreview());

    // an object url lets the browser show the picked file before it is uploaded
    this.thumbnailPreview.set(file ? URL.createObjectURL(file) : '');
  }

  onVideoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;

    this.errorMessage.set('');
    this.videoFile.set(file);
    this.revokeObjectUrl(this.videoPreview());

    // same trick for the video, so it can be played back before the upload
    this.videoPreview.set(file ? URL.createObjectURL(file) : '');
  }

  onSubmit(): void {
    const title = this.title().trim();
    const videoFile = this.videoFile();
    const thumbnailFile = this.thumbnailFile();

    // The server validates everything again, this is only for faster feedback
    if (!title) {
      this.fail('Please add a title');
      return;
    }

    if (!videoFile) {
      this.fail('Please choose a video file');
      return;
    }

    if (!videoFile.type.startsWith('video/')) {
      this.fail('The video file must be a video');
      return;
    }

    if (videoFile.size > this.maxSize) {
      this.fail(`The video must be smaller than ${formatSize(this.maxSize)}`);
      return;
    }

    if (!thumbnailFile) {
      this.fail('Please choose a thumbnail image');
      return;
    }

    if (!thumbnailFile.type.startsWith('image/')) {
      this.fail('The thumbnail must be an image');
      return;
    }

    if (thumbnailFile.size > this.maxSize) {
      this.fail(`The thumbnail must be smaller than ${formatSize(this.maxSize)}`);
      return;
    }

    this.uploading.set(true);
    this.progress.set(0);

    this.videoService
      .uploadVideo({
        title,
        description: this.description().trim(),
        videoFile,
        thumbnailFile
      })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress.set(Math.round((event.loaded / event.total) * 100));
          }

          if (event.type === HttpEventType.Response) {
            this.uploading.set(false);
            this.progress.set(100);
            this.router.navigate(['/watch', event.body?.data?._id ?? '']);
          }
        },
        error: (err) => {
          this.uploading.set(false);
          this.errorMessage.set(readApiError(err, 'The upload failed, please try again'));
        }
      });
  }

  // Shows a validation message and cancels the submit
  private fail(message: string): void {
    this.errorMessage.set(message);
    this.uploading.set(false);
  }

  private revokeObjectUrl(url: string): void {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
