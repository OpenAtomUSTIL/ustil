import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { IssuesController } from './issues.controller';
import { IssuesRepository } from './issues.repository';
import { IssuesService } from './issues.service';

@Module({
  imports: [UsersModule],
  controllers: [IssuesController],
  providers: [IssuesRepository, IssuesService],
})
export class IssuesModule {}
