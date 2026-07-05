import { extractVideoId } from './extract-video-id';

describe('extractVideoId', () => {
  it('extracts id from a watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts id from a short youtu.be URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts id from an embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('ignores extra query params after the id', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for a non-YouTube URL', () => {
    expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(extractVideoId('not a url at all')).toBeNull();
  });
});
