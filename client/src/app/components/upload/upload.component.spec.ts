import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UploadComponent } from './upload.component';

describe('UploadComponent', () => {
  let fixture: ComponentFixture<UploadComponent>;
  let component: UploadComponent;
  let httpMock: HttpTestingController;

  const videoFile = new File(['video-bytes'], 'clip.mp4', { type: 'video/mp4' });
  const thumbnailFile = new File(['image-bytes'], 'cover.jpg', { type: 'image/jpeg' });

  const pick = (file: File) => ({ target: { files: [file] } }) as unknown as Event;

  beforeEach(async () => {
    localStorage.clear();
    // jsdom does not implement object urls, the component uses them for the preview
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('asks for a title, the video and the thumbnail before uploading', () => {
    component.onSubmit();
    expect(component.errorMessage()).toBe('Please add a title');

    component.title.set('My clip');
    component.onSubmit();
    expect(component.errorMessage()).toBe('Please choose a video file');

    component.videoFile.set(videoFile);
    component.onSubmit();
    expect(component.errorMessage()).toBe('Please choose a thumbnail image');

    expect(httpMock.match('/api/v1/videos').length).toBe(0);
  });

  it('rejects a file that is not a video', () => {
    component.title.set('My clip');
    component.videoFile.set(new File(['x'], 'notes.txt', { type: 'text/plain' }));
    component.thumbnailFile.set(thumbnailFile);

    component.onSubmit();

    expect(component.errorMessage()).toBe('The video file must be a video');
    expect(httpMock.match('/api/v1/videos').length).toBe(0);
  });

  it('shows a preview of the picked thumbnail', () => {
    component.onThumbnailSelected(pick(thumbnailFile));

    expect(component.thumbnailFile()).toBe(thumbnailFile);
    expect(component.thumbnailPreview()).toBe('blob:preview');
    expect(URL.createObjectURL).toHaveBeenCalledWith(thumbnailFile);
  });

  it('uploads the form data, reports the progress and opens the new video', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    component.title.set('  My clip  ');
    component.description.set('  a description  ');
    component.videoFile.set(videoFile);
    component.onThumbnailSelected(pick(thumbnailFile));

    component.onSubmit();

    expect(component.uploading()).toBe(true);

    const req = httpMock.expectOne('/api/v1/videos');
    expect(req.request.method).toBe('POST');

    const body = req.request.body as FormData;
    expect(body instanceof FormData).toBe(true);
    expect(body.get('title')).toBe('My clip');
    expect(body.get('description')).toBe('a description');
    expect(body.get('videoFile')).toBe(videoFile);
    expect(body.get('thumbnailFile')).toBe(thumbnailFile);

    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    expect(component.progress()).toBe(50);

    req.flush({ status: 'success', data: { _id: 'new-id' } });

    expect(component.uploading()).toBe(false);
    expect(component.progress()).toBe(100);
    expect(navigate).toHaveBeenCalledWith(['/watch', 'new-id']);
  });

  it('shows the message sent by the server when the upload is rejected', () => {
    component.title.set('My clip');
    component.videoFile.set(videoFile);
    component.onThumbnailSelected(pick(thumbnailFile));

    component.onSubmit();

    httpMock.expectOne('/api/v1/videos').flush(
      { status: 'fail', message: 'Only image files are allowed for the thumbnail' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.errorMessage()).toBe('Only image files are allowed for the thumbnail');
    expect(component.uploading()).toBe(false);
  });
});
