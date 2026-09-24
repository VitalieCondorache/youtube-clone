import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HomeComponent } from './home.component';
import { Video } from '../../services/video.service';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let httpMock: HttpTestingController;

  const makeVideo = (id: string): Video => ({
    _id: id,
    title: `Video ${id}`,
    description: '',
    videoUrl: `/uploads/${id}.mp4`,
    thumbnailUrl: `/uploads/${id}.jpg`,
    views: 1,
    uploader: { _id: 'u1', username: 'nate' },
    likesCount: 0,
    dislikesCount: 0,
    createdAt: new Date().toISOString()
  });

  const firstPage = {
    status: 'success',
    results: 2,
    page: 1,
    limit: 12,
    pages: 2,
    total: 3,
    data: [makeVideo('a'), makeVideo('b')]
  };

  const secondPage = {
    status: 'success',
    results: 1,
    page: 2,
    limit: 12,
    pages: 2,
    total: 3,
    data: [makeVideo('c')]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('loads the first page of the feed', () => {
    httpMock.expectOne('/api/v1/videos?page=1&limit=12').flush(firstPage);

    expect(component.videos().length).toBe(2);
    expect(component.page()).toBe(1);
    expect(component.pages()).toBe(2);
    expect(component.total()).toBe(3);
    expect(component.hasMore()).toBe(true);
    expect(component.loading()).toBe(false);

    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Video a');
  });

  it('appends the next page and stops at the last one', () => {
    httpMock.expectOne('/api/v1/videos?page=1&limit=12').flush(firstPage);

    component.loadNextPage();
    expect(component.loadingMore()).toBe(true);

    httpMock.expectOne('/api/v1/videos?page=2&limit=12').flush(secondPage);

    expect(component.videos().length).toBe(3);
    expect(component.videos()[2]._id).toBe('c');
    expect(component.loadingMore()).toBe(false);
    expect(component.hasMore()).toBe(false);

    // the last page is never requested twice
    component.loadNextPage();
    expect(httpMock.match('/api/v1/videos?page=3&limit=12').length).toBe(0);
  });

  it('loads more when the window is scrolled to the bottom', () => {
    httpMock.expectOne('/api/v1/videos?page=1&limit=12').flush(firstPage);

    window.dispatchEvent(new Event('scroll'));

    httpMock.expectOne('/api/v1/videos?page=2&limit=12').flush(secondPage);

    expect(component.videos().length).toBe(3);
  });

  it('does not request another page while one is in flight', () => {
    httpMock.expectOne('/api/v1/videos?page=1&limit=12').flush(firstPage);

    component.loadNextPage();
    component.loadNextPage();
    window.dispatchEvent(new Event('scroll'));

    // match() consumes the requests it returns, so they are flushed from here
    const pending = httpMock.match('/api/v1/videos?page=2&limit=12');
    expect(pending.length).toBe(1);

    pending[0].flush(secondPage);
  });

  it('shows the message of a failing feed', () => {
    httpMock
      .expectOne('/api/v1/videos?page=1&limit=12')
      .flush({ status: 'error', message: 'Mongo is down' }, { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage()).toBe('Mongo is down');
    expect(component.loading()).toBe(false);
  });
});
