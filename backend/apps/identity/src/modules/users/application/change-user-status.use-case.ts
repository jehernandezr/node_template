import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  RevocationReason,
  UserReactivatedEvent,
  UserSuspendedEvent,
  type UserOperationResult,
} from '@contracts/identity';
import { AuthStateWriter } from '@platform/auth';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UserRepository } from '../domain/user.repository.js';
import { UserReader } from './user-reader.js';

/**
 * Suspende y reactiva usuarios. Cada operación es idempotente y la compensación de la otra. La época
 * `auth:epoch:user:{id}` con `suspended` hace que los demás servicios rechacen sus tokens al instante.
 */
@Injectable()
export class ChangeUserStatus {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly reader: UserReader,
    private readonly users: UserRepository,
    private readonly sessions: SessionsFacade,
    private readonly state: AuthStateWriter,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  async suspend(userId: string, reason?: string): Promise<UserOperationResult> {
    const ref = await this.reader.requireRef(userId);
    const now = this.clock.now();
    const result = await this.inTransaction(ref, async (user) => {
      if (user.suspend()) {
        await this.users.update(user);
        await this.bus.publish(
          UserSuspendedEvent,
          {
            userId,
            ...(reason === undefined ? {} : { reason }),
            suspendedAt: now.toISOString(),
          },
          { tenantId: ref.homeTenantId },
        );
      }
      return { userId, status: user.snapshot().status };
    });
    await this.sessions.revokeUserSessions(ref, RevocationReason.AdminAction);
    await this.state.setUserEpoch(userId, {
      revokedBefore: this.seconds(now),
      suspended: true,
    });
    return result;
  }

  async reactivate(userId: string): Promise<UserOperationResult> {
    const ref = await this.reader.requireRef(userId);
    const now = this.clock.now();
    const result = await this.inTransaction(ref, async (user) => {
      if (user.reactivate()) {
        await this.users.update(user);
        await this.bus.publish(
          UserReactivatedEvent,
          { userId, reactivatedAt: now.toISOString() },
          { tenantId: ref.homeTenantId },
        );
      }
      return { userId, status: user.snapshot().status };
    });
    await this.state.setUserEpoch(userId, {
      revokedBefore: this.seconds(now),
      suspended: false,
    });
    return result;
  }

  private inTransaction<T>(
    ref: UserRef,
    fn: (
      user: NonNullable<Awaited<ReturnType<UserRepository['find']>>>,
    ) => Promise<T>,
  ): Promise<T> {
    return this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const user = await this.users.find(ref.userId);
        if (user === undefined) {
          throw new IdentityError(IdentityErrorCode.UserNotFound);
        }
        return fn(user);
      }),
    );
  }

  private seconds(now: Date): number {
    return Math.floor(now.getTime() / ChangeUserStatus.SECOND_MS);
  }
}
