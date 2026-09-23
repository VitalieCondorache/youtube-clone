import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Video {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  user: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private apiUrl = `${environment.apiUrl}/videos`;

  constructor(private http: HttpClient) {}

  // Get all videos
  getVideos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Get video by ID
  getVideoById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
}