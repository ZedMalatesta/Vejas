import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IRoomRepository } from './rooms.repository.interface';
import { CreateRoomDto } from './dto/create-rooms.dto';
import { UpdateRoomDto } from './dto/update-rooms.dto';
import { Room } from './entities/rooms.entity';
import { RoomStateService } from './room-state.service';
import { RoomLiveState } from './room.types';
import { UserService } from '../user/user.service';

export interface ApiRoom {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  adminId: string;
  adminName: string;
  allowGuestControl: boolean;
  createdAt: string | null;
  viewersCount: number;
}

export interface ApiRoomWithState extends ApiRoom {
  state: RoomLiveState;
}

@Injectable()
export class RoomService {
  constructor(
    @Inject('ROOM_REPOSITORY')
    private repository: IRoomRepository,
    private readonly roomState: RoomStateService,
    private readonly userService: UserService,
  ) {}

  async findAll(adminId?: string): Promise<ApiRoom[]> {
    const rooms = await this.repository.findAll();
    const sorted = rooms
      .filter((room) => !adminId || room.adminId === adminId)
      .sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      );
    return Promise.all(sorted.map((room) => this.toApiRoom(room)));
  }

  async findOne(id: string): Promise<ApiRoom> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return this.toApiRoom(item);
  }

  async findOneWithState(id: string): Promise<ApiRoomWithState> {
    const room = await this.findOne(id);
    const state = await this.roomState.getState(id);
    return { ...room, state };
  }

  async create(dto: CreateRoomDto, adminId: string): Promise<ApiRoom> {
    const room = await this.repository.create({ ...dto, adminId } as CreateRoomDto & {
      adminId: string;
    });
    return this.toApiRoom(room);
  }

  async update(
    id: string,
    dto: UpdateRoomDto,
    requesterId: string,
  ): Promise<ApiRoom> {
    await this.assertAdmin(id, requesterId);
    const item = await this.repository.update(id, dto);
    if (!item) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return this.toApiRoom(item);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    await this.assertAdmin(id, requesterId);
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    await this.roomState.clear(id);
  }

  private async assertAdmin(roomId: string, userId: string): Promise<void> {
    const room = await this.repository.findById(roomId);
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }
    if (room.adminId !== userId) {
      throw new ForbiddenException('Only the room admin can do this');
    }
  }

  private async toApiRoom(room: Room): Promise<ApiRoom> {
    const [adminName, viewersCount] = await Promise.all([
      this.userService
        .getById(room.adminId)
        // Prefer the chosen nickname; never leak the full email login.
        .then((user) => user.nickname ?? user.login.split('@')[0])
        .catch(() => 'Unknown'),
      this.roomState.getViewersCount(room.id),
    ]);

    return {
      id: room.id,
      name: room.name,
      description: room.description ?? '',
      coverUrl: room.coverUrl ?? null,
      adminId: room.adminId,
      adminName,
      allowGuestControl: room.allowGuestControl,
      createdAt: room.createdAt?.toISOString() ?? null,
      viewersCount,
    };
  }
}
