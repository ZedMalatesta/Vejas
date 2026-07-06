import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { supabase } from '../auth/supabase';
import { RoomStateService } from './room-state.service';
import type {
  ChatMessagePayload,
  JoinRoomPayload,
  PlaybackUpdatePayload,
  PlaylistAddPayload,
  PlaylistRemovePayload,
  PlaylistSelectPayload,
} from './room.types';

@WebSocketGateway({ cors: { origin: '*' } })
export class RoomGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomState: RoomStateService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    const { error } = await supabase.auth.getUser(token);
    if (error) {
      client.disconnect();
    }
  }

  @SubscribeMessage('joinRoom')
  onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: JoinRoomPayload,
  ) {
    void client.join(roomId);
    client.emit('roomState', this.roomState.getOrCreate(roomId));
  }

  @SubscribeMessage('playbackUpdate')
  onPlaybackUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, isPlaying, currentTime }: PlaybackUpdatePayload,
  ) {
    this.roomState.setPlayback(roomId, isPlaying, currentTime);
    client.to(roomId).emit('playbackUpdate', { isPlaying, currentTime });
  }

  @SubscribeMessage('chatMessage')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, author, text }: ChatMessagePayload,
  ) {
    const message = this.roomState.addMessage(roomId, author, text);
    this.server.to(roomId).emit('chatMessage', message);
  }

  @SubscribeMessage('playlistAdd')
  onPlaylistAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, videoId, url }: PlaylistAddPayload,
  ) {
    const state = this.roomState.addPlaylistItem(roomId, videoId, url);
    this.server.to(roomId).emit('playlistUpdate', state);
  }

  @SubscribeMessage('playlistSelect')
  onPlaylistSelect(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, index }: PlaylistSelectPayload,
  ) {
    const state = this.roomState.selectPlaylistItem(roomId, index);
    this.server.to(roomId).emit('playlistUpdate', state);
  }

  @SubscribeMessage('playlistRemove')
  onPlaylistRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, id }: PlaylistRemovePayload,
  ) {
    const state = this.roomState.removePlaylistItem(roomId, id);
    this.server.to(roomId).emit('playlistUpdate', state);
  }

  broadcastChatMessage(roomId: string, message: unknown): void {
    this.server.to(roomId).emit('chatMessage', message);
  }
}
