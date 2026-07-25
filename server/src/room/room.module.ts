import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { RoomStateService } from './room-state.service';
import { RoomsController } from './rooms.controller';

@Module({
  controllers: [RoomsController],
  providers: [RoomGateway, RoomStateService],
})
export class RoomModule {}
