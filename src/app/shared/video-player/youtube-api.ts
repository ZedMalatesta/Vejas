/** Minimal typings + loader for the YouTube IFrame Player API. */

export interface YtPlayer {
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  destroy(): void;
}

export interface YtStateChangeEvent {
  data: number;
}

export interface YtErrorEvent {
  data: number;
}

/** Human-readable messages for the IFrame API error codes. */
export function describeYtError(code: number): string {
  switch (code) {
    case 2:
      return 'Invalid video link';
    case 100:
      return 'This video was not found or is private';
    case 101:
    case 150:
      return 'The video owner does not allow embedding — try another video';
    default:
      return 'YouTube could not play this video';
  }
}

interface YtNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (event: YtStateChangeEvent) => void;
        onError: (event: YtErrorEvent) => void;
      };
    }
  ) => YtPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YtNamespace> | null = null;

export function loadYouTubeApi(): Promise<YtNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });

  return apiPromise;
}
