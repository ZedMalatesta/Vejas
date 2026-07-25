export interface PlaylistItem {
  id: string;
  videoId: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  author: string;
  text: string;
  sentAt: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: string;
}

export interface RoomLiveState {
  playlist: PlaylistItem[];
  currentIndex: number;
  playback: PlaybackState;
  messages: ChatMessage[];
}

export interface JwtUser {
  userId: string;
  login: string;
  roles: string[];
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface PlaybackUpdatePayload {
  roomId: string;
  isPlaying: boolean;
  currentTime: number;
}

export interface ChatMessagePayload {
  roomId: string;
  text: string;
}

export interface PlaylistAddPayload {
  roomId: string;
  videoId: string;
  url: string;
}

export interface PlaylistSelectPayload {
  roomId: string;
  index: number;
}

export interface PlaylistRemovePayload {
  roomId: string;
  id: string;
}
