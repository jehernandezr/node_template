import { Injectable } from '@nestjs/common';
import type { SessionAccess } from '@contracts/identity';
import type { UserActor } from '@platform/auth';
import { SessionsFacade } from '../../sessions/index.js';
import { AccessResolver } from './access-resolver.js';

/** El acceso de la sesión actual, para llenar la sesión del front. */
@Injectable()
export class GetSessionAccess {
  constructor(
    private readonly resolver: AccessResolver,
    private readonly sessions: SessionsFacade,
  ) {}

  async execute(actor: UserActor): Promise<SessionAccess> {
    const access = await this.resolver.resolve(actor.userId, actor.tenantId);
    const mfaVerifiedAt = await this.sessions.mfaVerifiedAt({
      sessionId: actor.sessionId,
      userId: actor.userId,
      homeTenantId: actor.homeTenantId,
    });
    return {
      userId: actor.userId,
      tenantId: actor.tenantId,
      sessionId: actor.sessionId,
      ...access,
      mfaVerifiedAt: mfaVerifiedAt?.toISOString() ?? null,
    };
  }
}
