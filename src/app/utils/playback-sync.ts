/**
 * Decides whether a viewer's player should hard-seek to the admin's position.
 * Small drift is tolerated to avoid seek loops; only real divergence seeks.
 */
export const DEFAULT_SYNC_THRESHOLD_SECONDS = 2.5;

export function shouldSeek(
  localTime: number,
  remoteTime: number,
  thresholdSeconds: number = DEFAULT_SYNC_THRESHOLD_SECONDS
): boolean {
  return Math.abs(localTime - remoteTime) > thresholdSeconds;
}
