import { CreateRoomDto } from './dto/create-rooms.dto';
import { UpdateRoomDto } from './dto/update-rooms.dto';
import { Room } from './entities/rooms.entity';

export interface IRoomRepository {
  findAll(adminId?: string): Promise<Room[]>;
  findById(id: string | number): Promise<Room | undefined>;
  create(data: CreateRoomDto, adminId?: string): Promise<Room>;
  update(id: string | number, data: UpdateRoomDto): Promise<Room | undefined>;
  delete(id: string | number): Promise<boolean>;
}
