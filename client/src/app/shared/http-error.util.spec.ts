import { readApiError } from './http-error.util';

describe('readApiError', () => {
  it('prefers the message sent by the API', () => {
    expect(readApiError({ error: { message: 'Video not found' } }, 'fallback')).toBe('Video not found');
  });

  it('falls back to the transport message', () => {
    expect(readApiError({ message: 'Http failure response for /api: 403 Forbidden' }, 'fallback')).toBe(
      'Http failure response for /api: 403 Forbidden'
    );
  });

  it('uses the fallback when the body is empty', () => {
    expect(readApiError({}, 'Upload failed')).toBe('Upload failed');
    expect(readApiError(null, 'Upload failed')).toBe('Upload failed');
    expect(readApiError(undefined, 'Upload failed')).toBe('Upload failed');
  });
});
