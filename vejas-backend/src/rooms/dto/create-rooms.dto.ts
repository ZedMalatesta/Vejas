import { IsBoolean, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @Length(3, 60)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsBoolean()
  allowGuestControl?: boolean;
}
