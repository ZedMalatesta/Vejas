import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto, UpdatePasswordDto } from './dto/user.dto';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  const mockUserService = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = [{ id: '1', login: 'user1' }];
      service.getAll.mockResolvedValue(users as any);

      const result = await controller.getAllUsers();

      expect(service.getAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const user = { id: userId, login: 'testuser' };
      service.getById.mockResolvedValue(user as any);

      const result = await controller.getUserById(userId);

      expect(service.getById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(user);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        login: 'newuser',
        password: 'password123',
      };
      const createdUser = { id: '1', login: createDto.login };
      service.create.mockResolvedValue(createdUser as any);

      const result = await controller.createUser(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdatePasswordDto = {
        oldPassword: 'oldpass',
        newPassword: 'newpass',
      };
      const updatedUser = { id: userId, version: 2 };
      service.update.mockResolvedValue(updatedUser as any);

      const result = await controller.updatePassword(userId, updateDto);

      expect(service.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      service.delete.mockResolvedValue(undefined);

      const result = await controller.deleteUser(userId);

      expect(service.delete).toHaveBeenCalledWith(userId);
      expect(result).toBeUndefined();
    });
  });
});
