import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        login: 'newuser',
        password: 'password123',
      };
      const createdUser = { id: '1', login: createDto.login };
      service.signup.mockResolvedValue(createdUser as any);

      const result = await controller.signup(createDto);

      expect(service.signup).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    it('should return tokens', async () => {
      const loginDto: LoginDto = {
        login: 'testuser',
        password: 'password123',
      };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      service.login.mockResolvedValue(tokens);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(tokens);
    });
  });

  describe('refresh', () => {
    it('should return new tokens', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'refresh-token',
      };
      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      service.refresh.mockResolvedValue(tokens);

      const result = await controller.refresh(refreshDto);

      expect(service.refresh).toHaveBeenCalledWith(refreshDto);
      expect(result).toEqual(tokens);
    });
  });
});
