import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './video.service';
import { environment } from '../../environments/environment';

export interface CommentAuthor {
  _id: string;
  username: string;
  avatarUrl?: string;
}

export interface VideoComment {
  _id: string;
  text: string;
  video: string;
  author: CommentAuthor;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = `${environment.apiUrl}/comments`;

  constructor(private http: HttpClient) {}

  // Get all comments of a video
  getComments(videoId: string): Observable<ApiResponse<VideoComment[]>> {
    return this.http.get<ApiResponse<VideoComment[]>>(`${this.apiUrl}/${videoId}`);
  }

  // Add a comment to a video (requires a valid token)
  addComment(videoId: string, text: string): Observable<ApiResponse<VideoComment>> {
    return this.http.post<ApiResponse<VideoComment>>(`${this.apiUrl}/${videoId}`, { text });
  }
}
