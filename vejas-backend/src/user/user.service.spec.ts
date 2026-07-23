import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { IUserRepository } from 'src/db/user/user.repository.interface';
import { CreateUserDto, UpdatePasswordDto, User } from './dto/user.dto';

jest.mock('src/crypto/hashPassword', () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import { hashPassword, comparePassword } from 'src/crypto/hashPassword';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<IUserRepository>;

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

  const mockRepository = {
    getAll: jest.fn(),
    getById: jest.fn(),
    getByLogin: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: 'USER_REPOSITORY',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get('USER_REPOSITORY');

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      repository.getAll.mockResolvedValue(users);

      const result = await service.getAll();

      expect(repository.getAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('getById', () => {
    it('should return user by id', async () => {
      repository.getById.mockResolvedValue(mockUser);

      const result = await service.getById(mockUser.id);

      expect(repository.getById).toHaveBeenCalledWith(mockUser.id);
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.getById.mockResolvedValue(undefined);

      await expect(service.getById(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByLogin', () => {
    it('should return user by login', async () => {
      repository.getByLogin.mockResolvedValue(mockUser);

      const result = await service.getByLogin(mockUser.login);

      expect(repository.getByLogin).toHaveBeenCalledWith(mockUser.login);
      expect(result).toEqual(mockUser);
    });

    it('should return undefined if user not found', async () => {
      repository.getByLogin.mockResolvedValue(undefined);

      const result = await service.getByLogin('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        login: 'newuser',
        password: 'password123',
      };

      const hashedPassword = 'hashedpassword123';
      const newUser: User = {
        ...mockUser,
        login: createDto.login,
        password: hashedPassword,
      };

      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      repository.create.mockResolvedValue(newUser);

      const result = await service.create(createDto);

      expect(hashPassword).toHaveBeenCalledWith(createDto.password);
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        password: hashedPassword,
      });
      expect(result).not.toHaveProperty('password');
      expect(result.login).toBe(createDto.login);
    });
  });

  describe('update', () => {
    it('should update user password', async () => {
      const updateDto: UpdatePasswordDto = {
        oldPassword: 'oldpass',
        newPassword: 'newpass',
      };

      const updatedUser: User = {
        ...mockUser,
        version: 2,
      };

      repository.getById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue(updatedUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue('hashednewpassword');

      const result = await service.update(mockUser.id, updateDto);

      expect(repository.getById).toHaveBeenCalledWith(mockUser.id);
      expect(comparePassword).toHaveBeenCalledWith('oldpass', mockUser.password);
      expect(hashPassword).toHaveBeenCalledWith('newpass');
      expect(repository.update).toHaveBeenCalled();
      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateDto: UpdatePasswordDto = {
        oldPassword: 'oldpass',
        newPassword: 'newpass',
      };

      repository.getById.mockResolvedValue(undefined);

      await expect(
        service.update(mockUser.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      repository.getById.mockResolvedValue(mockUser);
      repository.delete.mockResolvedValue(true);

      await service.delete(mockUser.id);

      expect(repository.getById).toHaveBeenCalledWith(mockUser.id);
      expect(repository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.getById.mockResolvedValue(undefined);

      await expect(service.delete(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
