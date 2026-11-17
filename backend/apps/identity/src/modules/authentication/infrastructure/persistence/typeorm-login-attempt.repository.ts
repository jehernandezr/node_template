import { Injectable } from '@nestjs/common';
import { RepositoryKit } from '@platform/persistence';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import type { LoginAttempt } from '../../domain/login-attempt.js';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository.js';
import { LoginAttemptEntity } from './entities/login-attempt.entity.js';

/** `LoginAttemptRepository` sobre `login_attempts`. */
@Injectable()
export class TypeOrmLoginAttemptRepository
  extends UserShardRepository
  implements LoginAttemptRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async record(attempt: LoginAttempt): Promise<void> {
    await this.write((manager) =>
      manager.insert(LoginAttemptEntity, {
        id: attempt.id,
        userId: attempt.userId,
        result: attempt.result,
        reason: attempt.reason ?? null,
        ip: attempt.ip,
        deviceId: attempt.deviceId ?? null,
        traceId: attempt.traceId ?? null,
        attemptedAt: attempt.attemptedAt,
      }),
    );
  }
}
