import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoomService } from './rooms.service';
import { Room } from './entities/rooms.entity';
import { RoomStateService } from './room-state.service';
import { UserService } from '../user/user.service';

const ADMIN_ID = 'admin-1';

const mockRoom: Room = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Room',
  description: undefined,
  coverUrl: undefined,
  adminId: ADMIN_ID,
  allowGuestControl: false,
  createdAt: new Date('2026-07-06T10:00:00.000Z'),
};

describe('RoomService', () => {
  let service: RoomService;

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockRoomState = {
    getState: jest.fn().mockResolvedValue({
      playlist: [],
      currentIndex: 0,
      playback: { isPlaying: false, currentTime: 0, updatedAt: '' },
      messages: [],
    }),
    getViewersCount: jest.fn().mockResolvedValue(3),
    clear: jest.fn(),
  };

  const mockUserService = {
    getById: jest.fn().mockResolvedValue({ login: 'alex@test.com', nickname: null }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: 'ROOM_REPOSITORY', useValue: mockRepository },
        { provide: RoomStateService, useValue: mockRoomState },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    jest.clearAllMocks();
    mockRoomState.getViewersCount.mockResolvedValue(3);
    mockUserService.getById.mockResolvedValue({ login: 'alex@test.com', nickname: null });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns rooms enriched with adminName and viewersCount', async () => {
      mockRepository.findAll.mockResolvedValue([mockRoom]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      // Never leak the full email: the login prefix is used when
      // no nickname is set.
      expect(result[0].adminName).toBe('alex');
      expect(result[0].viewersCount).toBe(3);
      expect(result[0].description).toBe('');
    });

    it('prefers the nickname over the login for adminName', async () => {
      mockRepository.findAll.mockResolvedValue([mockRoom]);
      mockUserService.getById.mockResolvedValue({
        login: 'alex@test.com',
        nickname: 'CoolAlex',
      });

      const result = await service.findAll();
      expect(result[0].adminName).toBe('CoolAlex');
    });

    it('filters rooms by adminId when provided', async () => {
      mockRepository.findAll.mockResolvedValue([
        mockRoom,
        { ...mockRoom, id: 'other', adminId: 'someone-else' },
      ]);

      const result = await service.findAll(ADMIN_ID);

      expect(result).toHaveLength(1);
      expect(result[0].adminId).toBe(ADMIN_ID);
    });

    it('falls back to Unknown when the admin user is gone', async () => {
      mockRepository.findAll.mockResolvedValue([mockRoom]);
      mockUserService.getById.mockRejectedValue(new NotFoundException());

      const result = await service.findAll();
      expect(result[0].adminName).toBe('Unknown');
    });
  });

  describe('findOne', () => {
    it('returns the room by id', async () => {
      mockRepository.findById.mockResolvedValue(mockRoom);
      const result = await service.findOne(mockRoom.id);
      expect(result.id).toBe(mockRoom.id);
    });

    it('throws NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValue(undefined);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneWithState', () => {
    it('attaches the live state from Redis', async () => {
      mockRepository.findById.mockResolvedValue(mockRoom);

      const result = await service.findOneWithState(mockRoom.id);

      expect(mockRoomState.getState).toHaveBeenCalledWith(mockRoom.id);
      expect(result.state.playlist).toEqual([]);
    });
  });

  describe('create', () => {
    it('stores the creator as the room admin', async () => {
      mockRepository.create.mockResolvedValue(mockRoom);

      await service.create({ name: 'Test Room' }, ADMIN_ID);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Room', adminId: ADMIN_ID }),
      );
    });
  });

  describe('remove', () => {
    it('lets the admin delete the room and clears its state', async () => {
      mockRepository.findById.mockResolvedValue(mockRoom);
      mockRepository.delete.mockResolvedValue(true);

      await service.remove(mockRoom.id, ADMIN_ID);

      expect(mockRepository.delete).toHaveBeenCalledWith(mockRoom.id);
      expect(mockRoomState.clear).toHaveBeenCalledWith(mockRoom.id);
    });

    it('forbids non-admins from deleting the room', async () => {
      mockRepository.findById.mockResolvedValue(mockRoom);

      await expect(service.remove(mockRoom.id, 'someone-else')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if the room does not exist', async () => {
      mockRepository.findById.mockResolvedValue(undefined);
      await expect(service.remove('missing', ADMIN_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
