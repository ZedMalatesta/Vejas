export interface PlaylistItem {
  id: string;
  videoId: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  sentAt: string;
}

export interface RoomState {
  playlist: PlaylistItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  messages: ChatMessage[];
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
  author: string;
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
