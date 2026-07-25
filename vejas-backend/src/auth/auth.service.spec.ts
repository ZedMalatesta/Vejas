import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { CreateUserDto, User } from 'src/user/dto/user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

jest.mock('src/crypto/hashPassword', () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import { comparePassword, hashPassword } from 'src/crypto/hashPassword';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    login: 'testuser',
    password: 'hashedpassword',
    nickname: null,
    avatarUrl: null,
    roles: ['user'],
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockUserService = {
    create: jest.fn(),
    getByLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);

    // Setup environment variables
    process.env.JWT_SECRET_KEY = 'test-secret';
    process.env.JWT_SECRET_REFRESH_KEY = 'test-refresh-secret';
    process.env.TOKEN_EXPIRE_TIME = '1h';
    process.env.TOKEN_REFRESH_EXPIRE_TIME = '24h';

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        login: 'newuser',
        password: 'password123',
      };
      const createdUser = { id: '1', login: createDto.login };

      userService.create.mockResolvedValue(createdUser as any);

      const result = await service.signup(createDto);

      // Hashing happens inside UserService.create (covered by its own spec);
      // signup just delegates the dto.
      expect(userService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const loginDto: LoginDto = {
        login: 'testuser',
        password: 'password123',
      };

      userService.getByLogin.mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.login(loginDto);

      expect(userService.getByLogin).toHaveBeenCalledWith(loginDto.login);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ForbiddenException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        login: 'testuser',
        password: 'wrongpassword',
      };

      userService.getByLogin.mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user not found', async () => {
      const loginDto: LoginDto = {
        login: 'nonexistent',
        password: 'password123',
      };

      userService.getByLogin.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      const payload = { userId: mockUser.id, login: mockUser.login };
      jwtService.verifyAsync.mockResolvedValue(payload);
      userService.getByLogin.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refresh(refreshDto);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        { secret: process.env.JWT_SECRET_REFRESH_KEY },
      );
      expect(userService.getByLogin).toHaveBeenCalledWith(payload.login);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ForbiddenException for invalid refresh token', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'invalid-token',
      };

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: '',
      };

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
