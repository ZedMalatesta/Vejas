export interface PlaylistItemDto {
  id: string;
  videoId: string;
  url: string;
}

export interface RoomChatMessage {
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

export interface RoomState {
  playlist: PlaylistItemDto[];
  currentIndex: number;
  playback: PlaybackState;
  messages: RoomChatMessage[];
}

export interface Room {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  adminId: string;
  adminName: string;
  createdAt: string;
  viewersCount: number;
}

export interface RoomWithState extends Room {
  state: RoomState;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  coverUrl?: string;
}
