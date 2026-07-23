import { Test, TestingModule } from '@nestjs/testing';
import { RoomController } from './rooms.controller';
import { RoomService } from './rooms.service';

describe('RoomController', () => {
  let controller: RoomController;
  let service: jest.Mocked<RoomService>;

  const mockRoomService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [{ provide: RoomService, useValue: mockRoomService }],
    }).compile();

    controller = module.get<RoomController>(RoomController);
    service = module.get(RoomService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should call service.findAll', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });
});
