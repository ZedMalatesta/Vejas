import { DEFAULT_SYNC_THRESHOLD_SECONDS, shouldSeek } from './playback-sync';

describe('shouldSeek', () => {
  it('does not seek when local and remote time match', () => {
    expect(shouldSeek(100, 100)).toBe(false);
  });

  it('does not seek when drift is within the threshold', () => {
    expect(shouldSeek(100, 102)).toBe(false);
    expect(shouldSeek(102, 100)).toBe(false);
  });

  it('seeks when the viewer is behind by more than the threshold', () => {
    expect(shouldSeek(100, 103.5)).toBe(true);
  });

  it('seeks when the viewer is ahead by more than the threshold', () => {
    expect(shouldSeek(103.5, 100)).toBe(true);
  });

  it('respects a custom threshold', () => {
    expect(shouldSeek(100, 101, 0.5)).toBe(true);
    expect(shouldSeek(100, 101, 5)).toBe(false);
  });

  it('exposes a sane default threshold', () => {
    expect(DEFAULT_SYNC_THRESHOLD_SECONDS).toBeGreaterThan(0);
    expect(DEFAULT_SYNC_THRESHOLD_SECONDS).toBeLessThanOrEqual(5);
  });
});
