import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { LoggerModule } from "./logger/logger.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { LoggerService } from "./logger/logger.service";
import { LoggingMiddleware } from "./logger/logging.middleware";
import { RoomModule } from "./rooms/rooms.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
        AuthModule,
        UserModule,
        LoggerModule,
        RedisModule,
        RoomModule
    ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
      LoggerService,
      {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
          },
      {
            provide: APP_GUARD,
            useClass: RolesGuard,
          }
],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggingMiddleware).forRoutes('*');
    }
}
