import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MyVideosComponent } from './my-videos.component';
import { Video } from '../../services/video.service';

describe('MyVideosComponent', () => {
  let fixture: ComponentFixture<MyVideosComponent>;
  let component: MyVideosComponent;
  let httpMock: HttpTestingController;

  const video: Video = {
    _id: 'v1',
    title: 'My first clip',
    description: 'A description',
    videoUrl: '/uploads/video.mp4',
    thumbnailUrl: '/uploads/thumb.jpg',
    views: 4,
    uploader: { _id: 'u1', username: 'nate' },
    likesCount: 2,
    dislikesCount: 0,
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyVideosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MyVideosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('loads the videos of the current user', () => {
    httpMock.expectOne('/api/v1/videos/mine').flush({ status: 'success', results: 1, data: [video] });

    expect(component.videos().length).toBe(1);
    expect(component.videos()[0].title).toBe('My first clip');
    expect(component.loading()).toBe(false);

    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('My first clip');
  });

  it('asks for a confirmation before deleting', () => {
    httpMock.expectOne('/api/v1/videos/mine').flush({ status: 'success', results: 1, data: [video] });

    component.askToDelete('v1');

    expect(component.confirmingId()).toBe('v1');
    expect(httpMock.match('/api/v1/videos/v1').length).toBe(0);
  });

  it('removes the video from the list once it is deleted', () => {
    httpMock.expectOne('/api/v1/videos/mine').flush({ status: 'success', results: 1, data: [video] });

    component.deleteVideo('v1');

    const req = httpMock.expectOne('/api/v1/videos/v1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 'success', data: { _id: 'v1' } });

    expect(component.videos().length).toBe(0);
    expect(component.confirmingId()).toBeNull();
    expect(component.deletingId()).toBeNull();
  });

  it('keeps the video and shows the error when the delete fails', () => {
    httpMock.expectOne('/api/v1/videos/mine').flush({ status: 'success', results: 1, data: [video] });

    component.deleteVideo('v1');

    httpMock
      .expectOne('/api/v1/videos/v1')
      .flush({ status: 'fail', message: 'You can only delete your own videos' }, { status: 403, statusText: 'Forbidden' });

    expect(component.videos().length).toBe(1);
    expect(component.errorMessage()).toBe('You can only delete your own videos');
  });
});
