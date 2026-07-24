import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IRoomRepository } from './rooms.repository.interface';
import { CreateRoomDto } from './dto/create-rooms.dto';
import { UpdateRoomDto } from './dto/update-rooms.dto';
import { Room } from './entities/rooms.entity';

@Injectable()
export class PrismaRoomRepository implements IRoomRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(adminId?: string): Promise<Room[]> {
    const items = await this.prisma.room.findMany(
      (adminId ? { where: { adminId } } : {}) as any,
    );
    return items.map((item) => this.mapToDomain(item));
  }

  async findById(id: string | number): Promise<Room | undefined> {
    const item = await this.prisma.room.findUnique({ where: { id: id as any } });
    return item ? this.mapToDomain(item) : undefined;
  }

  async create(data: CreateRoomDto, adminId?: string): Promise<Room> {
    const item = await this.prisma.room.create({
      data: { ...data, ...(adminId ? { adminId } : {}) } as any,
    });
    return this.mapToDomain(item);
  }

  async update(id: string | number, data: UpdateRoomDto): Promise<Room | undefined> {
    try {
      const item = await this.prisma.room.update({
        where: { id: id as any },
        data: data as any,
      });
      return this.mapToDomain(item);
    } catch {
      return undefined;
    }
  }

  async delete(id: string | number): Promise<boolean> {
    try {
      await this.prisma.room.delete({ where: { id: id as any } });
      return true;
    } catch {
      return false;
    }
  }

  private mapToDomain(item: any): Room {
    return {
      id: (item as any).id,
      name: (item as any).name,
      description: (item as any).description,
      coverUrl: (item as any).coverUrl,
      adminId: (item as any).adminId,
      allowGuestControl: (item as any).allowGuestControl ?? false,
      createdAt: (item as any).createdAt,
    };
  }
}
