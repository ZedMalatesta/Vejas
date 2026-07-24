import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  CreateUserDto,
  UpdatePasswordDto,
  UpdateProfileDto,
} from './dto/user.dto';
import { UserService } from './user.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../rooms/room.types';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('admin')
  getAllUsers() {
    return this.userService.getAll();
  }

  @Get('me')
  @Roles('admin', 'user')
  getMe(@CurrentUser() user: JwtUser) {
    return this.userService.getById(user.userId);
  }

  @Patch('me')
  @Roles('admin', 'user')
  updateMe(@CurrentUser() user: JwtUser, @Body() body: UpdateProfileDto) {
    return this.userService.updateProfile(user.userId, body);
  }

  @Get(':id')
  @Roles('admin', 'user')
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getById(id);
  }

  @Post()
  @Public()
  createUser(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Put(':id/password')
  @Roles('admin', 'user')
  updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePasswordDto,
  ) {
    return this.userService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.delete(id);
  }
}
