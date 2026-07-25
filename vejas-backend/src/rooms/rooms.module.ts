import { Module } from '@nestjs/common';
import { RoomController } from './rooms.controller';
import { RoomService } from './rooms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaRoomRepository } from './rooms.repository';
import { RoomStateService } from './room-state.service';
import { RoomsGateway } from './rooms.gateway';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, AuthModule, UserModule],
  controllers: [RoomController],
  providers: [
    {
      provide: 'ROOM_REPOSITORY',
      useClass: PrismaRoomRepository,
    },
    RoomService,
    RoomStateService,
    RoomsGateway,
  ],
  exports: [RoomService],
})
export class RoomModule {}
