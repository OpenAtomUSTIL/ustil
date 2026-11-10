import { Module } from '@nestjs/common';
import { redisProvider, refreshTokenStoreProvider } from '../../db/redis';
import { StorageModule } from '../storage/storage.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [StorageModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, redisProvider, refreshTokenStoreProvider],
  exports: [UsersService],
})
export class UsersModule {}
