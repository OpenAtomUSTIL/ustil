import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsRepository } from './assignments.repository';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [UsersModule, StorageModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsRepository, AssignmentsService],
})
export class AssignmentsModule {}
