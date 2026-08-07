import { Module } from '@nestjs/common';
import { UserRepository } from './user/user.repository';
import { RefreshSessionRepository } from './refresh-session/refresh-session.repository';
import { AuditLogRepository } from './audit-log/audit-log.repository';

const repositories = [
  UserRepository,
  RefreshSessionRepository,
  AuditLogRepository,
];

@Module({
  providers: [...repositories],
  exports: [...repositories],
})
export class RepositoriesModule {}
