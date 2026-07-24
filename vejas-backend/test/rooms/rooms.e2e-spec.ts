import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Room (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdRoomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.room.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.room.deleteMany({});
  });

  it('POST /rooms — creates item', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ name: 'Test Room' })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    createdRoomId = res.body.id;
  });

  it('GET /rooms — returns array', async () => {
    const res = await request(app.getHttpServer()).get('/rooms').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /rooms/:id — returns 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .get('/rooms/123e4567-e89b-12d3-a456-426614174000')
      .expect(404);
  });

  it('POST /rooms — returns 400 for invalid body', async () => {
    await request(app.getHttpServer())
      .post('/rooms')
      .send({})
      .expect(400);
  });
});
