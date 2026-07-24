import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './rooms.service';
import { RoomStateService } from './room-state.service';
import { UserService } from '../user/user.service';
import type {
  ChatMessagePayload,
  JoinRoomPayload,
  JwtUser,
  PlaybackUpdatePayload,
  PlaylistAddPayload,
  PlaylistRemovePayload,
  PlaylistSelectPayload,
} from './room.types';

interface SocketData {
  user: JwtUser;
  roomId?: string;
}

type RoomSocket = Socket & { data: SocketData };

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? '*',
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(
    private readonly rooms: RoomService,
    private readonly roomState: RoomStateService,
    private readonly jwtService: JwtService,
    private readonly users: UserService,
  ) {}

  async handleConnection(client: RoomSocket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      client.data.user = await this.jwtService.verifyAsync<JwtUser>(token, {
        secret: process.env.JWT_SECRET_KEY,
      });
    } catch {
      this.logger.warn(`Rejected socket ${client.id}: invalid token`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: RoomSocket): Promise<void> {
    const { roomId } = client.data;
    if (roomId) {
      await this.broadcastViewersCount(roomId);
    }
  }

  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() { roomId }: JoinRoomPayload,
  ): Promise<void> {
    // Throws NotFoundException -> wsException filter if the room is unknown.
    const room = await this.rooms.findOne(roomId).catch(() => null);
    if (!room) {
      throw new WsException(`Room ${roomId} not found`);
    }

    if (client.data.roomId && client.data.roomId !== roomId) {
      await client.leave(client.data.roomId);
      await this.broadcastViewersCount(client.data.roomId);
    }

    client.data.roomId = roomId;
    await client.join(roomId);

    // Snapshot first, fresh count after: the snapshot's viewersCount was
    // read before this client joined, so the broadcast must arrive later
    // or the joiner overwrites the live number with a stale one.
    const state = await this.roomState.getState(roomId);
    client.emit('roomState', { ...room, state });

    await this.broadcastViewersCount(roomId);
  }

  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() { roomId }: JoinRoomPayload,
  ): Promise<void> {
    if (client.data.roomId !== roomId) return;
    client.data.roomId = undefined;
    await client.leave(roomId);
    await this.broadcastViewersCount(roomId);
  }

  @SubscribeMessage('playbackUpdate')
  async onPlaybackUpdate(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() { roomId, isPlaying, currentTime }: PlaybackUpdatePayload,
  ): Promise<void> {
    await this.assertCanControlPlayback(client, roomId);
    await this.roomState.setPlayback(roomId, isPlaying, currentTime);
    client.to(roomId).emit('playbackUpdate', { isPlaying, currentTime });
  }

  @SubscribeMessage('chatMessage')
  async onChatMessage(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() { roomId, text }: ChatMessagePayload,
  ): Promise<void> {
    this.assertMember(client, roomId);
    if (!text?.trim()) return;

    const { userId, login } = client.data.user;
    const author = await this.users
      .getById(userId)
      .then((user) => user.nickname ?? user.login.split('@')[0])
      .catch(() => login.split('@')[0]);

    const message = await this.roomState.addMessage(roomId, userId, author, text);
    this.server.to(roomId).emit('chatMessage', message);
  }

  @SubscribeMessage('playlistAdd')
  async onPlaylistAdd(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() { roomId, videoId, url }: PlaylistAddPayload,
  ): Promise<void> {
    await this.assertAdmin(client, roomId);
    const state = await this.roomState.addPlaylistItem(roomId, videoId, url);
    this.server.to(roomId).emit('playlistUpdate', state);
  }

  @SubscribeMessage('playlistSelect')
  async onPlaylistSelect(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() { roomId, index }: PlaylistSelectPayload,
  ): Promise<void> {
    await this.assertAdmin(client, roomId);
    const state = await this.roomState.selectPlaylistItem(roomId, index);
    this.server.to(roomId).emit('playlistUpdate', state);
  }

  @SubscribeMessage('playlistRemove')
  async onPlaylistRemove(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() { roomId, id }: PlaylistRemovePayload,
  ): Promise<void> {
    await this.assertAdmin(client, roomId);
    const state = await this.roomState.removePlaylistItem(roomId, id);
    this.server.to(roomId).emit('playlistUpdate', state);
  }

  private assertMember(client: RoomSocket, roomId: string): void {
    if (client.data.roomId !== roomId) {
      throw new WsException('Join the room first');
    }
  }

  private async assertAdmin(client: RoomSocket, roomId: string): Promise<void> {
    this.assertMember(client, roomId);
    const room = await this.rooms.findOne(roomId).catch(() => null);
    if (room?.adminId !== client.data.user.userId) {
      throw new WsException('Only the room admin can do this');
    }
  }

  /** Playback is open to everyone when the room was created with
   *  "allow guest control"; the playlist always stays admin-only. */
  private async assertCanControlPlayback(
    client: RoomSocket,
    roomId: string,
  ): Promise<void> {
    this.assertMember(client, roomId);
    const room = await this.rooms.findOne(roomId).catch(() => null);
    if (!room) {
      throw new WsException(`Room ${roomId} not found`);
    }
    if (room.allowGuestControl) return;
    if (room.adminId !== client.data.user.userId) {
      throw new WsException('Only the room admin can control playback');
    }
  }

  private async broadcastViewersCount(roomId: string): Promise<void> {
    const count = this.server.sockets.adapter.rooms.get(roomId)?.size ?? 0;
    await this.roomState.setViewersCount(roomId, count);
    this.server.to(roomId).emit('viewersCount', { count });
  }
}
