import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WatchComponent } from './watch.component';
import { Video } from '../../services/video.service';

describe('WatchComponent', () => {
  let fixture: ComponentFixture<WatchComponent>;
  let component: WatchComponent;
  let httpMock: HttpTestingController;

  const video: Video = {
    _id: 'v1',
    title: 'Demo video',
    description: 'A description',
    videoUrl: '/uploads/video.mp4',
    thumbnailUrl: '/uploads/thumb.jpg',
    views: 3,
    uploader: { _id: 'u1', username: 'nate' },
    likesCount: 1,
    dislikesCount: 0,
    userReaction: null,
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [WatchComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // must be declared after provideRouter, otherwise the router's own ActivatedRoute wins
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'v1' }) } }
        }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WatchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  const flushVideoAndComments = (comments: unknown[] = []) => {
    httpMock.expectOne('/api/v1/videos/v1').flush({ status: 'success', data: video });
    httpMock.expectOne('/api/v1/comments/v1').flush({ status: 'success', results: comments.length, data: comments });
  };

  it('loads the video and renders the player', () => {
    fixture.detectChanges();
    flushVideoAndComments();

    expect(component.video()?.title).toBe('Demo video');
    expect(component.loading()).toBe(false);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const player = compiled.querySelector('video') as HTMLVideoElement | null;
    expect(player?.src).toContain('/uploads/video.mp4');
    expect(compiled.textContent).toContain('Demo video');
  });

  it('shows the server message when the video cannot be loaded', () => {
    fixture.detectChanges();
    httpMock
      .expectOne('/api/v1/videos/v1')
      .flush({ status: 'fail', message: 'Video not found' }, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne('/api/v1/comments/v1').flush({ status: 'success', results: 0, data: [] });

    expect(component.errorMessage()).toBe('Video not found');

    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Video not found');
  });

  it('sends anonymous users to the login page instead of reacting', () => {
    fixture.detectChanges();
    flushVideoAndComments();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    component.onReact(1);

    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(httpMock.match('/api/v1/videos/v1/like').length).toBe(0);
  });

  it('updates the counters after a like', () => {
    localStorage.setItem('token', 'jwt-token');
    fixture.detectChanges();
    flushVideoAndComments();

    component.onReact(1);

    const req = httpMock.expectOne('/api/v1/videos/v1/like');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ value: 1 });
    req.flush({ status: 'success', data: { likesCount: 2, dislikesCount: 0, userReaction: 1 } });

    expect(component.video()?.likesCount).toBe(2);
    expect(component.video()?.userReaction).toBe(1);
  });

  it('prepends a new comment after posting it', () => {
    fixture.detectChanges();
    flushVideoAndComments();

    component.commentText.set('  Nice video!  ');
    component.onAddComment();

    const req = httpMock.expectOne('/api/v1/comments/v1');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ text: 'Nice video!' });
    req.flush({
      status: 'success',
      data: { _id: 'c1', text: 'Nice video!', video: 'v1', author: { _id: 'u1', username: 'nate' }, createdAt: new Date().toISOString() }
    });

    expect(component.comments().length).toBe(1);
    expect(component.comments()[0].text).toBe('Nice video!');
    expect(component.commentText()).toBe('');
  });

  it('ignores empty comments', () => {
    fixture.detectChanges();
    flushVideoAndComments();

    component.commentText.set('   ');
    component.onAddComment();

    expect(httpMock.match('/api/v1/comments/v1').length).toBe(0);
  });
});
