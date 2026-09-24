import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VideoUploader {
  _id: string;
  username: string;
  avatarUrl?: string;
}

// 1 = liked, -1 = disliked, null = no reaction
export type VideoReaction = 1 | -1 | null;

export interface Video {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  uploader: VideoUploader;
  likesCount: number;
  dislikesCount: number;
  userReaction?: VideoReaction;
  createdAt: string;
}

export interface ReactionSummary {
  likesCount: number;
  dislikesCount: number;
  userReaction: VideoReaction;
}

export interface ApiResponse<T> {
  status: string;
  results?: number;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private apiUrl = `${environment.apiUrl}/videos`;

  constructor(private http: HttpClient) {}

  // Get all videos
  getVideos(): Observable<ApiResponse<Video[]>> {
    return this.http.get<ApiResponse<Video[]>>(this.apiUrl);
  }

  // Get video by ID (also increments its view counter)
  getVideoById(id: string): Observable<ApiResponse<Video>> {
    return this.http.get<ApiResponse<Video>>(`${this.apiUrl}/${id}`);
  }

  // Like (1) or dislike (-1) a video. Sending the current reaction again removes it.
  toggleLike(id: string, value: 1 | -1): Observable<ApiResponse<ReactionSummary>> {
    return this.http.post<ApiResponse<ReactionSummary>>(`${this.apiUrl}/${id}/like`, { value });
  }

  // Videos uploaded by the current user
  getMyVideos(): Observable<ApiResponse<Video[]>> {
    return this.http.get<ApiResponse<Video[]>>(`${this.apiUrl}/mine`);
  }

  // Upload a video together with its thumbnail, reporting the progress events
  uploadVideo(data: {
    title: string;
    description: string;
    videoFile: File;
    thumbnailFile: File;
  }): Observable<HttpEvent<ApiResponse<Video>>> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('videoFile', data.videoFile);
    formData.append('thumbnailFile', data.thumbnailFile);

    return this.http.post<ApiResponse<Video>>(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  // Delete one of my videos
  deleteVideo(id: string): Observable<ApiResponse<{ _id: string }>> {
    return this.http.delete<ApiResponse<{ _id: string }>>(`${this.apiUrl}/${id}`);
  }
}
