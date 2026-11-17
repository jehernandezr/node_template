import { Injectable } from '@nestjs/common';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { SessionState } from '../domain/session.js';
import { SessionRef } from '../domain/session-ref.js';
import { SessionRepository } from '../domain/session.repository.js';

/** Lee una sesión, por ejemplo para responder su último MFA. */
@Injectable()
export class FindSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly scopes: IdentityShardScopes,
  ) {}

  async execute(ref: SessionRef): Promise<SessionState | undefined> {
    const session = await this.scopes.inUserShard(ref, () =>
      this.sessions.find(ref.userId, ref.sessionId),
    );
    return session?.snapshot();
  }
}
