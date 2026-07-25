import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { RoomStateService } from './room-state.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomState: RoomStateService,
    private readonly gateway: RoomGateway,
  ) {}

  @Get(':id')
  getRoom(@Param('id') id: string) {
    return this.roomState.getOrCreate(id);
  }

  @Post(':id/messages')
  postMessage(
    @Param('id') id: string,
    @Body() body: { author: string; text: string },
  ) {
    const message = this.roomState.addMessage(id, body.author, body.text);
    this.gateway.broadcastChatMessage(id, message);
    return message;
  }
}
