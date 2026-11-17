import { Injectable } from '@nestjs/common';
import { SessionPage } from '@contracts/identity';
import { UseCase } from '@platform/kernel';
import { UserActor } from '@platform/auth';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { Clock } from '@platform/kernel';
import { SessionRepository } from '../domain/session.repository.js';

/** Sesiones activas del usuario, la actual primero. Una página alcanza: un usuario tiene pocas. */
@Injectable()
export class ListMySessions implements UseCase<UserActor, SessionPage> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly scopes: IdentityShardScopes,
    private readonly clock: Clock,
  ) {}

  async execute(actor: UserActor): Promise<SessionPage> {
    const ref = { userId: actor.userId, homeTenantId: actor.homeTenantId };
    const sessions = await this.scopes.inUserShard(ref, () =>
      this.sessions.listActive(actor.userId),
    );
    const now = this.clock.now();
    const items = sessions
      .filter((session) => !session.isExpired(now))
      .map((session) => session.snapshot())
      .map((state) => ({
        id: state.id,
        deviceName: state.deviceName,
        platform: state.platform,
        lastSeenAt: state.lastRefreshAt.toISOString(),
        current: state.id === actor.sessionId,
      }))
      .sort((a, b) => Number(b.current) - Number(a.current));
    return { items, nextCursor: null };
  }
}
