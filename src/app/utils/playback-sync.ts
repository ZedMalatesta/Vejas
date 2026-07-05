/* eslint-disable @typescript-eslint/no-unused-vars -- TDD skeleton, remove with implementation */
/**
 * Decides whether a viewer's player should hard-seek to the admin's position.
 * Small drift is tolerated to avoid seek loops; only real divergence seeks.
 */
export const DEFAULT_SYNC_THRESHOLD_SECONDS = 2.5;

export function shouldSeek(
  _localTime: number,
  _remoteTime: number,
  _thresholdSeconds: number = DEFAULT_SYNC_THRESHOLD_SECONDS
): boolean {
  // TODO(TDD): implement
  return false;
}
