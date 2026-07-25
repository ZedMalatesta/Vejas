import { Exclude } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export interface User {
  id: string;
  login: string;
  password: string;
  nickname: string | null;
  avatarUrl: string | null;
  roles: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  login: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @IsOptional()
  nickname?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  newPassword: string;
}

export class UserResponse {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  @IsString()
  login: string;

  nickname: string | null;

  avatarUrl: string | null;

  @IsNotEmpty()
  roles: string[];

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  version: number;

  @IsNotEmpty()
  createdAt: number;

  @IsNotEmpty()
  updatedAt: number;

  @Exclude()
  password: string;
}
